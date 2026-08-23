"""The Orchestrator, the only communication path between sub-agents.

All four sub-agents are wired in. None of them knows the others exist: each one
takes data, returns a result, and this module decides what happens next and what
is written to storage.

The session loop lives here rather than inside the Examiner Session Agent, and
that is deliberate. An agent that owned the loop would hold the conversation in
framework memory, and a session interrupted mid-defense would be gone. Here,
every turn reads the whole session from storage and writes it back, so the
process holds nothing between turns and a restart costs nothing.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.agents.draft_analyzer import analyze_draft
from app.agents.examiner_session import evaluate_answer
from app.agents.question_strategy import plan_questions
from app.agents.session_reflection import reflect_on_session
from app.llm.client import ModelRunner
from app.models.question_strategy import StrategyResult
from app.models.session import (
    AnswerEvaluation,
    AnswerStrength,
    ExaminerDecision,
    QuestionProgress,
    SessionState,
    SessionStatus,
    SessionSummary,
    SessionTurnResult,
    TranscriptTurn,
)
from app.models.weakness_map import AnalysisResult, WeaknessFinding
from app.storage.firestore import save_weakness_map
from app.storage.session_store import InMemorySessionStore, SessionStore

logger = logging.getLogger(__name__)


@dataclass
class SessionPreparation:
    """Everything produced before the examination begins."""

    analysis: AnalysisResult
    strategy: StrategyResult


@dataclass
class SessionStart:
    """The opening of a session: what the examiner says first."""

    session_id: str
    opening_remark: str
    first_question: str
    question_id: str
    preparation: SessionPreparation


@dataclass
class SessionClosing:
    """The end of a session, after reflection."""

    session_id: str
    summary: SessionSummary
    adjustments: list[str] = field(default_factory=list)


@dataclass
class Orchestrator:
    """Coordinator for a CITRA Viva session.

    `runner` is injected in tests. `store` defaults to an in-memory session store
    so the loop can be exercised without a database; production passes a
    `FirestoreSessionStore`.
    """

    runner: ModelRunner | None = None
    firestore_client: Any | None = None
    store: SessionStore = field(default_factory=InMemorySessionStore)

    # Findings are cached only to give the examiner the quoted passage as extra
    # context. See `_finding_for`: a resumed session finds nothing here, and that
    # must never be a problem.
    _findings_cache: dict[str, dict[str, WeaknessFinding]] = field(
        default_factory=dict, init=False, repr=False
    )

    # ---------------------------------------------------------------- #
    # Preparation
    # ---------------------------------------------------------------- #

    def run_draft_analysis(
        self,
        draft_text: str,
        user_id: str = "",
        draft_id: str = "",
        persist: bool = False,
    ) -> AnalysisResult:
        """Step one: raw draft text becomes a Weakness Map.

        Persistence is optional, and a failure to persist does not discard an
        analysis that already succeeded. During a live demo, a database write
        failing must not throw away a result that is already in hand.
        """
        result = analyze_draft(draft_text, runner=self.runner)
        logger.info(
            "draft_analyzer finished: %d findings kept, %d dropped",
            len(result.weakness_map.findings),
            len(result.dropped),
        )

        if persist:
            if not draft_id or not user_id:
                raise ValueError("persist=True requires user_id and draft_id.")
            try:
                save_weakness_map(
                    draft_id=draft_id,
                    user_id=user_id,
                    draft_text=draft_text,
                    result=result,
                    client=self.firestore_client,
                )
            except Exception:
                logger.exception("Failed to persist the Weakness Map to Firestore.")

        return result

    def run_question_strategy(
        self,
        analysis: AnalysisResult,
        recurring_gaps: list[str] | None = None,
    ) -> StrategyResult:
        """Step two: a Weakness Map becomes an ordered examination plan."""
        result = plan_questions(
            analysis.weakness_map, recurring_gaps=recurring_gaps, runner=self.runner
        )
        logger.info(
            "question_strategy finished: %d questions kept, %d dropped",
            len(result.strategy.questions),
            len(result.dropped),
        )
        return result

    def prepare_session(
        self,
        draft_text: str,
        recurring_gaps: list[str] | None = None,
        user_id: str = "",
        draft_id: str = "",
        persist: bool = False,
    ) -> SessionPreparation:
        """Run both preparation steps in the order a real session takes."""
        analysis = self.run_draft_analysis(
            draft_text, user_id=user_id, draft_id=draft_id, persist=persist
        )
        strategy = self.run_question_strategy(analysis, recurring_gaps=recurring_gaps)
        return SessionPreparation(analysis=analysis, strategy=strategy)

    # ---------------------------------------------------------------- #
    # The session loop
    # ---------------------------------------------------------------- #

    def start_session(
        self,
        draft_text: str,
        recurring_gaps: list[str] | None = None,
        user_id: str = "",
        draft_id: str = "",
        session_id: str = "",
        persist_draft: bool = False,
    ) -> SessionStart:
        """Prepare an examination and open it with the first question."""
        preparation = self.prepare_session(
            draft_text,
            recurring_gaps=recurring_gaps,
            user_id=user_id,
            draft_id=draft_id,
            persist=persist_draft,
        )
        strategy = preparation.strategy.strategy
        if not strategy.questions:
            raise ValueError("The examination plan is empty, so there is no session to run.")

        session_id = session_id or f"session-{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC)
        state = SessionState(
            session_id=session_id,
            user_id=user_id,
            draft_id=draft_id,
            status=SessionStatus.IN_PROGRESS,
            language=strategy.language,
            opening_remark=strategy.opening_remark,
            questions=list(strategy.questions),
            progress=[QuestionProgress(question_id=q.id) for q in strategy.questions],
            current_index=0,
            created_at=now,
            updated_at=now,
        )

        first = state.questions[0]
        opening_text = " ".join(part for part in (strategy.opening_remark, first.question) if part)
        state.transcript.append(
            TranscriptTurn(
                role="examiner",
                text=opening_text,
                question_id=first.id,
                timestamp=now,
            )
        )
        self.store.save(state)
        self._findings_cache[session_id] = {
            f.id: f for f in preparation.analysis.weakness_map.findings
        }

        return SessionStart(
            session_id=session_id,
            opening_remark=strategy.opening_remark,
            first_question=first.question,
            question_id=first.id,
            preparation=preparation,
        )

    def submit_answer(self, session_id: str, answer: str) -> SessionTurnResult:
        """Judge one answer and advance the session.

        The whole session is read from storage at the start and written back at
        the end. Nothing is carried in process memory between turns.
        """
        state = self.store.load(session_id)
        if state.status is SessionStatus.COMPLETED:
            raise ValueError(f"Session {session_id!r} has already finished.")

        question = state.current_question()
        progress = state.current_progress()
        if question is None or progress is None:
            raise ValueError(
                f"Session {session_id!r} has no question in progress. It should be "
                "closed rather than answered."
            )

        next_question = (
            state.questions[state.current_index + 1]
            if state.current_index + 1 < len(state.questions)
            else None
        )

        now = datetime.now(UTC)
        state.transcript.append(
            TranscriptTurn(
                role="student", text=answer.strip(), question_id=question.id, timestamp=now
            )
        )

        evaluation, adjustments = evaluate_answer(
            question=question,
            answer=answer,
            progress=progress,
            language=state.language,
            finding=self._finding_for(session_id, question.finding_id),
            transcript=state.transcript,
            next_question=next_question,
            runner=self.runner,
        )

        self._apply_decision(state, progress, evaluation)

        state.transcript.append(
            TranscriptTurn(
                role="examiner",
                text=evaluation.next_utterance,
                question_id=question.id,
                timestamp=datetime.now(UTC),
                evaluated_strength=evaluation.strength.value,
                decision=evaluation.decision.value,
            )
        )
        if state.is_finished():
            state.status = SessionStatus.COMPLETED
        self.store.save(state)

        following = state.current_question()
        return SessionTurnResult(
            session_id=session_id,
            examiner_says=evaluation.next_utterance,
            evaluation=evaluation,
            question_id=question.id,
            next_question_id=(following.id if following and following.id != question.id else ""),
            finished=state.is_finished(),
            adjustments=adjustments,
        )

    def close_session(self, session_id: str) -> SessionClosing:
        """Reflect on a finished session and store the summary."""
        state = self.store.load(session_id)
        summary, adjustments = reflect_on_session(state, runner=self.runner)

        state.summary = summary
        state.status = SessionStatus.COMPLETED
        self.store.save(state)
        logger.info(
            "session_reflection finished: %d gaps, %d recurring patterns",
            len(summary.remaining_gaps),
            len(summary.recurring_gap_patterns),
        )
        return SessionClosing(session_id=session_id, summary=summary, adjustments=adjustments)

    # ---------------------------------------------------------------- #
    # Internals
    # ---------------------------------------------------------------- #

    def _finding_for(self, session_id: str, finding_id: str) -> WeaknessFinding | None:
        """Look up the finding a question attacks, if it is still in memory.

        The cache is a convenience, not a dependency. A session resumed in a new
        process finds nothing here, and the examiner simply judges the answer
        against the question alone. Losing context must never break a resume.
        """
        if not finding_id:
            return None
        return self._findings_cache.get(session_id, {}).get(finding_id)

    @staticmethod
    def _apply_decision(
        state: SessionState, progress: QuestionProgress, evaluation: AnswerEvaluation
    ) -> None:
        """Move the session forward according to the examiner's decision."""
        if evaluation.decision is ExaminerDecision.PRESS_DEEPER:
            progress.follow_ups_asked += 1
            return

        if evaluation.decision is ExaminerDecision.ASK_CLARIFICATION:
            progress.clarifications_offered += 1
            return

        progress.final_strength = evaluation.strength.value
        progress.closed = True
        if evaluation.decision is ExaminerDecision.RECORD_GAP:
            progress.gap_recorded = evaluation.gap_note
        elif evaluation.strength in {AnswerStrength.STRONG, AnswerStrength.PARTIAL}:
            # Recorded in the examiner's own words, at the moment the point was
            # conceded. Restoring it later needs no prose written by our code.
            progress.defended_points = list(evaluation.criteria_met)
        state.current_index += 1

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
    QuestionRubric,
    SessionState,
    SessionStatus,
    SessionSummary,
    SessionTurnResult,
    TranscriptTurn,
)
from app.models.weakness_map import AnalysisResult
from app.observability import agent_span, record
from app.scoring import assess_session
from app.storage.draft_store import DraftStore, InMemoryDraftStore
from app.storage.firestore import save_weakness_map
from app.storage.session_store import (
    InMemorySessionStore,
    SessionNotFoundError,
    SessionStore,
)

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
    drafts: DraftStore = field(default_factory=InMemoryDraftStore)

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
        with agent_span(
            "agent.draft_analyzer", draft_characters=len(draft_text)
        ) as span:
            result = analyze_draft(draft_text, runner=self.runner)
            record(
                span,
                findings_kept=len(result.weakness_map.findings),
                findings_dropped=len(result.dropped),
            )
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
        with agent_span(
            "agent.question_strategy",
            findings_in=len(analysis.weakness_map.findings),
            recurring_gaps_in=len(recurring_gaps or []),
        ) as span:
            result = plan_questions(
                analysis.weakness_map, recurring_gaps=recurring_gaps, runner=self.runner
            )
            record(
                span,
                questions_kept=len(result.strategy.questions),
                questions_dropped=len(result.dropped),
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
            findings=list(preparation.analysis.weakness_map.findings),
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

        try:
            self.drafts.save(session_id, user_id, draft_text)
        except Exception:  # noqa: BLE001 - a stored manuscript is a convenience
            # The defense is prepared and paid for. Losing the copy the student
            # can read costs them a reference; losing the session would cost
            # them the examination, so this is logged and stepped over.
            logger.warning("Could not keep the manuscript for session %s", session_id)

        return SessionStart(
            session_id=session_id,
            opening_remark=strategy.opening_remark,
            first_question=first.question,
            question_id=first.id,
            preparation=preparation,
        )

    def load_session(self, session_id: str, actor_id: str = "") -> SessionState:
        """Read a session, refusing one that does not belong to this caller.

        The refusal is a `SessionNotFoundError` rather than a distinct
        "forbidden", so a stranger guessing ids learns nothing from the
        difference between an id that exists and one that does not.

        The comparison is exact, with no exemption for a session that carries no
        owner. An earlier version let those through, on the reasoning that
        sessions predating authentication should not be orphaned by it. That
        reasoning was affordable only while nobody real had used the service:
        the moment every visitor signs in, an ownerless document is one that
        anyone who guesses its id can open, and what it holds is somebody's
        unpublished manuscript and the map of where their argument fails.

        When authentication is off, every caller is the same anonymous user and
        every session is written under that same id, so local runs and the test
        suite compare equal and are unaffected.
        """
        state = self.store.load(session_id)
        if state.user_id != actor_id:
            raise SessionNotFoundError(f"Session {session_id!r} does not exist.")
        return state

    def delete_session(self, session_id: str, actor_id: str = "") -> None:
        """Remove a session and the manuscript kept with it, for good.

        The ownership check is `load_session`, unchanged and reused rather than
        rewritten: it already refuses a session belonging to somebody else, and
        refuses it as not-found so a stranger guessing ids learns nothing. A
        second implementation of that rule is a second place for it to be wrong.

        The manuscript goes first. If only one of the two deletions can happen,
        the student's unpublished thesis is the one that must not survive, and
        an orphaned session document holds a transcript of a defense they can
        no longer open.
        """
        self.load_session(session_id, actor_id)

        self.drafts.delete(session_id)
        self.store.delete(session_id)
        logger.info("Session %s deleted at the owner's request.", session_id)

    def submit_answer(self, session_id: str, answer: str, actor_id: str = "") -> SessionTurnResult:
        """Judge one answer and advance the session.

        The whole session is read from storage at the start and written back at
        the end. Nothing is carried in process memory between turns.
        """
        state = self.load_session(session_id, actor_id)
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

        # Claimed before the model is called, not after.
        #
        # The write at the end of a turn already refuses to overwrite a newer
        # revision, so a session could never be corrupted. What it could not
        # prevent was the waste: a second turn starting alongside the first
        # spent thirty seconds and a model call before discovering, at the very
        # last step, that it had lost. Claiming first moves that discovery to
        # the front, where it costs a single write.
        #
        # A claim that is never released is harmless. It advances the revision
        # and changes nothing else, so a student whose turn died mid-flight
        # simply loads the newer revision and answers again.
        now = datetime.now(UTC)
        state.judging_since = now
        self.store.save(state)
        state.transcript.append(
            TranscriptTurn(
                role="student", text=answer.strip(), question_id=question.id, timestamp=now
            )
        )

        with agent_span(
            "agent.examiner_session",
            session_id=session_id,
            question_id=question.id,
            question_number=state.current_index + 1,
            follow_ups_so_far=progress.follow_ups_asked,
        ) as span:
            evaluation, adjustments = evaluate_answer(
                question=question,
                answer=answer,
                progress=progress,
                language=state.language,
                finding=state.finding_for(question.finding_id),
                transcript=state.transcript,
                next_question=next_question,
                runner=self.runner,
            )
            # The decision and how strong the answer was, never the answer.
            record(
                span,
                decision=evaluation.decision.value,
                strength=evaluation.strength.value,
                rules_applied=len(adjustments),
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
                criteria_met=list(evaluation.criteria_met),
                criteria_missed=list(evaluation.criteria_missed),
            )
        )
        if state.is_finished():
            state.status = SessionStatus.COMPLETED
        state.judging_since = None
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

    def load_document(self, session_id: str, actor_id: str = "") -> str:
        """The manuscript this session was built from, for the student to read.

        A real viva happens with the thesis on the table. Ownership is checked
        against the manuscript's own record rather than the session's, so a
        stored document can never be read through a session it does not belong
        to.
        """
        # Reading the session first is what turns a guessed id into a 404 that
        # says nothing, before the manuscript store is touched at all.
        self.load_session(session_id, actor_id)
        return self.drafts.load(session_id, actor_id)

    def reveal_rubric(self, session_id: str, actor_id: str = "") -> QuestionRubric:
        """Show what the question now on the table is testing.

        Two limits, both deliberate.

        Only the current question. Revealing the criteria for a question still
        ahead would let a student prepare for an examination they are not
        supposed to be able to read in advance, which is the rule the whole
        sidebar is built around.

        And the request is written into the session before the answer comes
        back. The help is allowed; hiding that it was taken is not, because the
        closing report claims to describe what happened.
        """
        state = self.load_session(session_id, actor_id)

        question = state.current_question()
        if question is None:
            raise ValueError("This session has no question open.")

        progress = state.current_progress()
        if progress is not None and not progress.rubric_revealed:
            progress.rubric_revealed = True
            self.store.save(state)

        return QuestionRubric(
            question_id=question.id,
            question=question.question,
            intent=question.intent,
            evaluation_criteria=question.evaluation_criteria,
        )

    def close_session(self, session_id: str, actor_id: str = "") -> SessionClosing:
        """Reflect on a finished session and store the summary."""
        state = self.load_session(session_id, actor_id)
        with agent_span(
            "agent.session_reflection",
            session_id=session_id,
            turns=len(state.transcript),
            questions=len(state.questions),
        ) as span:
            summary, adjustments = reflect_on_session(state, runner=self.runner)
            record(
                span,
                remaining_gaps=len(summary.remaining_gaps),
                recurring_patterns=len(summary.recurring_gap_patterns),
                corrections_applied=len(adjustments),
            )

        # Taken from the record rather than asked of the model, in the same
        # way defended points and gaps are. A summary that could quietly omit
        # the help a student took would not be a summary of this session.
        summary.rubric_revealed_for = [
            item.question_id for item in state.progress if item.rubric_revealed
        ]

        # Computed here rather than asked of the reflection agent, and that is
        # the point: the number comes from what the examiner recorded turn by
        # turn, so the same transcript always produces the same score and every
        # part of it can be traced to an answer that was actually judged.
        summary.assessment = assess_session(state)

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

"""The Orchestrator, the only communication path between sub-agents.

Wired in so far: the Draft Analyzer and the Question Strategy Agent. The
Examiner Session and Session Reflection agents follow, and will enter through
this same door.

The contract enforced here is that sub-agents never call one another. Each agent
takes input and returns a result; the Orchestrator decides what happens next and
what gets written to Firestore. The Question Strategy Agent receives a Weakness
Map as data, not a reference to the agent that produced it.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.agents.draft_analyzer import analyze_draft
from app.agents.question_strategy import plan_questions
from app.llm.client import ModelRunner
from app.models.question_strategy import StrategyResult
from app.models.weakness_map import AnalysisResult
from app.storage.firestore import save_question_strategy, save_weakness_map

logger = logging.getLogger(__name__)


@dataclass
class SessionPreparation:
    """Everything produced before the examination begins."""

    analysis: AnalysisResult
    strategy: StrategyResult


@dataclass
class Orchestrator:
    """Coordinator for a CITRA Viva session.

    `runner` is injected in tests. In production it stays None so the real
    client is created lazily on first use.
    """

    runner: ModelRunner | None = None
    firestore_client: Any | None = None

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
            self._persist(
                lambda: save_weakness_map(
                    draft_id=self._require(draft_id, "draft_id"),
                    user_id=self._require(user_id, "user_id"),
                    draft_text=draft_text,
                    result=result,
                    client=self.firestore_client,
                ),
                "Weakness Map",
            )

        return result

    def run_question_strategy(
        self,
        analysis: AnalysisResult,
        recurring_gaps: list[str] | None = None,
        user_id: str = "",
        draft_id: str = "",
        session_id: str = "",
        persist: bool = False,
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

        if persist:
            self._persist(
                lambda: save_question_strategy(
                    session_id=self._require(session_id, "session_id"),
                    user_id=self._require(user_id, "user_id"),
                    draft_id=self._require(draft_id, "draft_id"),
                    result=result,
                    client=self.firestore_client,
                ),
                "question strategy",
            )

        return result

    def prepare_session(
        self,
        draft_text: str,
        recurring_gaps: list[str] | None = None,
        user_id: str = "",
        draft_id: str = "",
        session_id: str = "",
        persist: bool = False,
    ) -> SessionPreparation:
        """Run both preparation steps in order.

        This is the path a real session takes: analyze the draft, then plan the
        examination from what the analysis found.
        """
        analysis = self.run_draft_analysis(
            draft_text, user_id=user_id, draft_id=draft_id, persist=persist
        )
        strategy = self.run_question_strategy(
            analysis,
            recurring_gaps=recurring_gaps,
            user_id=user_id,
            draft_id=draft_id,
            session_id=session_id,
            persist=persist,
        )
        return SessionPreparation(analysis=analysis, strategy=strategy)

    @staticmethod
    def _require(value: str, name: str) -> str:
        if not value:
            raise ValueError(f"persist=True requires {name}.")
        return value

    @staticmethod
    def _persist(write, label: str) -> None:
        try:
            write()
        except ValueError:
            # A missing identifier is a caller error, not a database problem, and
            # silently swallowing it would hide a bug in the calling code.
            raise
        except Exception:
            logger.exception("Failed to persist the %s to Firestore.", label)

"""The Orchestrator, the only communication path between sub-agents.

Current state: only the Draft Analyzer is wired in. Question Strategy, Examiner
Session, and Session Reflection follow the roadmap and will enter through this
same door.

The contract enforced here is that sub-agents never call one another. Each agent
takes input and returns a result; the Orchestrator decides what happens next and
what gets written to Firestore.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.agents.draft_analyzer import analyze_draft
from app.llm.client import ModelRunner
from app.models.weakness_map import AnalysisResult
from app.storage.firestore import save_weakness_map

logger = logging.getLogger(__name__)


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
        """Step one of the Viva flow: raw draft text becomes a Weakness Map.

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
                raise ValueError("persist=True requires both user_id and draft_id.")
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

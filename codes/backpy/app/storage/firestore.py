"""Firestore access, the only module allowed to talk to the database.

Agents never call Firestore directly. They return Pydantic objects, and the
Orchestrator decides what gets persisted. That gives session durability a single
place to be enforced instead of scattering it across four agents.

The client is built lazily so importing this module requires no credentials.
"""

from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from app.config import get_settings
from app.models.firestore_schemas import (
    COLLECTION_RESEARCH_DRAFTS,
    COLLECTION_VIVA_SESSIONS,
    SessionStatus,
)
from app.models.question_strategy import StrategyResult
from app.models.weakness_map import AnalysisResult


@lru_cache
def get_firestore_client() -> Any:
    from google.cloud import firestore

    settings = get_settings()
    settings.require_gcp()
    return firestore.Client(
        project=settings.google_cloud_project,
        database=settings.firestore_database,
    )


def save_weakness_map(
    draft_id: str,
    user_id: str,
    draft_text: str,
    result: AnalysisResult,
    client: Any | None = None,
) -> str:
    """Persist a Weakness Map to `research_drafts/{draftId}`.

    The full draft text is never written here, only its length. The manuscript
    itself stays in this project's Cloud Storage bucket.
    """
    db = client or get_firestore_client()
    weakness_map = result.weakness_map
    payload = {
        "user_id": user_id,
        "source_text_chars": len(draft_text),
        "language": weakness_map.language,
        "summary": weakness_map.summary.model_dump(mode="json"),
        "weakness_map": [f.model_dump(mode="json") for f in weakness_map.findings],
        "coverage_note": weakness_map.coverage_note,
        "dropped_findings": result.dropped,
        "model": result.model,
        "analyzed_at": datetime.now(UTC),
    }
    db.collection(COLLECTION_RESEARCH_DRAFTS).document(draft_id).set(payload, merge=True)
    return draft_id


def save_question_strategy(
    session_id: str,
    user_id: str,
    draft_id: str,
    result: StrategyResult,
    client: Any | None = None,
) -> str:
    """Persist an examination plan to `viva_sessions/{sessionId}`.

    `current_question_index` starts at zero and is written here rather than when
    the session starts. A session that is interrupted before the first answer
    must still resume from a known position rather than from nothing.
    """
    db = client or get_firestore_client()
    strategy = result.strategy
    payload = {
        "user_id": user_id,
        "draft_id": draft_id,
        "status": SessionStatus.IN_PROGRESS.value,
        "language": strategy.language,
        "opening_remark": strategy.opening_remark,
        "strategy_note": strategy.strategy_note,
        "question_strategy": [q.model_dump(mode="json") for q in strategy.questions],
        "current_question_index": 0,
        "dropped_questions": result.dropped,
        "model": result.model,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    db.collection(COLLECTION_VIVA_SESSIONS).document(session_id).set(payload, merge=True)
    return session_id

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
from app.models.firestore_schemas import COLLECTION_RESEARCH_DRAFTS
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


def delete_weakness_maps_for_user(user_id: str, client: Any | None = None) -> int:
    """Remove every Weakness Map belonging to one student.

    These outlive the session that produced them, and each one carries findings
    quoted word for word out of a manuscript. A deletion that took the sessions
    and left these behind would leave a student's own sentences on our disks
    after they asked us to forget them, which is not a deletion.

    Ownership is the query. Nothing else decides what is in scope, so this
    cannot reach a document belonging to somebody else.
    """
    from google.cloud.firestore_v1.base_query import FieldFilter

    if not user_id:
        raise ValueError("Deleting weakness maps requires knowing whose they are.")

    db = client or get_firestore_client()
    documents = (
        db.collection(COLLECTION_RESEARCH_DRAFTS)
        .where(filter=FieldFilter("user_id", "==", user_id))
        .stream()
    )

    deleted = 0
    for document in documents:
        document.reference.delete()
        deleted += 1
    return deleted

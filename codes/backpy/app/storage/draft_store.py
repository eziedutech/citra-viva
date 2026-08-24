"""The manuscript a session was built from, kept so the student can read it.

Until now the draft text was never stored anywhere. It was analysed, quoted
from, and discarded, and only its character count survived. That was a sound
default: the less of somebody's unpublished research is held, the less there is
to lose.

It stops being sound the moment a student is under examination and needs to
check what they actually wrote. A real viva happens with the thesis on the table
in front of the candidate; refusing them their own document while pressing them
about it is not privacy, it is an obstacle.

So the manuscript is stored, and three decisions bound what that means.

It lives in its **own document**, not inside the session. A session document
already holds the findings, the whole transcript, and the summary, and Firestore
documents stop at one mebibyte. Adding several hundred kilobytes of manuscript
to a record that grows with every answer is a session that starts failing to
save partway through a long defense, which is exactly the class of failure this
system spends its effort avoiding.

It is **read only when asked for**. Nothing loads it to render a session, so the
cost of keeping it is storage rather than bandwidth on every turn.

It carries its **owner**, and reading it checks that owner, because a manuscript
is the most sensitive thing this system holds.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Protocol

from app.llm.retry import call_with_retry

COLLECTION_SESSION_DRAFTS = "viva_session_drafts"


class DraftNotFoundError(LookupError):
    """Raised when no manuscript was kept for a session."""


class DraftStore(Protocol):
    def save(self, session_id: str, user_id: str, text: str) -> None: ...

    def load(self, session_id: str, actor_id: str) -> str: ...


class InMemoryDraftStore:
    """For tests and local runs, with the same ownership rule as the real one."""

    def __init__(self) -> None:
        self._drafts: dict[str, tuple[str, str]] = {}

    def save(self, session_id: str, user_id: str, text: str) -> None:
        self._drafts[session_id] = (user_id, text)

    def load(self, session_id: str, actor_id: str) -> str:
        entry = self._drafts.get(session_id)
        if entry is None:
            raise DraftNotFoundError(f"No manuscript was kept for session {session_id!r}.")

        owner, text = entry
        if owner != actor_id:
            # Not found rather than forbidden, the same as everywhere else here:
            # telling a stranger the document exists confirms the id is real.
            raise DraftNotFoundError(f"No manuscript was kept for session {session_id!r}.")
        return text


class FirestoreDraftStore:
    """Manuscripts in `viva_session_drafts/{sessionId}`."""

    def __init__(self, client: Any | None = None) -> None:
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            from app.storage.firestore import get_firestore_client

            self._client = get_firestore_client()
        return self._client

    def save(self, session_id: str, user_id: str, text: str) -> None:
        payload = {
            "session_id": session_id,
            "user_id": user_id,
            "text": text,
            "characters": len(text),
            "stored_at": datetime.now(UTC).isoformat(),
        }
        call_with_retry(
            lambda: self.client.collection(COLLECTION_SESSION_DRAFTS)
            .document(session_id)
            .set(payload)
        )

    def load(self, session_id: str, actor_id: str) -> str:
        document = call_with_retry(
            lambda: self.client.collection(COLLECTION_SESSION_DRAFTS)
            .document(session_id)
            .get()
        )
        if not document.exists:
            raise DraftNotFoundError(f"No manuscript was kept for session {session_id!r}.")

        data = document.to_dict() or {}
        if str(data.get("user_id", "")) != actor_id:
            raise DraftNotFoundError(f"No manuscript was kept for session {session_id!r}.")

        return str(data.get("text", ""))

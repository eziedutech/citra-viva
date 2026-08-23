"""Session persistence.

Two implementations behind one protocol. Firestore is what runs in production;
the in-memory store is what the tests use, so the entire session loop can be
exercised without a database.

The protocol exists for a second reason beyond testing. It is the seam where
"state survives a restart" is enforced: the Orchestrator writes the whole
`SessionState` after every turn and reads it back at the start of the next one,
so it never depends on anything held in process memory between turns.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Protocol

from app.models.firestore_schemas import COLLECTION_VIVA_SESSIONS
from app.models.session import SessionState


class SessionStore(Protocol):
    def load(self, session_id: str) -> SessionState: ...

    def save(self, state: SessionState) -> None: ...


class SessionNotFoundError(LookupError):
    """Raised when a session id does not exist."""


class InMemorySessionStore:
    """A store that keeps sessions in a dict. For tests and local demos."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    def load(self, session_id: str) -> SessionState:
        state = self._sessions.get(session_id)
        if state is None:
            raise SessionNotFoundError(f"Session {session_id!r} does not exist.")
        # A copy is returned so a caller mutating the result cannot corrupt the
        # stored session without going through save(). Firestore behaves this
        # way naturally, and the two stores must not differ on that.
        return state.model_copy(deep=True)

    def save(self, state: SessionState) -> None:
        state.updated_at = datetime.now(UTC)
        self._sessions[state.session_id] = state.model_copy(deep=True)


class FirestoreSessionStore:
    """Sessions in `viva_sessions/{sessionId}`."""

    def __init__(self, client: Any | None = None) -> None:
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            from app.storage.firestore import get_firestore_client

            self._client = get_firestore_client()
        return self._client

    def load(self, session_id: str) -> SessionState:
        document = self.client.collection(COLLECTION_VIVA_SESSIONS).document(session_id).get()
        if not document.exists:
            raise SessionNotFoundError(f"Session {session_id!r} does not exist.")
        return SessionState.model_validate(document.to_dict())

    def save(self, state: SessionState) -> None:
        state.updated_at = datetime.now(UTC)
        payload = state.model_dump(mode="json")
        self.client.collection(COLLECTION_VIVA_SESSIONS).document(state.session_id).set(payload)

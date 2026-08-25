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

from app.llm.retry import call_with_retry
from app.models.firestore_schemas import COLLECTION_VIVA_SESSIONS
from app.models.session import SessionDigest, SessionState


class SessionStore(Protocol):
    def load(self, session_id: str) -> SessionState: ...

    def save(self, state: SessionState) -> None:
        """Write the session back, refusing a write onto a newer revision."""
        ...

    def list_for_user(self, user_id: str, limit: int = 50) -> list[SessionDigest]: ...

    def delete(self, session_id: str) -> None:
        """Remove a session for good. Deleting one that is already gone is fine."""
        ...


class SessionNotFoundError(LookupError):
    """Raised when a session id does not exist."""


class SessionConflictError(RuntimeError):
    """Raised when a session changed underneath the caller.

    A defense turn reads the whole session, spends half a minute in the model,
    and writes it back. Two turns starting together therefore both read the same
    state and both write it, and the later write erases the earlier one: two
    model calls paid for, two answers apparently accepted, one silently gone.

    Refusing the second write is the only honest outcome. The student is told
    their answer was not recorded rather than believing it was.
    """


# How many of a student's documents are read before the newest are picked out.
# A person practising for one defense does not accumulate hundreds of sessions,
# and a cap keeps one unusual account from turning a sidebar into a large read.
MAX_HISTORY_SCAN = 200


def _newest_first(sessions: list[SessionState], limit: int) -> list[SessionDigest]:
    """Order by when a session was last touched, with undated ones last.

    Sessions written before `created_at` was recorded have no date at all, and
    sorting `None` against a datetime raises. They sort to the bottom rather
    than taking the whole history down with them."""
    ordered = sorted(
        sessions,
        key=lambda state: (
            state.updated_at is not None,
            state.updated_at or state.created_at or datetime.min.replace(tzinfo=UTC),
        ),
        reverse=True,
    )
    return [state.digest() for state in ordered[:limit]]


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
        stored = self._sessions.get(state.session_id)
        if stored is not None and stored.revision != state.revision:
            raise SessionConflictError(
                f"Session {state.session_id!r} changed while this turn was being judged."
            )

        state.revision += 1
        state.updated_at = datetime.now(UTC)
        self._sessions[state.session_id] = state.model_copy(deep=True)

    def list_for_user(self, user_id: str, limit: int = 50) -> list[SessionDigest]:
        owned = [state for state in self._sessions.values() if state.user_id == user_id]
        return _newest_first(owned, limit)

    def delete(self, session_id: str) -> None:
        # Ownership is settled before this is called. A store deletes what it
        # is told to delete, and deciding whose it was is not its job.
        self._sessions.pop(session_id, None)


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
        """Read a session, retrying a database that is briefly unavailable.

        A moment of unavailability in the middle of a defense should cost a
        second, not the turn. The retry is the same one the model calls use, and
        it only covers the transient conditions listed there: a missing document
        is still an immediate not-found rather than something to wait for.
        """
        document = call_with_retry(
            lambda: self.client.collection(COLLECTION_VIVA_SESSIONS).document(session_id).get()
        )
        if not document.exists:
            raise SessionNotFoundError(f"Session {session_id!r} does not exist.")
        return SessionState.model_validate(document.to_dict())

    def save(self, state: SessionState) -> None:
        """Write the session, in a transaction that checks nobody else has.

        The revision is read and compared inside the transaction rather than
        before it, because a check that happens before the write is a check that
        can be overtaken by the write it was meant to guard against.

        The payload is built once, outside, so that a transaction Firestore
        retries under contention cannot bump the revision twice.
        """
        from google.cloud import firestore

        client = self.client
        reference = client.collection(COLLECTION_VIVA_SESSIONS).document(state.session_id)

        expected = state.revision
        state.revision = expected + 1
        state.updated_at = datetime.now(UTC)
        payload = state.model_dump(mode="json")

        @firestore.transactional
        def write(transaction: Any) -> None:
            snapshot = reference.get(transaction=transaction)
            if snapshot.exists:
                stored = int((snapshot.to_dict() or {}).get("revision", 0))
                if stored != expected:
                    raise SessionConflictError(
                        f"Session {state.session_id!r} changed while this turn "
                        "was being judged."
                    )
            transaction.set(reference, payload)

        try:
            # Retried on a database hiccup, never on a conflict: the conflict is
            # a correct answer, and repeating the write would be an attempt to
            # win a race the caller already lost.
            call_with_retry(lambda: write(client.transaction()))
        except SessionConflictError:
            # Leave the caller's object exactly as it was, so a retry compares
            # against the revision it actually holds.
            state.revision = expected
            raise

    def list_for_user(self, user_id: str, limit: int = 50) -> list[SessionDigest]:
        """A student's own sessions, newest first.

        Filtered on owner alone, then ordered in Python. Adding `order_by` to an
        equality filter makes Firestore demand a composite index, and a query
        that works locally and fails in production the first time a real user
        opens their history is not a trade worth making for a list this small.
        """
        from google.cloud.firestore_v1.base_query import FieldFilter

        if not user_id:
            return []

        documents = (
            self.client.collection(COLLECTION_VIVA_SESSIONS)
            .where(filter=FieldFilter("user_id", "==", user_id))
            .limit(MAX_HISTORY_SCAN)
            .stream()
        )
        return _newest_first(
            [SessionState.model_validate(document.to_dict()) for document in documents],
            limit,
        )

    def delete(self, session_id: str) -> None:
        """Remove the session document.

        Deleting a document that is not there is a success in Firestore, which
        is what makes a half-finished deletion safe to repeat. The endpoint
        above this still answers a second delete with a not-found, because by
        then the session really is gone; the tolerance here is for the store,
        not a promise to the caller.
        """
        call_with_retry(
            lambda: self.client.collection(COLLECTION_VIVA_SESSIONS)
            .document(session_id)
            .delete()
        )

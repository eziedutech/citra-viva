"""Deleting a session, and the one way it must never go wrong.

The feature is small. The failure that matters is not: deleting somebody else's
defense, or appearing to delete one and leaving the manuscript behind. Both are
pinned here.

These run against the orchestrator rather than the endpoint, because the
orchestrator is where ownership is decided and where the order of the two
deletions is chosen.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.models.question_strategy import PlannedQuestion, QuestionType
from app.models.session import QuestionProgress, SessionState, SessionStatus
from app.orchestrator.orchestrator import Orchestrator
from app.storage.draft_store import DraftNotFoundError, InMemoryDraftStore
from app.storage.session_store import InMemorySessionStore, SessionNotFoundError

NOW = datetime(2026, 8, 25, 9, 0, tzinfo=UTC)

OWNER = "student-1"
STRANGER = "student-2"
MANUSCRIPT = "The association held after controlling for prior grade average."


def session(session_id: str, user_id: str) -> SessionState:
    return SessionState(
        session_id=session_id,
        user_id=user_id,
        created_at=NOW - timedelta(days=1),
        updated_at=NOW,
        questions=[
            PlannedQuestion(
                id="Q1",
                finding_id="W1",
                question_type=QuestionType.PROBE,
                question="Why should a single faculty generalise?",
                intent="Test whether the limit on external validity is understood.",
                evaluation_criteria="Names the limit rather than defending the sample.",
            )
        ],
        progress=[QuestionProgress(question_id="Q1")],
        status=SessionStatus.IN_PROGRESS,
    )


@pytest.fixture
def orchestrator() -> Orchestrator:
    store = InMemorySessionStore()
    drafts = InMemoryDraftStore()
    store.save(session("s1", OWNER))
    drafts.save("s1", OWNER, MANUSCRIPT)
    return Orchestrator(store=store, drafts=drafts)


# --- the ordinary case ------------------------------------------------------


def test_the_owner_can_delete_their_own_session(orchestrator):
    orchestrator.delete_session("s1", actor_id=OWNER)

    with pytest.raises(SessionNotFoundError):
        orchestrator.load_session("s1", actor_id=OWNER)


def test_deleting_a_session_takes_the_manuscript_with_it(orchestrator):
    """The part a student most wants gone.

    A session that disappears from the sidebar while the thesis it was built
    from stays in the database is worse than no delete at all, because it looks
    like one.
    """
    orchestrator.delete_session("s1", actor_id=OWNER)

    # Asserted against the manuscript store directly. Going through
    # `load_document` would raise on the missing session first and prove
    # nothing about whether the document itself survived.
    with pytest.raises(DraftNotFoundError):
        orchestrator.drafts.load("s1", OWNER)


def test_a_deleted_session_leaves_the_history(orchestrator):
    assert orchestrator.store.list_for_user(OWNER) != []

    orchestrator.delete_session("s1", actor_id=OWNER)

    assert orchestrator.store.list_for_user(OWNER) == []


# --- the failure that matters -----------------------------------------------


def test_a_stranger_cannot_delete_somebody_elses_session(orchestrator):
    """Refused as not-found, the same answer reading it would give.

    A distinct "forbidden" would confirm to somebody guessing ids that they had
    guessed a real one, which is the single useful thing they could learn.
    """
    with pytest.raises(SessionNotFoundError):
        orchestrator.delete_session("s1", actor_id=STRANGER)


def test_a_refused_delete_removes_nothing(orchestrator):
    """The refusal has to happen before either deletion, not between them."""
    with pytest.raises(SessionNotFoundError):
        orchestrator.delete_session("s1", actor_id=STRANGER)

    assert orchestrator.load_session("s1", actor_id=OWNER).session_id == "s1"
    assert orchestrator.load_document("s1", actor_id=OWNER) == MANUSCRIPT


def test_deleting_a_session_that_is_already_gone_is_not_found(orchestrator):
    """Pressing delete twice is a 404, not a crash, and not a silent success."""
    orchestrator.delete_session("s1", actor_id=OWNER)

    with pytest.raises(SessionNotFoundError):
        orchestrator.delete_session("s1", actor_id=OWNER)


# --- partial state ----------------------------------------------------------


def test_a_session_with_no_stored_manuscript_still_deletes():
    """Sessions predate the manuscript store, and some carry no document.

    Deleting one must not fail on the half that was never there, or those
    sessions become permanently undeletable.
    """
    store = InMemorySessionStore()
    store.save(session("s2", OWNER))
    orchestrator = Orchestrator(store=store, drafts=InMemoryDraftStore())

    orchestrator.delete_session("s2", actor_id=OWNER)

    with pytest.raises(SessionNotFoundError):
        orchestrator.load_session("s2", actor_id=OWNER)


def test_one_deletion_does_not_touch_another_session():
    store = InMemorySessionStore()
    drafts = InMemoryDraftStore()
    for name in ("s1", "s2"):
        store.save(session(name, OWNER))
        drafts.save(name, OWNER, MANUSCRIPT)
    orchestrator = Orchestrator(store=store, drafts=drafts)

    orchestrator.delete_session("s1", actor_id=OWNER)

    assert orchestrator.load_session("s2", actor_id=OWNER).session_id == "s2"
    assert orchestrator.load_document("s2", actor_id=OWNER) == MANUSCRIPT

"""Deleting an account, and the ways it must never go half way.

Erasing everything is easy to write and easy to get quietly wrong. The failures
pinned here are the ones that would matter to a real student: touching somebody
else's defense, reporting success while a manuscript survives, and leaving the
Weakness Maps behind because they live in a different collection from the
sessions.

These run against the orchestrator, which is where ownership is decided and
where the order of the deletions is chosen.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.models.question_strategy import PlannedQuestion, QuestionType
from app.models.session import QuestionProgress, SessionState, SessionStatus
from app.orchestrator.orchestrator import Orchestrator
from app.storage.draft_store import DraftNotFoundError, InMemoryDraftStore
from app.storage.session_store import InMemorySessionStore

NOW = datetime(2026, 8, 27, 9, 0, tzinfo=UTC)

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


class FakeWeaknessMaps:
    """Stands in for the `research_drafts` collection.

    Only the two things the deletion depends on: that documents are filtered by
    owner, and that a failure to delete them is visible rather than swallowed.
    """

    def __init__(self, owners: list[str] | None = None) -> None:
        self.documents = list(owners or [])
        self.fail = False

    def __call__(self, user_id: str, client: object = None) -> int:
        if self.fail:
            raise RuntimeError("Firestore refused the delete.")
        remaining = [owner for owner in self.documents if owner != user_id]
        removed = len(self.documents) - len(remaining)
        self.documents = remaining
        return removed


@pytest.fixture
def maps(monkeypatch: pytest.MonkeyPatch) -> FakeWeaknessMaps:
    fake = FakeWeaknessMaps([OWNER, OWNER, STRANGER])
    monkeypatch.setattr(
        "app.orchestrator.orchestrator.delete_weakness_maps_for_user", fake
    )
    return fake


@pytest.fixture
def orchestrator() -> Orchestrator:
    store = InMemorySessionStore()
    drafts = InMemoryDraftStore()
    for session_id in ("s1", "s2"):
        store.save(session(session_id, OWNER))
        drafts.save(session_id, OWNER, MANUSCRIPT)
    store.save(session("s9", STRANGER))
    drafts.save("s9", STRANGER, MANUSCRIPT)
    return Orchestrator(store=store, drafts=drafts)


def test_every_session_the_student_owns_is_removed(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    assert orchestrator.delete_account(OWNER) == 2
    assert orchestrator.store.list_for_user(OWNER) == []


def test_the_manuscripts_go_with_them(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    """The whole point. A session row is a record; the manuscript is the thesis."""
    orchestrator.delete_account(OWNER)
    for session_id in ("s1", "s2"):
        with pytest.raises(DraftNotFoundError):
            orchestrator.drafts.load(session_id, OWNER)


def test_the_weakness_maps_go_too(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    """They live in another collection and quote the manuscript word for word."""
    orchestrator.delete_account(OWNER)
    assert maps.documents == [STRANGER]


def test_another_students_work_is_untouched(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    orchestrator.delete_account(OWNER)
    assert [d.session_id for d in orchestrator.store.list_for_user(STRANGER)] == ["s9"]
    assert orchestrator.drafts.load("s9", STRANGER) == MANUSCRIPT


def test_a_failure_to_delete_the_maps_is_raised_not_reported_as_success(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    """A deletion that reports a number while data survives is the worst outcome:
    the student stops looking."""
    maps.fail = True
    with pytest.raises(RuntimeError):
        orchestrator.delete_account(OWNER)


def test_deleting_twice_is_not_an_error(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    """Somebody with two tabs open must not see a failure for getting what they
    asked for."""
    assert orchestrator.delete_account(OWNER) == 2
    assert orchestrator.delete_account(OWNER) == 0


def test_an_account_with_nothing_in_it_deletes_cleanly(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    assert orchestrator.delete_account("student-with-no-sessions") == 0


def test_an_anonymous_caller_is_refused(
    orchestrator: Orchestrator, maps: FakeWeaknessMaps
) -> None:
    """Without an identity the query has no owner, and a query with no owner is
    a query for everything."""
    with pytest.raises(ValueError):
        orchestrator.delete_account("")
    assert len(orchestrator.store.list_for_user(OWNER)) == 2

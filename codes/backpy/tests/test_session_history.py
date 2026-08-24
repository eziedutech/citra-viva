"""Session history tests.

A history list is a small feature with one large failure mode: showing a person
a session that is not theirs. The first test here is that one, and it is written
against the store rather than the endpoint because the store is where ownership
is actually decided.

The ordering tests exist for a duller reason. Sessions written before
`created_at` was recorded have no date at all, and sorting `None` against a
datetime raises `TypeError`. That would not hide one row, it would take the
whole sidebar down, so the fallback is pinned here rather than left to chance.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.question_strategy import PlannedQuestion, QuestionType
from app.models.session import QuestionProgress, SessionState, SessionStatus, TranscriptTurn
from app.storage.session_store import InMemorySessionStore

NOW = datetime(2026, 8, 24, 9, 0, tzinfo=UTC)


def session(
    session_id: str,
    user_id: str,
    *,
    updated: datetime | None = NOW,
    opening: str = "",
) -> SessionState:
    return SessionState(
        session_id=session_id,
        user_id=user_id,
        opening_remark=opening,
        created_at=NOW - timedelta(days=1),
        updated_at=updated,
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
        progress=[QuestionProgress(question_id="Q1", gap_recorded="The limit was never named.")],
        transcript=[
            TranscriptTurn(role="examiner", text="Why should a single faculty generalise?"),
            TranscriptTurn(role="student", text="It should not, and I say so."),
        ],
    )


def seed(store: InMemorySessionStore, state: SessionState) -> None:
    """Put a session in the store with its dates intact.

    `save()` stamps `updated_at` with the current time, which is correct in use
    and useless here: two saves a millisecond apart are indistinguishable, and
    the case worth testing is a document that never had a date at all.
    """
    store._sessions[state.session_id] = state


def test_a_students_history_contains_only_their_own_sessions():
    store = InMemorySessionStore()
    store.save(session("mine-1", "student-a"))
    store.save(session("mine-2", "student-a"))
    store.save(session("theirs", "student-b"))

    rows = store.list_for_user("student-a")

    assert {row.session_id for row in rows} == {"mine-1", "mine-2"}


def test_an_empty_owner_matches_nothing_rather_than_everything():
    store = InMemorySessionStore()
    store.save(session("owned", "student-a"))
    assert store.list_for_user("") == []


def test_history_is_newest_first():
    """Ordered by when a session was last worked on, not when it was created."""
    store = InMemorySessionStore()
    seed(store, session("older", "student-a", updated=NOW - timedelta(hours=3)))
    seed(store, session("newer", "student-a", updated=NOW))

    assert [row.session_id for row in store.list_for_user("student-a")] == ["newer", "older"]


def test_a_session_with_no_date_sorts_last_instead_of_raising():
    store = InMemorySessionStore()
    undated = session("undated", "student-a", updated=None)
    undated.created_at = None
    seed(store, undated)
    seed(store, session("dated", "student-a"))

    assert [row.session_id for row in store.list_for_user("student-a")] == ["dated", "undated"]


def test_the_limit_is_honoured():
    store = InMemorySessionStore()
    for index in range(5):
        store.save(session(f"s{index}", "student-a"))

    assert len(store.list_for_user("student-a", limit=2)) == 2


def test_a_digest_counts_what_the_row_has_to_show():
    row = session("s1", "student-a").digest()

    assert row.question_count == 1
    assert row.answered_count == 1
    assert row.gap_count == 1
    assert row.has_summary is False
    assert row.status is SessionStatus.IN_PROGRESS


def test_a_row_falls_back_to_the_first_question_when_there_is_no_opening_remark():
    row = session("s1", "student-a").digest()
    assert row.headline == "Why should a single faculty generalise?"


def test_an_opening_remark_is_preferred_as_the_headline():
    row = session("s1", "student-a", opening="Let us begin with your sampling.").digest()
    assert row.headline == "Let us begin with your sampling."


def test_a_digest_carries_no_manuscript_text():
    """The reason this model exists: a sidebar must not ship every transcript."""
    fields = set(session("s1", "student-a").digest().model_dump())
    assert "transcript" not in fields
    assert "findings" not in fields
    assert "questions" not in fields


def test_a_finished_session_carries_its_patterns_onto_its_row():
    """The reason this field is on the digest at all.

    The patterns were already produced at the end of every session and already
    accepted at the start of the next one, and in between sat a copy and paste
    that nobody performs. Putting them on the row is what closes that loop.
    """
    from app.models.session import SessionSummary

    store = InMemorySessionStore()
    finished = session("done", "student-a")
    finished.status = SessionStatus.COMPLETED
    finished.summary = SessionSummary(
        strong_points=["Named the sampling limit."],
        remaining_gaps=["Causal language survives in the abstract."],
        recurring_gap_patterns=["States causation from a cross-sectional design."],
    )
    seed(store, finished)

    row = store.list_for_user("student-a")[0]

    assert row.has_summary is True
    assert row.recurring_gap_patterns == ["States causation from a cross-sectional design."]


def test_an_unfinished_session_carries_no_patterns():
    store = InMemorySessionStore()
    seed(store, session("open", "student-a"))

    assert store.list_for_user("student-a")[0].recurring_gap_patterns == []

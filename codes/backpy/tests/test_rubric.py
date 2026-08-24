"""Tests for revealing what a question is testing.

This feature exists in place of one that was asked for and declined: a button
that would produce a recommended answer. The product's single promise is that it
will not write a student's defense, and an answer read once cannot be unread,
after which every judgment in the session measures paraphrase rather than
understanding.

So what is revealed is the marking scheme, and the tests here pin the three
things that keep that distinction real: only the question actually on the table
can be opened, asking is written into the record, and the closing report carries
that record rather than the model's recollection of it.
"""

from __future__ import annotations

import pytest

from app.models.session import SessionStatus
from app.storage.session_store import SessionNotFoundError
from tests.test_auth import make_orchestrator
from tests.test_session_loop import DRAFT


def test_the_open_question_reports_what_it_is_testing():
    orchestrator = make_orchestrator()
    started = orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    rubric = orchestrator.reveal_rubric("s1", actor_id="uid-owner")

    assert rubric.question_id == started.question_id
    assert rubric.evaluation_criteria or rubric.intent


def test_asking_is_written_into_the_session():
    """Recorded, not hidden. The help is allowed; concealing it is not."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    orchestrator.reveal_rubric("s1", actor_id="uid-owner")

    stored = orchestrator.store.load("s1")
    assert stored.progress[0].rubric_revealed is True


def test_asking_twice_records_it_once_and_answers_the_same():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    first = orchestrator.reveal_rubric("s1", actor_id="uid-owner")
    second = orchestrator.reveal_rubric("s1", actor_id="uid-owner")

    assert first == second
    revealed = [item.question_id for item in orchestrator.store.load("s1").progress
                if item.rubric_revealed]
    assert revealed == [first.question_id]


def test_only_the_current_question_can_be_opened():
    """A defense you can read in advance is not a defense.

    There is no parameter for choosing a question, and this is the test that
    would fail if one were ever added carelessly: whatever the student asks,
    what comes back is the question they are actually facing.
    """
    orchestrator = make_orchestrator()
    started = orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    rubric = orchestrator.reveal_rubric("s1", actor_id="uid-owner")

    stored = orchestrator.store.load("s1")
    assert rubric.question_id == stored.questions[stored.current_index].id
    assert rubric.question_id == started.question_id
    assert [item.rubric_revealed for item in stored.progress[1:]] == [
        False for _ in stored.progress[1:]
    ]


def test_a_stranger_cannot_open_someone_elses_rubric():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    with pytest.raises(SessionNotFoundError):
        orchestrator.reveal_rubric("s1", actor_id="uid-stranger")


def test_a_finished_session_has_nothing_to_open():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    state = orchestrator.store.load("s1")
    state.current_index = len(state.questions)
    orchestrator.store.save(state)

    with pytest.raises(ValueError, match="no question open"):
        orchestrator.reveal_rubric("s1", actor_id="uid-owner")


def test_the_report_carries_what_was_opened():
    """Taken from the record by code, in the same way gaps and defended points
    are, so a summary cannot quietly flatter the session it describes."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")
    orchestrator.reveal_rubric("s1", actor_id="uid-owner")

    state = orchestrator.store.load("s1")
    opened = state.questions[0].id
    state.current_index = len(state.questions)
    orchestrator.store.save(state)

    closing = orchestrator.close_session("s1", actor_id="uid-owner")

    assert closing.summary.rubric_revealed_for == [opened]
    assert orchestrator.store.load("s1").status is SessionStatus.COMPLETED


def test_a_session_where_nothing_was_opened_says_so_by_being_empty():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    state = orchestrator.store.load("s1")
    state.current_index = len(state.questions)
    orchestrator.store.save(state)

    closing = orchestrator.close_session("s1", actor_id="uid-owner")

    assert closing.summary.rubric_revealed_for == []

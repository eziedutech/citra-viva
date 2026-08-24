"""What happens when things go wrong, tested on purpose.

Every test here describes a failure that either did happen or would have, and
what the student sees when it does. Success paths are covered elsewhere; these
exist because the difference between a robust product and a fragile one is
almost never visible on the happy path.

Two of these guard against silent loss, which is the worst class of failure this
system can produce: the student believes their answer was recorded, the record
disagrees, and nothing anywhere reported a problem.
"""

from __future__ import annotations

import pytest

from app.agents.draft_analyzer.core import (
    MAX_DRAFT_CHARS,
    analyze_draft,
    build_weakness_map,
)
from app.models.session import SessionStatus
from app.storage.session_store import (
    InMemorySessionStore,
    SessionConflictError,
    SessionNotFoundError,
)
from tests.test_auth import make_orchestrator
from tests.test_session_loop import ANALYSIS_PAYLOAD, DRAFT

# --------------------------------------------------------------------------- #
# Two turns at once
# --------------------------------------------------------------------------- #


def test_a_second_answer_judged_at_the_same_time_is_refused_rather_than_lost():
    """The failure this whole revision field exists for.

    A turn reads the session, spends half a minute in the model, and writes it
    back. Two turns starting together both read the same state and both write
    it, and the later write erases the earlier one. Two model calls are paid
    for, two answers appear to succeed, and one is gone with nothing reported.
    """
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    first = orchestrator.store.load("s1")
    second = orchestrator.store.load("s1")

    first.opening_remark = "written by the first turn"
    orchestrator.store.save(first)

    second.opening_remark = "written by the second turn"
    with pytest.raises(SessionConflictError):
        orchestrator.store.save(second)

    assert orchestrator.store.load("s1").opening_remark == "written by the first turn"


def test_a_refused_write_leaves_the_callers_session_untouched():
    """So a caller that reloads and retries compares against what it holds."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    stale = orchestrator.store.load("s1")
    revision_before = stale.revision

    fresh = orchestrator.store.load("s1")
    orchestrator.store.save(fresh)

    with pytest.raises(SessionConflictError):
        orchestrator.store.save(stale)

    assert stale.revision == revision_before


def test_writing_in_order_keeps_working():
    """The guard must not make ordinary sequential turns fail."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    for index in range(3):
        state = orchestrator.store.load("s1")
        state.opening_remark = f"turn {index}"
        orchestrator.store.save(state)

    assert orchestrator.store.load("s1").opening_remark == "turn 2"


def test_a_brand_new_session_writes_into_empty_storage():
    orchestrator = make_orchestrator()
    started = orchestrator.start_session(DRAFT, session_id="fresh", user_id="uid-owner")

    assert orchestrator.store.load(started.session_id).revision >= 1


# --------------------------------------------------------------------------- #
# Input a person can actually produce
# --------------------------------------------------------------------------- #


def test_a_draft_beyond_the_limit_is_refused_before_any_model_call():
    """There was no upper bound at all before this.

    A pasted two megabyte thesis was accepted, sent, charged for, and then timed
    out somewhere the student could not see. Refusing it costs nothing and says
    what to do instead.
    """
    called: list[str] = []

    def runner(*, prompt: str, response_schema):  # noqa: ANN001, ARG001
        called.append(prompt)
        return "{}"

    with pytest.raises(ValueError, match="limit"):
        analyze_draft("x" * (MAX_DRAFT_CHARS + 1), runner=runner)

    assert called == [], "Nothing may reach the model after the size check fails."


def test_a_draft_at_the_limit_is_accepted():
    """The boundary itself must not be the thing that breaks."""
    text = (DRAFT + "\n") * 40
    assert len(text) < MAX_DRAFT_CHARS

    result = build_weakness_map(ANALYSIS_PAYLOAD, text, "gemini-3.5-flash")

    assert result.weakness_map.findings


def test_an_empty_draft_says_it_is_too_short_rather_than_failing_obscurely():
    def runner(*, prompt: str, response_schema):  # noqa: ANN001, ARG001
        raise AssertionError("The model must not be reached for an empty draft.")

    with pytest.raises(ValueError, match="too short"):
        analyze_draft("", runner=runner)


# --------------------------------------------------------------------------- #
# Sessions in the wrong state
# --------------------------------------------------------------------------- #


def test_answering_a_finished_session_is_refused():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    state = orchestrator.store.load("s1")
    state.status = SessionStatus.COMPLETED
    orchestrator.store.save(state)

    with pytest.raises(ValueError, match="already finished"):
        orchestrator.submit_answer("s1", "Jawaban terlambat.", actor_id="uid-owner")


def test_answering_past_the_last_question_says_to_close_it_instead():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    state = orchestrator.store.load("s1")
    state.current_index = len(state.questions)
    orchestrator.store.save(state)

    with pytest.raises(ValueError, match="closed rather than answered"):
        orchestrator.submit_answer("s1", "Jawaban.", actor_id="uid-owner")


def test_a_session_that_does_not_exist_is_a_not_found_rather_than_a_crash():
    store = InMemorySessionStore()

    with pytest.raises(SessionNotFoundError):
        store.load("never-existed")


# --------------------------------------------------------------------------- #
# A model that fails rather than answers
# --------------------------------------------------------------------------- #


def test_a_model_failure_during_a_turn_leaves_the_session_exactly_as_it_was():
    """The student loses the attempt, not their place in the defense.

    The turn appends to the transcript in memory before calling the model. If
    that call raises, none of it may reach storage, or a resumed session would
    contain an answer that was never judged.
    """

    class Failing:
        def __call__(self, *, prompt: str, response_schema):  # noqa: ANN001, ARG002
            raise RuntimeError("resource exhausted")

    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")
    before = orchestrator.store.load("s1")

    orchestrator.runner = Failing()
    with pytest.raises(RuntimeError):
        orchestrator.submit_answer("s1", "Jawaban saya.", actor_id="uid-owner")

    after = orchestrator.store.load("s1")
    assert len(after.transcript) == len(before.transcript)
    assert after.current_index == before.current_index
    assert after.revision == before.revision

"""The 4.00 indicator, checked as arithmetic.

Every number here is worked out by hand in the test rather than copied from a
run, because the point of computing a score instead of asking a model for one
is that it can be worked out by hand.
"""

from __future__ import annotations

import pytest

from app.models.question_strategy import PlannedQuestion, QuestionType
from app.models.session import QuestionProgress, SessionState
from app.models.weakness_map import Severity, WeaknessFinding
from app.scoring import MAXIMUM, assess_session
from app.scoring.assessment import (
    CLARIFICATION_PENALTY,
    FOLLOW_UP_PENALTY,
    GAP_CEILING,
    RUBRIC_PENALTY,
)


def finding(finding_id: str, severity: Severity) -> WeaknessFinding:
    return WeaknessFinding(
        id=finding_id,
        category="unsupported_claim",
        severity=severity,
        section="Findings",
        quote="The association held across the sector.",
        why_weak="One faculty cannot speak for a sector.",
        examiner_angle="Ask what the sample can support.",
        quote_verified=True,
    )


def question(question_id: str, finding_id: str = "") -> PlannedQuestion:
    return PlannedQuestion(
        id=question_id,
        finding_id=finding_id,
        question_type=QuestionType.PROBE if finding_id else QuestionType.OPENING,
        question=f"Question {question_id}",
        intent="Test the limit of the claim.",
        evaluation_criteria="Names the limit rather than defending the sample.",
    )


def session(questions, progress, findings=()) -> SessionState:
    return SessionState(
        session_id="s1",
        user_id="student",
        questions=list(questions),
        progress=list(progress),
        findings=list(findings),
    )


# --- the plain cases --------------------------------------------------------


def test_one_strong_answer_scores_full_marks():
    state = session(
        [question("Q1", "W1")],
        [QuestionProgress(question_id="Q1", final_strength="strong")],
        [finding("W1", Severity.HIGH)],
    )

    result = assess_session(state)

    assert result.score == MAXIMUM
    assert result.questions_scored == 1


def test_one_weak_answer_scores_what_weak_is_worth():
    state = session(
        [question("Q1", "W1")],
        [QuestionProgress(question_id="Q1", final_strength="weak")],
        [finding("W1", Severity.HIGH)],
    )

    assert assess_session(state).score == 1.2


def test_evasive_scores_below_weak():
    """Talking around a point is worse than admitting the gap."""
    weak = session(
        [question("Q1")], [QuestionProgress(question_id="Q1", final_strength="weak")]
    )
    evasive = session(
        [question("Q1")], [QuestionProgress(question_id="Q1", final_strength="evasive")]
    )

    assert assess_session(evasive).score < assess_session(weak).score


# --- the deductions ---------------------------------------------------------


def test_being_pressed_costs_something_but_not_much():
    state = session(
        [question("Q1")],
        [QuestionProgress(question_id="Q1", final_strength="strong", follow_ups_asked=2)],
    )

    result = assess_session(state)

    assert result.score == round(4.0 - 2 * FOLLOW_UP_PENALTY, 2)
    assert "pressed 2 more time(s)" in result.breakdown[0].deductions[0]


def test_taking_the_marking_scheme_is_deducted_and_named():
    state = session(
        [question("Q1")],
        [QuestionProgress(question_id="Q1", final_strength="strong", rubric_revealed=True)],
    )

    result = assess_session(state)

    assert result.score == round(4.0 - RUBRIC_PENALTY, 2)
    assert any("marking scheme" in line for line in result.breakdown[0].deductions)


def test_a_clarification_costs_more_than_a_follow_up():
    """Needing the question explained again is a weaker signal than being pressed."""
    assert CLARIFICATION_PENALTY > FOLLOW_UP_PENALTY


def test_a_recorded_gap_cannot_read_as_a_pass():
    """Whatever the arithmetic said, the examiner recorded the point undefended."""
    state = session(
        [question("Q1")],
        [
            QuestionProgress(
                question_id="Q1",
                final_strength="strong",
                gap_recorded="Never addressed the sample limit.",
            )
        ],
    )

    result = assess_session(state)

    assert result.score == GAP_CEILING
    assert any("open gap" in line for line in result.breakdown[0].deductions)


def test_deductions_cannot_drive_a_score_below_zero():
    state = session(
        [question("Q1")],
        [
            QuestionProgress(
                question_id="Q1",
                final_strength="evasive",
                follow_ups_asked=9,
                clarifications_offered=9,
                rubric_revealed=True,
            )
        ],
    )

    assert assess_session(state).score == 0.0


# --- weighting --------------------------------------------------------------


def test_a_high_severity_question_counts_for_more_than_a_low_one():
    """The weighting is the whole reason severity is carried into scoring."""
    state = session(
        [question("Q1", "W1"), question("Q2", "W2")],
        [
            QuestionProgress(question_id="Q1", final_strength="strong"),
            QuestionProgress(question_id="Q2", final_strength="weak"),
        ],
        [finding("W1", Severity.LOW), finding("W2", Severity.HIGH)],
    )

    # Weighted toward the badly answered high severity question:
    # (4.0 * 1 + 1.2 * 3) / 4 = 1.9
    assert assess_session(state).score == 1.9


def test_a_question_with_no_finding_still_carries_weight():
    """Opening and closing questions attack the work as a whole."""
    state = session([question("Q1")], [QuestionProgress(question_id="Q1", final_strength="strong")])

    result = assess_session(state)

    assert result.breakdown[0].weight == 2.0
    assert result.score == MAXIMUM


# --- what is deliberately not counted --------------------------------------


def test_questions_the_session_never_reached_are_left_out():
    """A defense that ended early was not failed.

    Counting unasked questions as zero would punish somebody for stopping,
    which is the opposite of what an unfinished session means.
    """
    state = session(
        [question("Q1"), question("Q2"), question("Q3")],
        [
            QuestionProgress(question_id="Q1", final_strength="strong"),
            QuestionProgress(question_id="Q2"),
            QuestionProgress(question_id="Q3"),
        ],
    )

    result = assess_session(state)

    assert result.score == MAXIMUM
    assert result.questions_scored == 1
    assert result.questions_unanswered == 2


def test_a_session_with_nothing_judged_scores_nothing_and_says_so():
    state = session([question("Q1")], [QuestionProgress(question_id="Q1")])

    result = assess_session(state)

    assert result.score == 0.0
    assert result.questions_scored == 0
    assert result.breakdown == []


def test_an_unrecognised_strength_is_read_mildly_rather_than_as_zero():
    """Same rule as everywhere else here: an unknown value cannot harm."""
    state = session(
        [question("Q1")], [QuestionProgress(question_id="Q1", final_strength="excellent")]
    )

    assert assess_session(state).score == 2.5


# --- the promise that makes this defensible ---------------------------------


def test_the_same_transcript_always_gives_the_same_score():
    """No model call, no clock, no randomness. This is the whole argument."""
    state = session(
        [question("Q1", "W1"), question("Q2", "W2")],
        [
            QuestionProgress(question_id="Q1", final_strength="partial", follow_ups_asked=1),
            QuestionProgress(question_id="Q2", final_strength="strong", rubric_revealed=True),
        ],
        [finding("W1", Severity.HIGH), finding("W2", Severity.MEDIUM)],
    )

    scores = {assess_session(state).score for _ in range(20)}

    assert len(scores) == 1


def test_every_scored_question_shows_its_own_arithmetic():
    """A number handed over without its workings is not checkable."""
    state = session(
        [question("Q1", "W1")],
        [QuestionProgress(question_id="Q1", final_strength="partial", follow_ups_asked=1)],
        [finding("W1", Severity.HIGH)],
    )

    item = assess_session(state).breakdown[0]

    assert item.base == 2.5
    assert item.weight == 3.0
    assert item.points == round(2.5 - FOLLOW_UP_PENALTY, 2)
    assert item.deductions
    assert item.question == "Question Q1"


@pytest.mark.parametrize("strength", ["strong", "partial", "weak", "evasive"])
def test_no_score_ever_leaves_the_scale(strength):
    state = session(
        [question("Q1")],
        [
            QuestionProgress(
                question_id="Q1",
                final_strength=strength,
                follow_ups_asked=3,
                clarifications_offered=2,
                rubric_revealed=True,
            )
        ],
    )

    score = assess_session(state).score

    assert 0.0 <= score <= MAXIMUM


# --- what to do about it ----------------------------------------------------


def codes(state) -> list[str]:
    return [item.code for item in assess_session(state).advice]


def test_undefended_points_are_the_first_thing_named():
    """They cost the most and they are the most concrete thing to prepare."""
    state = session(
        [question("Q1"), question("Q2")],
        [
            QuestionProgress(
                question_id="Q1",
                final_strength="weak",
                gap_recorded="Never addressed the sample limit.",
            ),
            QuestionProgress(question_id="Q2", final_strength="strong"),
        ],
    )

    assert codes(state)[0] == "close_the_gaps"
    assert assess_session(state).advice[0].count == 1


def test_an_evasive_answer_is_called_out_specifically():
    """The scoring is harsher on evasion than on a gap, and nothing else says so."""
    state = session(
        [question("Q1")],
        [QuestionProgress(question_id="Q1", final_strength="evasive")],
    )

    assert "answer_or_concede" in codes(state)


def test_needing_the_question_restated_is_named():
    state = session(
        [question("Q1")],
        [
            QuestionProgress(
                question_id="Q1", final_strength="partial", clarifications_offered=2
            )
        ],
    )

    assert "answer_the_question_asked" in codes(state)


def test_leaning_on_the_marking_scheme_is_named():
    state = session(
        [question("Q1")],
        [QuestionProgress(question_id="Q1", final_strength="strong", rubric_revealed=True)],
    )

    assert "try_without_the_rubric" in codes(state)


def test_the_weakest_question_is_pointed_at_by_id():
    """Advice with nowhere to start is not advice."""
    state = session(
        [question("Q1"), question("Q2")],
        [
            QuestionProgress(question_id="Q1", final_strength="strong"),
            QuestionProgress(question_id="Q2", final_strength="weak"),
        ],
    )

    pointed = [
        item for item in assess_session(state).advice if item.code == "weakest_question"
    ]

    assert len(pointed) == 1
    assert pointed[0].question_id == "Q2"


def test_a_defense_that_held_is_told_so_rather_than_given_filler():
    state = session(
        [question("Q1"), question("Q2")],
        [
            QuestionProgress(question_id="Q1", final_strength="strong"),
            QuestionProgress(question_id="Q2", final_strength="strong"),
        ],
    )

    assert codes(state) == ["held_throughout"]


def test_every_piece_of_advice_traces_to_something_recorded():
    """The promise: nothing here is invented, so nothing here can be argued with
    except by reading the transcript."""
    state = session(
        [question("Q1"), question("Q2"), question("Q3")],
        [
            QuestionProgress(
                question_id="Q1", final_strength="evasive", gap_recorded="Unaddressed."
            ),
            QuestionProgress(question_id="Q2", final_strength="partial", clarifications_offered=1),
            QuestionProgress(question_id="Q3", final_strength="strong", rubric_revealed=True),
        ],
    )

    result = assess_session(state)

    assert {item.code for item in result.advice} >= {
        "close_the_gaps",
        "answer_or_concede",
        "answer_the_question_asked",
        "try_without_the_rubric",
    }
    # Counts are counts of recorded turns, never estimates.
    by_code = {item.code: item.count for item in result.advice}
    assert by_code["close_the_gaps"] == 1
    assert by_code["try_without_the_rubric"] == 1


def test_an_unfinished_session_gets_no_advice_it_cannot_support():
    state = session([question("Q1")], [QuestionProgress(question_id="Q1")])

    assert assess_session(state).advice == []

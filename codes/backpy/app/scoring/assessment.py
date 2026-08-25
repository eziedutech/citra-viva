"""A 4.00 scale indicator, computed from the record rather than asked for.

This product refuses to grade research, and that has not changed. What it will
do is report how a defense went on the scale a university actually uses, and
the distinction that makes it defensible is where the number comes from.

**The model never produces a score.** Every input here was already written into
the session while the defense was running: how each answer was judged, how many
times the student had to be pressed, whether they were offered a clarification,
whether they asked for the marking scheme, and whether the point ended
undefended. This module does arithmetic on that record and nothing else.

Three properties follow, and they are the whole reason for doing it this way.

**Reproducible.** The same transcript gives the same number, today and in six
months, on any machine, with no model call involved.

**Traceable.** Every point can be pointed at a specific judged answer. Nothing
here is a summary impression of the session.

**Checkable.** The breakdown travels with the total, so a student who disagrees
can see which question cost them what, instead of being handed a figure and
asked to accept it.

What it is not is a mark for the thesis. Weighting uses the severity of the
finding a question came from, and severity is documented throughout this
project as a claim about how hard an examiner will press, never about the
quality of the work. So a high severity question counts for more because
failing to defend an obvious attack matters more, not because the underlying
research is worse.
"""

from __future__ import annotations

from app.models.assessment import MAXIMUM, Advice, QuestionScore, SessionAssessment
from app.models.session import AnswerStrength, SessionState
from app.models.weakness_map import Severity

# What each judgement is worth before anything is deducted.
#
# `strong` is full marks: the point was defended. `partial` sits at the middle
# rather than just below the top, because an answer that half held is not a
# near miss. `evasive` is below `weak` on purpose: not knowing something is a
# gap, and talking around it is a different and worse thing in a viva.
STRENGTH_POINTS: dict[AnswerStrength, float] = {
    AnswerStrength.STRONG: 4.0,
    AnswerStrength.PARTIAL: 2.5,
    AnswerStrength.WEAK: 1.2,
    AnswerStrength.EVASIVE: 0.8,
}

# How much each question counts, taken from the severity of the finding behind
# it. An opening or closing question attacks the work as a whole and carries no
# finding, so it weighs the same as a medium one.
SEVERITY_WEIGHT: dict[Severity, float] = {
    Severity.HIGH: 3.0,
    Severity.MEDIUM: 2.0,
    Severity.LOW: 1.0,
}
DEFAULT_WEIGHT = 2.0

# Deductions, each tied to something the examiner recorded at the time.
#
# They are small, and deliberately so. The strength of the answer is the
# judgement; these describe how the answer was arrived at. Being pressed twice
# before giving a good answer is worth noting and is not worth a grade.
FOLLOW_UP_PENALTY = 0.25
CLARIFICATION_PENALTY = 0.35
RUBRIC_PENALTY = 0.5
GAP_CEILING = 1.5


# A defense at or above this held, and is told so rather than given advice it
# does not need. Roughly a B, on the scale most faculties use.
SOLID_SCORE = 3.2


def _advice_from(state: SessionState, breakdown: list[QuestionScore], score: float) -> list[Advice]:
    """Say what to work on, using only what the examiner recorded.

    Ordered by how much it cost rather than by how easy it is to say. Nothing
    here is generated: each item counts occurrences of something already
    written into the session, so a student can go to the transcript and find
    every one of them.
    """
    progress = {item.question_id: item for item in state.progress}

    gaps = [item for item in breakdown if progress[item.question_id].gap_recorded]
    evasive = [item for item in breakdown if item.strength == AnswerStrength.EVASIVE.value]
    revealed = [item for item in breakdown if progress[item.question_id].rubric_revealed]
    clarified = [
        item for item in breakdown if progress[item.question_id].clarifications_offered
    ]
    pressed = [item for item in breakdown if progress[item.question_id].follow_ups_asked]

    advice: list[Advice] = []

    # Undefended points first. They cost the most and they are the most
    # concrete thing a student can go away and prepare.
    if gaps:
        advice.append(Advice(code="close_the_gaps", count=len(gaps)))

    # Said early because the scoring is deliberately harsher on it than on
    # admitting a gap, and a student has no way to know that otherwise.
    if evasive:
        advice.append(Advice(code="answer_or_concede", count=len(evasive)))

    if clarified:
        advice.append(Advice(code="answer_the_question_asked", count=len(clarified)))

    if revealed:
        advice.append(Advice(code="try_without_the_rubric", count=len(revealed)))

    if pressed and not gaps:
        advice.append(Advice(code="lead_with_the_limitation", count=len(pressed)))

    # One question named outright, so there is somewhere to start.
    weakest = min(breakdown, key=lambda item: (item.points, -item.weight))
    if weakest.points < STRENGTH_POINTS[AnswerStrength.PARTIAL]:
        advice.append(
            Advice(code="weakest_question", question_id=weakest.question_id, count=1)
        )

    if not advice and score >= SOLID_SCORE:
        advice.append(Advice(code="held_throughout", count=len(breakdown)))

    return advice


def _weight_for(state: SessionState, finding_id: str) -> float:
    finding = state.finding_for(finding_id)
    if finding is None:
        return DEFAULT_WEIGHT
    return SEVERITY_WEIGHT.get(finding.severity, DEFAULT_WEIGHT)


def assess_session(state: SessionState) -> SessionAssessment:
    """Score a defense from what the examiner already wrote down.

    Only questions that were actually closed are counted. A session abandoned
    after two questions is scored on those two, because the alternative is to
    treat questions nobody was asked as questions somebody failed.
    """
    questions = {question.id: question for question in state.questions}

    breakdown: list[QuestionScore] = []
    unanswered = 0

    for progress in state.progress:
        question = questions.get(progress.question_id)
        strength = progress.final_strength

        # Nothing was recorded for this one, so there is nothing to judge.
        if question is None or not strength:
            unanswered += 1
            continue

        try:
            judged = AnswerStrength(strength)
        except ValueError:
            # An unrecognised value should not silently become a zero. It is
            # treated as the mildest reading, the same way the rest of this
            # project resolves an enum it does not know.
            judged = AnswerStrength.PARTIAL

        base = STRENGTH_POINTS[judged]
        points = base
        deductions: list[str] = []

        # Each deduction names what was recorded and what it cost, so a student
        # who disagrees can argue with a specific line rather than with a total.
        if progress.follow_ups_asked:
            cost = FOLLOW_UP_PENALTY * progress.follow_ups_asked
            points -= cost
            deductions.append(
                f"pressed {progress.follow_ups_asked} more time(s): -{cost:.2f}"
            )

        if progress.clarifications_offered:
            cost = CLARIFICATION_PENALTY * progress.clarifications_offered
            points -= cost
            deductions.append(
                f"given {progress.clarifications_offered} chance(s) to clarify: -{cost:.2f}"
            )

        if progress.rubric_revealed:
            points -= RUBRIC_PENALTY
            deductions.append(f"marking scheme revealed: -{RUBRIC_PENALTY:.2f}")

        # A recorded gap is the examiner saying the point was never defended.
        # Whatever the arithmetic above produced, it cannot read as a pass.
        if progress.gap_recorded:
            if points > GAP_CEILING:
                deductions.append(f"recorded as an open gap: capped at {GAP_CEILING:.2f}")
            points = min(points, GAP_CEILING)

        points = max(0.0, min(MAXIMUM, points))

        breakdown.append(
            QuestionScore(
                question_id=progress.question_id,
                question=question.question,
                weight=_weight_for(state, question.finding_id),
                base=base,
                deductions=deductions,
                points=round(points, 2),
                strength=judged.value,
            )
        )

    if not breakdown:
        return SessionAssessment(
            score=0.0, questions_scored=0, questions_unanswered=unanswered
        )

    total_weight = sum(item.weight for item in breakdown)
    weighted = sum(item.points * item.weight for item in breakdown)

    score = round(weighted / total_weight, 2)

    return SessionAssessment(
        score=score,
        questions_scored=len(breakdown),
        questions_unanswered=unanswered,
        breakdown=breakdown,
        advice=_advice_from(state, breakdown, score),
    )

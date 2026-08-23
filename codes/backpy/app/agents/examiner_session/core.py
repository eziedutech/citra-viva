"""Examiner Session core logic. Pure Python, testable without a network.

This agent judges one answer and decides what happens next. It holds no session
state: the state lives in `SessionState` and the Orchestrator owns it. That
separation is what makes an interrupted session resumable, and it is what makes
this logic testable one turn at a time.

Two rules are enforced in code rather than trusted to the prompt, because both
protect the student and a prompt is a request, not a guarantee:

* A gap cannot be recorded until the student has been given a chance to clarify.
* A single question cannot absorb the whole session through endless follow-ups.
"""

from __future__ import annotations

from app.agents.examiner_session.prompt import build_prompt
from app.common.text import parse_json_object
from app.llm.client import ModelRunner
from app.models.question_strategy import PlannedQuestion
from app.models.session import (
    AnswerEvaluation,
    AnswerStrength,
    ExaminerDecision,
    QuestionProgress,
    TranscriptTurn,
)
from app.models.weakness_map import WeaknessFinding

MAX_FOLLOW_UPS_PER_QUESTION = 2
MAX_CLARIFICATIONS_PER_QUESTION = 1
TRANSCRIPT_CONTEXT_TURNS = 4


def _coerce_strength(value: object) -> AnswerStrength:
    """An unrecognized strength becomes `partial`, the neutral middle.

    Falling to `weak` would push the session toward recording a gap the model
    never actually asserted, which is the expensive direction to be wrong in.
    """
    try:
        return AnswerStrength(str(value).strip().lower())
    except ValueError:
        return AnswerStrength.PARTIAL


def _coerce_decision(value: object) -> ExaminerDecision:
    """An unrecognized decision becomes `ask_clarification`.

    Of the four options this is the only one that cannot harm the student: it
    neither records an undefended gap nor abandons a point that still matters.
    """
    try:
        return ExaminerDecision(str(value).strip().lower())
    except ValueError:
        return ExaminerDecision.ASK_CLARIFICATION


def _as_str_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _format_recent_transcript(turns: list[TranscriptTurn]) -> str:
    recent = turns[-TRANSCRIPT_CONTEXT_TURNS:]
    lines = []
    for turn in recent:
        speaker = "Examiner" if turn.role == "examiner" else "Student"
        lines.append(f"{speaker}: {turn.text}")
    return "\n".join(lines)


def enforce_session_rules(
    evaluation: AnswerEvaluation, progress: QuestionProgress
) -> tuple[AnswerEvaluation, list[str]]:
    """Override decisions that the session rules do not permit.

    Every override is reported rather than applied silently. A session where the
    examiner's stated decision and the actual behaviour diverge without record
    would be impossible to audit afterwards.
    """
    adjustments: list[str] = []

    if (
        evaluation.decision is ExaminerDecision.RECORD_GAP
        and progress.clarifications_offered < MAX_CLARIFICATIONS_PER_QUESTION
    ):
        evaluation.decision = ExaminerDecision.ASK_CLARIFICATION
        evaluation.gap_note = ""
        adjustments.append(
            "record_gap changed to ask_clarification: the student had not yet been "
            "given a chance to clarify this point."
        )

    if (
        evaluation.decision is ExaminerDecision.PRESS_DEEPER
        and progress.follow_ups_asked >= MAX_FOLLOW_UPS_PER_QUESTION
    ):
        evaluation.decision = ExaminerDecision.MOVE_ON
        adjustments.append(
            f"press_deeper changed to move_on: this question already had "
            f"{progress.follow_ups_asked} follow-ups, which is the limit."
        )

    if (
        evaluation.decision is ExaminerDecision.ASK_CLARIFICATION
        and progress.clarifications_offered >= MAX_CLARIFICATIONS_PER_QUESTION
    ):
        # The chance to clarify has been used. Standing still would trap the
        # session on one question, so the point is recorded as undefended.
        evaluation.decision = ExaminerDecision.RECORD_GAP
        adjustments.append(
            "ask_clarification changed to record_gap: a clarification was already "
            "offered and the point is still undefended."
        )

    if evaluation.decision is ExaminerDecision.RECORD_GAP and not evaluation.gap_note:
        evaluation.gap_note = "Undefended, and no description of the gap was recorded."
        adjustments.append("record_gap arrived without a gap_note.")

    if evaluation.decision is not ExaminerDecision.RECORD_GAP:
        evaluation.gap_note = ""

    return evaluation, adjustments


def build_evaluation(data: dict, progress: QuestionProgress) -> tuple[AnswerEvaluation, list[str]]:
    """Turn a raw model response into a validated evaluation."""
    evaluation = AnswerEvaluation(
        strength=_coerce_strength(data.get("strength")),
        decision=_coerce_decision(data.get("decision")),
        reasoning=str(data.get("reasoning", "") or "").strip(),
        criteria_met=_as_str_list(data.get("criteria_met")),
        criteria_missed=_as_str_list(data.get("criteria_missed")),
        next_utterance=str(data.get("next_utterance", "") or "").strip(),
        gap_note=str(data.get("gap_note", "") or "").strip(),
    )
    if not evaluation.next_utterance:
        raise ValueError(
            "The examiner produced no utterance, so there is nothing to say to the "
            "student. Refusing to continue the turn."
        )
    return enforce_session_rules(evaluation, progress)


def evaluate_answer(
    *,
    question: PlannedQuestion,
    answer: str,
    progress: QuestionProgress,
    language: str = "id",
    finding: WeaknessFinding | None = None,
    transcript: list[TranscriptTurn] | None = None,
    next_question: PlannedQuestion | None = None,
    runner: ModelRunner | None = None,
) -> tuple[AnswerEvaluation, list[str]]:
    """Judge one answer and decide what the examiner does next.

    Returns the evaluation and the list of decisions our code overrode.
    """
    if not answer or not answer.strip():
        raise ValueError("The student's answer is empty, so there is nothing to judge.")

    if runner is None:
        from app.llm.client import GeminiRunner

        runner = GeminiRunner()

    prompt = build_prompt(
        language=language,
        question=question.question,
        question_intent=question.intent,
        evaluation_criteria=question.evaluation_criteria,
        prepared_follow_up=question.follow_up_if_weak,
        finding_quote=finding.quote if finding else "",
        finding_why_weak=finding.why_weak if finding else "",
        answer=answer.strip(),
        recent_transcript=_format_recent_transcript(transcript or []),
        clarifications_offered=progress.clarifications_offered,
        follow_ups_asked=progress.follow_ups_asked,
        next_question=next_question.question if next_question else "",
    )
    raw = runner(prompt=prompt, response_schema=AnswerEvaluation)
    return build_evaluation(parse_json_object(raw), progress)

"""Examiner Session Agent tests.

Two rules matter more than the rest, and both are enforced in code rather than
trusted to the prompt:

* A gap cannot be recorded against a student who was never given a chance to
  clarify. Giving up the first time someone stumbles is ambush, not examination.
* One question cannot swallow the whole session through endless follow-ups.

The tests below drive the model into breaking each rule and check that the code
overrules it and says so.
"""

from __future__ import annotations

import json

import pytest

from app.agents.examiner_session import evaluate_answer
from app.agents.examiner_session.core import (
    MAX_CLARIFICATIONS_PER_QUESTION,
    MAX_FOLLOW_UPS_PER_QUESTION,
)
from app.models.question_strategy import PlannedQuestion, QuestionType
from app.models.session import AnswerStrength, ExaminerDecision, QuestionProgress


def make_runner(payload: dict):
    def _runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return json.dumps(payload, ensure_ascii=False)

    return _runner


def make_question() -> PlannedQuestion:
    return PlannedQuestion(
        id="Q2",
        finding_id="W1",
        question_type=QuestionType.PROBE,
        question="Mengapa Anda memakai kata membuktikan pada desain korelasional?",
        intent="Menguji pemahaman beda korelasi dan kausalitas.",
        evaluation_criteria="Mengakui desain potong lintang tidak menegakkan urutan waktu.",
        follow_up_if_weak="Bagaimana Anda menyingkirkan kemungkinan arah sebaliknya?",
    )


def evaluation_payload(**overrides) -> dict:
    payload = {
        "strength": "weak",
        "decision": "record_gap",
        "reasoning": "Mahasiswa mengulang klaim tanpa menjawab keberatan desain.",
        "criteria_met": [],
        "criteria_missed": ["Tidak mengakui keterbatasan desain potong lintang."],
        "next_utterance": "Saya catat poin ini belum terjawab.",
        "gap_note": "Klaim kausal tidak dipertahankan.",
    }
    payload.update(overrides)
    return payload


def test_gap_cannot_be_recorded_before_a_clarification_was_offered():
    progress = QuestionProgress(question_id="Q2", clarifications_offered=0)

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Karena hasilnya signifikan, jadi jelas berpengaruh.",
        progress=progress,
        runner=make_runner(evaluation_payload()),
    )

    assert evaluation.decision is ExaminerDecision.ASK_CLARIFICATION
    # The gap note is cleared with the decision. A note left behind would be a
    # recorded weakness for a point that was never actually abandoned.
    assert evaluation.gap_note == ""
    assert any("had not yet been given a chance" in note for note in adjustments)


def test_gap_is_recorded_once_the_clarification_was_used():
    progress = QuestionProgress(
        question_id="Q2", clarifications_offered=MAX_CLARIFICATIONS_PER_QUESTION
    )

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Sama seperti tadi, hasilnya signifikan.",
        progress=progress,
        runner=make_runner(evaluation_payload()),
    )

    assert evaluation.decision is ExaminerDecision.RECORD_GAP
    assert evaluation.gap_note
    assert adjustments == []


def test_second_clarification_request_becomes_a_recorded_gap():
    """Standing still would trap the session on one question forever."""
    progress = QuestionProgress(
        question_id="Q2", clarifications_offered=MAX_CLARIFICATIONS_PER_QUESTION
    )

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Maksud saya hasilnya memang begitu.",
        progress=progress,
        runner=make_runner(evaluation_payload(decision="ask_clarification")),
    )

    assert evaluation.decision is ExaminerDecision.RECORD_GAP
    assert any("already offered" in note for note in adjustments)


def test_follow_ups_are_capped_so_one_question_cannot_own_the_session():
    progress = QuestionProgress(question_id="Q2", follow_ups_asked=MAX_FOLLOW_UPS_PER_QUESTION)

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Desain saya memang tidak dapat menegakkan urutan waktu.",
        progress=progress,
        runner=make_runner(
            evaluation_payload(strength="strong", decision="press_deeper", gap_note="")
        ),
    )

    assert evaluation.decision is ExaminerDecision.MOVE_ON
    assert any("which is the limit" in note for note in adjustments)


def test_strong_answer_earns_a_harder_question_not_a_pass():
    progress = QuestionProgress(question_id="Q2")

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Saya mengakui desain ini hanya menunjukkan asosiasi, bukan sebab-akibat.",
        progress=progress,
        runner=make_runner(
            evaluation_payload(
                strength="strong",
                decision="press_deeper",
                gap_note="",
                next_utterance="Kalau begitu, apa yang sebenarnya dapat Anda simpulkan?",
            )
        ),
    )

    assert evaluation.strength is AnswerStrength.STRONG
    assert evaluation.decision is ExaminerDecision.PRESS_DEEPER
    assert adjustments == []


def test_unknown_strength_and_decision_fall_to_the_harmless_option():
    progress = QuestionProgress(question_id="Q2")

    evaluation, _ = evaluate_answer(
        question=make_question(),
        answer="Jawaban apa adanya.",
        progress=progress,
        runner=make_runner(evaluation_payload(strength="luar_biasa", decision="usir_mahasiswa")),
    )

    # Neither fallback can harm the student: partial records nothing, and asking
    # for clarification neither abandons the point nor logs a weakness.
    assert evaluation.strength is AnswerStrength.PARTIAL
    assert evaluation.decision is ExaminerDecision.ASK_CLARIFICATION


def test_gap_note_is_stripped_when_the_decision_is_not_to_record():
    progress = QuestionProgress(question_id="Q2")

    evaluation, _ = evaluate_answer(
        question=make_question(),
        answer="Jawaban yang cukup.",
        progress=progress,
        runner=make_runner(
            evaluation_payload(
                strength="strong",
                decision="move_on",
                gap_note="Sisa keraguan yang tidak jadi dicatat.",
            )
        ),
    )

    assert evaluation.decision is ExaminerDecision.MOVE_ON
    assert evaluation.gap_note == ""


def test_recorded_gap_without_a_note_is_marked_rather_than_left_blank():
    progress = QuestionProgress(
        question_id="Q2", clarifications_offered=MAX_CLARIFICATIONS_PER_QUESTION
    )

    evaluation, adjustments = evaluate_answer(
        question=make_question(),
        answer="Tidak ada tambahan.",
        progress=progress,
        runner=make_runner(evaluation_payload(gap_note="")),
    )

    assert evaluation.decision is ExaminerDecision.RECORD_GAP
    assert evaluation.gap_note
    assert any("without a gap_note" in note for note in adjustments)


def test_turn_without_an_utterance_is_refused():
    """An examiner with nothing to say cannot take a turn."""
    with pytest.raises(ValueError, match="no utterance"):
        evaluate_answer(
            question=make_question(),
            answer="Jawaban apa adanya.",
            progress=QuestionProgress(question_id="Q2"),
            runner=make_runner(evaluation_payload(next_utterance="   ")),
        )


def test_empty_answer_is_refused():
    with pytest.raises(ValueError, match="answer is empty"):
        evaluate_answer(
            question=make_question(),
            answer="   ",
            progress=QuestionProgress(question_id="Q2"),
            runner=make_runner(evaluation_payload()),
        )


def test_prompt_carries_the_rubric_the_answer_and_the_no_answer_rule():
    captured = {}

    def capturing_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        captured["prompt"] = prompt
        return json.dumps(evaluation_payload(decision="move_on", gap_note=""))

    evaluate_answer(
        question=make_question(),
        answer="Jawaban mahasiswa yang khas.",
        progress=QuestionProgress(question_id="Q2"),
        runner=capturing_runner,
    )

    assert "Mengakui desain potong lintang" in captured["prompt"]
    assert "Jawaban mahasiswa yang khas" in captured["prompt"]
    assert "NEVER supply the answer" in captured["prompt"]
    # The model has to know the student is still owed a chance to clarify.
    assert "NOT yet been given a chance to clarify" in captured["prompt"]

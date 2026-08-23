"""Question Strategy Agent tests.

The Draft Analyzer had to prove every finding against the manuscript. This agent
has to prove every question against the Weakness Map. The tests below feed it
responses that fail that anchoring in each of the ways a model actually fails
it, and check that none of them reach the session.
"""

from __future__ import annotations

import json

import pytest

from app.agents.question_strategy import plan_questions
from app.models.question_strategy import QuestionType
from app.models.weakness_map import (
    DraftSummary,
    Severity,
    WeaknessCategory,
    WeaknessFinding,
    WeaknessMap,
)


def make_runner(payload: dict):
    def _runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return json.dumps(payload, ensure_ascii=False)

    return _runner


def make_weakness_map() -> WeaknessMap:
    """A small Weakness Map standing in for real Draft Analyzer output."""
    return WeaknessMap(
        language="id",
        summary=DraftSummary(
            research_question="Bagaimana hubungan media sosial dengan prestasi akademik?",
            methodology="Survei potong lintang, 120 responden.",
            design_type="correlational",
            stated_limitations=["Jumlah sampel relatif kecil."],
        ),
        findings=[
            WeaknessFinding(
                id="W1",
                category=WeaknessCategory.CAUSAL_LANGUAGE_NON_EXPERIMENTAL,
                severity=Severity.HIGH,
                section="Hasil",
                quote="Temuan ini membuktikan bahwa media sosial menurunkan prestasi.",
                why_weak="Desain korelasional tidak dapat menopang klaim kausal.",
                examiner_angle="Atas dasar apa arah sebab-akibat disimpulkan?",
                quote_verified=True,
            ),
            WeaknessFinding(
                id="W2",
                category=WeaknessCategory.OVERGENERALIZATION,
                severity=Severity.MEDIUM,
                section="Pembahasan",
                quote="Berlaku untuk seluruh mahasiswa di Indonesia.",
                why_weak="Sampel satu fakultas, tidak mewakili populasi nasional.",
                examiner_angle="Bagaimana generalisasi nasional dibenarkan?",
                quote_verified=True,
            ),
        ],
    )


def probe(finding_id: str, text: str, **overrides) -> dict:
    base = {
        "id": "Q9",
        "finding_id": finding_id,
        "question_type": "probe",
        "question": text,
        "intent": "Menguji dasar klaim.",
        "evaluation_criteria": "Mengakui keterbatasan desain penelitiannya.",
        "follow_up_if_weak": "Lalu apa yang sebenarnya dapat Anda simpulkan?",
    }
    base.update(overrides)
    return base


def test_anchored_questions_are_kept_and_ordered():
    payload = {
        "language": "id",
        "opening_remark": "Silakan jelaskan inti penelitian Anda dalam tiga menit.",
        "strategy_note": "Serang klaim kausal lebih dulu karena menopang seluruh kesimpulan.",
        "questions": [
            probe("W2", "Bagaimana Anda membenarkan generalisasi ke tingkat nasional?"),
            {
                "id": "Q1",
                "finding_id": "",
                "question_type": "opening",
                "question": "Apa kontribusi utama penelitian Anda?",
                "intent": "Membuat mahasiswa berkomitmen pada posisinya.",
                "evaluation_criteria": "Menyatakan kontribusi secara spesifik.",
                "follow_up_if_weak": "",
            },
            probe("W1", "Mengapa Anda memakai kata membuktikan pada desain korelasional?"),
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))
    strategy = result.strategy

    assert result.dropped == []
    assert len(strategy.questions) == 3
    assert strategy.language == "id"
    assert strategy.opening_remark

    # The opening comes first, then the high severity finding, then the medium.
    assert [q.question_type for q in strategy.questions][0] is QuestionType.OPENING
    assert [q.finding_id for q in strategy.questions] == ["", "W1", "W2"]
    assert [q.id for q in strategy.questions] == ["Q1", "Q2", "Q3"]


def test_question_citing_an_unknown_finding_is_dropped():
    payload = {
        "language": "id",
        "questions": [
            probe("W1", "Pertanyaan yang sah."),
            probe("W99", "Pertanyaan yang menunjuk temuan yang tidak ada."),
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    assert len(result.strategy.questions) == 1
    assert len(result.dropped) == 1
    assert "not in the Weakness Map" in result.dropped[0]


def test_probing_question_without_a_finding_id_is_dropped():
    payload = {
        "language": "id",
        "questions": [probe("", "Pertanyaan menggantung tanpa dasar temuan.")],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    assert result.strategy.questions == []
    assert "no finding_id" in result.dropped[0]


def test_opening_and_closing_may_stand_without_a_finding():
    payload = {
        "language": "id",
        "questions": [
            {
                "id": "Q1",
                "finding_id": "",
                "question_type": "opening",
                "question": "Jelaskan inti penelitian Anda.",
                "intent": "Membuka sesi.",
            },
            {
                "id": "Q2",
                "finding_id": "",
                "question_type": "closing",
                "question": "Apa kontribusi penelitian ini bagi bidang Anda?",
                "intent": "Menutup sesi.",
            },
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    assert result.dropped == []
    assert [q.question_type for q in result.strategy.questions] == [
        QuestionType.OPENING,
        QuestionType.CLOSING,
    ]


def test_unknown_question_type_becomes_a_probe_and_still_needs_an_anchor():
    payload = {
        "language": "id",
        "questions": [
            probe("W1", "Pertanyaan bertipe asing.", question_type="interogasi_keras"),
            probe("", "Tanpa anchor dan bertipe asing.", question_type="interogasi_keras"),
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    # Falling back to `probe` must not become a loophole around anchoring.
    assert len(result.strategy.questions) == 1
    assert result.strategy.questions[0].question_type is QuestionType.PROBE
    assert "no finding_id" in result.dropped[0]


def test_recurring_gap_is_flagged_and_asked_earlier():
    gaps = ["generalisasi ke tingkat nasional"]
    payload = {
        "language": "id",
        "questions": [
            probe("W1", "Mengapa memakai kata membuktikan pada desain korelasional?"),
            probe("W2", "Bagaimana Anda membenarkan generalisasi ke tingkat nasional?"),
        ],
    }

    result = plan_questions(make_weakness_map(), recurring_gaps=gaps, runner=make_runner(payload))
    questions = result.strategy.questions

    # W2 is lower severity, but the student already failed this one before, so it
    # is asked first. That is the whole point of carrying memory across sessions.
    assert questions[0].finding_id == "W2"
    assert questions[0].targets_recurring_gap is True
    assert questions[1].targets_recurring_gap is False


def test_duplicate_and_empty_questions_are_dropped():
    text = "Bagaimana Anda membenarkan generalisasi ke tingkat nasional?"
    payload = {
        "language": "id",
        "questions": [
            probe("W2", text),
            probe("W2", text),
            probe("W1", "   "),
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    assert len(result.strategy.questions) == 1
    assert any("duplicate question" in reason for reason in result.dropped)
    assert any("empty question text" in reason for reason in result.dropped)


def test_empty_weakness_map_is_refused():
    empty = WeaknessMap(
        language="id",
        summary=DraftSummary(research_question="", methodology="", design_type="unclear"),
        findings=[],
    )

    with pytest.raises(ValueError, match="nothing to examine"):
        plan_questions(empty, runner=make_runner({}))


def test_prompt_carries_the_findings_and_the_no_answer_rule():
    captured = {}

    def capturing_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        captured["prompt"] = prompt
        return json.dumps({"language": "id", "questions": []})

    plan_questions(
        make_weakness_map(),
        recurring_gaps=["generalisasi berlebihan"],
        runner=capturing_runner,
    )

    assert "W1" in captured["prompt"]
    assert "membuktikan bahwa media sosial" in captured["prompt"]
    assert "generalisasi berlebihan" in captured["prompt"]
    # The rule that the agent never writes the student's answer has to reach the
    # model, not merely sit in a document.
    assert "NEVER write the student's answer" in captured["prompt"]


def test_first_session_prompt_says_there_is_no_history():
    captured = {}

    def capturing_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        captured["prompt"] = prompt
        return json.dumps({"language": "id", "questions": []})

    plan_questions(make_weakness_map(), runner=capturing_runner)

    assert "This is a first session" in captured["prompt"]


def test_model_asserted_recurring_gap_is_honored():
    """Whether a question revisits a prior gap is a semantic judgment, so the
    model's own assertion counts even when no words overlap."""
    payload = {
        "language": "id",
        "questions": [
            probe("W1", "Mengapa memakai kata membuktikan pada desain korelasional?"),
            probe(
                "W2",
                "Atas dasar apa temuan Anda berlaku di luar fakultas tempat data diambil?",
                targets_recurring_gap=True,
            ),
        ],
    }

    result = plan_questions(
        make_weakness_map(),
        recurring_gaps=["kesimpulan ditarik melampaui populasi yang diteliti"],
        runner=make_runner(payload),
    )

    assert result.strategy.questions[0].finding_id == "W2"
    assert result.strategy.questions[0].targets_recurring_gap is True


def test_recurring_gap_claim_is_refused_when_no_gaps_were_supplied():
    """A first session has no prior gaps, so nothing can target one. This is the
    part of the claim that IS verifiable, and it is enforced."""
    payload = {
        "language": "id",
        "questions": [
            probe("W1", "Pertanyaan biasa.", targets_recurring_gap=True),
        ],
    }

    result = plan_questions(make_weakness_map(), runner=make_runner(payload))

    assert result.strategy.questions[0].targets_recurring_gap is False

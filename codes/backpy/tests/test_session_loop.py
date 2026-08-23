"""Tests for the full session loop and for reflection.

The loop is driven end to end with a scripted model: draft analysis, question
planning, several answered turns, and a closing reflection. Nothing touches the
network.

The test that matters most is the resume test. A defense that drops halfway has
to continue from where it stopped, and the only way to prove that is to throw the
Orchestrator away mid-session and carry on with a new one.
"""

from __future__ import annotations

import json

import pytest

from app.agents.session_reflection.core import reflect_on_session
from app.models.session import (
    ExaminerDecision,
    QuestionProgress,
    SessionState,
    SessionStatus,
    TranscriptTurn,
)
from app.orchestrator.orchestrator import Orchestrator
from app.storage.session_store import InMemorySessionStore, SessionNotFoundError

DRAFT = """
BAB I PENDAHULUAN
Penelitian ini meneliti hubungan antara jam belajar mandiri dengan nilai ujian akhir
mahasiswa. Jam belajar mandiri jelas merupakan penentu utama keberhasilan akademik.

BAB III METODOLOGI
Desain penelitian adalah survei potong lintang terhadap 90 mahasiswa satu angkatan
yang dipilih secara sukarela. Data dikumpulkan melalui kuesioner daring.

BAB IV HASIL
Hasil menunjukkan korelasi positif yang signifikan antara jam belajar dan nilai ujian.
Temuan ini membuktikan bahwa menambah jam belajar mandiri meningkatkan nilai ujian
mahasiswa di seluruh Indonesia.
"""

ANALYSIS_PAYLOAD = {
    "language": "id",
    "summary": {
        "research_question": "Bagaimana hubungan jam belajar mandiri dengan nilai ujian?",
        "methodology": "Survei potong lintang, 90 mahasiswa, sukarela.",
        "design_type": "correlational",
        "key_findings": ["Korelasi positif signifikan."],
        "stated_limitations": [],
    },
    "coverage_note": "Bab II tidak disertakan.",
    "findings": [
        {
            "id": "W1",
            "category": "causal_language_non_experimental",
            "severity": "high",
            "section": "Hasil",
            "quote": (
                "Temuan ini membuktikan bahwa menambah jam belajar mandiri "
                "meningkatkan nilai ujian mahasiswa di seluruh Indonesia."
            ),
            "why_weak": "Desain potong lintang tidak menopang klaim kausal.",
            "examiner_angle": "Atas dasar apa arah sebab-akibat disimpulkan?",
        },
        {
            "id": "W2",
            "category": "unsupported_claim",
            "severity": "medium",
            "section": "Pendahuluan",
            "quote": ("Jam belajar mandiri jelas merupakan penentu utama keberhasilan akademik."),
            "why_weak": "Klaim penentu utama tanpa rujukan.",
            "examiner_angle": "Dari literatur mana klaim ini diambil?",
        },
    ],
}

STRATEGY_PAYLOAD = {
    "language": "id",
    "opening_remark": "Selamat siang. Kita mulai.",
    "strategy_note": "Serang klaim kausal lebih dulu.",
    "questions": [
        {
            "id": "Q1",
            "finding_id": "W1",
            "question_type": "probe",
            "question": "Mengapa Anda memakai kata membuktikan pada desain korelasional?",
            "intent": "Menguji beda korelasi dan kausalitas.",
            "evaluation_criteria": "Mengakui desain tidak menegakkan urutan waktu.",
            "follow_up_if_weak": "Bagaimana Anda menyingkirkan arah sebaliknya?",
        },
        {
            "id": "Q2",
            "finding_id": "W2",
            "question_type": "probe",
            "question": "Dari literatur mana klaim penentu utama itu Anda ambil?",
            "intent": "Menguji dasar klaim pendahuluan.",
            "evaluation_criteria": "Menyebut sumber atau menarik klaimnya.",
            "follow_up_if_weak": "Kalau tidak ada sumbernya, apa dasar klaim itu?",
        },
    ],
}

REFLECTION_PAYLOAD = {
    "strong_points": ["Mengakui keterbatasan desain potong lintang."],
    "remaining_gaps": ["Klaim penentu utama di pendahuluan tidak berdasar."],
    "recurring_gap_patterns": [
        "Menulis kesimpulan kausal dari temuan korelasional.",
        "Menyatakan klaim besar di pendahuluan tanpa rujukan.",
    ],
    "closing_remark": "Sesi selesai. Dua poin masih terbuka.",
}


class ScriptedRunner:
    """Routes each call to the right canned response by inspecting the prompt.

    A single fake has to serve four different agents here, and dispatching on the
    prompt keeps the test readable without a mock framework.
    """

    def __init__(self, evaluations: list[dict]) -> None:
        self.evaluations = list(evaluations)
        self.calls: list[str] = []

    def __call__(self, *, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG002
        if "Draft Analyzer of CITRA Viva" in prompt:
            self.calls.append("analyze")
            return json.dumps(ANALYSIS_PAYLOAD, ensure_ascii=False)
        if "Question Strategy planner" in prompt:
            self.calls.append("strategy")
            return json.dumps(STRATEGY_PAYLOAD, ensure_ascii=False)
        if "reflection stage" in prompt:
            self.calls.append("reflect")
            return json.dumps(REFLECTION_PAYLOAD, ensure_ascii=False)
        self.calls.append("evaluate")
        if not self.evaluations:
            raise AssertionError("The examiner was called more times than scripted.")
        return json.dumps(self.evaluations.pop(0), ensure_ascii=False)


def evaluation(**overrides) -> dict:
    payload = {
        "strength": "strong",
        "decision": "move_on",
        "reasoning": "Menjawab keberatan secara langsung.",
        "criteria_met": ["Mengakui keterbatasan desain."],
        "criteria_missed": [],
        "next_utterance": "Baik. Pertanyaan berikutnya.",
        "gap_note": "",
    }
    payload.update(overrides)
    return payload


def test_session_runs_from_opening_to_completion():
    runner = ScriptedRunner([evaluation(), evaluation()])
    orchestrator = Orchestrator(runner=runner)

    start = orchestrator.start_session(DRAFT, session_id="s1")

    assert start.session_id == "s1"
    assert start.question_id == "Q1"
    assert start.first_question.startswith("Mengapa")

    first = orchestrator.submit_answer("s1", "Saya mengakui desainnya korelasional.")
    assert first.finished is False
    assert first.next_question_id == "Q2"

    second = orchestrator.submit_answer("s1", "Klaim itu saya tarik kembali.")
    assert second.finished is True
    assert second.next_question_id == ""

    state = orchestrator.store.load("s1")
    assert state.status is SessionStatus.COMPLETED
    # Opening, answer, reply, answer, reply.
    assert len(state.transcript) == 5
    assert [t.role for t in state.transcript] == [
        "examiner",
        "student",
        "examiner",
        "student",
        "examiner",
    ]


def test_session_resumes_after_the_process_is_thrown_away():
    """The whole point of writing state on every turn."""
    store = InMemorySessionStore()
    runner = ScriptedRunner([evaluation(), evaluation()])

    first_process = Orchestrator(runner=runner, store=store)
    first_process.start_session(DRAFT, session_id="s2")
    first_process.submit_answer("s2", "Jawaban pertama.")

    del first_process  # the server restarts here

    second_process = Orchestrator(runner=runner, store=store)
    state = second_process.store.load("s2")
    assert state.current_index == 1
    assert state.current_question().id == "Q2"

    result = second_process.submit_answer("s2", "Jawaban kedua setelah restart.")

    assert result.finished is True
    assert len(second_process.store.load("s2").transcript) == 5


def test_press_deeper_keeps_the_session_on_the_same_question():
    runner = ScriptedRunner(
        [
            evaluation(decision="press_deeper", next_utterance="Lalu apa dasarnya?"),
            evaluation(),
            evaluation(),
        ]
    )
    orchestrator = Orchestrator(runner=runner)
    orchestrator.start_session(DRAFT, session_id="s3")

    turn = orchestrator.submit_answer("s3", "Jawaban yang kuat.")

    assert turn.evaluation.decision is ExaminerDecision.PRESS_DEEPER
    assert turn.next_question_id == ""
    state = orchestrator.store.load("s3")
    assert state.current_index == 0
    assert state.progress[0].follow_ups_asked == 1


def test_weak_answer_earns_a_clarification_before_a_gap_is_recorded():
    runner = ScriptedRunner(
        [
            evaluation(
                strength="weak",
                decision="record_gap",
                gap_note="Tidak dipertahankan.",
                next_utterance="Coba jelaskan lagi.",
            ),
            evaluation(
                strength="weak",
                decision="record_gap",
                gap_note="Klaim kausal tetap tidak dipertahankan.",
                next_utterance="Saya catat. Lanjut ke pertanyaan berikutnya.",
            ),
            evaluation(),
        ]
    )
    orchestrator = Orchestrator(runner=runner)
    orchestrator.start_session(DRAFT, session_id="s4")

    first = orchestrator.submit_answer("s4", "Pokoknya signifikan.")
    assert first.evaluation.decision is ExaminerDecision.ASK_CLARIFICATION
    assert first.adjustments, "The override should be reported, not silent."
    assert orchestrator.store.load("s4").progress[0].gap_recorded == ""

    second = orchestrator.submit_answer("s4", "Tetap sama.")
    assert second.evaluation.decision is ExaminerDecision.RECORD_GAP

    state = orchestrator.store.load("s4")
    assert state.progress[0].gap_recorded == "Klaim kausal tetap tidak dipertahankan."
    assert state.current_index == 1


def test_answering_a_finished_session_is_refused():
    runner = ScriptedRunner([evaluation(), evaluation()])
    orchestrator = Orchestrator(runner=runner)
    orchestrator.start_session(DRAFT, session_id="s5")
    orchestrator.submit_answer("s5", "Jawaban pertama.")
    orchestrator.submit_answer("s5", "Jawaban kedua.")

    with pytest.raises(ValueError, match="already finished"):
        orchestrator.submit_answer("s5", "Jawaban ketiga yang tidak diminta.")


def test_unknown_session_is_reported_clearly():
    with pytest.raises(SessionNotFoundError):
        Orchestrator().submit_answer("tidak-ada", "Halo?")


def test_closing_a_session_produces_a_summary_and_patterns():
    runner = ScriptedRunner([evaluation(), evaluation()])
    orchestrator = Orchestrator(runner=runner)
    orchestrator.start_session(DRAFT, session_id="s6")
    orchestrator.submit_answer("s6", "Jawaban pertama.")
    orchestrator.submit_answer("s6", "Jawaban kedua.")

    closing = orchestrator.close_session("s6")

    assert closing.summary.recurring_gap_patterns
    assert closing.summary.closing_remark
    assert orchestrator.store.load("s6").summary is not None
    assert "reflect" in runner.calls


# --------------------------------------------------------------------------- #
# Reflection rules
# --------------------------------------------------------------------------- #


def finished_state(*, gap: str = "", strength: str = "strong") -> SessionState:
    return SessionState(
        session_id="s-reflect",
        language="id",
        questions=[],
        progress=[
            QuestionProgress(
                question_id="Q1",
                final_strength=strength,
                gap_recorded=gap,
                closed=True,
            )
        ],
        transcript=[
            TranscriptTurn(role="examiner", text="Pertanyaan.", question_id="Q1"),
            TranscriptTurn(role="student", text="Jawaban.", question_id="Q1"),
        ],
    )


def test_a_recorded_gap_cannot_disappear_from_the_summary():
    """A summary that quietly drops a gap sends the student in unprepared."""
    gap = "Klaim kausal pada desain korelasional tidak dipertahankan sama sekali."
    payload = dict(REFLECTION_PAYLOAD, remaining_gaps=["Ada beberapa hal kecil."])

    summary, adjustments = reflect_on_session(
        finished_state(gap=gap, strength="weak"),
        runner=lambda **_: json.dumps(payload, ensure_ascii=False),
    )

    assert gap in summary.remaining_gaps
    assert any("was restored" in note for note in adjustments)


def test_a_rephrased_gap_is_accepted_rather_than_duplicated():
    gap = "Klaim kausal pada desain korelasional tidak dipertahankan."
    payload = dict(
        REFLECTION_PAYLOAD,
        remaining_gaps=["Klaim kausal tidak dipertahankan pada desain korelasional."],
    )

    summary, adjustments = reflect_on_session(
        finished_state(gap=gap, strength="weak"),
        runner=lambda **_: json.dumps(payload, ensure_ascii=False),
    )

    assert len(summary.remaining_gaps) == 1
    assert not any("was restored" in note for note in adjustments)


def test_praise_is_dropped_when_nothing_actually_held():
    payload = dict(REFLECTION_PAYLOAD, strong_points=["Presentasinya percaya diri."])

    summary, adjustments = reflect_on_session(
        finished_state(gap="Tidak dipertahankan.", strength="weak"),
        runner=lambda **_: json.dumps(payload, ensure_ascii=False),
    )

    assert summary.strong_points == []
    assert any("no answer in this session was judged strong" in n for n in adjustments)


def test_recurring_patterns_are_trimmed_so_the_list_stays_a_target():
    payload = dict(
        REFLECTION_PAYLOAD,
        recurring_gap_patterns=[f"Pola nomor {i}" for i in range(1, 9)],
    )

    summary, adjustments = reflect_on_session(
        finished_state(),
        runner=lambda **_: json.dumps(payload, ensure_ascii=False),
    )

    assert len(summary.recurring_gap_patterns) == 4
    assert any("trimmed" in note for note in adjustments)


def test_reflection_on_an_empty_transcript_is_refused():
    state = finished_state()
    state.transcript = []

    with pytest.raises(ValueError, match="empty transcript"):
        reflect_on_session(state, runner=lambda **_: "{}")

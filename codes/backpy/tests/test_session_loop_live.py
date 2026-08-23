"""Live test for the full defense loop against the real model.

Skipped by default. Run it before recording a demo:

    CITRA_RUN_LIVE_TESTS=1 uv run pytest tests/test_session_loop_live.py -s

Deliberately short. It answers the first question badly and the second one well,
which is enough to see whether the examiner actually adapts rather than reading
from a script. The full nine-turn run belongs in
`scripts/run_viva_session.py`, not in a test suite.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.models.session import AnswerStrength, ExaminerDecision
from app.orchestrator.orchestrator import Orchestrator

DRAFT = (Path(__file__).parent / "fixtures" / "sample_draft_id.txt").read_text(encoding="utf-8")

EVASIVE_ANSWER = (
    "Penelitian saya penting karena topiknya relevan dengan kondisi mahasiswa "
    "sekarang, dan datanya sudah saya olah dengan aplikasi statistik."
)
SOLID_ANSWER = (
    "Saya mengakui desain potong lintang saya hanya mengukur pada satu titik waktu, "
    "sehingga tidak dapat menegakkan urutan waktu maupun menyingkirkan variabel "
    "pengganggu. Karena itu klaim yang tepat adalah adanya asosiasi negatif, bukan "
    "bahwa media sosial menurunkan prestasi akademik."
)

pytestmark = pytest.mark.skipif(
    os.getenv("CITRA_RUN_LIVE_TESTS") != "1",
    reason="Set CITRA_RUN_LIVE_TESTS=1 to call the real Gemini model.",
)


def test_the_examiner_adapts_to_answer_quality():
    orchestrator = Orchestrator()
    start = orchestrator.start_session(DRAFT, session_id="live-session")

    assert start.first_question.strip()
    print(f"\nEXAMINER: {start.opening_remark}")
    print(f"EXAMINER [{start.question_id}]: {start.first_question}")

    first = orchestrator.submit_answer(start.session_id, EVASIVE_ANSWER)
    print(f"\nSTUDENT (evasive): {EVASIVE_ANSWER}")
    print(f"  judged: {first.evaluation.strength.value} -> {first.evaluation.decision.value}")
    print(f"EXAMINER: {first.examiner_says}")

    # An answer that dodges the question must not be accepted, and it must not be
    # recorded as a gap either: the student has not yet been asked to clarify.
    assert first.evaluation.strength is not AnswerStrength.STRONG
    assert first.evaluation.decision is not ExaminerDecision.RECORD_GAP
    assert first.examiner_says.strip()

    second = orchestrator.submit_answer(start.session_id, SOLID_ANSWER)
    print(f"\nSTUDENT (solid): {SOLID_ANSWER}")
    print(f"  judged: {second.evaluation.strength.value} -> {second.evaluation.decision.value}")
    print(f"EXAMINER: {second.examiner_says}")

    assert second.evaluation.strength in {AnswerStrength.STRONG, AnswerStrength.PARTIAL}
    assert second.examiner_says.strip()

    state = orchestrator.store.load(start.session_id)
    assert len(state.transcript) == 5
    # State is written on every turn, which is what makes a resume possible.
    assert state.updated_at is not None

    for note in first.adjustments + second.adjustments:
        print(f"  rule applied: {note}")


def test_a_finished_session_produces_a_report_with_patterns():
    """Runs the shortest possible complete session, then closes it."""
    orchestrator = Orchestrator()
    start = orchestrator.start_session(DRAFT, session_id="live-closing")

    finished = False
    guard = 0
    while not finished and guard < 20:
        guard += 1
        turn = orchestrator.submit_answer(
            start.session_id, "Saya tidak memiliki tambahan penjelasan untuk poin itu."
        )
        finished = turn.finished

    assert finished, "The session did not reach its end within a sane number of turns."

    closing = orchestrator.close_session(start.session_id)
    summary = closing.summary

    # Nothing was defended, so praise would be flattery and the rule strips it.
    assert summary.strong_points == []
    assert summary.remaining_gaps, "A session of non-answers must leave gaps recorded."
    assert summary.recurring_gap_patterns
    assert len(summary.recurring_gap_patterns) <= 4

    print(f"\nGaps: {len(summary.remaining_gaps)}")
    for gap in summary.remaining_gaps:
        print(f"  - {gap}")
    print("\nPatterns carried forward:")
    for pattern in summary.recurring_gap_patterns:
        print(f"  * {pattern}")
    print(f"\nClosing: {summary.closing_remark}")

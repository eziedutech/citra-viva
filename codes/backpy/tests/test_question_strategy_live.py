"""Live test for the full preparation chain: draft text to examination plan.

Skipped by default. Run it before recording a demo:

    CITRA_RUN_LIVE_TESTS=1 uv run pytest tests/test_question_strategy_live.py -s

This exercises both agents in sequence through the Orchestrator, which is the
path a real session takes.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.orchestrator.orchestrator import Orchestrator

DRAFT = (Path(__file__).parent / "fixtures" / "sample_draft_id.txt").read_text(encoding="utf-8")

pytestmark = pytest.mark.skipif(
    os.getenv("CITRA_RUN_LIVE_TESTS") != "1",
    reason="Set CITRA_RUN_LIVE_TESTS=1 to call the real Gemini model.",
)


def test_preparation_chain_produces_an_anchored_plan():
    preparation = Orchestrator().prepare_session(
        DRAFT,
        recurring_gaps=["generalisasi berlebihan ke populasi yang lebih luas"],
    )

    findings = preparation.analysis.weakness_map.findings
    strategy = preparation.strategy.strategy
    finding_ids = {f.id for f in findings}

    assert findings, "The Draft Analyzer produced no findings to plan against."
    assert 3 <= len(strategy.questions) <= 10, "Question count outside a sane range."
    assert strategy.language == "id"
    assert strategy.opening_remark.strip()

    for question in strategy.questions:
        assert question.question.strip()
        assert question.intent.strip()
        if question.question_type.value not in {"opening", "closing"}:
            assert question.finding_id in finding_ids, (
                f"{question.id} cites {question.finding_id!r}, which is not a finding."
            )

    # A yes/no question ends an exchange instead of forcing a defense. This is a
    # weak proxy for question quality, but it catches the most common failure.
    openers = [q.question.strip().lower().split()[0] for q in strategy.questions]
    banned = {"apakah", "is", "are", "does", "do", "did", "can", "could"}
    assert not (set(openers) & banned), f"Yes/no question detected: {openers}"

    print(f"\nModel: {preparation.strategy.model}")
    print(f"Findings: {len(findings)} | Questions: {len(strategy.questions)}")
    print(f"Dropped questions: {len(preparation.strategy.dropped)}")
    print(f"\nOpening: {strategy.opening_remark}")
    for question in strategy.questions:
        flag = " [RECURRING GAP]" if question.targets_recurring_gap else ""
        anchor = question.finding_id or "-"
        print(f"\n  {question.id} [{question.question_type.value}] anchor={anchor}{flag}")
        print(f"     Q      : {question.question}")
        print(f"     intent : {question.intent}")
        if question.follow_up_if_weak:
            print(f"     if weak: {question.follow_up_if_weak}")
    if strategy.strategy_note:
        print(f"\nStrategy note: {strategy.strategy_note}")
    for reason in preparation.strategy.dropped:
        print(f"  DROPPED {reason}")

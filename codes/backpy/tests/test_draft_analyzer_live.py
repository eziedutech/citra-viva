"""Tests that call the real Gemini model through Agent Platform.

Skipped by default: they need credentials, they cost money, and their output is
not deterministic. Run them when you want to confirm the prompt still produces
sensible findings, for example before recording a demo:

    CITRA_RUN_LIVE_TESTS=1 uv run pytest tests/test_draft_analyzer_live.py -s

Only properties that must always hold are asserted. Demanding specific sentences
from a model would make this test flaky for no benefit.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.agents.draft_analyzer import analyze_draft
from app.models.weakness_map import WeaknessCategory

DRAFT = (Path(__file__).parent / "fixtures" / "sample_draft_id.txt").read_text(encoding="utf-8")

pytestmark = pytest.mark.skipif(
    os.getenv("CITRA_RUN_LIVE_TESTS") != "1",
    reason="Set CITRA_RUN_LIVE_TESTS=1 to call the real Gemini model.",
)


def test_weakness_map_from_the_real_model_is_sensible():
    result = analyze_draft(DRAFT)
    weakness_map = result.weakness_map

    assert weakness_map.language == "id", "An Indonesian draft must be detected as 'id'."
    assert 3 <= len(weakness_map.findings) <= 12, "Finding count outside a sane range."

    for finding in weakness_map.findings:
        assert finding.quote.strip() in DRAFT, "Every quote must exist in the manuscript."
        assert finding.quote_verified
        assert finding.why_weak.strip()
        assert finding.examiner_angle.strip()

    categories = {f.category for f in weakness_map.findings}
    # The sample draft deliberately contains causal language on a correlational
    # design and a leap from one faculty to a national claim. If the model misses
    # both, the prompt is what needs fixing.
    assert categories & {
        WeaknessCategory.CAUSAL_LANGUAGE_NON_EXPERIMENTAL,
        WeaknessCategory.OVERGENERALIZATION,
    }, f"Core categories not detected. Got: {categories}"

    print(f"\nModel: {result.model}")
    print(f"Findings kept: {len(weakness_map.findings)} | dropped: {len(result.dropped)}")
    for finding in weakness_map.findings:
        print(f"  [{finding.severity.value:6}] {finding.id} {finding.category.value}")
        print(f"          quote  : {finding.quote[:90]}")
        print(f"          reason : {finding.why_weak[:90]}")
    for reason in result.dropped:
        print(f"  DROPPED {reason}")

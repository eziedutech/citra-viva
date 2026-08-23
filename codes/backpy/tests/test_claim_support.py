"""Claim-Support Checker tests.

The feature exists to catch a source that is about the right topic but does not
carry the sentence it was cited for. The tests below make sure it cannot commit
that same failure itself: a verdict of support that cannot point at a passage in
the source is not allowed to stand, and neither is a verdict that a citation is
wrong with no question the student can answer.
"""

from __future__ import annotations

import json

import pytest

from app.agents.claim_support import check_claim_support
from app.models.claim_support import CitedSource, SupportVerdict

ABSTRACT = (
    "This cross-sectional survey examined social media use among 1,204 undergraduate "
    "students at four universities in the Netherlands during 2019. Self-reported daily "
    "usage was negatively associated with grade point average (r = -0.18, p < .01). "
    "The design does not permit causal inference, and the sample was limited to "
    "students aged 18 to 24."
)

SOURCE = CitedSource(
    title="Social media use and academic performance among undergraduates",
    authors="Vermeer and Hartono",
    year="2019",
    doi="10.1234/example.2019",
    text=ABSTRACT,
)

CLAIM = "Penggunaan media sosial menurunkan prestasi akademik mahasiswa."


def make_runner(payload: dict):
    def _runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return json.dumps(payload, ensure_ascii=False)

    return _runner


def verdict_payload(**overrides) -> dict:
    payload = {
        "verdict": "partially_supports",
        "reasoning": "Sumber melaporkan asosiasi, bukan penurunan yang bersifat kausal.",
        "source_quote": (
            "Self-reported daily usage was negatively associated with grade point "
            "average (r = -0.18, p < .01)."
        ),
        "scope_mismatch": (
            "Sumber meneliti mahasiswa di Belanda berusia 18 sampai 24 tahun, "
            "sementara klaim ditulis tanpa batasan populasi."
        ),
        "question_for_author": "Apakah klaim Anda dimaksudkan sebagai asosiasi atau sebab-akibat?",
    }
    payload.update(overrides)
    return payload


def test_a_supported_verdict_keeps_its_verified_quote():
    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(verdict_payload()))
    check = result.check

    assert check.verdict is SupportVerdict.PARTIALLY_SUPPORTS
    assert check.quote_verified is True
    assert check.source_quote in ABSTRACT
    assert check.scope_mismatch
    assert result.adjustments == []


def test_support_claimed_with_an_invented_quote_falls_to_cannot_tell():
    """The exact failure this feature exists to catch, committed by the checker."""
    payload = verdict_payload(
        verdict="supports",
        source_quote="The study demonstrates that social media reduces academic performance.",
    )

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.verdict is SupportVerdict.CANNOT_TELL
    assert result.check.source_quote == ""
    assert any("not in the source" in note for note in result.adjustments)
    assert any("point at the passage" in note for note in result.adjustments)


def test_support_claimed_with_no_quote_at_all_falls_to_cannot_tell():
    payload = verdict_payload(verdict="supports", source_quote="")

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.verdict is SupportVerdict.CANNOT_TELL


def test_a_negative_verdict_without_a_question_is_refused():
    """Marking a citation wrong with no way to answer is an accusation."""
    payload = verdict_payload(verdict="does_not_support", question_for_author="")

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.verdict is SupportVerdict.CANNOT_TELL
    assert any("an accusation, not a check" in note for note in result.adjustments)


def test_a_negative_verdict_with_a_question_stands():
    payload = verdict_payload(
        verdict="does_not_support",
        source_quote="",
        question_for_author=(
            "Bagian mana dari sumber ini yang Anda maksud mendukung klaim tersebut?"
        ),
    )

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.verdict is SupportVerdict.DOES_NOT_SUPPORT
    assert result.check.question_for_author
    assert result.adjustments == []


def test_an_unknown_verdict_becomes_cannot_tell():
    """The only option that asserts nothing about the student's citation."""
    payload = verdict_payload(verdict="sangat_meragukan", source_quote="")

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.verdict is SupportVerdict.CANNOT_TELL


def test_a_slightly_misquoted_passage_is_snapped_back_to_the_source():
    payload = verdict_payload(
        source_quote=(
            "self reported daily usage was negatively associated with grade point average"
        )
    )

    result = check_claim_support(CLAIM, SOURCE, runner=make_runner(payload))

    assert result.check.quote_verified is True
    assert result.check.source_quote in ABSTRACT


def test_a_check_with_no_source_text_is_refused():
    """A judgment with nothing to read is a guess about a paper, not a check."""
    empty = CitedSource(title="Some paper", text="   ")

    with pytest.raises(ValueError, match="No source text"):
        check_claim_support(CLAIM, empty, runner=make_runner(verdict_payload()))


def test_a_claim_too_short_to_judge_is_refused():
    with pytest.raises(ValueError, match="too short"):
        check_claim_support("Media sosial.", SOURCE, runner=make_runner(verdict_payload()))


def test_the_prompt_carries_the_source_text_and_the_no_conviction_rule():
    captured = {}

    def capturing_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        captured["prompt"] = prompt
        return json.dumps(verdict_payload())

    check_claim_support(CLAIM, SOURCE, runner=capturing_runner)

    assert "r = -0.18" in captured["prompt"]
    assert "10.1234/example.2019" in captured["prompt"]
    assert "NEVER declare a citation wrong" in captured["prompt"]
    # Outside knowledge about the paper is exactly what makes a check unfalsifiable.
    assert "Judge ONLY from the source text supplied" in captured["prompt"]

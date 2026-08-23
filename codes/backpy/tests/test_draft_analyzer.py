"""Draft Analyzer tests.

What is under test here is our code, not the model provider's weather. The model
is replaced by a fake runner returning responses that are deliberately defective
in specific ways, matching the failure modes that actually occur: invented
quotes, findings with no explanation, categories outside the enum, and
duplicates. What is being measured is whether the validation pipeline stops all
of them.

Tests that call the real Gemini model live in `test_draft_analyzer_live.py` and
are skipped unless explicitly requested.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.agents.draft_analyzer import analyze_draft
from app.models.weakness_map import Severity, WeaknessCategory

FIXTURE = Path(__file__).parent / "fixtures" / "sample_draft_id.txt"
DRAFT = FIXTURE.read_text(encoding="utf-8")


def make_runner(payload: dict):
    """A fake runner: ignore the prompt, return a predetermined JSON response."""

    def _runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return json.dumps(payload, ensure_ascii=False)

    return _runner


BASE_SUMMARY = {
    "research_question": (
        "Bagaimana hubungan intensitas penggunaan media sosial dengan prestasi "
        "akademik mahasiswa Fakultas Ekonomi Universitas Nusantara?"
    ),
    "methodology": "Survei potong lintang, 120 responden, korelasi Pearson dan regresi.",
    "design_type": "correlational",
    "key_findings": ["Korelasi negatif signifikan (r = -0,42; p < 0,05)."],
    "stated_limitations": ["Jumlah sampel relatif kecil."],
}


def test_valid_findings_are_kept_and_marked_verified():
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "coverage_note": "Bab II tidak disertakan dalam teks yang dikirim.",
        "findings": [
            {
                "id": "X9",
                "category": "causal_language_non_experimental",
                "severity": "high",
                "section": "Hasil dan Pembahasan",
                "quote": (
                    "Temuan ini membuktikan bahwa penggunaan media sosial menurunkan "
                    "prestasi akademik mahasiswa."
                ),
                "why_weak": (
                    "Desain survei potong lintang tidak dapat menegakkan urutan waktu "
                    "maupun menyingkirkan variabel pengganggu."
                ),
                "examiner_angle": (
                    "Atas dasar apa Saudara menyimpulkan arah sebab-akibat dari data "
                    "yang dikumpulkan satu kali?"
                ),
            },
            {
                "id": "X10",
                "category": "overgeneralization",
                "severity": "medium",
                "section": "Hasil dan Pembahasan",
                "quote": (
                    "Dengan demikian dapat disimpulkan bahwa media sosial berdampak "
                    "negatif terhadap prestasi akademik seluruh mahasiswa di Indonesia."
                ),
                "why_weak": (
                    "Sampel hanya 120 mahasiswa satu fakultas dengan accidental "
                    "sampling, tidak mewakili mahasiswa Indonesia."
                ),
                "examiner_angle": (
                    "Bagaimana Saudara membenarkan lompatan dari satu fakultas ke tingkat nasional?"
                ),
            },
        ],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))
    weakness_map = result.weakness_map

    assert weakness_map.language == "id"
    assert weakness_map.summary.design_type == "correlational"
    # A section that was never examined must not read as one that came back clean.
    assert weakness_map.coverage_note
    assert len(weakness_map.findings) == 2
    assert result.dropped == []

    for finding in weakness_map.findings:
        assert finding.quote_verified is True
        # The evidence is really in the manuscript, not invented by the model.
        assert finding.quote.strip() in DRAFT
        assert finding.why_weak
        assert finding.examiner_angle

    # Identifiers are renumbered deterministically, ordered by priority.
    assert [f.id for f in weakness_map.findings] == ["W1", "W2"]
    assert weakness_map.findings[0].severity is Severity.HIGH


def test_invented_quote_is_dropped_with_a_recorded_reason():
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "findings": [
            {
                "id": "W1",
                "category": "unsupported_claim",
                "severity": "high",
                "section": "Hasil",
                "quote": (
                    "Seluruh responden menyatakan bahwa mereka kecanduan media sosial "
                    "sejak sekolah menengah pertama."
                ),
                "why_weak": "Klaim tanpa dukungan data.",
                "examiner_angle": "Dari mana angka ini berasal?",
            }
        ],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))

    assert result.weakness_map.findings == []
    assert len(result.dropped) == 1
    assert "quote not found" in result.dropped[0]


def test_findings_without_explanation_or_quote_are_dropped():
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "findings": [
            {
                "id": "W1",
                "category": "unsupported_claim",
                "severity": "medium",
                "section": "Pendahuluan",
                "quote": (
                    "Media sosial jelas merupakan penyebab utama menurunnya kualitas "
                    "pendidikan tinggi di Indonesia saat ini."
                ),
                "why_weak": "   ",
                "examiner_angle": "",
            },
            {
                "id": "W2",
                "category": "unsupported_claim",
                "severity": "medium",
                "section": "Pendahuluan",
                "quote": "",
                "why_weak": "Klaim besar tanpa rujukan.",
                "examiner_angle": "",
            },
        ],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))

    assert result.weakness_map.findings == []
    assert any("why_weak" in reason for reason in result.dropped)
    assert any("no supporting quote" in reason for reason in result.dropped)


def test_unknown_category_and_severity_are_neutralized_not_fatal():
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "findings": [
            {
                "id": "W1",
                "category": "metodologi_kacau",  # outside the enum
                "severity": "sangat_kritis",  # outside the enum
                "section": "Metodologi",
                "quote": (
                    "Sampel berjumlah 120 responden yang dipilih menggunakan teknik "
                    "accidental sampling."
                ),
                "why_weak": "Accidental sampling tidak memungkinkan inferensi ke populasi.",
                "examiner_angle": (
                    "Mengapa memilih accidental sampling untuk pertanyaan penelitian ini?"
                ),
            }
        ],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))
    finding = result.weakness_map.findings[0]

    # The message stays useful; only the label is untrustworthy.
    assert finding.category is WeaknessCategory.OTHER
    # An unknown severity falls to low rather than alarming the author.
    assert finding.severity is Severity.LOW
    assert finding.why_weak


def test_slightly_misquoted_evidence_is_snapped_back_to_the_draft():
    """Models often transcribe a quote with small differences. The finding stays
    valid as long as the quote can be recovered to the original sentence."""
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "findings": [
            {
                "id": "W1",
                "category": "unsupported_claim",
                "severity": "high",
                "section": "Pembahasan",
                "quote": (
                    "Hasil ini sejalan dengan konsensus para ahli pendidikan diseluruh "
                    "dunia yang telah lama menyatakan hal serupa"
                ),
                "why_weak": "Menyebut konsensus global tanpa satu pun rujukan.",
                "examiner_angle": "Konsensus siapa, dan di publikasi mana?",
            }
        ],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))
    finding = result.weakness_map.findings[0]

    assert finding.quote_verified is True
    assert finding.quote.strip() in DRAFT


def test_duplicate_quotes_are_dropped():
    quote = (
        "Temuan ini membuktikan bahwa penggunaan media sosial menurunkan prestasi "
        "akademik mahasiswa."
    )
    entry = {
        "id": "W1",
        "category": "causal_language_non_experimental",
        "severity": "high",
        "section": "Hasil",
        "quote": quote,
        "why_weak": "Bahasa kausal pada desain korelasional.",
        "examiner_angle": "Bagaimana Saudara menyingkirkan variabel pengganggu?",
    }
    payload = {
        "language": "id",
        "summary": BASE_SUMMARY,
        "findings": [entry, dict(entry, id="W2")],
    }

    result = analyze_draft(DRAFT, runner=make_runner(payload))

    assert len(result.weakness_map.findings) == 1
    assert any("duplicate quote" in reason for reason in result.dropped)


def test_short_draft_is_rejected_with_a_clear_message():
    with pytest.raises(ValueError, match="too short"):
        analyze_draft("Judul saja.", runner=make_runner({}))


def test_non_json_model_response_is_rejected():
    def broken_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return "maaf, saya tidak bisa membantu dengan permintaan itu"

    with pytest.raises(ValueError, match="not valid JSON"):
        analyze_draft(DRAFT, runner=broken_runner)


def test_json_wrapped_in_a_code_fence_is_still_parsed():
    payload = {"language": "id", "summary": BASE_SUMMARY, "findings": []}

    def fenced_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        return "```json\n" + json.dumps(payload, ensure_ascii=False) + "\n```"

    result = analyze_draft(DRAFT, runner=fenced_runner)
    assert result.weakness_map.summary.design_type == "correlational"


def test_prompt_carries_the_draft_and_the_no_rewrite_rule():
    captured = {}

    def capturing_runner(*, prompt: str, response_schema) -> str:  # noqa: ANN001, ARG001
        captured["prompt"] = prompt
        return json.dumps({"language": "id", "summary": BASE_SUMMARY, "findings": []})

    analyze_draft(DRAFT, runner=capturing_runner)

    assert "accidental sampling" in captured["prompt"]
    # The rule against rewriting the student's argument has to actually reach the
    # model, not merely be written down in a document.
    assert "NEVER rewrite" in captured["prompt"]

"""Draft Analyzer core logic. Pure Python, testable without a network.

Flow: build the prompt, call the model, parse the JSON, then clean and validate.

The cleaning stage is deliberately strict. Models get things wrong, and a wrong
finding in a practice defense means accusing a student of writing a sentence
they never wrote. Every finding therefore has to survive quote verification
before anything downstream is allowed to use it.
"""

from __future__ import annotations

from pydantic import ValidationError

from app.agents.draft_analyzer.prompt import build_prompt
from app.common.text import (
    candidate_spans,
    normalize_text,
    parse_json_object,
    verify_quote,
)
from app.llm.client import ModelRunner
from app.models.weakness_map import (
    AnalysisResult,
    DraftSummary,
    Severity,
    WeaknessCategory,
    WeaknessFinding,
    WeaknessMap,
)

MIN_DRAFT_CHARS = 200

# Roughly a hundred and thirty pages of dense text, which is more than any
# thesis chapter set a student would submit for one examination, and far below
# what the model's context window would technically accept.
#
# The limit is not about the window. Text of this size makes one analysis cost
# minutes and a great deal of money, and the sitting it produces is worse rather
# than better: an examination drawn from an entire thesis at once spreads itself
# thin. There was no upper bound at all before this, so a pasted 2 MB document
# was accepted, charged for, and then timed out somewhere the student could not
# see.
MAX_DRAFT_CHARS = 400_000
MAX_FINDINGS = 12

_SEVERITY_ORDER = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}


# --------------------------------------------------------------------------- #
# Coercing the model response
# --------------------------------------------------------------------------- #


def _coerce_summary(data: dict) -> DraftSummary:
    raw = data.get("summary") or {}
    if not isinstance(raw, dict):
        raw = {}
    try:
        return DraftSummary.model_validate(raw)
    except ValidationError:
        return DraftSummary(
            research_question=str(raw.get("research_question", "") or ""),
            methodology=str(raw.get("methodology", "") or ""),
            design_type=str(raw.get("design_type", "") or "unclear"),
        )


def _coerce_category(value: object) -> WeaknessCategory:
    """An invented category is neutralized to `other` rather than dropped.

    The message is still useful to an examiner; only the label is untrustworthy.
    """
    try:
        return WeaknessCategory(str(value).strip().lower())
    except ValueError:
        return WeaknessCategory.OTHER


def _coerce_severity(value: object) -> Severity:
    """An unrecognized severity falls to `low`, never rises.

    Alarming an author about something nobody actually asserted is a more
    expensive mistake than under-rating a single finding.
    """
    try:
        return Severity(str(value).strip().lower())
    except ValueError:
        return Severity.LOW


# --------------------------------------------------------------------------- #
# Finding validation
# --------------------------------------------------------------------------- #


def _clean_findings(
    raw_findings: object, draft_text: str
) -> tuple[list[WeaknessFinding], list[str]]:
    findings: list[WeaknessFinding] = []
    dropped: list[str] = []

    if not isinstance(raw_findings, list):
        return findings, ["The model did not return a list of findings."]

    spans = candidate_spans(draft_text)
    seen_quotes: set[str] = set()

    for index, item in enumerate(raw_findings, start=1):
        label = f"finding #{index}"
        if not isinstance(item, dict):
            dropped.append(f"{label}: not an object, dropped.")
            continue

        quote = str(item.get("quote", "") or "").strip()
        why_weak = str(item.get("why_weak", "") or "").strip()

        # A finding with no message is dropped rather than backfilled with
        # placeholder text. Meaningless rows fill the screen and train people to
        # stop reading the list.
        if not why_weak:
            dropped.append(f"{label}: no why_weak explanation, dropped.")
            continue
        if not quote:
            dropped.append(f"{label}: no supporting quote, dropped.")
            continue

        matched = verify_quote(quote, draft_text, spans)
        if matched is None:
            dropped.append(
                f"{label}: quote not found in the draft, dropped (quote: {quote[:60]!r})."
            )
            continue

        dedupe_key = normalize_text(matched)
        if dedupe_key in seen_quotes:
            dropped.append(f"{label}: duplicate quote, dropped.")
            continue
        seen_quotes.add(dedupe_key)

        findings.append(
            WeaknessFinding(
                id=str(item.get("id", "") or f"W{index}"),
                category=_coerce_category(item.get("category")),
                severity=_coerce_severity(item.get("severity")),
                section=str(item.get("section", "") or "").strip(),
                quote=matched,
                why_weak=why_weak,
                examiner_angle=str(item.get("examiner_angle", "") or "").strip(),
                quote_verified=True,
            )
        )

    findings.sort(key=lambda f: _SEVERITY_ORDER[f.severity])
    findings = findings[:MAX_FINDINGS]
    for position, finding in enumerate(findings, start=1):
        finding.id = f"W{position}"

    return findings, dropped


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #


def build_weakness_map(data: dict, draft_text: str, model_name: str = "") -> AnalysisResult:
    """Turn a raw model response into a validated Weakness Map.

    Both callers go through here: `analyze_draft()` on the API path, and the ADK
    wrapper in `adk_agent.py`. One place, so the cleaning rules can never drift
    apart between the two.
    """
    findings, dropped = _clean_findings(data.get("findings"), draft_text)
    language = str(data.get("language", "") or "id").strip().lower()
    if language not in {"id", "en"}:
        language = "id"

    weakness_map = WeaknessMap(
        language=language,
        summary=_coerce_summary(data),
        findings=findings,
        coverage_note=str(data.get("coverage_note", "") or "").strip(),
    )
    return AnalysisResult(weakness_map=weakness_map, dropped=dropped, model=model_name)


def analyze_draft(draft_text: str, runner: ModelRunner | None = None) -> AnalysisResult:
    """Produce a Weakness Map from research draft text.

    `runner` can be injected for testing. When omitted, the real Gemini model on
    Agent Platform is used.
    """
    if not draft_text or len(draft_text.strip()) < MIN_DRAFT_CHARS:
        raise ValueError(
            f"Draft text is too short to analyze (minimum {MIN_DRAFT_CHARS} characters)."
        )

    if len(draft_text) > MAX_DRAFT_CHARS:
        raise ValueError(
            f"This draft is {len(draft_text):,} characters, and the limit is "
            f"{MAX_DRAFT_CHARS:,}. Submit the chapters you want examined, usually "
            "the introduction, methodology, and findings. A whole thesis at once "
            "produces a thinner examination, not a deeper one."
        )

    model_name = ""
    if runner is None:
        from app.llm.client import GeminiRunner

        gemini = GeminiRunner()
        model_name = gemini.model
        runner = gemini

    raw = runner(prompt=build_prompt(draft_text), response_schema=WeaknessMap)
    return build_weakness_map(parse_json_object(raw), draft_text, model_name)

"""Text utilities shared by the agents.

These live outside `agents/` on purpose. Two agents needing the same helper is
not a reason for one agent to import from another: that would create exactly the
coupling the architecture forbids. Shared mechanics belong in a shared module,
and agent packages stay independent of each other.
"""

from __future__ import annotations

import json
import re
import unicodedata
from difflib import SequenceMatcher

# How close a quote must be to a passage before it counts as the same sentence.
QUOTE_MATCH_THRESHOLD = 0.85
# Shorter than this, a "quote" matches too much to prove anything.
MIN_QUOTE_CHARS = 20


def normalize_text(text: str) -> str:
    """Flatten cosmetic differences so they cannot break text matching.

    Unicode form, curly quotes, dashes, runs of whitespace, and case are all
    levelled. The result is for comparison only and is never shown to a user.
    """
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("‘", "'").replace("’", "'")  # curly single quotes
    text = text.replace("“", '"').replace("”", '"')  # curly double quotes
    text = text.replace("–", "-").replace("—", "-")  # en dash, em dash
    text = re.sub(r"\s+", " ", text)
    return text.strip().casefold()


def strip_code_fence(raw: str) -> str:
    """Remove a markdown code fence a model wrapped its JSON in."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def parse_json_object(raw: str) -> dict:
    """Parse a model response into a JSON object.

    Falls back to recovering the outermost braces when a model wraps its JSON in
    prose. Raises ValueError with a readable message when nothing can be
    recovered, so a refusal or a truncated response does not surface as an
    opaque JSONDecodeError.
    """
    text = strip_code_fence(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"Model response is not valid JSON: {exc}") from exc
        data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("Model response is not a JSON object.")
    return data


def candidate_spans(source_text: str) -> list[str]:
    """Split text into sentences, plus every consecutive sentence pair.

    Pairs are included because a legitimate quote may run two sentences long.
    """
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", source_text) if s.strip()]
    spans = list(sentences)
    spans += [f"{a} {b}" for a, b in zip(sentences, sentences[1:], strict=False)]
    return spans


def verify_quote(quote: str, source_text: str, spans: list[str] | None = None) -> str | None:
    """Return the original text matching `quote`, or None if there is none.

    A matching quote is snapped back to the source's own wording, so small
    transcription differences from a model do not break traceability.

    Used wherever a claim has to point at evidence: findings against the
    student's manuscript, and support judgments against a cited source. The
    rule is the same in both places, so it lives in one.
    """
    spans = spans if spans is not None else candidate_spans(source_text)

    norm_quote = normalize_text(quote)
    if len(norm_quote) < MIN_QUOTE_CHARS:
        return None

    if norm_quote in normalize_text(source_text):
        for span in spans:
            if norm_quote in normalize_text(span):
                return span
        return quote

    best_span, best_ratio = None, 0.0
    for span in spans:
        ratio = SequenceMatcher(None, norm_quote, normalize_text(span)).ratio()
        if ratio > best_ratio:
            best_span, best_ratio = span, ratio
    if best_span is not None and best_ratio >= QUOTE_MATCH_THRESHOLD:
        return best_span
    return None

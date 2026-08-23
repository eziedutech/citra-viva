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

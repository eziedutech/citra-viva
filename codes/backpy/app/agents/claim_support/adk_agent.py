"""ADK wrapper for the Claim-Support Checker."""

from __future__ import annotations

from typing import Any

from app.agents.claim_support.core import build_check
from app.agents.claim_support.prompt import SYSTEM_INSTRUCTION
from app.common.text import parse_json_object
from app.config import get_settings
from app.models.claim_support import CitedSource, ClaimSupportCheck, ClaimSupportResult

AGENT_NAME = "claim_support_checker"
OUTPUT_KEY = "claim_support_raw"


def build_claim_support_agent(model: str | None = None) -> Any:
    """Build the ADK `LlmAgent` for the Claim-Support Checker."""
    from google.adk.agents import LlmAgent

    settings = get_settings()
    return LlmAgent(
        name=AGENT_NAME,
        model=model or settings.gemini_model,
        description=(
            "Judges whether a cited source carries the specific claim it was "
            "cited for, rather than merely sharing its topic."
        ),
        instruction=SYSTEM_INSTRUCTION,
        output_schema=ClaimSupportCheck,
        output_key=OUTPUT_KEY,
        disallow_transfer_to_parent=True,
        disallow_transfer_to_peers=True,
    )


def finalize_agent_output(state: dict, source: CitedSource) -> ClaimSupportResult:
    """Read the raw output from ADK session state, then validate it.

    Quote verification runs here too. A judgment that cannot point at the
    passage it rests on is unusable whichever path produced it.
    """
    raw = state.get(OUTPUT_KEY)
    if raw is None:
        raise ValueError(
            f"ADK state does not contain '{OUTPUT_KEY}'. The agent has not run, "
            "or the output key changed."
        )
    if isinstance(raw, ClaimSupportCheck):
        data = raw.model_dump(mode="json")
    elif isinstance(raw, str):
        data = parse_json_object(raw)
    else:
        data = dict(raw)

    settings = get_settings()
    return build_check(data, source, settings.gemini_model)

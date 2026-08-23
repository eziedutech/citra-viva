"""ADK wrapper for the Session Reflection Agent."""

from __future__ import annotations

from typing import Any

from app.agents.session_reflection.core import build_summary
from app.agents.session_reflection.prompt import SYSTEM_INSTRUCTION
from app.common.text import parse_json_object
from app.config import get_settings
from app.models.session import SessionState, SessionSummary

AGENT_NAME = "session_reflection"
OUTPUT_KEY = "session_summary_raw"


def build_session_reflection_agent(model: str | None = None) -> Any:
    """Build the ADK `LlmAgent` for the Session Reflection Agent."""
    from google.adk.agents import LlmAgent

    settings = get_settings()
    return LlmAgent(
        name=AGENT_NAME,
        model=model or settings.gemini_model,
        description=(
            "Reads a finished defense transcript and writes what held, what is "
            "still undefended, and the recurring habits behind the gaps."
        ),
        instruction=SYSTEM_INSTRUCTION,
        output_schema=SessionSummary,
        output_key=OUTPUT_KEY,
        disallow_transfer_to_parent=True,
        disallow_transfer_to_peers=True,
    )


def finalize_agent_output(
    state_dict: dict, session: SessionState
) -> tuple[SessionSummary, list[str]]:
    """Read the agent's raw output from ADK session state, then reconcile it.

    Gap reconciliation runs here too. A summary that quietly drops a recorded gap
    is wrong regardless of which path produced it.
    """
    raw = state_dict.get(OUTPUT_KEY)
    if raw is None:
        raise ValueError(
            f"ADK state does not contain '{OUTPUT_KEY}'. The agent has not run, "
            "or the output key changed."
        )
    if isinstance(raw, SessionSummary):
        data = raw.model_dump(mode="json")
    elif isinstance(raw, str):
        data = parse_json_object(raw)
    else:
        data = dict(raw)

    return build_summary(data, session)

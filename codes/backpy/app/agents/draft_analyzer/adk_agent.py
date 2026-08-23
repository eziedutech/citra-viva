"""ADK wrapper for the Draft Analyzer.

This layer is deliberately thin. All reasoning about what counts as a weakness
lives in `prompt.py`, and all validation lives in `core.py`. What this file does
is register the Draft Analyzer as a first-class ADK sub-agent, so the
Orchestrator reaches it through the framework rather than through a direct
module import.

ADK is imported inside the functions rather than at module scope, so the Draft
Analyzer unit tests still run without `google-cloud-aiplatform[adk]` installed.
Install it with `uv sync --extra adk`.
"""

from __future__ import annotations

from typing import Any

from app.agents.draft_analyzer.core import build_weakness_map
from app.agents.draft_analyzer.prompt import SYSTEM_INSTRUCTION
from app.common.text import parse_json_object
from app.config import get_settings
from app.models.weakness_map import AnalysisResult, WeaknessMap

AGENT_NAME = "draft_analyzer"
OUTPUT_KEY = "weakness_map_raw"


def build_draft_analyzer_agent(model: str | None = None) -> Any:
    """Build the ADK `LlmAgent` for the Draft Analyzer.

    Transfer to both parent and peers is disabled explicitly. This enforces the
    separation of concerns at the framework level: the Draft Analyzer cannot
    hand control to the Examiner Session Agent or any other sub-agent. Its only
    way out is back to the Orchestrator, carrying state.
    """
    from google.adk.agents import LlmAgent

    settings = get_settings()
    return LlmAgent(
        name=AGENT_NAME,
        model=model or settings.gemini_model,
        description=(
            "Reads a research draft and produces a Weakness Map: the weakest "
            "points in the argument that an examiner will attack."
        ),
        instruction=SYSTEM_INSTRUCTION,
        output_schema=WeaknessMap,
        output_key=OUTPUT_KEY,
        disallow_transfer_to_parent=True,
        disallow_transfer_to_peers=True,
    )


def finalize_agent_output(state: dict, draft_text: str) -> AnalysisResult:
    """Read the agent's raw output from ADK session state, then validate it.

    Output bound to an `output_schema` is well shaped, but well shaped is not the
    same as honest: a quote may still not exist in the draft. Quote verification
    in `core.build_weakness_map` remains mandatory before the result is used.
    """
    raw = state.get(OUTPUT_KEY)
    if raw is None:
        raise ValueError(
            f"ADK state does not contain '{OUTPUT_KEY}'. The agent has not run, "
            "or the output key changed."
        )
    if isinstance(raw, WeaknessMap):
        data = raw.model_dump(mode="json")
    elif isinstance(raw, str):
        data = parse_json_object(raw)
    else:
        data = dict(raw)

    settings = get_settings()
    return build_weakness_map(data, draft_text, settings.gemini_model)

"""ADK wrapper for the Question Strategy Agent.

Same shape as the Draft Analyzer's wrapper, and for the same reason: the
Orchestrator reaches this agent through the framework, and the agent cannot
reach anything else.
"""

from __future__ import annotations

from typing import Any

from app.agents.question_strategy.core import build_strategy
from app.agents.question_strategy.prompt import SYSTEM_INSTRUCTION
from app.common.text import parse_json_object
from app.config import get_settings
from app.models.question_strategy import QuestionStrategy, StrategyResult
from app.models.weakness_map import WeaknessMap

AGENT_NAME = "question_strategy"
OUTPUT_KEY = "question_strategy_raw"


def build_question_strategy_agent(model: str | None = None) -> Any:
    """Build the ADK `LlmAgent` for the Question Strategy Agent.

    Transfer to parent and peers is disabled. This agent plans an examination and
    hands the plan back to the Orchestrator. It never starts the examination
    itself, because running the session belongs to a different agent with a
    different responsibility.
    """
    from google.adk.agents import LlmAgent

    settings = get_settings()
    return LlmAgent(
        name=AGENT_NAME,
        model=model or settings.gemini_model,
        description=(
            "Turns a Weakness Map into an ordered interrogation plan, prioritizing "
            "the weaknesses a student failed to fix in earlier sessions."
        ),
        instruction=SYSTEM_INSTRUCTION,
        output_schema=QuestionStrategy,
        output_key=OUTPUT_KEY,
        disallow_transfer_to_parent=True,
        disallow_transfer_to_peers=True,
    )


def finalize_agent_output(
    state: dict,
    weakness_map: WeaknessMap,
    recurring_gaps: list[str] | None = None,
) -> StrategyResult:
    """Read the agent's raw output from ADK session state, then validate it.

    An `output_schema` guarantees shape, not truthfulness. A question can still
    cite a finding that does not exist, so anchor validation in
    `core.build_strategy` still has to run.
    """
    raw = state.get(OUTPUT_KEY)
    if raw is None:
        raise ValueError(
            f"ADK state does not contain '{OUTPUT_KEY}'. The agent has not run, "
            "or the output key changed."
        )
    if isinstance(raw, QuestionStrategy):
        data = raw.model_dump(mode="json")
    elif isinstance(raw, str):
        data = parse_json_object(raw)
    else:
        data = dict(raw)

    settings = get_settings()
    return build_strategy(data, weakness_map, recurring_gaps, settings.gemini_model)

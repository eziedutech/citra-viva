"""ADK wrapper for the Examiner Session Agent.

Same shape as the other two wrappers. Note what is NOT here: the session loop.
An ADK agent that owned the loop would keep the conversation in framework
memory, and a session interrupted mid-defense would be lost. The loop lives in
the Orchestrator with state in Firestore, and this agent judges one turn at a
time.
"""

from __future__ import annotations

from typing import Any

from app.agents.examiner_session.core import build_evaluation
from app.agents.examiner_session.prompt import SYSTEM_INSTRUCTION
from app.common.text import parse_json_object
from app.config import get_settings
from app.models.session import AnswerEvaluation, QuestionProgress

AGENT_NAME = "examiner_session"
OUTPUT_KEY = "answer_evaluation_raw"


def build_examiner_session_agent(model: str | None = None) -> Any:
    """Build the ADK `LlmAgent` for the Examiner Session Agent."""
    from google.adk.agents import LlmAgent

    settings = get_settings()
    return LlmAgent(
        name=AGENT_NAME,
        model=model or settings.gemini_model,
        description=(
            "Judges a student's answer against the question that was asked and "
            "decides whether to press deeper, ask for clarification, move on, or "
            "record the point as undefended."
        ),
        instruction=SYSTEM_INSTRUCTION,
        output_schema=AnswerEvaluation,
        output_key=OUTPUT_KEY,
        disallow_transfer_to_parent=True,
        disallow_transfer_to_peers=True,
    )


def finalize_agent_output(
    state: dict, progress: QuestionProgress
) -> tuple[AnswerEvaluation, list[str]]:
    """Read the agent's raw output from ADK session state, then apply the rules.

    The session rules are enforced here too, not only on the direct path. An
    agent that decided to record a gap before offering a clarification must be
    overruled regardless of which route its answer travelled.
    """
    raw = state.get(OUTPUT_KEY)
    if raw is None:
        raise ValueError(
            f"ADK state does not contain '{OUTPUT_KEY}'. The agent has not run, "
            "or the output key changed."
        )
    if isinstance(raw, AnswerEvaluation):
        data = raw.model_dump(mode="json")
    elif isinstance(raw, str):
        data = parse_json_object(raw)
    else:
        data = dict(raw)

    return build_evaluation(data, progress)

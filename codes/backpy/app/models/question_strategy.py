"""Question Strategy schema, the output of the Question Strategy Agent.

The strategy is a plan for an interrogation, not a script for a conversation.
Every planned question is anchored to a finding in the Weakness Map, for the
same reason every finding is anchored to a quote: a question that traces to
nothing cannot be justified to the student afterwards.

One field needs care. `evaluation_criteria` describes what the Examiner Session
Agent should listen for when judging an answer. It is a rubric, never a model
answer, and it is never shown to the student. Phrase it as what to check for,
not as the defense itself.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class QuestionType(StrEnum):
    """What a question is doing in the session, not what it is about."""

    OPENING = "opening"
    PROBE = "probe"
    METHODOLOGICAL = "methodological"
    CLOSING = "closing"


class PlannedQuestion(BaseModel):
    """One question the examiner intends to ask."""

    id: str = Field(description="Short stable identifier, for example Q1, Q2.")
    finding_id: str = Field(
        description=(
            "The Weakness Map finding this question attacks, for example W1. "
            "Empty only for an opening question."
        )
    )
    question_type: QuestionType
    question: str = Field(
        description=(
            "The question as the examiner would say it out loud, in the language "
            "of the draft. Direct and specific, never a template."
        )
    )
    intent: str = Field(
        description="What this question is testing. Internal, never shown to the student."
    )
    evaluation_criteria: str = Field(
        default="",
        description=(
            "What the Examiner Session Agent should listen for to judge the answer. "
            "A rubric of things to check, never a model answer. Internal only."
        ),
    )
    follow_up_if_weak: str = Field(
        default="",
        description=(
            "The harder question to ask if the answer does not hold up. Prepared in "
            "advance so the examiner can press without stalling."
        ),
    )
    targets_recurring_gap: bool = Field(
        default=False,
        description=(
            "True when this question attacks a weakness the student failed to fix "
            "in an earlier session. Whether a question addresses a previously "
            "recorded gap is a semantic judgment that cannot be proven from the "
            "text, so the model may assert it and a lexical check offers a second "
            "route to the same conclusion. With no prior gaps supplied it is "
            "always False. It only affects question ordering."
        ),
    )


class QuestionStrategy(BaseModel):
    """The full interrogation plan for one session."""

    language: str = Field(description="Language of the questions, 'id' or 'en'.")
    opening_remark: str = Field(
        default="",
        description=(
            "How the examiner opens the session. Sets a formal, skeptical tone "
            "without previewing the attack."
        ),
    )
    questions: list[PlannedQuestion] = Field(default_factory=list)
    strategy_note: str = Field(
        default="",
        description=(
            "Why the questions are ordered this way. Read by a human reviewing the "
            "plan, and by the Session Reflection Agent afterwards."
        ),
    )


class StrategyResult(BaseModel):
    """The strategy plus an audit trail of what validation rejected."""

    strategy: QuestionStrategy
    dropped: list[str] = Field(
        default_factory=list,
        description="One reason per question that validation rejected.",
    )
    model: str = ""

"""Weakness Map schema, the structured output of the Draft Analyzer Agent.

Two design constraints are binding here.

First, there is no binary pass/fail verdict and no overall quality score for the
research. There are only individual findings, and every one of them must carry a
verbatim quote from the draft so it can be traced back to the manuscript.
Findings without traceable evidence are discarded.

Second, the agent never rewrites the student's argument. That is why this schema
has no "suggested fix" and no "replacement sentence" field. It carries the
reason a point is weak and the angle an examiner would attack from, and nothing
the student could paste into their defense.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class WeaknessCategory(StrEnum):
    """The four categories from the product spec, plus a safety net.

    Categories the model invents outside this list are neutralized to `other`
    rather than dropped. The message is still useful to an examiner; only the
    label is untrustworthy.
    """

    UNSUPPORTED_CLAIM = "unsupported_claim"
    CAUSAL_LANGUAGE_NON_EXPERIMENTAL = "causal_language_non_experimental"
    OVERGENERALIZATION = "overgeneralization"
    UNADDRESSED_LIMITATION = "unaddressed_limitation"
    OTHER = "other"


class Severity(StrEnum):
    """How hard an examiner is likely to press on this point.

    This is not a judgment of research quality. It is the ordering signal the
    Question Strategy Agent uses to decide what to ask first.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DraftSummary(BaseModel):
    """A synthesis of the draft, not a copy of it."""

    research_question: str = Field(
        description="The main research question as understood from the draft."
    )
    methodology: str = Field(description="The methodology the author states, condensed.")
    design_type: str = Field(
        description=(
            "Research design: experimental | quasi_experimental | correlational | "
            "survey | qualitative | mixed_methods | unclear"
        )
    )
    key_findings: list[str] = Field(
        default_factory=list, description="The main findings or claims the author states."
    )
    stated_limitations: list[str] = Field(
        default_factory=list,
        description="Limitations the author already acknowledges explicitly.",
    )


class WeaknessFinding(BaseModel):
    """One argumentative weak point an examiner is likely to attack."""

    id: str = Field(description="Short stable identifier, for example W1, W2, W3.")
    category: WeaknessCategory
    severity: Severity
    section: str = Field(description="Where in the draft the finding sits, for example 'Results'.")
    quote: str = Field(
        description=(
            "A VERBATIM quote from the draft, one or two sentences, copied exactly. "
            "This is the evidence that makes the finding traceable."
        )
    )
    why_weak: str = Field(
        description=(
            "Why an examiner would challenge this passage. Explains the problem, "
            "never supplies an answer or a fix."
        )
    )
    examiner_angle: str = Field(
        description=(
            "The examiner's line of attack in one sentence: what the student will "
            "be required to defend. Raw material for the Question Strategy Agent, "
            "not an answer the student could reuse."
        )
    )
    quote_verified: bool = Field(
        default=False,
        description=(
            "Set by our code, not by the model: True when `quote` was actually "
            "located in the draft text."
        ),
    )


class WeaknessMap(BaseModel):
    """The complete output of the Draft Analyzer Agent."""

    language: str = Field(
        description="Language of the draft, 'id' or 'en'. Findings are written in it."
    )
    summary: DraftSummary
    findings: list[WeaknessFinding] = Field(default_factory=list)
    coverage_note: str = Field(
        default="",
        description=(
            "Parts of the draft that could not be assessed because they were not "
            "present in the submitted text. A section that was never examined must "
            "not read as a section that came back clean."
        ),
    )


class AnalysisResult(BaseModel):
    """The Weakness Map plus an audit trail of what validation rejected.

    `dropped` is deliberately kept rather than silently discarded. An auditable
    system has to be able to explain what the model said and we refused.
    """

    weakness_map: WeaknessMap
    dropped: list[str] = Field(
        default_factory=list,
        description="One reason per finding that validation rejected.",
    )
    model: str = ""

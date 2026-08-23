"""Claim-Support schema: does this source actually support this claim?

The disclosure that matters, restated here because it shapes the design.
Mechanical citation verification, matching a DOI against Crossref or OpenAlex,
belongs to a separate project and is deliberately out of scope. It answers a
different question anyway: whether the source exists, and whether the metadata
is real.

What this adds is the question a supervisor actually asks. The source exists.
The DOI resolves. But does it support the specific sentence it was cited for,
or is it merely about the same topic? Topical relevance passes every mechanical
check ever written, and it is the most common way a citation misleads.

The rule that keeps this honest is the same one the Draft Analyzer follows: a
judgment must point at the passage it rests on, verbatim, and that passage is
verified against the source before the judgment is allowed to stand.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class SupportVerdict(StrEnum):
    """How well the source carries the specific claim."""

    SUPPORTS = "supports"
    PARTIALLY_SUPPORTS = "partially_supports"
    DOES_NOT_SUPPORT = "does_not_support"
    UNRELATED = "unrelated"
    # Reached when the source text on hand is not enough to judge, and when a
    # judgment fails validation. Saying so is a legitimate answer here, and a
    # far better one than a confident verdict nobody can trace.
    CANNOT_TELL = "cannot_tell"


class CitedSource(BaseModel):
    """The source as the student cited it, with whatever text is available."""

    title: str = ""
    authors: str = ""
    year: str = ""
    doi: str = ""
    text: str = Field(
        description=(
            "Abstract or excerpt of the source. This is the only evidence the "
            "judgment may rest on, and the only text a quote can be verified "
            "against."
        )
    )


class ClaimSupportCheck(BaseModel):
    """One judgment: this claim, against this source."""

    verdict: SupportVerdict
    reasoning: str = Field(
        description=(
            "Why the source does or does not carry this specific claim, in the "
            "language of the claim."
        )
    )
    source_quote: str = Field(
        default="",
        description=(
            "The passage from the source the judgment rests on, copied verbatim. "
            "Required for any verdict that the source supports the claim."
        ),
    )
    scope_mismatch: str = Field(
        default="",
        description=(
            "Where the source's population, setting, period, or measure differs "
            "from what the claim asserts. Empty when they match."
        ),
    )
    question_for_author: str = Field(
        default="",
        description=(
            "What to ask the student, rather than marking their citation wrong. "
            "Required for any negative verdict."
        ),
    )
    quote_verified: bool = Field(
        default=False,
        description="Set by our code, not the model: the quote was found in the source.",
    )


class ClaimSupportResult(BaseModel):
    """The judgment plus an audit trail of what validation changed."""

    check: ClaimSupportCheck
    adjustments: list[str] = Field(
        default_factory=list,
        description="Verdicts our code overruled, and why.",
    )
    model: str = ""

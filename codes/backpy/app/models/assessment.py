"""The shape of a session assessment.

Data only. The arithmetic that fills it lives in `app.scoring`, and it is
separated so that a session can carry its own assessment without the models
package having to import the scoring package that imports it back.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# The scale, as used by Indonesian universities and many others.
MAXIMUM = 4.0


class QuestionScore(BaseModel):
    """One question's contribution, with the arithmetic left visible."""

    question_id: str
    question: str = Field(description="The question as it was asked.")
    weight: float = Field(description="From the severity of the finding behind it.")
    base: float = Field(description="Points for how the answer was judged.")
    deductions: list[str] = Field(
        default_factory=list,
        description="Each one names what was recorded and what it cost.",
    )
    points: float = Field(description="What this question finally scored, out of 4.")
    strength: str = Field(default="", description="The examiner's judgement, verbatim.")


class Advice(BaseModel):
    """One thing to work on, named by what the record shows.

    A code and a number rather than a sentence, because the sentence has to be
    written in the language the student is reading the interface in, and this
    layer has no business deciding that. Everything here is derived from what
    the examiner recorded, so there is no advice that cannot be traced back to
    a specific turn.
    """

    code: str = Field(description="What was observed. The interface names it.")
    count: int = Field(default=0, description="How many questions it applied to.")
    question_id: str = Field(default="", description="Set when it points at one.")


class SessionAssessment(BaseModel):
    """The indicator, and everything needed to check it."""

    score: float = Field(description="0.00 to 4.00, weighted across the questions.")
    maximum: float = MAXIMUM
    questions_scored: int
    questions_unanswered: int = Field(
        description="Questions the session never reached. They are left out rather "
        "than counted as zero, because a defense that ended early was not failed."
    )
    breakdown: list[QuestionScore] = Field(default_factory=list)
    advice: list[Advice] = Field(
        default_factory=list,
        description="What to work on, strongest signal first. Empty when the "
        "defense held throughout.",
    )

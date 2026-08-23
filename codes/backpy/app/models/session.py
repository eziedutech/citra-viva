"""Session models: the state of a defense in progress, and how it is evaluated.

A defense session must survive a restart. Everything needed to resume sits in
`SessionState`, including how many follow-ups and clarifications each question
has already consumed. A dropped connection therefore costs the student their
place in the conversation, not their progress.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.question_strategy import PlannedQuestion


class SessionStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class AnswerStrength(StrEnum):
    """How well an answer held up, judged against the question's own rubric.

    This is not a grade for the student. It is the signal the examiner uses to
    decide what to do next.
    """

    STRONG = "strong"
    PARTIAL = "partial"
    WEAK = "weak"
    EVASIVE = "evasive"


class ExaminerDecision(StrEnum):
    """What the examiner does after hearing an answer."""

    PRESS_DEEPER = "press_deeper"
    ASK_CLARIFICATION = "ask_clarification"
    MOVE_ON = "move_on"
    RECORD_GAP = "record_gap"


class AnswerEvaluation(BaseModel):
    """The examiner's read on one answer, and what happens next."""

    strength: AnswerStrength
    decision: ExaminerDecision
    reasoning: str = Field(
        description=(
            "Why the answer earned this strength, referring to what the student "
            "actually said. Internal, never shown during the session."
        )
    )
    criteria_met: list[str] = Field(
        default_factory=list,
        description="Points from the question's rubric the answer satisfied.",
    )
    criteria_missed: list[str] = Field(
        default_factory=list,
        description="Points from the question's rubric the answer left untouched.",
    )
    next_utterance: str = Field(
        description=(
            "What the examiner says next: the harder follow-up, the request for "
            "clarification, or the transition to the next topic. This is the only "
            "field the student hears."
        )
    )
    gap_note: str = Field(
        default="",
        description=(
            "One line recording what remains undefended, written only when the "
            "examiner gives up on this question. Describes the gap, never how to "
            "fix it."
        ),
    )


class TranscriptTurn(BaseModel):
    """One utterance in the session transcript."""

    role: str = Field(description="'examiner' or 'student'.")
    text: str
    question_id: str = ""
    timestamp: datetime | None = None
    evaluated_strength: str = ""
    decision: str = ""


class QuestionProgress(BaseModel):
    """How far the examination of one planned question has gone.

    `clarifications_offered` is what makes the fairness rule enforceable: a
    weakness cannot be recorded against a student who was never given a chance
    to clarify it.
    """

    question_id: str
    follow_ups_asked: int = 0
    clarifications_offered: int = 0
    final_strength: str = ""
    gap_recorded: str = ""
    closed: bool = False


class SessionSummary(BaseModel):
    strong_points: list[str] = Field(default_factory=list)
    remaining_gaps: list[str] = Field(default_factory=list)
    recurring_gap_patterns: list[str] = Field(default_factory=list)
    closing_remark: str = ""


class SessionState(BaseModel):
    """Everything needed to resume a session from cold storage."""

    session_id: str
    user_id: str = ""
    draft_id: str = ""
    status: SessionStatus = SessionStatus.IN_PROGRESS
    language: str = "id"
    opening_remark: str = ""
    questions: list[PlannedQuestion] = Field(default_factory=list)
    progress: list[QuestionProgress] = Field(default_factory=list)
    current_index: int = 0
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    summary: SessionSummary | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def current_question(self) -> PlannedQuestion | None:
        if 0 <= self.current_index < len(self.questions):
            return self.questions[self.current_index]
        return None

    def current_progress(self) -> QuestionProgress | None:
        if 0 <= self.current_index < len(self.progress):
            return self.progress[self.current_index]
        return None

    def is_finished(self) -> bool:
        return self.current_index >= len(self.questions)


class SessionTurnResult(BaseModel):
    """What the caller gets back after submitting one answer."""

    session_id: str
    examiner_says: str
    evaluation: AnswerEvaluation
    question_id: str = Field(description="The question the answer was judged against.")
    next_question_id: str = Field(
        default="", description="Empty when the examiner is still on the same question."
    )
    finished: bool = False
    adjustments: list[str] = Field(
        default_factory=list,
        description="Decisions our code overrode, and why. Part of the audit trail.",
    )

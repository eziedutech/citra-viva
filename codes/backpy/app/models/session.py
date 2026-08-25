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

from app.models.assessment import SessionAssessment
from app.models.question_strategy import PlannedQuestion
from app.models.weakness_map import WeaknessFinding


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

    # Carried on the turn so a finished session can show how each answer was
    # judged, not only the most recent one. Both default to empty, so sessions
    # recorded before this existed still load and simply show less.
    #
    # `reasoning` is deliberately not among them. It is written for the
    # examiner rather than the student, and this project keeps it that way.
    criteria_met: list[str] = Field(default_factory=list)
    criteria_missed: list[str] = Field(default_factory=list)

    # How much of a student's answer arrived by paste rather than by typing.
    #
    # Recorded, never blocked, and never scored. Blocking is unenforceable and
    # would stop the legitimate case, which is quoting your own manuscript to
    # defend a point. Scoring it would punish that same case. What it is worth
    # is telling somebody, at the end, how much of their practice was written
    # somewhere else, because in the room they will not be able to paste.
    pasted_characters: int = 0


class QuestionProgress(BaseModel):
    """How far the examination of one planned question has gone.

    `clarifications_offered` is what makes the fairness rule enforceable: a
    weakness cannot be recorded against a student who was never given a chance
    to clarify it.
    """

    question_id: str
    follow_ups_asked: int = 0
    clarifications_offered: int = 0
    rubric_revealed: bool = Field(
        default=False,
        description=(
            "Whether the student asked to see what this question was testing. "
            "Recorded rather than hidden: the help is allowed, and pretending "
            "it was not taken is what would make the session report a lie."
        ),
    )
    final_strength: str = ""
    gap_recorded: str = ""
    defended_points: list[str] = Field(
        default_factory=list,
        description=(
            "Rubric points the examiner judged satisfied when this question "
            "closed. The mirror image of `gap_recorded`, and the reason a "
            "successful defense cannot silently vanish from the summary either."
        ),
    )
    closed: bool = False


class SessionSummary(BaseModel):
    strong_points: list[str] = Field(default_factory=list)
    remaining_gaps: list[str] = Field(default_factory=list)
    recurring_gap_patterns: list[str] = Field(default_factory=list)
    closing_remark: str = ""
    rubric_revealed_for: list[str] = Field(
        default_factory=list,
        description=(
            "Questions where the student opened the marking criteria before "
            "answering. Filled from the session record by code, never by the "
            "model, so it cannot be flattered away."
        ),
    )
    assessment: SessionAssessment | None = Field(
        default=None,
        description=(
            "The 4.00 indicator, computed from this transcript. Optional "
            "because sessions closed before scoring existed do not carry one, "
            "and a missing score is not a score of zero."
        ),
    )


class QuestionRubric(BaseModel):
    """What one question is testing, in the examiner's own planning words.

    This is the marking scheme, not an answer. A supervisor telling a student
    what a good answer would have to establish is teaching them; a supervisor
    telling them what to say is doing it for them, and this model deliberately
    carries only the first.
    """

    question_id: str
    question: str
    intent: str = ""
    evaluation_criteria: str = ""


class SessionDigest(BaseModel):
    """One line of a student's own history, and nothing more.

    Deliberately not a `SessionState`. A history list of twenty defenses would
    otherwise carry twenty manuscripts worth of findings and transcripts to the
    browser to render twenty rows, and every one of those is text the student
    did not ask to see again.
    """

    session_id: str
    status: SessionStatus = SessionStatus.IN_PROGRESS
    headline: str = Field(
        default="",
        description="The opening remark or first question, so a row is recognisable.",
    )
    question_count: int = 0
    answered_count: int = 0
    gap_count: int = 0
    has_summary: bool = False
    recurring_gap_patterns: list[str] = Field(
        default_factory=list,
        description=(
            "What this session concluded should be tested first next time. "
            "Carried on the row itself so the next session can offer it without "
            "the student copying it across by hand, which is the reason the "
            "field existed for months and was almost never used."
        ),
    )
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SessionState(BaseModel):
    """Everything needed to resume a session from cold storage."""

    session_id: str
    user_id: str = ""
    draft_id: str = ""
    judging_since: datetime | None = Field(
        default=None,
        description=(
            "When a turn claimed this session, cleared when it finishes. "
            "Recorded, never enforced on: a process that dies holding it would "
            "otherwise lock a student out of their own defense forever. The "
            "revision is what actually serialises turns."
        ),
    )
    revision: int = Field(
        default=0,
        description=(
            "Bumped by every write, and checked against storage before one. Two "
            "answers judged at the same time used to overwrite each other in "
            "silence: both cost a model call, both appeared to succeed, and only "
            "one survived. The second now fails loudly instead."
        ),
    )
    status: SessionStatus = SessionStatus.IN_PROGRESS
    language: str = "id"
    opening_remark: str = ""
    questions: list[PlannedQuestion] = Field(default_factory=list)
    findings: list[WeaknessFinding] = Field(
        default_factory=list,
        description=(
            "The Weakness Map this examination was planned from. Stored with the "
            "session so a resumed one can still show the evidence behind every "
            "question, and so the examiner keeps the quoted passage as context "
            "after a restart."
        ),
    )
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

    def finding_for(self, finding_id: str) -> WeaknessFinding | None:
        """The finding a question attacks, or None for opening and closing."""
        if not finding_id:
            return None
        return next((f for f in self.findings if f.id == finding_id), None)

    def current_progress(self) -> QuestionProgress | None:
        if 0 <= self.current_index < len(self.progress):
            return self.progress[self.current_index]
        return None

    def digest(self) -> SessionDigest:
        """Reduce a session to the row that represents it in a history list."""
        headline = self.opening_remark.strip()
        if not headline and self.questions:
            headline = self.questions[0].question.strip()

        return SessionDigest(
            session_id=self.session_id,
            status=self.status,
            headline=headline,
            question_count=len(self.questions),
            answered_count=sum(1 for turn in self.transcript if turn.role == "student"),
            gap_count=sum(1 for item in self.progress if item.gap_recorded),
            has_summary=self.summary is not None,
            recurring_gap_patterns=(
                list(self.summary.recurring_gap_patterns) if self.summary else []
            ),
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

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
    audio_base64: str = Field(
        default="",
        description=(
            "The examiner's reply, spoken, when the student asked for a voice. "
            "Carried with the turn rather than fetched after it, so the words "
            "and the voice arrive together."
        ),
    )
    audio_mime: str = ""
    adjustments: list[str] = Field(
        default_factory=list,
        description="Decisions our code overrode, and why. Part of the audit trail.",
    )

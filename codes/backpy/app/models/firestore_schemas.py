"""Firestore collection schemas.

This module only defines document shapes and collection names. All reads and
writes live in `app/storage/firestore.py`, so that agents never talk to the
database directly.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.weakness_map import WeaknessFinding

COLLECTION_USERS = "users"
COLLECTION_RESEARCH_DRAFTS = "research_drafts"
COLLECTION_VIVA_SESSIONS = "viva_sessions"
COLLECTION_WEAKNESS_PROFILE = "weakness_profile"


class SessionStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class UserDoc(BaseModel):
    """users/{userId}"""

    profile: str = ""
    institution: str = ""
    field_of_study: str = ""


class ResearchDraftDoc(BaseModel):
    """research_drafts/{draftId}"""

    user_id: str
    file_url: str = ""
    source_text_chars: int = 0
    language: str = "id"
    extracted_claims: list[str] = Field(default_factory=list)
    weakness_map: list[WeaknessFinding] = Field(default_factory=list)
    uploaded_at: datetime | None = None
    analyzed_at: datetime | None = None


class TranscriptTurn(BaseModel):
    role: str
    text: str
    timestamp: datetime | None = None
    evaluated_strength: str = ""


class SessionSummary(BaseModel):
    strong_points: list[str] = Field(default_factory=list)
    remaining_gaps: list[str] = Field(default_factory=list)


class VivaSessionDoc(BaseModel):
    """viva_sessions/{sessionId}

    A defense session must survive a restart. Everything needed to resume an
    interrupted session is persisted here, including `current_question_index`,
    so a dropped connection does not force the student to start over.
    """

    user_id: str
    draft_id: str
    status: SessionStatus = SessionStatus.IN_PROGRESS
    question_strategy: list[dict] = Field(default_factory=list)
    current_question_index: int = 0
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    session_summary: SessionSummary = Field(default_factory=SessionSummary)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class WeaknessProfileDoc(BaseModel):
    """weakness_profile/{userId}, the basis for cross-session memory."""

    recurring_gap_patterns: list[str] = Field(default_factory=list)
    last_updated: datetime | None = None

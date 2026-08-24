"""FastAPI endpoints for CITRA Viva.

The session endpoints are stateless between requests. Each one loads the whole
session from Firestore, does one turn, and writes it back. Two consequences
follow, and both are deliberate: the service scales horizontally without sticky
sessions, and a restart mid-defense costs nothing.
"""

from __future__ import annotations

import base64
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.agents.claim_support import check_claim_support
from app.auth import CurrentUser
from app.config import get_settings
from app.ingest.extract import ExtractionError, extract_draft
from app.models.claim_support import CitedSource, ClaimSupportResult
from app.models.question_strategy import StrategyResult
from app.models.session import (
    QuestionRubric,
    SessionDigest,
    SessionState,
    SessionSummary,
    SessionTurnResult,
)
from app.models.weakness_map import AnalysisResult
from app.orchestrator.orchestrator import Orchestrator
from app.speech.voice import SpeechError, speak_text, transcribe_answer
from app.storage.session_store import (
    FirestoreSessionStore,
    SessionConflictError,
    SessionNotFoundError,
)

router = APIRouter()


@contextmanager
def _translated_errors() -> Iterator[None]:
    """Turn domain errors into HTTP status codes, in one place.

    Without this the same three except blocks would be copied onto six
    endpoints, and the copies would drift apart.
    """
    try:
        yield
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SessionConflictError as exc:
        # 409, not 500. Nothing broke: this turn simply lost a race with
        # another one, and the caller can recover by reloading the session.
        raise HTTPException(
            status_code=409,
            detail=(
                "This session moved on while your answer was being judged, so it "
                "was not recorded. Reload the session and send it again."
            ),
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _orchestrator() -> Orchestrator:
    """An Orchestrator backed by Firestore, built fresh for each request."""
    return Orchestrator(store=FirestoreSessionStore())


def _transcriber():
    """Built per request, and imported here so no credential is needed to import."""
    from app.llm.client import GeminiTranscriber

    return GeminiTranscriber()


def _voice():
    from app.llm.client import GeminiVoice

    return GeminiVoice()


class AnalyzeDraftRequest(BaseModel):
    draft_text: str = Field(description="Research draft text, plain text for now.")
    draft_id: str = ""
    persist: bool = Field(
        default=False,
        description="Persist the result to Firestore. Requires user_id and draft_id.",
    )


class PrepareSessionRequest(AnalyzeDraftRequest):
    recurring_gaps: list[str] = Field(
        default_factory=list,
        description=(
            "Weaknesses the student failed to resolve in earlier sessions. "
            "Questions attacking these are asked first."
        ),
    )


class PrepareSessionResponse(BaseModel):
    analysis: AnalysisResult
    strategy: StrategyResult


class StartSessionRequest(PrepareSessionRequest):
    session_id: str = Field(default="", description="Optional. Generated when not supplied.")


class StartSessionResponse(BaseModel):
    session_id: str
    opening_remark: str
    first_question: str
    question_id: str
    analysis: AnalysisResult
    strategy: StrategyResult


class ExtractDraftResponse(BaseModel):
    text: str = Field(description="The manuscript as text, for the student to review.")
    page_count: int = 0
    characters: int = 0
    notes: list[str] = Field(
        default_factory=list,
        description="What extraction changed, so nothing is altered silently.",
    )


class AnswerRequest(BaseModel):
    answer: str = Field(description="What the student said.")


class TranscribeResponse(BaseModel):
    text: str = Field(
        description="The spoken answer as text, for the student to review before sending."
    )
    characters: int = 0


class SpeakRequest(BaseModel):
    text: str = Field(description="Examiner text to read aloud, exactly as written.")


class SpeakResponse(BaseModel):
    audio_base64: str = Field(description="The spoken audio, base64 encoded.")
    mime_type: str = "audio/wav"


class SessionHistoryResponse(BaseModel):
    sessions: list[SessionDigest] = Field(default_factory=list)


class CloseSessionResponse(BaseModel):
    session_id: str
    summary: SessionSummary
    adjustments: list[str] = Field(default_factory=list)


@router.get("/health")
def health() -> dict:
    """Readiness check that never calls the model, so probes stay free."""
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.gemini_model,
        "project_configured": bool(settings.google_cloud_project),
        "auth_required": settings.auth_required,
        "env": settings.app_env,
    }


@router.post("/api/drafts/analyze", response_model=AnalysisResult)
def analyze_draft_endpoint(request: AnalyzeDraftRequest, user: CurrentUser) -> AnalysisResult:
    with _translated_errors():
        return _orchestrator().run_draft_analysis(
            draft_text=request.draft_text,
            user_id=user.uid,
            draft_id=request.draft_id,
            persist=request.persist,
        )


@router.post("/api/drafts/extract", response_model=ExtractDraftResponse)
async def extract_draft_endpoint(
    user: CurrentUser, file: Annotated[UploadFile, File()]
) -> ExtractDraftResponse:
    """Turn an uploaded PDF, DOCX, or text file into text.

    The text is returned rather than analysed. The student reads it, corrects
    it if extraction got something wrong, and submits it deliberately, which is
    what keeps every verified quote checkable against a document they have
    actually seen.

    Nothing is stored. The file is read into memory and discarded.
    """
    data = await file.read()
    try:
        extracted = extract_draft(file.filename or "", data)
    except ExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ExtractDraftResponse(
        text=extracted.text,
        page_count=extracted.page_count,
        characters=len(extracted.text),
        notes=extracted.notes,
    )


@router.post("/api/speech/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(
    user: CurrentUser, file: Annotated[UploadFile, File()]
) -> TranscribeResponse:
    """Turn one spoken answer into text.

    The text is returned, not submitted. A student reads it, fixes anything the
    recognition got wrong, and sends it themselves, so what the examiner judges
    is what they meant to say rather than what a model heard. It then travels
    the ordinary answer endpoint, which means every session rule still applies
    to a spoken answer exactly as it does to a typed one.

    Nothing is stored. The recording is read into memory and discarded.
    """
    data = await file.read()
    try:
        text = transcribe_answer(
            data,
            file.content_type or "",
            transcriber=_transcriber(),
        )
    except SpeechError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TranscribeResponse(text=text, characters=len(text))


@router.post("/api/speech/say", response_model=SpeakResponse)
def speak_endpoint(request: SpeakRequest, user: CurrentUser) -> SpeakResponse:
    """Read examiner text aloud.

    The words spoken are the words already in the transcript. Nothing is
    generated a second time here, so what a student hears and what the record
    shows cannot come apart.
    """
    settings = get_settings()
    try:
        speech = speak_text(
            request.text,
            voice=settings.gemini_voice_name,
            synthesizer=_voice(),
        )
    except SpeechError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SpeakResponse(
        audio_base64=base64.b64encode(speech.data).decode("ascii"),
        mime_type=speech.mime_type,
    )


@router.post("/api/sessions/prepare", response_model=PrepareSessionResponse)
def prepare_session_endpoint(
    request: PrepareSessionRequest, user: CurrentUser
) -> PrepareSessionResponse:
    """Analyze a draft and plan the examination, without starting it."""
    with _translated_errors():
        preparation = _orchestrator().prepare_session(
            draft_text=request.draft_text,
            recurring_gaps=request.recurring_gaps,
            user_id=user.uid,
            draft_id=request.draft_id,
            persist=request.persist,
        )
    return PrepareSessionResponse(analysis=preparation.analysis, strategy=preparation.strategy)


@router.post("/api/sessions/start", response_model=StartSessionResponse)
def start_session_endpoint(request: StartSessionRequest, user: CurrentUser) -> StartSessionResponse:
    """Prepare an examination and open it with the first question."""
    with _translated_errors():
        start = _orchestrator().start_session(
            draft_text=request.draft_text,
            recurring_gaps=request.recurring_gaps,
            user_id=user.uid,
            draft_id=request.draft_id,
            session_id=request.session_id,
            persist_draft=request.persist,
        )
    return StartSessionResponse(
        session_id=start.session_id,
        opening_remark=start.opening_remark,
        first_question=start.first_question,
        question_id=start.question_id,
        analysis=start.preparation.analysis,
        strategy=start.preparation.strategy,
    )


@router.post("/api/sessions/{session_id}/answer", response_model=SessionTurnResult)
def answer_endpoint(
    session_id: str, request: AnswerRequest, user: CurrentUser
) -> SessionTurnResult:
    """Submit one answer and receive what the examiner says next."""
    with _translated_errors():
        return _orchestrator().submit_answer(session_id, request.answer, actor_id=user.uid)


@router.post("/api/sessions/{session_id}/rubric", response_model=QuestionRubric)
def reveal_rubric_endpoint(session_id: str, user: CurrentUser) -> QuestionRubric:
    """What the open question is testing, and what a sufficient answer must do.

    It returns the marking scheme, never a model answer. The distinction is the
    product: telling a student what would count as a good answer teaches them,
    and telling them the answer replaces them. An answer read once cannot be
    unread, and every judgment after it would be measuring paraphrase.

    Asking is recorded against the question and appears in the closing report.
    """
    with _translated_errors():
        return _orchestrator().reveal_rubric(session_id, actor_id=user.uid)


@router.post("/api/sessions/{session_id}/close", response_model=CloseSessionResponse)
def close_session_endpoint(session_id: str, user: CurrentUser) -> CloseSessionResponse:
    """Reflect on a finished session and store the summary."""
    with _translated_errors():
        closing = _orchestrator().close_session(session_id, actor_id=user.uid)
    return CloseSessionResponse(
        session_id=closing.session_id,
        summary=closing.summary,
        adjustments=closing.adjustments,
    )


class CheckClaimRequest(BaseModel):
    claim: str = Field(description="The sentence as written in the manuscript.")
    source: CitedSource = Field(
        description="The cited source, including whatever text is available to read."
    )


@router.post("/api/claims/check", response_model=ClaimSupportResult)
def check_claim_endpoint(request: CheckClaimRequest, user: CurrentUser) -> ClaimSupportResult:
    """Judge whether a cited source carries the specific claim it was cited for.

    A supporting layer rather than one of the four defense sub-agents. It never
    marks a citation wrong on its own: a negative verdict has to come with a
    question the author can answer.
    """
    with _translated_errors():
        return check_claim_support(request.claim, request.source)


@router.get("/api/sessions", response_model=SessionHistoryResponse)
def list_sessions_endpoint(user: CurrentUser) -> SessionHistoryResponse:
    """The caller's own sessions, newest first.

    Ownership is the query rather than a check applied to the results, so there
    is no path through this endpoint that reads another student's defense in
    order to decide not to show it.
    """
    with _translated_errors():
        return SessionHistoryResponse(
            sessions=FirestoreSessionStore().list_for_user(user.uid)
        )


@router.get("/api/sessions/{session_id}", response_model=SessionState)
def get_session_endpoint(session_id: str, user: CurrentUser) -> SessionState:
    """Read the full session state, including the transcript so far."""
    with _translated_errors():
        return _orchestrator().load_session(session_id, actor_id=user.uid)

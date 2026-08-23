"""FastAPI endpoints for CITRA Viva.

The session endpoints are stateless between requests. Each one loads the whole
session from Firestore, does one turn, and writes it back. Two consequences
follow, and both are deliberate: the service scales horizontally without sticky
sessions, and a restart mid-defense costs nothing.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.question_strategy import StrategyResult
from app.models.session import SessionState, SessionSummary, SessionTurnResult
from app.models.weakness_map import AnalysisResult
from app.orchestrator.orchestrator import Orchestrator
from app.storage.session_store import FirestoreSessionStore, SessionNotFoundError

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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _orchestrator() -> Orchestrator:
    """An Orchestrator backed by Firestore, built fresh for each request."""
    return Orchestrator(store=FirestoreSessionStore())


class AnalyzeDraftRequest(BaseModel):
    draft_text: str = Field(description="Research draft text, plain text for now.")
    user_id: str = ""
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


class AnswerRequest(BaseModel):
    answer: str = Field(description="What the student said.")


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
        "env": settings.app_env,
    }


@router.post("/api/drafts/analyze", response_model=AnalysisResult)
def analyze_draft_endpoint(request: AnalyzeDraftRequest) -> AnalysisResult:
    with _translated_errors():
        return _orchestrator().run_draft_analysis(
            draft_text=request.draft_text,
            user_id=request.user_id,
            draft_id=request.draft_id,
            persist=request.persist,
        )


@router.post("/api/sessions/prepare", response_model=PrepareSessionResponse)
def prepare_session_endpoint(request: PrepareSessionRequest) -> PrepareSessionResponse:
    """Analyze a draft and plan the examination, without starting it."""
    with _translated_errors():
        preparation = _orchestrator().prepare_session(
            draft_text=request.draft_text,
            recurring_gaps=request.recurring_gaps,
            user_id=request.user_id,
            draft_id=request.draft_id,
            persist=request.persist,
        )
    return PrepareSessionResponse(analysis=preparation.analysis, strategy=preparation.strategy)


@router.post("/api/sessions/start", response_model=StartSessionResponse)
def start_session_endpoint(request: StartSessionRequest) -> StartSessionResponse:
    """Prepare an examination and open it with the first question."""
    with _translated_errors():
        start = _orchestrator().start_session(
            draft_text=request.draft_text,
            recurring_gaps=request.recurring_gaps,
            user_id=request.user_id,
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
def answer_endpoint(session_id: str, request: AnswerRequest) -> SessionTurnResult:
    """Submit one answer and receive what the examiner says next."""
    with _translated_errors():
        return _orchestrator().submit_answer(session_id, request.answer)


@router.post("/api/sessions/{session_id}/close", response_model=CloseSessionResponse)
def close_session_endpoint(session_id: str) -> CloseSessionResponse:
    """Reflect on a finished session and store the summary."""
    with _translated_errors():
        closing = _orchestrator().close_session(session_id)
    return CloseSessionResponse(
        session_id=closing.session_id,
        summary=closing.summary,
        adjustments=closing.adjustments,
    )


@router.get("/api/sessions/{session_id}", response_model=SessionState)
def get_session_endpoint(session_id: str) -> SessionState:
    """Read the full session state, including the transcript so far."""
    with _translated_errors():
        return _orchestrator().store.load(session_id)

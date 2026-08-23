"""FastAPI endpoints for CITRA Viva.

Two flows are exposed: draft analysis on its own, and full session preparation
which runs analysis and question planning in order. Endpoints for running the
examination itself follow once the Examiner Session Agent exists.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.question_strategy import StrategyResult
from app.models.weakness_map import AnalysisResult
from app.orchestrator.orchestrator import Orchestrator

router = APIRouter()


class AnalyzeDraftRequest(BaseModel):
    draft_text: str = Field(description="Research draft text, plain text for now.")
    user_id: str = ""
    draft_id: str = ""
    persist: bool = Field(
        default=False,
        description="Persist the result to Firestore. Requires user_id and draft_id.",
    )


class PrepareSessionRequest(AnalyzeDraftRequest):
    session_id: str = ""
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
    try:
        return Orchestrator().run_draft_analysis(
            draft_text=request.draft_text,
            user_id=request.user_id,
            draft_id=request.draft_id,
            persist=request.persist,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/api/sessions/prepare", response_model=PrepareSessionResponse)
def prepare_session_endpoint(request: PrepareSessionRequest) -> PrepareSessionResponse:
    """Analyze a draft and plan the examination that follows from it."""
    try:
        preparation = Orchestrator().prepare_session(
            draft_text=request.draft_text,
            recurring_gaps=request.recurring_gaps,
            user_id=request.user_id,
            draft_id=request.draft_id,
            session_id=request.session_id,
            persist=request.persist,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PrepareSessionResponse(analysis=preparation.analysis, strategy=preparation.strategy)

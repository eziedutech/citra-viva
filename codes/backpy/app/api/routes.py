"""FastAPI endpoints for CITRA Viva.

Only one flow is exposed so far: draft analysis. Session endpoints follow once
the Question Strategy and Examiner Session agents exist.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
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

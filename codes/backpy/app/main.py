"""FastAPI entry point for CITRA Viva."""

import logging

from fastapi import FastAPI

from app.api.live_routes import router as live_router
from app.api.routes import router
from app.config import get_settings

settings = get_settings()
logging.basicConfig(level=settings.log_level)

app = FastAPI(
    title="CITRA Viva",
    description="Adversarial AI thesis defense simulator, a module of C.I.T.R.A.",
    version="0.1.0",
)
app.include_router(router)

# The one route a browser reaches directly. A Next.js route handler cannot carry
# a WebSocket upgrade, so the streaming transcription socket is opened against
# this service rather than through the web app, and needs the web app's origin
# allowed. The credential travels in the subprotocol and is verified per
# connection; this list only decides which pages may attempt it at all.
_origins = [origin for origin in settings.allowed_web_origins.split(",") if origin.strip()]
if _origins:
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in _origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(live_router)

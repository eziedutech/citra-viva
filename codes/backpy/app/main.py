"""FastAPI entry point for CITRA Viva."""

import logging

from fastapi import FastAPI

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

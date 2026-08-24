"""FastAPI entry point for CITRA Viva."""

import logging

from fastapi import FastAPI

from app.api.live_routes import router as live_router
from app.api.routes import router
from app.config import get_settings
from app.observability import configure_tracing

settings = get_settings()
logging.basicConfig(level=settings.log_level)

app = FastAPI(
    title="CITRA Viva",
    description="Adversarial AI thesis defense simulator, a module of C.I.T.R.A.",
    version="0.1.0",
)
app.include_router(router)

# Tracing, when the deployment asks for it.
#
# Configured before the request instrumentation below, because the agent spans
# are only worth anything if they hang under the request that caused them. One
# turn of a defense then reads as a single trace: the request, and inside it the
# examiner agent that judged the answer.
#
# Every failure path here returns False and logs. A service that cannot export a
# span still runs a defense.
_tracing = configure_tracing()

# Said out loud at startup, because the alternative is what happened while this
# was being built: no spans arriving, and no way to tell from the outside
# whether tracing was off, misconfigured, or exporting into a void.
logging.getLogger(__name__).info(
    "Tracing is %s.", "on, exporting to Cloud Trace" if _tracing else "off"
)

if _tracing:
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(app)
        logging.getLogger(__name__).info("Request spans are on.")
    except Exception:  # noqa: BLE001 - telemetry never breaks the service
        logging.getLogger(__name__).warning(
            "Request spans are unavailable, so agent spans will have no parent.",
            exc_info=True,
        )

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

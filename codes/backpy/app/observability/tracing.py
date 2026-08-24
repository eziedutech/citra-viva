"""One span per agent call, exported to Cloud Trace.

A defense is a chain of decisions made by five different agents, and until now
the only way to see that chain was to read the logs of a single request and
infer the order. A trace makes the shape of it visible: which agent ran, how
long it took, what it kept, and what it threw away.

Three rules shape everything below.

**Tracing must never change an answer.** Every failure here is swallowed and
logged. A student in the middle of a defense does not lose a turn because an
exporter could not reach Cloud Trace, and a missing telemetry package makes
this module a no-op rather than an import error.

**Off unless it is asked for.** `ENABLE_CLOUD_TRACE` is false by default, so
the test suite and a local run produce no spans, open no exporter, and need no
credentials. Turning it on without a project id is a misconfiguration, and it
says so once rather than failing on every span.

**No draft text, no answers, no transcripts.** Span attributes carry counts,
identifiers, and decisions, never the manuscript or what the student said. A
trace is readable by anyone with console access to the project, which is a
wider audience than the one a session is written for.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

# The service as it appears in the trace list.
SERVICE_NAME = "citra-viva-api"

# Where spans go. The project is deliberately absent from this URL: it travels
# as a resource attribute instead, and the request is refused without it.
TELEMETRY_ENDPOINT = "https://telemetry.googleapis.com/v1/traces"
PROJECT_ATTRIBUTE = "gcp.project_id"
CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"

# Set once by `configure_tracing`. `None` means tracing is off, which is the
# ordinary case rather than an error.
_tracer: Any = None
_provider: Any = None
_configured = False


def _cloud_exporter(project: str) -> Any:
    """The exporter that actually delivers, which took two attempts to find.

    The obvious choice is `CloudTraceSpanExporter` from
    `opentelemetry-exporter-gcp-trace`. It is deprecated, and it fails in the
    worst available way: spans are accepted, no exception is raised, no error
    is logged, and nothing whatsoever arrives. It was only caught because the
    trace was read back afterwards rather than assumed to exist.

    What works is OTLP over HTTP to the Telemetry API, which is the path
    Google now documents. Two details are not optional and neither is
    guessable from a stack trace: the endpoint carries no project, and the
    project has to travel as a resource attribute instead, or the request is
    refused with a 400.
    """
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
        OTLPSpanExporter,
    )

    credentials, _ = google.auth.default(scopes=[CLOUD_PLATFORM_SCOPE])
    session = AuthorizedSession(credentials)
    session.headers.update({"x-goog-user-project": project})

    # A refused export says so, once.
    #
    # Without this the telemetry fails the way the telemetry was added to catch:
    # the exporter reports nothing, the service looks healthy, and the traces
    # are simply absent. The response body is where the actual reason lives,
    # and every reason met so far has been a sentence long and completely
    # specific.
    post = session.post
    complained = False

    def post_and_report(*args: Any, **kwargs: Any) -> Any:
        nonlocal complained
        response = post(*args, **kwargs)
        if response.status_code != 200 and not complained:
            complained = True
            logger.warning(
                "Cloud Trace refused a span export: HTTP %s %s",
                response.status_code,
                response.text[:400],
            )
        return response

    session.post = post_and_report
    return OTLPSpanExporter(endpoint=TELEMETRY_ENDPOINT, session=session)


def configure_tracing(exporter: Any = None) -> bool:
    """Turn tracing on, and report whether it actually came on.

    Called once at startup. Passing an `exporter` replaces Cloud Trace, which
    is how the tests observe spans without a network or a project.

    Returns `False` for every reason tracing might not run: switched off,
    misconfigured, or the packages absent. None of those is fatal, and the
    caller is expected to carry on either way.
    """
    global _tracer, _provider, _configured

    if _configured:
        return _tracer is not None

    settings = get_settings()

    if exporter is None and not settings.enable_cloud_trace:
        _configured = True
        return False

    if exporter is None and not settings.google_cloud_project:
        # Said once, at startup, rather than on every span.
        logger.warning(
            "ENABLE_CLOUD_TRACE is on but GOOGLE_CLOUD_PROJECT is empty, so "
            "there is nowhere to send spans. Tracing stays off."
        )
        _configured = True
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import SERVICE_NAME as RESOURCE_SERVICE_NAME
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor

        if exporter is None:
            exporter = _cloud_exporter(settings.google_cloud_project)

        _provider = TracerProvider(
            resource=Resource.create(
                {
                    RESOURCE_SERVICE_NAME: SERVICE_NAME,
                    # Required, and rejected with a 400 when absent. It is not
                    # inferred from the credential or from the endpoint.
                    PROJECT_ATTRIBUTE: settings.google_cloud_project,
                }
            )
        )
        # Exported as each span ends, rather than batched in the background.
        #
        # Cloud Run throttles a container's CPU between requests. A batching
        # processor does its work on a background thread, which is exactly the
        # thing that may never be scheduled once a response has been sent, so
        # buffered spans can sit until the instance is torn down.
        #
        # Batching was used first here and did deliver, so this is a guard
        # against a known hazard rather than a fix for an observed loss. It is
        # cheap enough not to need stronger justification: exporting inline
        # costs one HTTP call as a span ends, against requests dominated by
        # twenty to fifty seconds of model latency.
        _provider.add_span_processor(SimpleSpanProcessor(exporter))

        # Published globally so that the FastAPI instrumentation, which knows
        # nothing about this module, sends its request spans to the same
        # exporter. OpenTelemetry allows this exactly once per process and
        # only warns when it is refused, so the tracer below is taken from our
        # own provider rather than from the global one. Parenting still works
        # either way: a span finds its parent through the active context, not
        # through the provider that created it.
        trace.set_tracer_provider(_provider)
        _tracer = _provider.get_tracer(SERVICE_NAME)

    except ImportError:
        logger.warning(
            "Tracing is switched on but the OpenTelemetry packages are not "
            "installed. Tracing stays off.",
            exc_info=True,
        )
        _tracer = None
    except Exception:  # noqa: BLE001 - telemetry never breaks the service
        logger.warning("Tracing could not be configured.", exc_info=True)
        _tracer = None

    _configured = True
    return _tracer is not None


def flush(timeout_millis: int = 5000) -> None:
    """Push anything still buffered to the exporter.

    Spans are batched, and a Cloud Run instance can be frozen or torn down
    between requests with a batch still in hand. Those spans are the ones
    somebody would most want, because an instance that went away mid-turn is
    exactly the case worth looking at.
    """
    if _provider is None:
        return
    try:
        _provider.force_flush(timeout_millis)
    except Exception:  # noqa: BLE001 - telemetry never breaks the service
        logger.debug("Spans could not be flushed.", exc_info=True)


def reset_tracing_for_tests() -> None:
    """Forget the configuration, so a test can configure it differently."""
    global _tracer, _configured
    _tracer = None
    _configured = False


@contextmanager
def agent_span(name: str, **attributes: Any) -> Iterator[Any]:
    """Wrap one agent call in a span, or in nothing at all.

    Yields the span when tracing is on and `None` when it is off, so a caller
    does the same thing either way and never has to ask which it is. Pair it
    with `record`, which tolerates `None`.
    """
    if _tracer is None:
        yield None
        return

    # Only the starting of the span is guarded. Wrapping the `yield` as well
    # would put this module in the path of every exception an agent raises:
    # it would swallow the caller's failure, and then resume a generator that
    # has already been thrown into. Once the span exists, the `with` below ends
    # it on the way out whether the body succeeded or raised, and OpenTelemetry
    # marks the span with the exception, which is the trace anyone debugging a
    # failed turn actually wants.
    try:
        started = _tracer.start_as_current_span(name)
    except Exception:  # noqa: BLE001 - a broken span is not a broken defense
        logger.warning("A span could not be started for %s.", name, exc_info=True)
        yield None
        return

    with started as span:
        record(span, **attributes)
        yield span


def record(span: Any, **attributes: Any) -> None:
    """Attach attributes to a span that may not exist.

    Counts, ids, and decisions only. Never the manuscript, an answer, or a
    transcript: see the note at the top of this module.
    """
    if span is None:
        return
    try:
        for key, value in attributes.items():
            if value is not None:
                span.set_attribute(key, value)
    except Exception:  # noqa: BLE001
        logger.debug("Span attributes could not be set.", exc_info=True)

"""Telemetry. Nothing here is allowed to affect the answer a student gets."""

from app.observability.tracing import agent_span, configure_tracing, flush, record

__all__ = ["agent_span", "configure_tracing", "flush", "record"]

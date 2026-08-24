"""Tracing is off unless asked for, and never costs an answer when it breaks.

These run without a network and without a project. Spans go to an in-memory
exporter, which is why `configure_tracing` accepts one at all.
"""

from __future__ import annotations

import pytest

from app.config import get_settings
from app.observability import agent_span, configure_tracing, record
from app.observability.tracing import flush, reset_tracing_for_tests


@pytest.fixture(autouse=True)
def _reset():
    """Each test configures tracing for itself, and leaves it off."""
    reset_tracing_for_tests()
    get_settings.cache_clear()
    yield
    reset_tracing_for_tests()
    get_settings.cache_clear()


@pytest.fixture
def exporter():
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import (
        InMemorySpanExporter,
    )

    return InMemorySpanExporter()


def _spans(exporter):
    """Flush the batch processor, then read what came out.

    Flushed through the module rather than through the global provider, which
    in a test process belongs to whichever test configured tracing first.
    """
    flush()
    return exporter.get_finished_spans()


# --- off by default ---------------------------------------------------------


def test_tracing_is_off_unless_it_is_switched_on():
    """The default deployment posture. No exporter, no credentials, no spans."""
    assert configure_tracing() is False


def test_a_span_with_tracing_off_yields_nothing_and_raises_nothing():
    """The whole point of yielding None: the caller does not have to ask."""
    configure_tracing()

    with agent_span("agent.draft_analyzer", draft_characters=10) as span:
        assert span is None
        # Recording onto nothing is the ordinary case, not an error.
        record(span, findings_kept=3)


def test_switched_on_without_a_project_stays_off(monkeypatch):
    """A misconfiguration is reported once and then behaves like off.

    Failing hard here would take down a service over telemetry, which is the
    one thing telemetry must never do.
    """
    monkeypatch.setenv("ENABLE_CLOUD_TRACE", "true")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "")
    get_settings.cache_clear()

    assert configure_tracing() is False


# --- on ---------------------------------------------------------------------


def test_an_agent_call_produces_one_named_span(exporter):
    assert configure_tracing(exporter=exporter) is True

    with agent_span("agent.draft_analyzer", draft_characters=1200) as span:
        record(span, findings_kept=4, findings_dropped=1)

    spans = _spans(exporter)
    assert len(spans) == 1
    assert spans[0].name == "agent.draft_analyzer"
    assert spans[0].attributes["draft_characters"] == 1200
    assert spans[0].attributes["findings_kept"] == 4
    assert spans[0].attributes["findings_dropped"] == 1


def test_agent_spans_nest_so_one_turn_reads_as_one_chain(exporter):
    """The reason this exists at all.

    A trace is worth having because it shows the order and the nesting, not
    because it shows durations. A span with no parent is a fact without a
    story.
    """
    configure_tracing(exporter=exporter)

    with agent_span("http.request") as parent:
        assert parent is not None
        with agent_span("agent.examiner_session", question_number=3):
            pass

    spans = {span.name: span for span in _spans(exporter)}
    child = spans["agent.examiner_session"]
    outer = spans["http.request"]

    assert child.parent is not None
    assert child.parent.span_id == outer.context.span_id


def test_a_failing_agent_still_closes_its_span(exporter):
    """An exception has to propagate, and the span has to end anyway.

    A trace that only records the calls that succeeded would hide exactly the
    turn somebody is looking for.
    """
    configure_tracing(exporter=exporter)

    with pytest.raises(ValueError):
        with agent_span("agent.question_strategy"):
            raise ValueError("the model returned nothing usable")

    spans = _spans(exporter)
    assert len(spans) == 1
    assert spans[0].name == "agent.question_strategy"


def test_none_attributes_are_left_off_rather_than_recorded(exporter):
    """`None` is not a value, and OpenTelemetry rejects it."""
    configure_tracing(exporter=exporter)

    with agent_span("agent.session_reflection") as span:
        record(span, remaining_gaps=2, closing_remark=None)

    attributes = _spans(exporter)[0].attributes
    assert attributes["remaining_gaps"] == 2
    assert "closing_remark" not in attributes


def test_configuring_twice_does_not_stack_exporters(exporter):
    """Startup runs once, but a reload, a test, or an import cycle may not."""
    assert configure_tracing(exporter=exporter) is True
    assert configure_tracing(exporter=exporter) is True

    with agent_span("agent.draft_analyzer"):
        pass

    assert len(_spans(exporter)) == 1

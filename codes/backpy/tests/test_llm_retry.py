"""Tests for the transient failure retry policy.

This policy exists because a real demo run died mid-session on a 429 and printed
a provider traceback. A recording made in one take cannot survive that, and
neither can a student halfway through a defense.

No real sleeping happens here: the sleep function is injected, so the backoff
schedule is asserted rather than waited out.
"""

from __future__ import annotations

import pytest

from app.llm.retry import call_with_retry, is_retryable


class FakeQuotaError(Exception):
    """Shaped like what google-genai raises on quota exhaustion."""

    def __init__(self) -> None:
        super().__init__("429 RESOURCE_EXHAUSTED. Resource exhausted, try again later.")


class FakePermissionError(Exception):
    def __init__(self) -> None:
        super().__init__("403 PERMISSION_DENIED. The caller does not have permission.")


def test_quota_and_availability_errors_are_retryable():
    assert is_retryable(FakeQuotaError())
    assert is_retryable(Exception("503 UNAVAILABLE"))
    assert is_retryable(Exception("504 DEADLINE_EXCEEDED"))


def test_permission_and_argument_errors_are_not_retryable():
    """Repeating a request the provider rejected on its merits is just slower failure."""
    assert not is_retryable(FakePermissionError())
    assert not is_retryable(ValueError("400 INVALID_ARGUMENT"))


def test_a_transient_failure_is_retried_and_then_succeeds():
    attempts = {"count": 0}
    delays: list[float] = []

    def flaky():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise FakeQuotaError()
        return "the model responded"

    result = call_with_retry(flaky, base_delay=1.0, sleep=delays.append)

    assert result == "the model responded"
    assert attempts["count"] == 3
    # Exponential, so the provider gets progressively more room to recover.
    assert delays == [1.0, 2.0]


def test_a_permanent_failure_is_raised_immediately_without_sleeping():
    delays: list[float] = []

    def denied():
        raise FakePermissionError()

    with pytest.raises(FakePermissionError):
        call_with_retry(denied, sleep=delays.append)

    assert delays == []


def test_exhausted_retries_become_a_readable_error():
    """The caller must be able to say 'quota' rather than surface a traceback."""
    delays: list[float] = []

    def always_throttled():
        raise FakeQuotaError()

    with pytest.raises(RuntimeError, match="usually quota rather than a bug"):
        call_with_retry(always_throttled, max_attempts=3, base_delay=0.5, sleep=delays.append)

    # Three attempts means two waits: no pointless sleep after the last try.
    assert delays == [0.5, 1.0]


def test_a_successful_first_call_never_sleeps():
    delays: list[float] = []

    result = call_with_retry(lambda: "immediate", sleep=delays.append)

    assert result == "immediate"
    assert delays == []

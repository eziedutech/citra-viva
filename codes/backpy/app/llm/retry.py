"""Retry policy for transient model failures.

Written as a pure function so it can be tested without a network, a clock that
matters, or a real client.

Only two failures are retried, and both are the provider saying "not now"
rather than "no": quota exhaustion and service unavailability. A malformed
request or a permission problem is retried never, because repeating it would
just be slower failure.

This exists because of an actual failure during a demo run: a mid-session 429
ended the defense with a raw traceback. A live recording cannot afford that,
and a student halfway through a defense should not lose the session to a
momentary quota spike.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable

logger = logging.getLogger(__name__)

RETRYABLE_MARKERS = (
    "resource_exhausted",
    "429",
    "unavailable",
    "503",
    "deadline_exceeded",
    "504",
)


def is_retryable(error: Exception) -> bool:
    """True when the provider is saying 'not now' rather than 'no'."""
    text = f"{type(error).__name__} {error}".lower()
    return any(marker in text for marker in RETRYABLE_MARKERS)


def call_with_retry[T](
    operation: Callable[[], T],
    *,
    max_attempts: int = 4,
    base_delay: float = 2.0,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    """Run `operation`, retrying transient failures with exponential backoff.

    Raises `RuntimeError` with a readable message once attempts run out, so the
    caller reports a quota problem rather than surfacing a provider traceback.
    """
    if max_attempts < 1:
        raise ValueError("max_attempts must be at least 1.")

    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return operation()
        except Exception as error:  # noqa: BLE001 - re-raised below when not retryable
            if not is_retryable(error):
                raise
            last_error = error
            if attempt == max_attempts:
                break
            delay = base_delay * (2 ** (attempt - 1))
            logger.warning(
                "Model call failed with a transient error (attempt %d of %d). "
                "Retrying in %.1fs. %s",
                attempt,
                max_attempts,
                delay,
                error,
            )
            sleep(delay)

    raise RuntimeError(
        f"The model was unavailable after {max_attempts} attempts. This is usually "
        f"quota rather than a bug: check the quota for your project and region. "
        f"Last error: {last_error}"
    ) from last_error

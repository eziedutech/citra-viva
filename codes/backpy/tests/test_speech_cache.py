"""The speech cache, which exists to stop the same line being paid for twice.

Reading a question aloud costs a model call and several seconds, and the same
question is read more than once often enough to matter: a student replays what
they did not catch, an opening remark is identical for everyone, and a browser
refused permission to autoplay asks again the moment the reader clicks.
"""

from __future__ import annotations

import pytest

from app.speech.cache import (
    MAX_CACHE_BYTES,
    cache_speech,
    cache_stats,
    clear_cache,
    get_cached_speech,
)
from app.speech.voice import Speech

QUESTION = "Your sample was drawn from one faculty. Why should that generalise?"


@pytest.fixture(autouse=True)
def empty_cache():
    clear_cache()
    yield
    clear_cache()


def speech(size: int = 1024) -> Speech:
    return Speech(data=b"\x00\x01" * (size // 2), mime_type="audio/wav")


def test_a_line_read_twice_is_synthesised_once():
    cache_speech(QUESTION, "Charon", speech())

    assert get_cached_speech(QUESTION, "Charon") is not None


def test_a_line_never_read_is_a_miss():
    assert get_cached_speech(QUESTION, "Charon") is None


def test_surrounding_whitespace_does_not_make_a_different_line():
    cache_speech(QUESTION, "Charon", speech())

    assert get_cached_speech(f"  {QUESTION}\n", "Charon") is not None


def test_a_different_voice_is_a_different_recording():
    """Same words, another speaker. Returning the first would be the wrong voice."""
    cache_speech(QUESTION, "Charon", speech())

    assert get_cached_speech(QUESTION, "Puck") is None


def test_the_cache_stays_within_its_limit():
    """Bounded by bytes, because entries here differ by two orders of magnitude."""
    chunk = MAX_CACHE_BYTES // 4
    for index in range(8):
        cache_speech(f"line {index}", "Charon", speech(chunk))

    assert cache_stats()["bytes"] <= MAX_CACHE_BYTES


def test_the_least_recently_used_line_is_the_one_dropped():
    chunk = MAX_CACHE_BYTES // 3
    cache_speech("first", "Charon", speech(chunk))
    cache_speech("second", "Charon", speech(chunk))

    # Touching the first makes the second the oldest.
    assert get_cached_speech("first", "Charon") is not None

    cache_speech("third", "Charon", speech(chunk))
    cache_speech("fourth", "Charon", speech(chunk))

    assert get_cached_speech("first", "Charon") is not None
    assert get_cached_speech("second", "Charon") is None


def test_a_recording_larger_than_the_whole_cache_is_not_kept():
    """Keeping it would evict everything else to hold one entry."""
    cache_speech("enormous", "Charon", speech(MAX_CACHE_BYTES + 2))

    assert cache_stats() == {"entries": 0, "bytes": 0}


def test_re_reading_the_same_line_does_not_count_its_bytes_twice():
    cache_speech(QUESTION, "Charon", speech(2048))
    cache_speech(QUESTION, "Charon", speech(2048))

    assert cache_stats() == {"entries": 1, "bytes": 2048}


def test_the_key_does_not_hold_the_text_itself():
    """A defense passage must not sit in a dictionary key.

    It would be printed by any debugger and captured by any memory dump that
    ever looks at this process.
    """
    from app.speech.cache import _key

    key = _key(QUESTION, "Charon")

    assert QUESTION not in key
    assert len(key) == 64

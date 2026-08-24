"""Synthesised speech, kept so the same line is never paid for twice.

Reading a question aloud costs a model call and several seconds. The same
question is read more than once often enough to matter: a student replays what
they did not catch, an opening remark is identical for everyone, and a browser
that was refused permission to autoplay asks again the moment the reader clicks.

Held in the process rather than in a shared store, which is the honest limit of
this: Cloud Run runs several instances and each keeps its own, so a repeat can
still miss. That is a smaller cache than a shared one would be and it needs no
new service, no new failure mode, and no eviction policy anyone has to operate.

Bounded by total bytes rather than by entry count, because entries here differ
by two orders of magnitude: one short follow-up against a full opening remark.
Counting them would let a handful of long ones hold far more memory than a
hundred short ones ever could.
"""

from __future__ import annotations

import hashlib
from collections import OrderedDict
from threading import Lock

from app.speech.voice import Speech

# About twenty minutes of speech at the rate the voice model returns. Small
# enough to be invisible beside a container's memory, large enough to cover a
# whole defense several times over.
MAX_CACHE_BYTES = 64 * 1024 * 1024

_entries: OrderedDict[str, Speech] = OrderedDict()
_total_bytes = 0
_lock = Lock()


def _key(text: str, voice: str) -> str:
    """Hash rather than the text itself.

    The key would otherwise be a passage of somebody's defense sitting in a
    dictionary key, printed by any debugger and any memory dump that ever looks
    at this process.
    """
    digest = hashlib.sha256()
    digest.update(voice.encode("utf-8"))
    digest.update(b"\x00")
    digest.update(text.strip().encode("utf-8"))
    return digest.hexdigest()


def get_cached_speech(text: str, voice: str) -> Speech | None:
    """Audio already made for this exact line, if it is still held."""
    key = _key(text, voice)
    with _lock:
        speech = _entries.get(key)
        if speech is not None:
            # Recently used, so it survives the next eviction.
            _entries.move_to_end(key)
        return speech


def cache_speech(text: str, voice: str, speech: Speech) -> None:
    """Keep this audio, evicting the least recently used until it fits."""
    global _total_bytes

    size = len(speech.data)
    if size > MAX_CACHE_BYTES:
        # One entry that would evict everything else is not worth keeping.
        return

    key = _key(text, voice)
    with _lock:
        existing = _entries.pop(key, None)
        if existing is not None:
            _total_bytes -= len(existing.data)

        _entries[key] = speech
        _total_bytes += size

        while _total_bytes > MAX_CACHE_BYTES and _entries:
            _, evicted = _entries.popitem(last=False)
            _total_bytes -= len(evicted.data)


def cache_stats() -> dict[str, int]:
    """Entries and bytes held, for tests and for a health check to report."""
    with _lock:
        return {"entries": len(_entries), "bytes": _total_bytes}


def clear_cache() -> None:
    """Drop everything. Used by tests, which must not share state."""
    global _total_bytes
    with _lock:
        _entries.clear()
        _total_bytes = 0

"""Streaming transcription over the Gemini Live API.

A spoken answer used to be recorded whole, uploaded, and transcribed in one
call, which meant several seconds of nothing after the student had already
stopped talking. This streams the audio as it is spoken and returns the words
in pieces, so the box fills while they speak.

Four things were established by testing rather than assumed, and each one shapes
the code below.

**The Live model is not on the `global` endpoint.** Connecting there is refused
outright. It answers in `us-central1`, which is a different region from the rest
of this application, so the client here is built separately rather than reusing
the shared one.

**It refuses text output.** `gemini-live-2.5-flash-native-audio` is a native
audio model and rejects `response_modalities=["TEXT"]` with a policy error, so
the session must ask for audio and simply discard what comes back. We want the
transcript of the student, never a reply to them: replying is the examiner's
job, and the examiner lives in the text pipeline with all the rules.

**Transcription is not continuous, and the turn has to be ours.** With automatic
activity detection on, the API closed the turn at the first pause, began
answering, and treated everything said afterwards as an interruption: four
sentences went in and one came out. With detection off and the turn marked
explicitly, the whole answer comes back correctly, and it comes back under a
second after the student stops, because the audio went up while they were
speaking. `ActivityHandling` and `TurnCoverage` were tried and changed nothing
measurable, so they are not set.

What this does not do is put words on screen while somebody is still talking.
The transcript is emitted per turn, and no arrangement of the settings changed
that. What it removes is the four second wait afterwards.

**A system instruction telling it to stay silent made it unreliable.** Two
identical runs gave different results with one, and identical results without
one. So there is none, and the model's spoken reply is thrown away instead.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

# What the browser sends and what the API expects, which are deliberately the
# same thing: 16 kHz mono signed 16-bit PCM, little endian.
INPUT_MIME_TYPE = "audio/pcm;rate=16000"

# One chunk of audio at a time. A hundred milliseconds is small enough that the
# first words come back quickly and large enough that a defense answer is not
# thousands of separate frames.
CHUNK_MS = 100
BYTES_PER_CHUNK = int(16_000 * 2 * CHUNK_MS / 1000)

# A spoken answer, with room to spare. The Live API also ends sessions of its
# own accord after about ten minutes, which this stays well inside.
MAX_STREAM_SECONDS = 300


@dataclass
class Transcript:
    """One stretch of speech, as the API finished hearing it."""

    text: str
    finished: bool


def live_client() -> Any:
    """A client for the region the Live model actually answers in."""
    from google import genai

    settings = get_settings()
    settings.require_gcp()
    return genai.Client(
        vertexai=settings.google_genai_use_vertexai,
        project=settings.google_cloud_project,
        location=settings.gemini_live_location,
    )


def live_config() -> Any:
    """The session configuration, kept in one place because each field was earned.

    `AUDIO` rather than `TEXT` because the model refuses text. No system
    instruction because adding one made transcription intermittent. Input
    transcription on, which is the only output of this session anyone reads.
    """
    from google.genai import types

    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        # Turn taking is ours, not the model's.
        #
        # With automatic detection on, the API closed the turn at the first
        # pause and began answering, and everything the student said after that
        # was treated as an interruption and never transcribed. Four sentences
        # went in and one came out. A student pausing for breath is not a
        # student who has finished, and only the student knows when they have.
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(disabled=True)
        ),
    )


def transcript_from(message: Any) -> Transcript | None:
    """Pull a transcript out of a Live message, ignoring everything else.

    Most of what arrives is the model's own spoken reply, which is discarded:
    answering the student is the examiner's job, and the examiner lives in the
    text pipeline where the rules are.
    """
    content = getattr(message, "server_content", None)
    if content is None:
        return None

    transcription = getattr(content, "input_transcription", None)
    if transcription is None or not getattr(transcription, "text", ""):
        return None

    return Transcript(
        text=str(transcription.text),
        finished=bool(getattr(transcription, "finished", False)),
    )


def chunks_of(audio: bytes, size: int = BYTES_PER_CHUNK) -> list[bytes]:
    """Split a buffer into frames of the size the API is fed.

    Sending a whole recording as one frame works and defeats the purpose: the
    transcript then arrives when the upload finishes, which is what streaming
    was meant to avoid.
    """
    if size <= 0:
        raise ValueError("A chunk size must be positive.")
    return [audio[at : at + size] for at in range(0, len(audio), size)]


async def stream_transcripts(
    session: Any,
    on_transcript: Callable[[Transcript], Any],
) -> None:
    """Read a Live session and hand every transcript to the caller.

    Ends when the session does. Errors are the caller's to handle, because only
    the caller knows whether there is still a browser to tell.
    """
    async for message in session.receive():
        transcript = transcript_from(message)
        if transcript is not None:
            await on_transcript(transcript)


async def send_audio(session: Any, chunks: AsyncIterator[bytes]) -> None:
    """Feed audio to a Live session, marking where the speech begins and ends.

    Automatic activity detection is off, so these markers are the only thing
    that tells the API a turn is under way. Without the closing one the last
    stretch of speech is never transcribed, and the last thing somebody says in
    a defense is usually the point of it.
    """
    from google.genai import types

    await session.send_realtime_input(activity_start=types.ActivityStart())
    try:
        async for chunk in chunks:
            if not chunk:
                continue
            await session.send_realtime_input(
                audio=types.Blob(data=chunk, mime_type=INPUT_MIME_TYPE)
            )
    finally:
        # In a finally block: a student who closes the tab mid-sentence still
        # leaves a session that can close itself down cleanly.
        await session.send_realtime_input(activity_end=types.ActivityEnd())

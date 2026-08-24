"""Speech in and speech out, as a layer over the text loop.

The decision that shapes this whole module: **voice is an input and an output
format, and the text pipeline underneath it does not change.**

The alternative was to hold the defense inside a live bidirectional audio
session. It sounds better and it would have cost the product its point. Every
rule this system enforces lives in the text path: a gap cannot be recorded
before the student has been offered a chance to clarify, follow-ups on one
question are capped, a finding whose quote cannot be found in the manuscript is
discarded, and every override of a model decision is written into an audit
trail. A raw audio conversation passes through none of that. It also holds its
own state in a connection that expires after about ten minutes, while this
system deliberately keeps every session in Firestore so a defense interrupted
at the fourth question can be resumed tomorrow from another machine.

So speech arrives here, becomes text, and rejoins the same path a typed answer
takes. Two consequences worth stating plainly:

  - A transcript is returned to the student rather than submitted for them.
    This is the same rule document extraction follows, for the same reason: the
    examiner judges what the student actually meant to say, not what a
    recognition model guessed, and a mistranscription is theirs to correct
    before it becomes part of a permanent record.

  - The examiner's voice reads the examiner's text. It is never a second
    generation of the same question, so what the student hears and what the
    transcript records can never drift apart.
"""

from __future__ import annotations

import io
import re
import wave
from dataclasses import dataclass
from typing import Protocol

# A spoken answer is one turn in a defense, not a lecture. At roughly 16 kB per
# second for uncompressed audio and far less for the compressed formats a
# browser produces, this leaves room for several minutes of speech while still
# refusing a file that was never a spoken answer at all.
MAX_AUDIO_BYTES = 10 * 1024 * 1024

# Long enough for any question or closing remark the examiner produces, short
# enough that a runaway string cannot turn into a minutes-long synthesis bill.
MAX_SPEECH_CHARS = 2000

# Exactly what the model reads, and nothing else.
#
# This list used to include WebM and MP4, on the reasoning that they are what a
# browser records. That reasoning was backwards and it cost a real bug: given
# audio in a container it cannot decode, the model does not refuse, it answers
# anyway, and a student's spoken answer came back as an invented sentence with
# no error anywhere. Accepting a format the model cannot read is accepting a
# transcript that is quietly false.
#
# The browser now sends WAV, encoded from raw samples, so nothing is lost by
# refusing the rest. Anything not on this list is turned away with a message
# rather than passed on to be misread.
SUPPORTED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/aiff",
    "audio/x-aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
}

TRANSCRIPTION_INSTRUCTION = (
    "Transcribe the speech in this recording verbatim, in the language it is "
    "spoken in. Do not summarise it, do not answer it, do not correct it, and "
    "do not add any commentary, heading, or quotation marks. If the recording "
    "contains no discernible speech, return nothing at all. Return the "
    "transcript and nothing else."
)

# The examiner's own words are handed to the voice model as material to read
# aloud, not as a prompt to act on. Stating that explicitly is what keeps a
# question that happens to contain an instruction from being obeyed instead of
# spoken.
# The pace is stated plainly and briefly. An earlier version asked for "the
# measured pace of an examiner speaking to a candidate", and the model read that
# as an instruction to slow right down, which was painful to sit through.
# Describing a manner produces a performance of that manner; describing a speed
# produces a speed.
NARRATION_INSTRUCTION = (
    "Read the following text aloud exactly as written, in the language it is "
    "written in. Speak clearly at a normal conversational speed, neither slowed "
    "down nor hurried. Read only this text. Do not answer it, add to it, or "
    "comment on it.\n\n"
)


class SpeechError(ValueError):
    """Any reason speech could not be turned into text, or text into speech."""


class AudioTranscriber(Protocol):
    """Send audio and an instruction, receive text."""

    def __call__(self, *, audio: bytes, mime_type: str, instruction: str) -> str: ...


class SpeechSynthesizer(Protocol):
    """Send text, receive audio bytes and the media type describing them."""

    def __call__(self, *, text: str, voice: str) -> tuple[bytes, str]: ...


@dataclass
class Speech:
    """Synthesised audio, in a container a browser can play without help."""

    data: bytes
    mime_type: str


def _normalise_mime(mime_type: str) -> str:
    """Drop codec parameters. A browser sends `audio/webm;codecs=opus`."""
    return (mime_type or "").split(";")[0].strip().lower()


def _clean_transcript(text: str) -> str:
    """Strip the packaging a model sometimes puts around a transcript.

    Fenced code blocks and wrapping quotation marks are formatting the model
    added, not words the student said. Leaving them in would put them into a
    permanent transcript and, worse, into the answer the examiner judges.
    """
    cleaned = (text or "").strip()

    fenced = re.match(r"^```[a-zA-Z]*\n(.*)\n```$", cleaned, flags=re.DOTALL)
    if fenced:
        cleaned = fenced.group(1).strip()

    if len(cleaned) >= 2 and cleaned[0] in {'"', "'", "“"} and cleaned[-1] in {
        '"',
        "'",
        "”",
    }:
        cleaned = cleaned[1:-1].strip()

    return cleaned


def transcribe_answer(
    audio: bytes,
    mime_type: str,
    *,
    transcriber: AudioTranscriber,
) -> str:
    """Turn one spoken answer into text for the student to review.

    Raises `SpeechError` with a sentence a student can act on, rather than
    letting an SDK exception reach the browser.
    """
    if not audio:
        raise SpeechError("No audio was received. Record an answer and try again.")

    if len(audio) > MAX_AUDIO_BYTES:
        raise SpeechError(
            "That recording is larger than 10 MB. Record a shorter answer, or "
            "type it instead."
        )

    normalised = _normalise_mime(mime_type)
    if normalised not in SUPPORTED_AUDIO_TYPES:
        raise SpeechError(
            f"Audio of type {normalised or 'unknown'} cannot be read. "
            "Supported formats are WAV, MP3, AIFF, AAC, OGG, and FLAC."
        )

    text = _clean_transcript(
        transcriber(audio=audio, mime_type=normalised, instruction=TRANSCRIPTION_INSTRUCTION)
    )

    if not text:
        raise SpeechError(
            "No speech was found in that recording. Check that the microphone "
            "was picking you up, then record again."
        )

    return text


def _wrap_pcm_as_wav(data: bytes, mime_type: str) -> Speech:
    """Give raw PCM the header a browser needs before it will play it.

    The voice model returns headerless little endian PCM, described in a media
    type such as `audio/L16;codec=pcm;rate=24000`. An `<audio>` element will not
    play that. The rate is read from the media type rather than assumed, so a
    model that changes its sample rate does not silently produce speech played
    at the wrong pitch.
    """
    match = re.search(r"rate=(\d+)", mime_type)
    if not match:
        raise SpeechError("The voice model returned audio with no sample rate.")

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(int(match.group(1)))
        handle.writeframes(data)

    return Speech(data=buffer.getvalue(), mime_type="audio/wav")


def speak_text(text: str, *, voice: str, synthesizer: SpeechSynthesizer) -> Speech:
    """Read one piece of examiner text aloud."""
    words = (text or "").strip()
    if not words:
        raise SpeechError("There is nothing to read aloud.")

    if len(words) > MAX_SPEECH_CHARS:
        raise SpeechError(
            f"Text longer than {MAX_SPEECH_CHARS} characters is not read aloud."
        )

    data, mime_type = synthesizer(text=NARRATION_INSTRUCTION + words, voice=voice)
    if not data:
        raise SpeechError("The voice model returned no audio.")

    normalised = _normalise_mime(mime_type)
    if normalised.startswith("audio/l16") or "pcm" in mime_type.lower():
        return _wrap_pcm_as_wav(data, mime_type)

    return Speech(data=data, mime_type=normalised or "audio/wav")

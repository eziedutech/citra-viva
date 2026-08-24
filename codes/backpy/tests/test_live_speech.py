"""The pure parts of streaming transcription.

Nothing here opens a socket or reaches a model. What is tested is the handling
that sits either side of the Live API, because that is where this feature can go
wrong quietly: a chunk size that turns streaming back into a single upload, and
a reader that mistakes the model's own reply for the student's words.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.speech.live import (
    BYTES_PER_CHUNK,
    CHUNK_MS,
    chunks_of,
    transcript_from,
)


@dataclass
class FakeTranscription:
    text: str
    finished: bool = False


@dataclass
class FakeContent:
    input_transcription: FakeTranscription | None = None
    output_transcription: FakeTranscription | None = None


@dataclass
class FakeMessage:
    server_content: FakeContent | None = None


def test_a_chunk_is_a_tenth_of_a_second_of_audio():
    """The number that decides whether this streams or merely uploads.

    Sixteen kilohertz, sixteen bits, one channel: 3200 bytes is 100 ms. Sending
    a whole recording as one frame works perfectly and returns the transcript
    when the upload finishes, which is the thing streaming exists to avoid.
    """
    assert CHUNK_MS == 100
    assert BYTES_PER_CHUNK == 3200


def test_audio_is_split_into_frames_of_that_size():
    audio = b"\x00\x01" * (BYTES_PER_CHUNK * 2)  # four chunks worth

    frames = chunks_of(audio)

    assert len(frames) == 4
    assert all(len(frame) == BYTES_PER_CHUNK for frame in frames)
    assert b"".join(frames) == audio


def test_a_final_short_frame_is_kept():
    """Speech does not end on a chunk boundary, and the tail is often the point."""
    audio = b"\x00\x01" * (BYTES_PER_CHUNK // 2 + 40)

    frames = chunks_of(audio)

    assert b"".join(frames) == audio
    assert len(frames[-1]) < BYTES_PER_CHUNK


def test_an_empty_recording_produces_no_frames():
    assert chunks_of(b"") == []


def test_a_chunk_size_of_zero_is_refused():
    """Otherwise the split loops forever on the first byte."""
    with pytest.raises(ValueError):
        chunks_of(b"abc", size=0)


def test_the_students_words_are_read():
    message = FakeMessage(
        server_content=FakeContent(
            input_transcription=FakeTranscription(text="I accept the limit.", finished=True)
        )
    )

    transcript = transcript_from(message)

    assert transcript is not None
    assert transcript.text == "I accept the limit."
    assert transcript.finished is True


def test_the_models_own_reply_is_not_mistaken_for_the_students_words():
    """The session speaks back and there is no way to stop it.

    The model refuses text output, so it always answers aloud. Reading its reply
    into the answer box would put words the student never said into the record
    they are about to submit as their defense.
    """
    message = FakeMessage(
        server_content=FakeContent(
            output_transcription=FakeTranscription(text="That is a fair point.")
        )
    )

    assert transcript_from(message) is None


def test_a_message_carrying_nothing_is_ignored():
    assert transcript_from(FakeMessage()) is None
    assert transcript_from(FakeMessage(server_content=FakeContent())) is None


def test_an_empty_transcript_is_ignored():
    """The API sends these, and appending one adds nothing but a wasted render."""
    message = FakeMessage(
        server_content=FakeContent(input_transcription=FakeTranscription(text=""))
    )

    assert transcript_from(message) is None

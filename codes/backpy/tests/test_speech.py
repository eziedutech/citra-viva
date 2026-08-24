"""Speech layer tests.

Every one of these runs with a fake transcriber and a fake voice, so the suite
stays offline, free, and immune to quota. What is being tested is not whether
Gemini can hear: it is the set of rules around the model, and those are the
part that can quietly break.

Two of them exist because of what would happen if they failed. If a transcript
arrived wrapped in a code fence or in quotation marks, that packaging would be
sent to the examiner as part of the student's answer and then written into a
permanent record of the defense. And if the sample rate were assumed rather
than read from what the model returned, a change on Google's side would not
raise anything: the examiner would simply start speaking at the wrong pitch.
"""

from __future__ import annotations

import io
import wave

import pytest

from app.speech.voice import (
    MAX_AUDIO_BYTES,
    MAX_SPEECH_CHARS,
    NARRATION_INSTRUCTION,
    SpeechError,
    speak_text,
    transcribe_answer,
)

ANSWER = (
    "The sample covers one faculty only, so I accept the limit on external "
    "validity. The mechanism I am testing is cognitive rather than institutional."
)

AUDIO = b"\x00\x01" * 512


def transcriber_returning(text: str):
    """A transcriber that answers with `text` and records how it was called."""
    calls: list[dict] = []

    def fake(*, audio: bytes, mime_type: str, instruction: str) -> str:
        calls.append({"audio": audio, "mime_type": mime_type, "instruction": instruction})
        return text

    fake.calls = calls  # type: ignore[attr-defined]
    return fake


def voice_returning(data: bytes, mime_type: str):
    calls: list[dict] = []

    def fake(*, text: str, voice: str) -> tuple[bytes, str]:
        calls.append({"text": text, "voice": voice})
        return data, mime_type

    fake.calls = calls  # type: ignore[attr-defined]
    return fake


# --------------------------------------------------------------------- speech in


def test_transcript_is_returned_unchanged():
    result = transcribe_answer(AUDIO, "audio/webm", transcriber=transcriber_returning(ANSWER))
    assert result == ANSWER


def test_codec_parameters_are_stripped_from_the_media_type():
    """A browser sends `audio/webm;codecs=opus`, which is not a type on its own."""
    fake = transcriber_returning(ANSWER)
    transcribe_answer(AUDIO, "audio/webm;codecs=opus", transcriber=fake)
    assert fake.calls[0]["mime_type"] == "audio/webm"


def test_a_fenced_transcript_is_unwrapped():
    fake = transcriber_returning(f"```\n{ANSWER}\n```")
    assert transcribe_answer(AUDIO, "audio/webm", transcriber=fake) == ANSWER


def test_a_quoted_transcript_is_unwrapped():
    fake = transcriber_returning(f'"{ANSWER}"')
    assert transcribe_answer(AUDIO, "audio/webm", transcriber=fake) == ANSWER


def test_silence_is_reported_rather_than_sent_on_as_an_empty_answer():
    with pytest.raises(SpeechError, match="No speech"):
        transcribe_answer(AUDIO, "audio/webm", transcriber=transcriber_returning("   "))


def test_empty_audio_is_refused():
    with pytest.raises(SpeechError, match="No audio"):
        transcribe_answer(b"", "audio/webm", transcriber=transcriber_returning(ANSWER))


def test_oversized_audio_is_refused_before_it_reaches_the_model():
    fake = transcriber_returning(ANSWER)
    with pytest.raises(SpeechError, match="10 MB"):
        transcribe_answer(b"x" * (MAX_AUDIO_BYTES + 1), "audio/webm", transcriber=fake)
    assert fake.calls == []


def test_an_unsupported_media_type_is_refused():
    with pytest.raises(SpeechError, match="cannot be read"):
        transcribe_answer(AUDIO, "video/mp4", transcriber=transcriber_returning(ANSWER))


# -------------------------------------------------------------------- speech out


def test_raw_pcm_is_given_a_wav_header_at_the_rate_the_model_reported():
    frames = b"\x00\x01" * 2400
    speech = speak_text(
        "Why should that generalise?",
        voice="Charon",
        synthesizer=voice_returning(frames, "audio/L16;codec=pcm;rate=24000"),
    )

    assert speech.mime_type == "audio/wav"
    with wave.open(io.BytesIO(speech.data), "rb") as handle:
        assert handle.getframerate() == 24000
        assert handle.getnchannels() == 1
        assert handle.getsampwidth() == 2
        assert handle.readframes(handle.getnframes()) == frames


def test_a_different_sample_rate_is_honoured_rather_than_assumed():
    speech = speak_text(
        "Why should that generalise?",
        voice="Charon",
        synthesizer=voice_returning(b"\x00\x01" * 1600, "audio/L16;codec=pcm;rate=16000"),
    )
    with wave.open(io.BytesIO(speech.data), "rb") as handle:
        assert handle.getframerate() == 16000


def test_audio_that_already_has_a_container_is_passed_through():
    speech = speak_text(
        "Why should that generalise?",
        voice="Charon",
        synthesizer=voice_returning(b"OggS-payload", "audio/ogg"),
    )
    assert speech.mime_type == "audio/ogg"
    assert speech.data == b"OggS-payload"


def test_the_examiner_text_reaches_the_voice_model_intact():
    """The words spoken have to be the words in the transcript, verbatim."""
    fake = voice_returning(b"\x00\x01" * 100, "audio/L16;codec=pcm;rate=24000")
    question = "Your sample was drawn from one faculty. Why should that generalise?"
    speak_text(question, voice="Charon", synthesizer=fake)

    sent = fake.calls[0]["text"]
    assert sent == NARRATION_INSTRUCTION + question
    assert fake.calls[0]["voice"] == "Charon"


def test_empty_text_is_refused():
    fake = voice_returning(b"\x00\x01", "audio/L16;codec=pcm;rate=24000")
    with pytest.raises(SpeechError, match="nothing to read"):
        speak_text("   ", voice="Charon", synthesizer=fake)
    assert fake.calls == []


def test_runaway_text_is_refused_before_it_becomes_a_synthesis_bill():
    fake = voice_returning(b"\x00\x01", "audio/L16;codec=pcm;rate=24000")
    with pytest.raises(SpeechError, match=str(MAX_SPEECH_CHARS)):
        speak_text("a" * (MAX_SPEECH_CHARS + 1), voice="Charon", synthesizer=fake)
    assert fake.calls == []


def test_pcm_without_a_declared_rate_fails_loudly():
    """Guessing here would produce speech at the wrong pitch, silently."""
    with pytest.raises(SpeechError, match="sample rate"):
        speak_text(
            "Why should that generalise?",
            voice="Charon",
            synthesizer=voice_returning(b"\x00\x01" * 100, "audio/L16;codec=pcm"),
        )


def test_no_audio_from_the_model_is_reported_rather_than_played_as_silence():
    with pytest.raises(SpeechError, match="no audio"):
        speak_text(
            "Why should that generalise?",
            voice="Charon",
            synthesizer=voice_returning(b"", "audio/L16;codec=pcm;rate=24000"),
        )

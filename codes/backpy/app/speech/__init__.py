"""Speech in and speech out, layered over the unchanged text pipeline."""

from app.speech.voice import (
    MAX_AUDIO_BYTES,
    MAX_SPEECH_CHARS,
    SUPPORTED_AUDIO_TYPES,
    Speech,
    SpeechError,
    speak_text,
    transcribe_answer,
)

__all__ = [
    "MAX_AUDIO_BYTES",
    "MAX_SPEECH_CHARS",
    "SUPPORTED_AUDIO_TYPES",
    "Speech",
    "SpeechError",
    "speak_text",
    "transcribe_answer",
]

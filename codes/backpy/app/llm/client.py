"""Access to Gemini through the Gemini Enterprise Agent Platform.

Calls go through `client.models.generate_content`, the path Google's own
documentation recommends for stable deployments. Structured output is enforced
with a Pydantic `response_schema`.

The client is constructed lazily so that importing this module requires no
credentials, which is what lets the Draft Analyzer unit tests run entirely
offline.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Protocol

from pydantic import BaseModel

from app.config import get_settings
from app.llm.retry import call_with_retry


class ModelRunner(Protocol):
    """The narrow contract between an agent and the model.

    An agent needs exactly one thing: send a prompt, receive a JSON string.
    Keeping the surface this small is what makes agent logic testable with a
    fake runner, with no network and no cost.
    """

    def __call__(self, *, prompt: str, response_schema: type[BaseModel]) -> str: ...


@lru_cache
def get_genai_client():
    """Build a google-genai client pointed at Agent Platform."""
    from google import genai  # local import keeps this module cheap to load

    settings = get_settings()
    settings.require_gcp()
    return genai.Client(
        vertexai=settings.google_genai_use_vertexai,
        project=settings.google_cloud_project,
        location=settings.google_cloud_location,
    )


class GeminiRunner:
    """The production implementation of `ModelRunner`, backed by google-genai."""

    def __init__(self, model: str | None = None) -> None:
        settings = get_settings()
        self.model = model or settings.gemini_model
        self._settings = settings

    def __call__(self, *, prompt: str, response_schema: type[BaseModel]) -> str:
        from google.genai import types

        client = get_genai_client()
        config = types.GenerateContentConfig(
            temperature=self._settings.gemini_temperature,
            max_output_tokens=self._settings.gemini_max_output_tokens,
            response_mime_type="application/json",
            response_schema=response_schema,
        )

        response = call_with_retry(
            lambda: client.models.generate_content(
                model=self.model, contents=prompt, config=config
            ),
            max_attempts=self._settings.gemini_max_retries,
            base_delay=self._settings.gemini_retry_base_delay,
        )
        text = response.text
        if not text:
            raise RuntimeError(
                "The model returned an empty response. Check quota and region in .env."
            )
        return text


class GeminiTranscriber:
    """Speech to text, through the same client as everything else.

    One HTTP request per spoken turn, deliberately. A live audio socket would
    add a second place for session state to live and a connection that expires
    part way through a defense, and buy nothing: the transcript still has to
    reach the student for review before it is judged.
    """

    def __init__(self, model: str | None = None) -> None:
        settings = get_settings()
        self.model = model or settings.gemini_speech_model
        self._settings = settings

    def __call__(self, *, audio: bytes, mime_type: str, instruction: str) -> str:
        from google.genai import types

        client = get_genai_client()
        response = call_with_retry(
            lambda: client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=audio, mime_type=mime_type),
                    instruction,
                ],
                # A transcript has one correct answer. Sampling would only
                # introduce differences between what was said and what is
                # recorded.
                config=types.GenerateContentConfig(temperature=0.0),
            ),
            max_attempts=self._settings.gemini_max_retries,
            base_delay=self._settings.gemini_retry_base_delay,
        )
        return response.text or ""


class GeminiVoice:
    """Text to speech, returning the audio bytes and their media type."""

    def __init__(self, model: str | None = None) -> None:
        settings = get_settings()
        self.model = model or settings.gemini_voice_model
        self._settings = settings

    def __call__(self, *, text: str, voice: str) -> tuple[bytes, str]:
        from google.genai import types

        client = get_genai_client()
        response = call_with_retry(
            lambda: client.models.generate_content(
                model=self.model,
                contents=text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voice
                            )
                        )
                    ),
                ),
            ),
            max_attempts=self._settings.gemini_max_retries,
            base_delay=self._settings.gemini_retry_base_delay,
        )

        for candidate in response.candidates or []:
            for part in (candidate.content.parts if candidate.content else []) or []:
                blob = getattr(part, "inline_data", None)
                if blob and blob.data:
                    return blob.data, blob.mime_type or ""

        raise RuntimeError("The voice model returned no audio. Check quota and region in .env.")

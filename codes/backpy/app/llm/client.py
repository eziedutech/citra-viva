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

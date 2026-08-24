"""ADK reads the environment, and this project's configuration is not in it.

The failure this prevents was misleading in the worst way. An ADK run inside a
fully configured Google Cloud project reported "No API key was provided" and
linked to the Gemini Developer API documentation, because ADK could see no Agent
Platform settings and fell back to a different product. Nothing in that message
points at the actual cause, which is that pydantic-settings reads a `.env` file
into an object and never touches `os.environ`.
"""

from __future__ import annotations

import pytest

from app.config import Settings, get_settings
from app.llm.adk_env import LOCATION, PROJECT, USE_VERTEXAI, configure_adk_environment


@pytest.fixture
def configured(monkeypatch):
    """Settings and a clean environment, neither of them the real ones."""

    def apply(**overrides):
        values = {
            "google_cloud_project": "test-project",
            "google_cloud_location": "global",
            "google_genai_use_vertexai": True,
            **overrides,
        }
        replacement = Settings(**values)
        monkeypatch.setattr("app.llm.adk_env.get_settings", lambda: replacement)
        return replacement

    for name in (USE_VERTEXAI, PROJECT, LOCATION):
        monkeypatch.delenv(name, raising=False)

    get_settings.cache_clear()
    yield apply
    get_settings.cache_clear()


def test_the_settings_are_published_into_the_environment(configured, monkeypatch):
    configured()

    published = configure_adk_environment()

    assert published[PROJECT] == "test-project"
    assert published[LOCATION] == "global"
    assert published[USE_VERTEXAI] == "true"


def test_an_environment_already_set_is_never_overwritten(configured, monkeypatch):
    """A deployment that sets these means it.

    Agent Runtime supplies its own project and location, and a local .env file
    finding its way into that process must not redirect it somewhere else.
    """
    configured()
    monkeypatch.setenv(PROJECT, "deployed-project")
    monkeypatch.setenv(LOCATION, "us-central1")

    published = configure_adk_environment()

    assert published[PROJECT] == "deployed-project"
    assert published[LOCATION] == "us-central1"


def test_the_agent_platform_flag_can_be_turned_off(configured):
    configured(google_genai_use_vertexai=False)

    assert configure_adk_environment()[USE_VERTEXAI] == "false"


def test_a_missing_project_fails_with_a_readable_message(configured):
    """Better here than as an authentication error three layers deeper."""
    configured(google_cloud_project="")

    with pytest.raises(RuntimeError, match="GOOGLE_CLOUD_PROJECT"):
        configure_adk_environment()

"""Make the ADK runtime see the same configuration the rest of the app uses.

Everything else here reaches Gemini through `app.llm.client`, which builds a
`genai.Client` with the project, location, and Agent Platform flag passed in
explicitly. ADK does not take a client. It constructs its own from process
environment variables, and configuration in this project lives in a `.env` file
read by pydantic-settings, which never touches `os.environ`.

The result was a failure that pointed in exactly the wrong direction: an ADK run
inside a fully configured project reported "No API key was provided" and linked
to the Gemini Developer API, because ADK could see no Agent Platform settings and
fell back to the other product entirely.

So the settings are copied across before an ADK agent runs. Anything already set
in the environment wins, since a deployment that sets these deliberately, such as
Agent Runtime, must not have them overwritten by a local file.
"""

from __future__ import annotations

import os

from app.config import get_settings

# The three ADK reads to decide which Gemini it is talking to.
USE_VERTEXAI = "GOOGLE_GENAI_USE_VERTEXAI"
PROJECT = "GOOGLE_CLOUD_PROJECT"
LOCATION = "GOOGLE_CLOUD_LOCATION"


def configure_adk_environment() -> dict[str, str]:
    """Publish the project's Gemini settings into the process environment.

    Returns what the environment holds afterwards, so a caller can print it or
    assert on it rather than guess which Gemini an agent reached.
    """
    settings = get_settings()
    settings.require_gcp()

    wanted = {
        USE_VERTEXAI: "true" if settings.google_genai_use_vertexai else "false",
        PROJECT: settings.google_cloud_project,
        LOCATION: settings.google_cloud_location,
    }

    for name, value in wanted.items():
        if value and not os.environ.get(name):
            os.environ[name] = value

    return {name: os.environ.get(name, "") for name in wanted}

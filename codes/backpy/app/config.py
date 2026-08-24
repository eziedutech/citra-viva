"""Application configuration. Every value comes from an environment variable.

No credential and no project identifier is ever hardcoded. See `.env.example`
for the full list of variables the application reads.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Google Cloud and Agent Platform
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_genai_use_vertexai: bool = True

    # Model
    gemini_model: str = "gemini-3.5-flash"
    gemini_temperature: float = 0.2
    gemini_max_output_tokens: int = 16384
    gemini_max_retries: int = 4
    gemini_retry_base_delay: float = 2.0

    # Voice. Speech is a layer over the text loop, never a replacement for it,
    # so these are two ordinary models rather than a live audio session. See
    # app/speech/voice.py for why that choice was made.
    gemini_speech_model: str = "gemini-3.5-flash"
    gemini_voice_model: str = "gemini-2.5-flash-tts"
    gemini_voice_name: str = "Charon"

    # Streaming transcription. The Live model is refused on the `global`
    # endpoint and answers in us-central1, so it carries its own location
    # rather than borrowing the one every other call uses.
    gemini_live_model: str = "gemini-live-2.5-flash-native-audio"
    gemini_live_location: str = "us-central1"

    # Origins allowed to open the streaming socket. Comma separated, and empty
    # by default so a local run stays closed until it says otherwise.
    allowed_web_origins: str = ""

    # Firestore
    firestore_database: str = "(default)"

    # Authentication
    # Off by default so the test suite and a bare local backend run without a
    # Firebase project. Every deployment sets it explicitly.
    auth_required: bool = False
    firebase_project_id: str = ""

    # Application
    app_env: str = "local"
    log_level: str = "INFO"

    # Observability. One span per agent call, exported to Cloud Trace. Off by
    # default so a local run and the test suite export nothing and need no
    # credentials for it.
    enable_cloud_trace: bool = False

    def require_gcp(self) -> None:
        """Fail early with a readable message instead of an SDK stack trace."""
        if not self.google_cloud_project:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT is not set. Copy .env.example to .env and "
                "fill in your project id."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()

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

    # Firestore
    firestore_database: str = "(default)"

    # Cloud Storage
    gcs_draft_bucket: str = ""

    # Agent Runtime
    agent_staging_bucket: str = ""

    # Application
    app_env: str = "local"
    log_level: str = "INFO"
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

"""
Application configuration loaded from environment variables.

Uses pydantic-settings to validate and type-check all config values at startup.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the Climate Hazard Trend Analyzer backend."""

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "climate_hazard_analyzer"

    # Open-Meteo Historical Weather API
    openmeteo_base_url: str = "https://archive-api.open-meteo.com/v1/archive"

    # Analysis versioning — bump when hazard-detection logic changes so that
    # stale cached results are automatically bypassed.
    analysis_version: str = "1.0.0"

    # CORS origins (comma-separated in .env, parsed as list)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# Module-level singleton — import this everywhere.
settings = Settings()

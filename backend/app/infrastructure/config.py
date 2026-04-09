"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration."""

    database_url: str | None = None
    app_name: str = "FinLog"
    debug: bool = False
    
    # LLM Settings (Optional for fallback)
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model_name: str = "gpt-4o-mini"

    # Supabase Auth Settings
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_jwt_secret: str | None = None
    admin_email: str = ""  # First admin auto-promoted on login

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()

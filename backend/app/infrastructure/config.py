"""Application settings loaded from environment variables."""

from __future__ import annotations

from datetime import timezone, timedelta
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration."""

    database_url: str | None = None
    app_name: str = "KedenFlow"
    debug: bool = False
    
    # LLM Settings (Optional for fallback)
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model_name: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # Supabase Auth Settings
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_jwt_secret: str | None = None
    admin_email: str = ""  # First admin auto-promoted on login

    # Telegram Support Notifications
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Default timezone for the application (UTC+5)
APP_TZ = timezone(timedelta(hours=5))


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()

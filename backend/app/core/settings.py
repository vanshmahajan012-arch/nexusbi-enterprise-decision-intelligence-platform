from functools import lru_cache

from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_name: str = "NXUS BI API"
    app_version: str = "0.1.0"
    environment: str = "development"

    api_host: str = "127.0.0.1"
    api_port: int = 8000

    # ---------------------------------------------------------
    # AI Providers
    # ---------------------------------------------------------

    gemini_api_key: str | None = Field(
        default=None,
        alias="GEMINI_API_KEY",
    )

    openrouter_api_key: str | None = Field(
        default=None,
        alias="OPENROUTER_API_KEY",
    )

    # ---------------------------------------------------------
    # Supabase
    # ---------------------------------------------------------

    supabase_url: str | None = Field(
        default=None,
        alias="SUPABASE_URL",
    )

    supabase_anon_key: str | None = Field(
        default=None,
        alias="SUPABASE_ANON_KEY",
    )

    supabase_service_role_key: str | None = Field(
        default=None,
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )

    supabase_db_password: str | None = Field(
        default=None,
        alias="SUPABASE_DB_PASSWORD",
    )

    supabase_db_host: str | None = Field(
        default=None,
        alias="SUPABASE_DB_HOST",
    )

    supabase_db_port: int = Field(
        default=5432,
        alias="SUPABASE_DB_PORT",
    )

    supabase_db_name: str = Field(
        default="postgres",
        alias="SUPABASE_DB_NAME",
    )

    supabase_db_user: str = Field(
        default="postgres",
        alias="SUPABASE_DB_USER",
    )

    # ---------------------------------------------------------
    # Email / Security Notifications
    # ---------------------------------------------------------

    resend_api_key: str | None = Field(
        default=None,
        alias="RESEND_API_KEY",
    )

    security_alert_email: str | None = Field(
        default=None,
        alias="SECURITY_ALERT_EMAIL",
    )

    security_alert_from: str | None = Field(
        default=None,
        alias="SECURITY_ALERT_FROM",
    )

    # ---------------------------------------------------------
    # Market Data
    # ---------------------------------------------------------

    twelve_data_api_key: str | None = Field(
        default=None,
        alias="TWELVE_DATA_API_KEY",
    )

    # ---------------------------------------------------------
    # Environment configuration
    # ---------------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
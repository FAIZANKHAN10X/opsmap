"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the OpsMap API."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "OpsMap"
    app_env: str = "development"
    app_debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_v1_prefix: str = "/api/v1"

    # Database (Supabase PostgreSQL). Empty until configured.
    database_url: str = ""

    # Redis (Phase 9 — RQ workers)
    redis_url: str = "redis://localhost:6379/0"
    rq_job_timeout: str = "10m"
    rq_result_ttl: int = 86400  # 24h
    rq_failure_ttl: int = 604800  # 7d

    # Image derivatives (Phase 9)
    image_max_edge: int = 1920  # max dimension for resized derivative
    thumbnail_max_edge: int = 256  # max dimension for thumbnail

    # Email jobs (Phase 9) — SMTP optional; without it jobs log only
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "opsmap@localhost"
    smtp_use_tls: bool = True

    # Supabase (placeholders for later phases)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # AI (optional)
    openai_api_key: str = ""

    # Document uploads (Phase 8) — local filesystem; path relative to process cwd
    upload_dir: str = "uploads"
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MiB
    # Generated reports land under upload_dir/reports/
    report_dir: str = "reports"

    # CORS — comma-separated origins in env, or default local frontend
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in {"development", "dev", "local"}


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "Handwrite2KaTeX API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://h2k:h2kpassword@localhost:5432/handwrite2katex"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-strong-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.2-11b-vision-preview"

    # Mathpix (fallback)
    MATHPIX_APP_ID: str = ""
    MATHPIX_APP_KEY: str = ""

    # Storage (S3 / MinIO)
    STORAGE_BACKEND: Literal["s3", "minio", "local"] = "local"
    S3_BUCKET_NAME: str = "handwrite2katex"
    S3_REGION: str = "ap-northeast-2"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    MINIO_ENDPOINT: str = "http://localhost:9000"
    LOCAL_STORAGE_PATH: str = "/tmp/h2k_storage"

    # Image processing
    MAX_IMAGE_SIZE_MB: int = 5
    MIN_IMAGE_DIMENSION: int = 64
    MAX_IMAGE_DIMENSION: int = 2048

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Network
    SSL_VERIFY: bool = True

    # Local model
    USE_LOCAL_MODEL: bool = False

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

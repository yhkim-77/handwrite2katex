from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import api_router
from app.core.config import settings
from app.core.database import engine
from app.models import User, FormulaHistory  # ensure models are imported for Alembic
from app.services.recognizer import LocalRecognizer


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.STORAGE_BACKEND == "local":
        os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    if settings.USE_LOCAL_MODEL:
        await LocalRecognizer.preload()
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes
    app.include_router(api_router)

    # Serve locally stored images
    if settings.STORAGE_BACKEND == "local":
        os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
        app.mount(
            "/storage",
            StaticFiles(directory=settings.LOCAL_STORAGE_PATH),
            name="storage",
        )

    @app.get("/health", tags=["health"])
    async def health() -> dict:
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()

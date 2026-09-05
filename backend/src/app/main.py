from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import Settings, get_settings
from app.core.errors import AppError, app_error_handler, unhandled_error_handler
from app.core.logging import configure_logging
from app.middleware.errors import ErrorResponseMiddleware
from app.middleware.request_id import RequestIdMiddleware

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        configure_logging(active_settings.log_level)
        logger.info("Starting %s in %s mode", active_settings.app_name, active_settings.environment)
        yield
        logger.info("Stopping %s", active_settings.app_name)

    app = FastAPI(
        title=active_settings.app_name,
        version=active_settings.version,
        docs_url=None if active_settings.is_production else "/docs",
        redoc_url=None if active_settings.is_production else "/redoc",
        openapi_url=None if active_settings.is_production else "/openapi.json",
        lifespan=lifespan,
    )

    def resolve_settings() -> Settings:
        return active_settings

    app.dependency_overrides[get_settings] = resolve_settings
    # Added middleware wraps earlier entries: request ID -> CORS -> error translation.
    app.add_middleware(ErrorResponseMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(active_settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()

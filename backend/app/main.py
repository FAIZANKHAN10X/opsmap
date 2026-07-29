"""OpsMap FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.api.v1 import health as health_module
from app.core.logging import configure_logging, get_logger
from app.core.settings import get_settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_application: FastAPI):
    """Application lifespan hooks. Logging is configured before yield."""
    settings = get_settings()
    configure_logging(
        level="DEBUG" if settings.app_debug else "INFO",
        json_logs=not settings.is_development,
    )
    logger.info(
        "application_started",
        extra={"environment": settings.app_env, "service": settings.app_name},
    )
    yield


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    # Configure logging early so import-time / startup errors are structured.
    configure_logging(
        level="DEBUG" if settings.app_debug else "INFO",
        json_logs=not settings.is_development,
    )

    application = FastAPI(
        title=settings.app_name,
        description="Operations management platform API",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)

    # Unversioned health for load balancers / docker healthchecks
    application.include_router(health_module.router, tags=["health"])

    # Versioned API surface
    application.include_router(api_router)

    return application


app = create_app()

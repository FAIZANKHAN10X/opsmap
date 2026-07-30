"""Health check endpoints for readiness and liveness probes."""

from fastapi import APIRouter

from app.core.queue import ping_redis
from app.core.settings import get_settings

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    """Return service health. Unauthenticated by design."""
    settings = get_settings()
    redis_ok = ping_redis()
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": settings.app_name,
            "environment": settings.app_env,
            "redis": "ok" if redis_ok else "unavailable",
        },
        "message": None,
    }

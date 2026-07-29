"""Health check endpoints for readiness and liveness probes."""

from fastapi import APIRouter

from app.core.settings import get_settings

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    """Return service health. Unauthenticated by design."""
    settings = get_settings()
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": settings.app_name,
            "environment": settings.app_env,
        },
        "message": None,
    }

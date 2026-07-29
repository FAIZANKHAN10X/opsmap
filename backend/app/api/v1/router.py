"""Aggregate v1 routers."""

from fastapi import APIRouter

from app.api.v1 import (
    asset_statuses,
    asset_types,
    assets,
    health,
    projects,
)

api_v1_router = APIRouter()
api_v1_router.include_router(health.router, tags=["health"])
api_v1_router.include_router(projects.router)
api_v1_router.include_router(assets.router)
api_v1_router.include_router(asset_types.router)
api_v1_router.include_router(asset_statuses.router)

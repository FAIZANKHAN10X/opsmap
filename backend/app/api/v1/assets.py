"""Asset REST endpoints."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.services.asset import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=ListResponse[AssetRead])
def list_assets(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    project_id: UUID | None = None,
    asset_type_id: UUID | None = None,
    asset_status_id: UUID | None = None,
    search: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, description="Status slug"),
    type: str | None = Query(default=None, description="Type slug"),
    owner: str | None = None,
    assigned_to: str | None = Query(
        default=None,
        description="Employee / assignee name",
    ),
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    sort: Literal["name", "code", "owner", "created_at", "updated_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    db: Session = Depends(get_db),
) -> ListResponse[AssetRead]:
    items, total = AssetService(db).list(
        page=page,
        limit=limit,
        project_id=project_id,
        asset_type_id=asset_type_id,
        asset_status_id=asset_status_id,
        type_slug=type,
        status_slug=status,
        search=search,
        owner=owner,
        assigned_to=assigned_to,
        created_after=created_after,
        created_before=created_before,
        sort=sort,
        order=order,
    )
    return ListResponse(
        data=[AssetRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get("/{asset_id}", response_model=DataResponse[AssetRead])
def get_asset(
    asset_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[AssetRead]:
    asset = AssetService(db).get(asset_id)
    return DataResponse(data=AssetRead.model_validate(asset))


@router.post(
    "",
    response_model=DataResponse[AssetRead],
    status_code=status.HTTP_201_CREATED,
)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetRead]:
    asset = AssetService(db).create(payload)
    return DataResponse(data=AssetRead.model_validate(asset))


@router.patch("/{asset_id}", response_model=DataResponse[AssetRead])
def update_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetRead]:
    asset = AssetService(db).update(asset_id, payload)
    return DataResponse(data=AssetRead.model_validate(asset))


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    AssetService(db).delete(asset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

"""Asset status REST endpoints — Status Engine."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.asset_status import (
    AssetStatusCreate,
    AssetStatusRead,
    AssetStatusUpdate,
)
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.services.asset_status import AssetStatusService

router = APIRouter(prefix="/asset-statuses", tags=["asset-statuses"])


@router.get("", response_model=ListResponse[AssetStatusRead])
def list_asset_statuses(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ListResponse[AssetStatusRead]:
    items, total = AssetStatusService(db).list(page=page, limit=limit)
    return ListResponse(
        data=[AssetStatusRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.post(
    "/seed-defaults",
    response_model=ListResponse[AssetStatusRead],
    status_code=status.HTTP_200_OK,
)
def seed_default_asset_statuses(
    db: Session = Depends(get_db),
) -> ListResponse[AssetStatusRead]:
    """Idempotently create missing default operational statuses."""
    created = AssetStatusService(db).seed_defaults()
    # Return full active list after seed so clients refresh UI from one call.
    items, total = AssetStatusService(db).list(page=1, limit=100)
    return ListResponse(
        data=[AssetStatusRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=1, limit=100, total=total),
        message=f"Created {len(created)} default status(es)."
        if created
        else "Defaults already present.",
    )


@router.get("/{asset_status_id}", response_model=DataResponse[AssetStatusRead])
def get_asset_status(
    asset_status_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[AssetStatusRead]:
    asset_status = AssetStatusService(db).get(asset_status_id)
    return DataResponse(data=AssetStatusRead.model_validate(asset_status))


@router.post(
    "",
    response_model=DataResponse[AssetStatusRead],
    status_code=status.HTTP_201_CREATED,
)
def create_asset_status(
    payload: AssetStatusCreate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetStatusRead]:
    asset_status = AssetStatusService(db).create(payload)
    return DataResponse(data=AssetStatusRead.model_validate(asset_status))


@router.patch("/{asset_status_id}", response_model=DataResponse[AssetStatusRead])
def update_asset_status(
    asset_status_id: UUID,
    payload: AssetStatusUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetStatusRead]:
    asset_status = AssetStatusService(db).update(asset_status_id, payload)
    return DataResponse(data=AssetStatusRead.model_validate(asset_status))


@router.delete(
    "/{asset_status_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_asset_status(
    asset_status_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    AssetStatusService(db).delete(asset_status_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

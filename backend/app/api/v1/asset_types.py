"""Asset type REST endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.asset_type import AssetTypeCreate, AssetTypeRead, AssetTypeUpdate
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.services.asset_type import AssetTypeService

router = APIRouter(prefix="/asset-types", tags=["asset-types"])


@router.get("", response_model=ListResponse[AssetTypeRead])
def list_asset_types(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ListResponse[AssetTypeRead]:
    items, total = AssetTypeService(db).list(page=page, limit=limit)
    return ListResponse(
        data=[AssetTypeRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get("/{asset_type_id}", response_model=DataResponse[AssetTypeRead])
def get_asset_type(
    asset_type_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[AssetTypeRead]:
    asset_type = AssetTypeService(db).get(asset_type_id)
    return DataResponse(data=AssetTypeRead.model_validate(asset_type))


@router.post(
    "",
    response_model=DataResponse[AssetTypeRead],
    status_code=status.HTTP_201_CREATED,
)
def create_asset_type(
    payload: AssetTypeCreate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetTypeRead]:
    asset_type = AssetTypeService(db).create(payload)
    return DataResponse(data=AssetTypeRead.model_validate(asset_type))


@router.patch("/{asset_type_id}", response_model=DataResponse[AssetTypeRead])
def update_asset_type(
    asset_type_id: UUID,
    payload: AssetTypeUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[AssetTypeRead]:
    asset_type = AssetTypeService(db).update(asset_type_id, payload)
    return DataResponse(data=AssetTypeRead.model_validate(asset_type))

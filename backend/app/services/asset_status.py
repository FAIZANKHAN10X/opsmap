"""Asset status business logic."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.asset_status import AssetStatus
from app.repositories.asset_status import AssetStatusRepository
from app.schemas.asset_status import AssetStatusCreate, AssetStatusUpdate


class AssetStatusService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = AssetStatusRepository(session)

    def get(self, asset_status_id: UUID) -> AssetStatus:
        asset_status = self.repo.get_by_id(asset_status_id)
        if asset_status is None:
            raise NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.")
        return asset_status

    def list(self, *, page: int, limit: int) -> tuple[list[AssetStatus], int]:
        return self.repo.list(
            page=page,
            limit=limit,
            order_by=(AssetStatus.sort_order.asc(), AssetStatus.name.asc()),
        )

    def create(self, payload: AssetStatusCreate) -> AssetStatus:
        if self.repo.exists_slug(payload.slug):
            raise ConflictError(
                "ASSET_STATUS_SLUG_EXISTS",
                "An asset status with this slug already exists.",
            )
        asset_status = AssetStatus(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            color=payload.color,
            sort_order=payload.sort_order,
        )
        self.repo.add(asset_status)
        self.repo.commit()
        return asset_status

    def update(self, asset_status_id: UUID, payload: AssetStatusUpdate) -> AssetStatus:
        asset_status = self.get(asset_status_id)
        data = payload.model_dump(exclude_unset=True)
        if "slug" in data and data["slug"] != asset_status.slug:
            if self.repo.exists_slug(data["slug"], exclude_id=asset_status.id):
                raise ConflictError(
                    "ASSET_STATUS_SLUG_EXISTS",
                    "An asset status with this slug already exists.",
                )
        for key, value in data.items():
            setattr(asset_status, key, value)
        self.session.add(asset_status)
        self.session.commit()
        self.session.refresh(asset_status)
        return asset_status

"""Asset type business logic."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.asset_type import AssetType
from app.repositories.asset_type import AssetTypeRepository
from app.schemas.asset_type import AssetTypeCreate, AssetTypeUpdate


class AssetTypeService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = AssetTypeRepository(session)

    def get(self, asset_type_id: UUID) -> AssetType:
        asset_type = self.repo.get_by_id(asset_type_id)
        if asset_type is None:
            raise NotFoundError("ASSET_TYPE_NOT_FOUND", "Asset type not found.")
        return asset_type

    def list(self, *, page: int, limit: int) -> tuple[list[AssetType], int]:
        return self.repo.list(
            page=page,
            limit=limit,
            order_by=(AssetType.sort_order.asc(), AssetType.name.asc()),
        )

    def create(self, payload: AssetTypeCreate) -> AssetType:
        if self.repo.exists_slug(payload.slug):
            raise ConflictError(
                "ASSET_TYPE_SLUG_EXISTS",
                "An asset type with this slug already exists.",
            )
        asset_type = AssetType(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            sort_order=payload.sort_order,
        )
        self.repo.add(asset_type)
        self.repo.commit()
        return asset_type

    def update(self, asset_type_id: UUID, payload: AssetTypeUpdate) -> AssetType:
        asset_type = self.get(asset_type_id)
        data = payload.model_dump(exclude_unset=True)
        if "slug" in data and data["slug"] != asset_type.slug:
            if self.repo.exists_slug(data["slug"], exclude_id=asset_type.id):
                raise ConflictError(
                    "ASSET_TYPE_SLUG_EXISTS",
                    "An asset type with this slug already exists.",
                )
        for key, value in data.items():
            setattr(asset_type, key, value)
        self.session.add(asset_type)
        self.session.commit()
        self.session.refresh(asset_type)
        return asset_type

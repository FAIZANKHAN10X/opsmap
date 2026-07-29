"""Asset type data access."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset_type import AssetType
from app.repositories.base import BaseRepository


class AssetTypeRepository(BaseRepository[AssetType]):
    model = AssetType

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def exists_slug(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = select(AssetType.id).where(
            AssetType.slug == slug,
            AssetType.deleted_at.is_(None),
        )
        if exclude_id is not None:
            stmt = stmt.where(AssetType.id != exclude_id)
        return self.session.scalar(stmt) is not None

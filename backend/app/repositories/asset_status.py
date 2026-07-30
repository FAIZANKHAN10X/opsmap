"""Asset status data access."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.repositories.base import BaseRepository


class AssetStatusRepository(BaseRepository[AssetStatus]):
    model = AssetStatus

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def exists_slug(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = select(AssetStatus.id).where(
            AssetStatus.slug == slug,
            AssetStatus.deleted_at.is_(None),
        )
        if exclude_id is not None:
            stmt = stmt.where(AssetStatus.id != exclude_id)
        return self.session.scalar(stmt) is not None

    def count_assets_using(self, status_id: UUID) -> int:
        """Count non-deleted assets currently assigned this status."""
        stmt = (
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.asset_status_id == status_id,
                Asset.deleted_at.is_(None),
            )
        )
        return int(self.session.scalar(stmt) or 0)

    def get_by_slug(self, slug: str) -> AssetStatus | None:
        stmt = select(AssetStatus).where(
            AssetStatus.slug == slug,
            AssetStatus.deleted_at.is_(None),
        )
        return self.session.scalar(stmt)

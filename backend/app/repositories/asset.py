"""Asset data access."""

from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.repositories.base import BaseRepository


class AssetRepository(BaseRepository[Asset]):
    model = Asset

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_filtered(
        self,
        *,
        page: int = 1,
        limit: int = 25,
        project_id: UUID | None = None,
        asset_type_id: UUID | None = None,
        asset_status_id: UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Asset], int]:
        filters = []
        if project_id is not None:
            filters.append(Asset.project_id == project_id)
        if asset_type_id is not None:
            filters.append(Asset.asset_type_id == asset_type_id)
        if asset_status_id is not None:
            filters.append(Asset.asset_status_id == asset_status_id)
        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    Asset.name.ilike(pattern),
                    Asset.code.ilike(pattern),
                    Asset.description.ilike(pattern),
                )
            )
        return self.list(page=page, limit=limit, filters=filters or None)

"""Asset data access — list, filter, sort, search."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.repositories.base import BaseRepository

ALLOWED_SORT_FIELDS = frozenset(
    {
        "name",
        "code",
        "owner",
        "created_at",
        "updated_at",
    }
)


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
        type_slug: str | None = None,
        status_slug: str | None = None,
        search: str | None = None,
        owner: str | None = None,
        assigned_to: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        sort: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[Asset], int]:
        filters: list = []

        if project_id is not None:
            filters.append(Asset.project_id == project_id)
        if asset_type_id is not None:
            filters.append(Asset.asset_type_id == asset_type_id)
        if asset_status_id is not None:
            filters.append(Asset.asset_status_id == asset_status_id)

        if type_slug:
            type_ids = list(
                self.session.scalars(
                    select(AssetType.id).where(
                        AssetType.slug == type_slug,
                        AssetType.deleted_at.is_(None),
                    )
                ).all()
            )
            filters.append(Asset.asset_type_id.in_(type_ids if type_ids else [None]))

        if status_slug:
            status_ids = list(
                self.session.scalars(
                    select(AssetStatus.id).where(
                        AssetStatus.slug == status_slug,
                        AssetStatus.deleted_at.is_(None),
                    )
                ).all()
            )
            filters.append(
                Asset.asset_status_id.in_(status_ids if status_ids else [None])
            )

        if search and search.strip():
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    Asset.name.ilike(pattern),
                    Asset.code.ilike(pattern),
                    Asset.description.ilike(pattern),
                    Asset.owner.ilike(pattern),
                    Asset.notes.ilike(pattern),
                    cast(Asset.assignees, String).ilike(pattern),
                )
            )

        if owner and owner.strip():
            filters.append(Asset.owner.ilike(f"%{owner.strip()}%"))

        if assigned_to and assigned_to.strip():
            # Match employee name inside assignees JSON list (portable cast).
            filters.append(
                cast(Asset.assignees, String).ilike(f"%{assigned_to.strip()}%")
            )

        if created_after is not None:
            filters.append(Asset.created_at >= created_after)
        if created_before is not None:
            filters.append(Asset.created_at <= created_before)

        sort_key = sort if sort in ALLOWED_SORT_FIELDS else "created_at"
        column = getattr(Asset, sort_key)
        order_by = column.asc() if order.lower() == "asc" else column.desc()

        return self.list(
            page=page,
            limit=limit,
            filters=filters or None,
            order_by=order_by,
        )

    def suggest(
        self,
        query: str,
        *,
        project_id: UUID | None = None,
        limit: int = 8,
    ) -> list[Asset]:
        """Lightweight keyword suggestions for autocomplete."""
        q = query.strip()
        if not q:
            return []
        pattern = f"%{q}%"
        filters = [
            or_(
                Asset.name.ilike(pattern),
                Asset.code.ilike(pattern),
                Asset.owner.ilike(pattern),
            )
        ]
        if project_id is not None:
            filters.append(Asset.project_id == project_id)
        items, _ = self.list(
            page=1,
            limit=limit,
            filters=filters,
            order_by=Asset.updated_at.desc(),
        )
        return items

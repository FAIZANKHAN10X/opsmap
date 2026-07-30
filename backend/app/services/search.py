"""Search service — keyword discovery over assets.

Uses SQLAlchemy ILIKE filtering (PostgreSQL-compatible). Semantic search is later.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.asset import Asset
from app.repositories.asset import ALLOWED_SORT_FIELDS, AssetRepository
from app.repositories.project import ProjectRepository
from app.schemas.search import SearchSuggestion


class SearchService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.assets = AssetRepository(session)
        self.projects = ProjectRepository(session)

    def search_assets(
        self,
        *,
        q: str | None = None,
        project_id: UUID | None = None,
        asset_type_id: UUID | None = None,
        asset_status_id: UUID | None = None,
        status: str | None = None,
        type_slug: str | None = None,
        owner: str | None = None,
        assigned_to: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Asset], int]:
        if project_id is not None and self.projects.get_by_id(project_id) is None:
            raise NotFoundError("PROJECT_NOT_FOUND", "Project not found.")

        if created_after and created_before and created_after > created_before:
            raise ValidationAppError(
                "created_after must be before created_before.",
                fields=[
                    {
                        "field": "created_after",
                        "message": "Must be earlier than created_before.",
                    }
                ],
            )

        sort_key = sort if sort in ALLOWED_SORT_FIELDS else "created_at"
        order_key = order if order.lower() in {"asc", "desc"} else "desc"

        return self.assets.list_filtered(
            page=page,
            limit=limit,
            project_id=project_id,
            asset_type_id=asset_type_id,
            asset_status_id=asset_status_id,
            type_slug=type_slug,
            status_slug=status,
            search=q,
            owner=owner,
            assigned_to=assigned_to,
            created_after=created_after,
            created_before=created_before,
            sort=sort_key,
            order=order_key,
        )

    def suggestions(
        self,
        q: str,
        *,
        project_id: UUID | None = None,
        limit: int = 8,
    ) -> list[SearchSuggestion]:
        if project_id is not None and self.projects.get_by_id(project_id) is None:
            raise NotFoundError("PROJECT_NOT_FOUND", "Project not found.")

        assets = self.assets.suggest(q, project_id=project_id, limit=limit)
        results: list[SearchSuggestion] = []
        for asset in assets:
            code_part = f"{asset.code} · " if asset.code else ""
            owner_part = f" — {asset.owner}" if asset.owner else ""
            results.append(
                SearchSuggestion(
                    id=asset.id,
                    name=asset.name,
                    code=asset.code,
                    project_id=asset.project_id,
                    owner=asset.owner,
                    asset_status_id=asset.asset_status_id,
                    label=f"{code_part}{asset.name}{owner_part}",
                )
            )
        return results

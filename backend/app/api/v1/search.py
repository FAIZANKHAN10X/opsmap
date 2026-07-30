"""Search endpoints — keyword discovery (Phase 7)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.asset import AssetRead
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.schemas.search import SearchSuggestion
from app.services.search import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=ListResponse[AssetRead])
def search_assets(
    q: str | None = Query(default=None, max_length=200, description="Keyword"),
    project_id: UUID | None = None,
    status: str | None = Query(default=None, description="Status slug"),
    type: str | None = Query(default=None, description="Asset type slug"),
    owner: str | None = None,
    assigned_to: str | None = Query(
        default=None,
        description="Employee / assignee name",
    ),
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    sort: Literal["name", "code", "owner", "created_at", "updated_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ListResponse[AssetRead]:
    items, total = SearchService(db).search_assets(
        q=q,
        project_id=project_id,
        status=status,
        type_slug=type,
        owner=owner,
        assigned_to=assigned_to,
        created_after=created_after,
        created_before=created_before,
        sort=sort,
        order=order,
        page=page,
        limit=limit,
    )
    return ListResponse(
        data=[AssetRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get("/suggestions", response_model=DataResponse[list[SearchSuggestion]])
def search_suggestions(
    q: str = Query(min_length=1, max_length=200),
    project_id: UUID | None = None,
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db),
) -> DataResponse[list[SearchSuggestion]]:
    suggestions = SearchService(db).suggestions(
        q,
        project_id=project_id,
        limit=limit,
    )
    return DataResponse(data=suggestions)

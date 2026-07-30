"""Search request/response schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.asset import AssetRead
from app.schemas.common import ORMModel


class SearchSuggestion(ORMModel):
    id: UUID
    name: str
    code: str | None
    project_id: UUID
    owner: str | None = None
    asset_status_id: UUID | None = None
    label: str


class SearchParams(ORMModel):
    """Normalized search parameters (shared by /search and enriched /assets)."""

    q: str | None = Field(default=None, max_length=200)
    project_id: UUID | None = None
    status: str | None = Field(default=None, max_length=100)  # status slug
    type: str | None = Field(default=None, max_length=100)  # type slug
    owner: str | None = Field(default=None, max_length=255)
    assigned_to: str | None = Field(default=None, max_length=255)  # employee
    created_after: datetime | None = None
    created_before: datetime | None = None
    sort: Literal["name", "code", "owner", "created_at", "updated_at"] = "created_at"
    order: Literal["asc", "desc"] = "desc"
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=25, ge=1, le=100)


class SearchResultItem(AssetRead):
    """Asset row returned by search (same shape as AssetRead for FE reuse)."""

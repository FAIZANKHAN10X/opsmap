"""Asset type request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import ORMModel
from app.utils.slug import normalize_slug


class AssetTypeCreate(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    description: str | None = None
    sort_order: int = Field(default=0, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        return normalize_slug(value)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name is required")
        return cleaned


class AssetTypeUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    sort_order: int | None = Field(default=None, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_slug(value)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name cannot be empty")
        return cleaned


class AssetTypeRead(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

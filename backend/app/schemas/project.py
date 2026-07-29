"""Project request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import ORMModel
from app.utils.slug import normalize_slug

ALLOWED_PROJECT_STATUSES = frozenset({"active", "archived"})


class ProjectCreate(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    description: str | None = None
    status: str = Field(default="active", max_length=50)

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

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_PROJECT_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(ALLOWED_PROJECT_STATUSES))}"
            )
        return normalized


class ProjectUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    status: str | None = Field(default=None, max_length=50)

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

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in ALLOWED_PROJECT_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(ALLOWED_PROJECT_STATUSES))}"
            )
        return normalized


class ProjectRead(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

"""Document request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.core.document_constants import DOCUMENT_CATEGORIES
from app.schemas.common import ORMModel


class DocumentCreate(ORMModel):
    """Metadata-only create (legacy/manual). Prefer multipart upload."""

    asset_id: UUID
    name: str = Field(min_length=1, max_length=255)
    filename: str = Field(min_length=1, max_length=512)
    mime_type: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)
    storage_path: str | None = Field(default=None, max_length=1024)
    category: str = Field(default="other", max_length=50)
    notes: str | None = None

    @field_validator("name", "filename")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("required")
        return cleaned

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in DOCUMENT_CATEGORIES:
            raise ValueError(
                f"category must be one of: {', '.join(sorted(DOCUMENT_CATEGORIES))}"
            )
        return cleaned


class DocumentUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    category: str | None = Field(default=None, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("cannot be empty")
        return cleaned

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip().lower()
        if cleaned not in DOCUMENT_CATEGORIES:
            raise ValueError(
                f"category must be one of: {', '.join(sorted(DOCUMENT_CATEGORIES))}"
            )
        return cleaned


class DocumentRead(ORMModel):
    id: UUID
    asset_id: UUID
    name: str
    filename: str
    mime_type: str | None
    size_bytes: int | None
    storage_path: str | None
    thumbnail_path: str | None = None
    resized_path: str | None = None
    category: str = "other"
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # Convenience flags for the UI (computed, not stored).
    is_previewable: bool = False
    has_file: bool = False
    has_thumbnail: bool = False

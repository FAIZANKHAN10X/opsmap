"""Document metadata request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import ORMModel


class DocumentCreate(ORMModel):
    asset_id: UUID
    name: str = Field(min_length=1, max_length=255)
    filename: str = Field(min_length=1, max_length=512)
    mime_type: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)
    storage_path: str | None = Field(default=None, max_length=1024)
    notes: str | None = None

    @field_validator("name", "filename")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("required")
        return cleaned


class DocumentUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    filename: str | None = Field(default=None, min_length=1, max_length=512)
    mime_type: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)
    storage_path: str | None = Field(default=None, max_length=1024)
    notes: str | None = None

    @field_validator("name", "filename")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("cannot be empty")
        return cleaned


class DocumentRead(ORMModel):
    id: UUID
    asset_id: UUID
    name: str
    filename: str
    mime_type: str | None
    size_bytes: int | None
    storage_path: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

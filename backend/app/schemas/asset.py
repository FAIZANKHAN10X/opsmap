"""Asset request/response schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import ORMModel


class AssetCreate(ORMModel):
    project_id: UUID
    name: str = Field(min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=100)
    description: str | None = None
    asset_type_id: UUID | None = None
    asset_status_id: UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name is required")
        return cleaned

    @field_validator("code")
    @classmethod
    def strip_code(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned or None


class AssetUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=100)
    description: str | None = None
    asset_type_id: UUID | None = None
    asset_status_id: UUID | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name cannot be empty")
        return cleaned

    @field_validator("code")
    @classmethod
    def strip_code(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned or None


class AssetRead(ORMModel):
    id: UUID
    project_id: UUID
    asset_type_id: UUID | None
    asset_status_id: UUID | None
    name: str
    code: str | None
    description: str | None
    metadata: dict[str, Any] = Field(
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

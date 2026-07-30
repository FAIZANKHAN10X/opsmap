"""Notification request/response schemas (Phase 10)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, computed_field, field_validator

from app.core.notification_constants import (
    NOTIFICATION_KINDS,
    NOTIFICATION_SEVERITIES,
)
from app.schemas.common import ORMModel


class NotificationCreate(ORMModel):
    severity: str = Field(default="info", max_length=32)
    kind: str = Field(default="system", max_length=32)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=4000)
    recipient: str | None = Field(default=None, max_length=320)
    recipient_email: str | None = Field(default=None, max_length=320)
    entity_type: str | None = Field(default=None, max_length=64)
    entity_id: UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in NOTIFICATION_SEVERITIES:
            raise ValueError(
                f"severity must be one of: {', '.join(sorted(NOTIFICATION_SEVERITIES))}"
            )
        return cleaned

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in NOTIFICATION_KINDS:
            raise ValueError(
                f"kind must be one of: {', '.join(sorted(NOTIFICATION_KINDS))}"
            )
        return cleaned

    @field_validator("title", "message")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("required")
        return cleaned


class NotificationUpdate(ORMModel):
    """Mark read / unread."""

    read: bool = True


class NotificationRead(ORMModel):
    id: UUID
    severity: str
    kind: str
    title: str
    message: str
    recipient: str | None
    recipient_email: str | None
    entity_type: str | None
    entity_id: UUID | None
    read_at: datetime | None
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_read(self) -> bool:
        return self.read_at is not None


class UnreadCountRead(ORMModel):
    count: int

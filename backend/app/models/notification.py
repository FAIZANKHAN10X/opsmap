"""In-app notification records for alerts and awareness (Phase 10)."""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User-facing alert. Pre-auth: recipient is a display name or email string."""

    __tablename__ = "notifications"

    # success | info | warning | error
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="info")
    # assignment | system | email
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Assignee name / email until authenticated users exist.
    recipient: Mapped[str | None] = mapped_column(
        String(320), nullable=True, index=True
    )
    recipient_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    # Optional structured context (asset name, previous assignees, etc.).
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=False,
        default=dict,
    )

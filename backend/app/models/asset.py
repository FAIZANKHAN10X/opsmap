"""Asset model — physical object managed on the map."""

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.db.base import Base
from app.models.mixins import (
    AuditUserMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)

if TYPE_CHECKING:
    from app.models.asset_status import AssetStatus
    from app.models.asset_type import AssetType
    from app.models.document import Document
    from app.models.project import Project


class Asset(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    AuditUserMixin,
    SoftDeleteMixin,
    Base,
):
    """Generic physical asset. Type, status, and metadata define behavior."""

    __tablename__ = "assets"
    __table_args__ = (
        Index("ix_assets_project_id_asset_status_id", "project_id", "asset_status_id"),
        Index("ix_assets_project_id_asset_type_id", "project_id", "asset_type_id"),
    )

    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    asset_type_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("asset_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    asset_status_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("asset_statuses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Free-text owner until authenticated users exist.
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Assigned people by display name (pre-auth simplicity).
    assignees: Mapped[list[Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=False,
        default=list,
    )
    # Variable attributes (bedrooms, capacity, map_x/map_y, etc.).
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=False,
        default=dict,
    )

    project: Mapped["Project"] = relationship(back_populates="assets")
    asset_type: Mapped["AssetType | None"] = relationship(back_populates="assets")
    asset_status: Mapped["AssetStatus | None"] = relationship(back_populates="assets")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="asset",
        cascade="all, delete-orphan",
    )

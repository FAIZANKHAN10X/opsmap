"""Asset status lookup — global configurable operational states."""

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import (
    AuditUserMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)

if TYPE_CHECKING:
    from app.models.asset import Asset


class AssetStatus(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    AuditUserMixin,
    SoftDeleteMixin,
    Base,
):
    """Operational state for assets (available, occupied, maintenance, ...)."""

    __tablename__ = "asset_statuses"
    __table_args__ = (UniqueConstraint("slug", name="uq_asset_statuses_slug"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Visual identity for status — kept consistent across the platform.
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    assets: Mapped[list["Asset"]] = relationship(back_populates="asset_status")

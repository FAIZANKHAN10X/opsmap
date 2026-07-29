"""Project model — primary operational boundary (root domain entity)."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text, UniqueConstraint
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


class Project(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    AuditUserMixin,
    SoftDeleteMixin,
    Base,
):
    """Single operational environment (hotel, warehouse, site, etc.)."""

    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("slug", name="uq_projects_slug"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Project lifecycle status (active / archived). Not asset status.
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    assets: Mapped[list["Asset"]] = relationship(back_populates="project")

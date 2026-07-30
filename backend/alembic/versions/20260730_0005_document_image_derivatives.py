"""Add document thumbnail and resized paths for Phase 9 image jobs.

Revision ID: 20260730_0005
Revises: 20260730_0004
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0005"
down_revision: str | None = "20260730_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("thumbnail_path", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("resized_path", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "resized_path")
    op.drop_column("documents", "thumbnail_path")

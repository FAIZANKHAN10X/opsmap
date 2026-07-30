"""Add document category column.

Revision ID: 20260730_0004
Revises: 20260730_0003
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0004"
down_revision: str | None = "20260730_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
            server_default="other",
        ),
    )
    op.create_index(op.f("ix_documents_category"), "documents", ["category"], unique=False)
    op.alter_column("documents", "category", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_category"), table_name="documents")
    op.drop_column("documents", "category")

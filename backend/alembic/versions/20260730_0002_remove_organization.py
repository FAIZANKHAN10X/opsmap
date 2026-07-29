"""Remove organization multi-tenant boundary.

Revision ID: 20260730_0002
Revises: 20260730_0001
Create Date: 2026-07-30

Project becomes the root domain entity. Asset types and statuses are global.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260730_0002"
down_revision: str | None = "20260730_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- projects ---
    op.drop_constraint(
        "uq_projects_organization_id_slug",
        "projects",
        type_="unique",
    )
    op.drop_index("ix_projects_organization_id", table_name="projects")
    op.drop_constraint(
        "projects_organization_id_fkey",
        "projects",
        type_="foreignkey",
    )
    op.drop_column("projects", "organization_id")
    op.create_unique_constraint("uq_projects_slug", "projects", ["slug"])

    # --- asset_types ---
    op.drop_constraint(
        "uq_asset_types_organization_id_slug",
        "asset_types",
        type_="unique",
    )
    op.drop_index("ix_asset_types_organization_id", table_name="asset_types")
    op.drop_constraint(
        "asset_types_organization_id_fkey",
        "asset_types",
        type_="foreignkey",
    )
    op.drop_column("asset_types", "organization_id")
    op.create_unique_constraint("uq_asset_types_slug", "asset_types", ["slug"])

    # --- asset_statuses ---
    op.drop_constraint(
        "uq_asset_statuses_organization_id_slug",
        "asset_statuses",
        type_="unique",
    )
    op.drop_index("ix_asset_statuses_organization_id", table_name="asset_statuses")
    op.drop_constraint(
        "asset_statuses_organization_id_fkey",
        "asset_statuses",
        type_="foreignkey",
    )
    op.drop_column("asset_statuses", "organization_id")
    op.create_unique_constraint("uq_asset_statuses_slug", "asset_statuses", ["slug"])

    # --- organizations ---
    op.drop_index("ix_organizations_deleted_at", table_name="organizations")
    op.drop_table("organizations")


def downgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        "ix_organizations_deleted_at",
        "organizations",
        ["deleted_at"],
        unique=False,
    )

    # Seed a single default organization for restored FK targets.
    op.execute(
        sa.text(
            """
            INSERT INTO organizations (id, name, slug, description)
            VALUES (
                '11111111-1111-1111-1111-111111111111',
                'Default',
                'default',
                'Restored for downgrade'
            )
            """
        )
    )
    default_org = "11111111-1111-1111-1111-111111111111"

    op.drop_constraint("uq_asset_statuses_slug", "asset_statuses", type_="unique")
    op.add_column(
        "asset_statuses",
        sa.Column("organization_id", sa.Uuid(), nullable=True),
    )
    op.execute(sa.text(f"UPDATE asset_statuses SET organization_id = '{default_org}'"))
    op.alter_column("asset_statuses", "organization_id", nullable=False)
    op.create_foreign_key(
        "asset_statuses_organization_id_fkey",
        "asset_statuses",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_asset_statuses_organization_id",
        "asset_statuses",
        ["organization_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_asset_statuses_organization_id_slug",
        "asset_statuses",
        ["organization_id", "slug"],
    )

    op.drop_constraint("uq_asset_types_slug", "asset_types", type_="unique")
    op.add_column(
        "asset_types",
        sa.Column("organization_id", sa.Uuid(), nullable=True),
    )
    op.execute(sa.text(f"UPDATE asset_types SET organization_id = '{default_org}'"))
    op.alter_column("asset_types", "organization_id", nullable=False)
    op.create_foreign_key(
        "asset_types_organization_id_fkey",
        "asset_types",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_asset_types_organization_id",
        "asset_types",
        ["organization_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_asset_types_organization_id_slug",
        "asset_types",
        ["organization_id", "slug"],
    )

    op.drop_constraint("uq_projects_slug", "projects", type_="unique")
    op.add_column(
        "projects",
        sa.Column("organization_id", sa.Uuid(), nullable=True),
    )
    op.execute(sa.text(f"UPDATE projects SET organization_id = '{default_org}'"))
    op.alter_column("projects", "organization_id", nullable=False)
    op.create_foreign_key(
        "projects_organization_id_fkey",
        "projects",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_projects_organization_id",
        "projects",
        ["organization_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_projects_organization_id_slug",
        "projects",
        ["organization_id", "slug"],
    )

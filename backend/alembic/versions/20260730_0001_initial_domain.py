"""Initial domain foundation tables.

Revision ID: 20260730_0001
Revises:
Create Date: 2026-07-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260730_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
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
        op.f("ix_organizations_deleted_at"),
        "organizations",
        ["deleted_at"],
        unique=False,
    )

    op.create_table(
        "asset_statuses",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(length=32), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "slug",
            name="uq_asset_statuses_organization_id_slug",
        ),
    )
    op.create_index(
        op.f("ix_asset_statuses_deleted_at"),
        "asset_statuses",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_asset_statuses_organization_id"),
        "asset_statuses",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "asset_types",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "slug",
            name="uq_asset_types_organization_id_slug",
        ),
    )
    op.create_index(
        op.f("ix_asset_types_deleted_at"),
        "asset_types",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_asset_types_organization_id"),
        "asset_types",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "projects",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "slug",
            name="uq_projects_organization_id_slug",
        ),
    )
    op.create_index(
        op.f("ix_projects_deleted_at"),
        "projects",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_projects_organization_id"),
        "projects",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "assets",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("asset_type_id", sa.Uuid(), nullable=True),
        sa.Column("asset_status_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(
            ["asset_status_id"],
            ["asset_statuses.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["asset_type_id"],
            ["asset_types.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assets_asset_status_id"),
        "assets",
        ["asset_status_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assets_asset_type_id"),
        "assets",
        ["asset_type_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assets_deleted_at"),
        "assets",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assets_project_id"), "assets", ["project_id"], unique=False
    )
    op.create_index(
        "ix_assets_project_id_asset_status_id",
        "assets",
        ["project_id", "asset_status_id"],
        unique=False,
    )
    op.create_index(
        "ix_assets_project_id_asset_type_id",
        "assets",
        ["project_id", "asset_type_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_assets_project_id_asset_type_id", table_name="assets")
    op.drop_index("ix_assets_project_id_asset_status_id", table_name="assets")
    op.drop_index(op.f("ix_assets_project_id"), table_name="assets")
    op.drop_index(op.f("ix_assets_deleted_at"), table_name="assets")
    op.drop_index(op.f("ix_assets_asset_type_id"), table_name="assets")
    op.drop_index(op.f("ix_assets_asset_status_id"), table_name="assets")
    op.drop_table("assets")

    op.drop_index(op.f("ix_projects_organization_id"), table_name="projects")
    op.drop_index(op.f("ix_projects_deleted_at"), table_name="projects")
    op.drop_table("projects")

    op.drop_index(op.f("ix_asset_types_organization_id"), table_name="asset_types")
    op.drop_index(op.f("ix_asset_types_deleted_at"), table_name="asset_types")
    op.drop_table("asset_types")

    op.drop_index(
        op.f("ix_asset_statuses_organization_id"), table_name="asset_statuses"
    )
    op.drop_index(op.f("ix_asset_statuses_deleted_at"), table_name="asset_statuses")
    op.drop_table("asset_statuses")

    op.drop_index(op.f("ix_organizations_deleted_at"), table_name="organizations")
    op.drop_table("organizations")

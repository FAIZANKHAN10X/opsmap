-- =============================================================================
-- OpsMap — Initial schema (consolidated).
--
-- Translates the FINAL state of the Python SQLAlchemy models + Alembic chain
-- 20260730_0001 → 20260730_0006 into a single Supabase migration.
--
-- The Alembic history created then dropped an `organizations` boundary; the
-- final schema has no such table, so it is not recreated here. Table order and
-- every column/index/constraint/FK below mirror the post-0006 state exactly.
--
-- Auth note: `created_by` / `updated_by` / `owner` / `assignees` / `recipient`
-- remain free-text / nullable. No Supabase Auth user relationships yet (Phase 3).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
    id uuid primary key,
    name varchar(255) not null,
    slug varchar(100) not null,
    description text,
    status varchar(50) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz,
    constraint uq_projects_slug unique (slug)
);

create index ix_projects_deleted_at on public.projects (deleted_at);

-- -----------------------------------------------------------------------------
-- asset_types (global configuration — not nested under a project)
-- -----------------------------------------------------------------------------
create table public.asset_types (
    id uuid primary key,
    name varchar(255) not null,
    slug varchar(100) not null,
    description text,
    sort_order integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz,
    constraint uq_asset_types_slug unique (slug)
);

create index ix_asset_types_deleted_at on public.asset_types (deleted_at);

-- -----------------------------------------------------------------------------
-- asset_statuses (global configuration — Status Engine)
-- -----------------------------------------------------------------------------
create table public.asset_statuses (
    id uuid primary key,
    name varchar(255) not null,
    slug varchar(100) not null,
    description text,
    color varchar(32),
    sort_order integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz,
    constraint uq_asset_statuses_slug unique (slug)
);

create index ix_asset_statuses_deleted_at on public.asset_statuses (deleted_at);

-- -----------------------------------------------------------------------------
-- assets
-- -----------------------------------------------------------------------------
create table public.assets (
    id uuid primary key,
    project_id uuid not null
        references public.projects (id) on delete restrict,
    asset_type_id uuid
        references public.asset_types (id) on delete set null,
    asset_status_id uuid
        references public.asset_statuses (id) on delete set null,
    name varchar(255) not null,
    code varchar(100),
    description text,
    owner varchar(255),
    notes text,
    assignees jsonb not null,
    metadata jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz
);

create index ix_assets_project_id on public.assets (project_id);
create index ix_assets_asset_type_id on public.assets (asset_type_id);
create index ix_assets_asset_status_id on public.assets (asset_status_id);
create index ix_assets_deleted_at on public.assets (deleted_at);
create index ix_assets_project_id_asset_status_id
    on public.assets (project_id, asset_status_id);
create index ix_assets_project_id_asset_type_id
    on public.assets (project_id, asset_type_id);

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
create table public.documents (
    id uuid primary key,
    asset_id uuid not null
        references public.assets (id) on delete cascade,
    name varchar(255) not null,
    filename varchar(512) not null,
    mime_type varchar(128),
    size_bytes integer,
    storage_path varchar(1024),
    thumbnail_path varchar(1024),
    resized_path varchar(1024),
    category varchar(50) not null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz
);

create index ix_documents_asset_id on public.documents (asset_id);
create index ix_documents_deleted_at on public.documents (deleted_at);
create index ix_documents_category on public.documents (category);

-- -----------------------------------------------------------------------------
-- notifications
--
-- No soft-delete / audit-user columns: Notification uses only the
-- UUIDPrimaryKey + Timestamp mixins in the ORM model.
-- -----------------------------------------------------------------------------
create table public.notifications (
    id uuid primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    severity varchar(32) not null,
    kind varchar(32) not null,
    title varchar(255) not null,
    message text not null,
    recipient varchar(320),
    recipient_email varchar(320),
    entity_type varchar(64),
    entity_id uuid,
    read_at timestamptz,
    metadata jsonb not null
);

create index ix_notifications_kind on public.notifications (kind);
create index ix_notifications_recipient on public.notifications (recipient);
create index ix_notifications_read_at on public.notifications (read_at);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
--
-- The ORM applied `onupdate=func.now()` at the application layer. A trigger is
-- the Supabase equivalent so `updated_at` stays in sync on every UPDATE.
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger handle_projects_updated_at
    before update on public.projects
    for each row execute function public.handle_updated_at();
create trigger handle_asset_types_updated_at
    before update on public.asset_types
    for each row execute function public.handle_updated_at();
create trigger handle_asset_statuses_updated_at
    before update on public.asset_statuses
    for each row execute function public.handle_updated_at();
create trigger handle_assets_updated_at
    before update on public.assets
    for each row execute function public.handle_updated_at();
create trigger handle_documents_updated_at
    before update on public.documents
    for each row execute function public.handle_updated_at();
create trigger handle_notifications_updated_at
    before update on public.notifications
    for each row execute function public.handle_updated_at();
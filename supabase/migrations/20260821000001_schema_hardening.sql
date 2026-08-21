-- =============================================================================
-- OpsMap — Schema hardening (deferred from Engineering Hardening Pass).
--
-- Additive, backward-compatible migration covering:
--   1. UUID defaults (gen_random_uuid) for application-generated PKs
--   2. JSONB defaults for assignees/metadata
--   3. CHECK constraints (projects.status, documents.category, size_bytes)
--   4. Soft-delete-aware partial unique indexes (slug uniqueness)
--   5. Notifications grants least-privilege
--   6. Reports bucket MIME restriction
--   7. Future-proof anon revokes for contacts tables
-- =============================================================================

-- Ensure pgcrypto for gen_random_uuid() (Supabase has it, but idempotent).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. UUID defaults — database safety for direct inserts.
--    Profiles.id is FK to auth.users, so no default.
-- -----------------------------------------------------------------------------
alter table public.projects alter column id set default gen_random_uuid();
alter table public.asset_types alter column id set default gen_random_uuid();
alter table public.asset_statuses alter column id set default gen_random_uuid();
alter table public.assets alter column id set default gen_random_uuid();
alter table public.documents alter column id set default gen_random_uuid();
alter table public.notifications alter column id set default gen_random_uuid();
alter table public.contacts alter column id set default gen_random_uuid();
alter table public.property_contacts alter column id set default gen_random_uuid();

-- -----------------------------------------------------------------------------
-- 2. JSONB defaults — intended empty values.
--    Preserve NULL semantics: only defaults for NOT NULL columns with known
--    empty value. contacts/property_contacts do not have JSONB defaults to add.
-- -----------------------------------------------------------------------------
alter table public.assets alter column assignees set default '[]'::jsonb;
alter table public.assets alter column metadata set default '{}'::jsonb;
alter table public.notifications alter column metadata set default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- 3. CHECK constraints — database-level validation mirroring application constants.
--    Use NOT VALID initially to avoid long table scans on large tables, then
--    validate. Existing data is expected to be clean (app validates), but this
--    avoids blocking if legacy rows exist.
-- -----------------------------------------------------------------------------
-- projects.status: active | archived (frontend/lib/server/constants.ts)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_projects_status') then
    alter table public.projects add constraint chk_projects_status
      check (status in ('active', 'archived')) not valid;
  end if;
end $$;
alter table public.projects validate constraint chk_projects_status;

-- documents.category: contract | report | image | manual | other
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_documents_category') then
    alter table public.documents add constraint chk_documents_category
      check (category in ('contract', 'report', 'image', 'manual', 'other')) not valid;
  end if;
end $$;
alter table public.documents validate constraint chk_documents_category;

-- documents.size_bytes: >= 0 when present
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_documents_size_bytes') then
    alter table public.documents add constraint chk_documents_size_bytes
      check (size_bytes is null or size_bytes >= 0) not valid;
  end if;
end $$;
alter table public.documents validate constraint chk_documents_size_bytes;

-- -----------------------------------------------------------------------------
-- 4. Soft-delete-aware partial unique indexes.
--    Replace table-wide UNIQUE (slug) with WHERE deleted_at IS NULL so a
--    soft-deleted row does not block reuse of its slug. Preserve uniqueness
--    for active records.
-- -----------------------------------------------------------------------------
-- projects.slug
alter table public.projects drop constraint if exists uq_projects_slug;
drop index if exists uq_projects_slug;
create unique index if not exists uq_projects_slug_active
  on public.projects (slug) where deleted_at is null;

-- asset_types.slug
alter table public.asset_types drop constraint if exists uq_asset_types_slug;
drop index if exists uq_asset_types_slug;
create unique index if not exists uq_asset_types_slug_active
  on public.asset_types (slug) where deleted_at is null;

-- asset_statuses.slug
alter table public.asset_statuses drop constraint if exists uq_asset_statuses_slug;
drop index if exists uq_asset_statuses_slug;
create unique index if not exists uq_asset_statuses_slug_active
  on public.asset_statuses (slug) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 5. Notifications grants — least privilege.
--    RLS has no INSERT/DELETE policies (service_role only), so revoke those
--    grants from authenticated. Keep SELECT/UPDATE which have RLS policies.
-- -----------------------------------------------------------------------------
revoke insert, delete on table public.notifications from authenticated;

-- -----------------------------------------------------------------------------
-- 6. Reports bucket MIME restriction.
--    Reports are application/json (frontend/lib/server/services/reports.ts).
--    Documents bucket already has its allowlist; reports had none.
-- -----------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['application/json']::text[]
where id = 'reports';

-- -----------------------------------------------------------------------------
-- 7. Future-proof anon revokes for tables created after 20260730000005.
--    contacts / property_contacts were created in 20260820000002 and never
--    had anon revoked (anon gets nothing by default when auto_expose off, but
--    defense-in-depth requires explicit revoke).
-- -----------------------------------------------------------------------------
revoke all on table public.contacts, public.property_contacts from anon;


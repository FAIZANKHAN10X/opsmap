-- =============================================================================
-- OpsMap — Canonical property types (Phase 15 property experience).
--
-- Establishes clean owner-facing taxonomy:
--   Villa, House, Apartment, Land, Commercial, Other
-- Seed is idempotent (on conflict slug do nothing).
--
-- Also migrates real properties that referenced stale Phase14-generated
-- types (e.g. phase14-type-*) to the canonical Villa type and soft-deletes
-- the stale rows so they never appear in the Type filter again.
--
-- Preserves data integrity: assets are remapped before stale types are retired.
-- =============================================================================

-- 1) Seed canonical types (villa already exists from 20260820000001)
-- Partial unique index requires WHERE predicate for ON CONFLICT
insert into public.asset_types (id, name, slug, description, sort_order)
values
  (gen_random_uuid(), 'House', 'house', 'Standalone house property.', 2),
  (gen_random_uuid(), 'Apartment', 'apartment', 'Apartment unit.', 3),
  (gen_random_uuid(), 'Land', 'land', 'Land / Plot property.', 4),
  (gen_random_uuid(), 'Commercial', 'commercial', 'Commercial property.', 5),
  (gen_random_uuid(), 'Other', 'other', 'Other property type.', 6)
on conflict (slug) where deleted_at is null do nothing;

-- 2) Migrate assets that reference stale phase14 types to Villa
--    (Villa is the primary property type for existing real data)
update public.assets
set asset_type_id = (select id from public.asset_types where slug = 'villa' and deleted_at is null limit 1),
    updated_at = now()
where asset_type_id in (
  select id from public.asset_types where slug like 'phase14-%' and deleted_at is null
);

-- 3) Soft-delete stale phase14 types so they disappear from UI filters
update public.asset_types
set deleted_at = now(), updated_at = now()
where slug like 'phase14-%' and deleted_at is null;

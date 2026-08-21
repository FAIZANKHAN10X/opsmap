-- =============================================================================
-- OpsMap — Real geographic property positioning (Phase 16 / P0 map).
--
-- Adds nullable geographic coordinates to `assets` so properties can be
-- placed on a real interactive map:
--   latitude  numeric(9, 6)  — WGS84, valid range -90..90
--   longitude numeric(9, 6)  — WGS84, valid range -180..180
--
-- Deliberate decisions:
-- - Plain numerics, NOT PostGIS: no proximity/spatial queries exist yet.
--   Promoting to geography types later is a separate additive migration.
-- - Nullable: a property is "unplaced" until it has BOTH values.
-- - CHECK constraints enforce the valid WGS84 ranges at the DB level,
--   mirroring the service-layer validation.
-- - The legacy site-plan columns (`metadata.map_x` / `map_y`) are untouched
--   and conceptually distinct (internal plan pixels vs real-world coords).
--
-- Additive only: no existing rows change; both columns default to NULL.
-- =============================================================================

alter table public.assets
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6);

-- Coordinates must be within WGS84 bounds when present.
alter table public.assets
  add constraint chk_assets_latitude
  check (latitude is null or latitude between -90 and 90);

alter table public.assets
  add constraint chk_assets_longitude
  check (longitude is null or longitude between -180 and 180);

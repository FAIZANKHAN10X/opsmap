-- =============================================================================
-- OpsMap — Phase 1: default asset type (property/villa) seed.
--
-- A fresh deployment had no seed data for `asset_types`, so the owner-facing
-- property/villa type dropdown was empty until a manager manually created one
-- (there was no UI surface for it). This migration inserts the single default
-- property type that the 8AM HUB workflow and the Demo/Mock Data dataset
-- (`lib/demo/dataset.ts`, slug `villa`) depend on.
--
-- Idempotent: `on conflict (slug) do nothing` keeps existing databases safe
-- and never creates duplicates, even if a manager already added the type at
-- runtime. No database IDs are hardcoded (`gen_random_uuid()`).
--
-- Runtime recovery for already-deployed databases is provided by the
-- idempotent POST /api/asset-types/seed-defaults route (Settings → Property
-- Types → Seed defaults), which mirrors the Status Engine seed mechanism.
-- =============================================================================

insert into public.asset_types (id, name, slug, description, sort_order)
values (gen_random_uuid(), 'Villa', 'villa', 'Private residence property.', 1)
on conflict (slug) do nothing;
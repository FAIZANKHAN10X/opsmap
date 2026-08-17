-- =============================================================================
-- OpsMap — Revoke anon table privileges (Phase 14 hardening).
--
-- When the schema tables were created (20260730000001_initial_schema.sql)
-- they did not yet have RLS enabled, so Supabase's automatic table exposure
-- granted the `anon` role full CRUD privileges on them. RLS (enabled in
-- 20260730000002_enable_rls.sql) denies `anon` at the row level, so no data
-- was ever readable or writable by unauthenticated requests — but the design
-- model ("the `anon` role gets no table grants", see 20260730000003_auth.sql)
-- requires anon to be denied at the privilege layer too, for defense in depth.
--
-- This migration revokes those auto-exposed grants. The `authenticated`
-- (RLS-governed) and `service_role` grants from 20260730000003_auth.sql are
-- unaffected.
-- =============================================================================

revoke all privileges on table
    public.projects,
    public.asset_types,
    public.asset_statuses,
    public.assets,
    public.documents,
    public.notifications,
    public.profiles
from anon;

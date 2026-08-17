-- =============================================================================
-- OpsMap — Row Level Security.
--
-- RLS is enabled on every table. No Supabase Auth user relationships exist yet
-- (Phase 3), so policies grant full CRUD to the `authenticated` role as a
-- placeholder. The `anon` role is denied by default (RLS denies when no policy
-- matches). Phase 3 will replace these with `auth.uid()`-scoped policies.
--
-- The service layer remains authoritative; RLS is defense-in-depth.
-- =============================================================================

alter table public.projects enable row level security;
alter table public.asset_types enable row level security;
alter table public.asset_statuses enable row level security;
alter table public.assets enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create policy "projects_authenticated_all"
    on public.projects
    for all
    to authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- asset_types
-- -----------------------------------------------------------------------------
create policy "asset_types_authenticated_all"
    on public.asset_types
    for all
    to authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- asset_statuses
-- -----------------------------------------------------------------------------
create policy "asset_statuses_authenticated_all"
    on public.asset_statuses
    for all
    to authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- assets
-- -----------------------------------------------------------------------------
create policy "assets_authenticated_all"
    on public.assets
    for all
    to authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
create policy "documents_authenticated_all"
    on public.documents
    for all
    to authenticated
    using (true)
    with check (true);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create policy "notifications_authenticated_all"
    on public.notifications
    for all
    to authenticated
    using (true)
    with check (true);
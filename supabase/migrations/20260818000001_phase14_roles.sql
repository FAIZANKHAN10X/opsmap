-- =============================================================================
-- OpsMap — Phase 14: Owner hardening — business-user roles & RLS.
--
-- Adds an additive `role` column to `profiles` (Admin / Manager / Operator /
-- Viewer) scoped to the single-company RLS model: every authenticated user
-- still reads the shared workspace; roles only gate writes.
--
-- Write capabilities (mirrored by the action-layer `requireRole` guard in
-- frontend/lib/server/authorize.ts):
--   * projects, asset_types, asset_statuses  → manager+
--   * assets                                 → operator+ (insert/update),
--                                              manager+ (delete)
--   * documents                              → operator+ (insert/update),
--                                              manager+ (delete)
--   * profile role changes                   → admin only, via
--                                              public.set_user_role() (below)
--
-- The service layer remains authoritative; RLS is defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles.role
-- -----------------------------------------------------------------------------
alter table public.profiles
    add column role text not null default 'viewer'
    check (role in ('admin', 'manager', 'operator', 'viewer'));

-- -----------------------------------------------------------------------------
-- user_role(): current caller's role. SECURITY DEFINER so RLS on profiles
-- cannot block the lookup from a policy.
-- -----------------------------------------------------------------------------
create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.user_role() to authenticated;

-- -----------------------------------------------------------------------------
-- set_user_role(): the ONLY path that changes a profile's role (privilege
-- escalation guard). Runs as definer and checks the caller is an admin.
-- -----------------------------------------------------------------------------
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role text;
begin
    select public.user_role() into caller_role;
    if caller_role is distinct from 'admin' then
        raise exception 'FORBIDDEN: only admins can change roles';
    end if;
    if new_role not in ('admin', 'manager', 'operator', 'viewer') then
        raise exception 'INVALID_ROLE: unknown role "%"', new_role;
    end if;
    update public.profiles
       set role = new_role, updated_at = now()
     where id = target_user_id;
    if not found then
        raise exception 'PROFILE_NOT_FOUND';
    end if;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- profiles policies
-- -----------------------------------------------------------------------------
-- Users keep reading/updating their own row, but cannot change their own role
-- (self-escalation guard: the new row's role must equal the caller's current
-- role, resolved via user_role()).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id and role = public.user_role());

-- Admins may read and update any profile (role-management surface).
create policy "profiles_admin_select_all"
    on public.profiles
    for select
    to authenticated
    using (public.user_role() = 'admin');

create policy "profiles_admin_update"
    on public.profiles
    for update
    to authenticated
    using (public.user_role() = 'admin')
    with check (true);

-- -----------------------------------------------------------------------------
-- projects — manager+ writes, all authenticated reads.
-- -----------------------------------------------------------------------------
drop policy if exists "projects_authenticated_all" on public.projects;
create policy "projects_select"
    on public.projects for select to authenticated using (true);
create policy "projects_insert"
    on public.projects for insert to authenticated
    with check (public.user_role() in ('admin', 'manager'));
create policy "projects_update"
    on public.projects for update to authenticated
    using (public.user_role() in ('admin', 'manager'))
    with check (public.user_role() in ('admin', 'manager'));
create policy "projects_delete"
    on public.projects for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- asset_types — manager+ writes.
-- -----------------------------------------------------------------------------
drop policy if exists "asset_types_authenticated_all" on public.asset_types;
create policy "asset_types_select"
    on public.asset_types for select to authenticated using (true);
create policy "asset_types_insert"
    on public.asset_types for insert to authenticated
    with check (public.user_role() in ('admin', 'manager'));
create policy "asset_types_update"
    on public.asset_types for update to authenticated
    using (public.user_role() in ('admin', 'manager'))
    with check (public.user_role() in ('admin', 'manager'));
create policy "asset_types_delete"
    on public.asset_types for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- asset_statuses — manager+ writes.
-- -----------------------------------------------------------------------------
drop policy if exists "asset_statuses_authenticated_all" on public.asset_statuses;
create policy "asset_statuses_select"
    on public.asset_statuses for select to authenticated using (true);
create policy "asset_statuses_insert"
    on public.asset_statuses for insert to authenticated
    with check (public.user_role() in ('admin', 'manager'));
create policy "asset_statuses_update"
    on public.asset_statuses for update to authenticated
    using (public.user_role() in ('admin', 'manager'))
    with check (public.user_role() in ('admin', 'manager'));
create policy "asset_statuses_delete"
    on public.asset_statuses for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- assets — operator+ insert/update, manager+ delete.
-- -----------------------------------------------------------------------------
drop policy if exists "assets_authenticated_all" on public.assets;
create policy "assets_select"
    on public.assets for select to authenticated using (true);
create policy "assets_insert"
    on public.assets for insert to authenticated
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "assets_update"
    on public.assets for update to authenticated
    using (public.user_role() in ('admin', 'manager', 'operator'))
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "assets_delete"
    on public.assets for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- documents — operator+ insert/update, manager+ delete.
-- -----------------------------------------------------------------------------
drop policy if exists "documents_authenticated_all" on public.documents;
create policy "documents_select"
    on public.documents for select to authenticated using (true);
create policy "documents_insert"
    on public.documents for insert to authenticated
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "documents_update"
    on public.documents for update to authenticated
    using (public.user_role() in ('admin', 'manager', 'operator'))
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "documents_delete"
    on public.documents for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- Indexes for the Phase 14 role lookups.
-- -----------------------------------------------------------------------------
create index if not exists profiles_role_idx on public.profiles (role);
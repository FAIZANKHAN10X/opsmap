-- =============================================================================
-- OpsMap — Supabase Auth (Phase 3).
--
-- Adds the minimal `profiles` table (one row per Auth user; no org/role system)
-- and replaces the temporary `authenticated` + `using (true)` placeholder
-- policies with `auth.uid()`-scoped policies where the product model supports
-- row-level ownership:
--
--   * profiles      — a user may read/update only their own row.
--   * notifications — a user may read/update notifications addressed to them,
--                     matched by their email (auth.jwt() -> 'email').
--   * projects, asset_types, asset_statuses, assets, documents
--                   — remain `authenticated` + `using (true)`. The product is a
--                     single-company shared workspace with no per-user row
--                     ownership, so every authenticated user legitimately sees
--                     all shared data. These policies are intentional, not
--                     placeholders.
--
-- Notification creation stays a privileged server-side operation (assignment
-- alerts via the service_role client), so `authenticated` gets no insert or
-- delete policy on notifications.
--
-- The service layer remains authoritative; RLS is defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    email      text not null unique,
    full_name  text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger handle_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

-- Automatically create a profile row when a new Auth user is created. Runs as
-- the table owner (SECURITY DEFINER) so RLS on profiles cannot block the insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);

create policy "profiles_update_own"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- notifications — scoped to the recipient's email.
-- -----------------------------------------------------------------------------
drop policy if exists "notifications_authenticated_all" on public.notifications;

create policy "notifications_select_own"
    on public.notifications
    for select
    to authenticated
    using (
        recipient_email = auth.jwt() ->> 'email'
        or recipient = auth.jwt() ->> 'email'
    );

create policy "notifications_update_own"
    on public.notifications
    for update
    to authenticated
    using (
        recipient_email = auth.jwt() ->> 'email'
        or recipient = auth.jwt() ->> 'email'
    )
    with check (
        recipient_email = auth.jwt() ->> 'email'
        or recipient = auth.jwt() ->> 'email'
    );

-- -----------------------------------------------------------------------------
-- Grants.
--
-- `auto_expose_new_tables` is unset in supabase/config.toml (new entities are
-- NOT auto-exposed), so explicit grants are required for the Data API roles.
-- RLS still governs row-level visibility; service_role bypasses RLS and is used
-- only for privileged server-side operations.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
    on public.projects,
       public.asset_types,
       public.asset_statuses,
       public.assets,
       public.documents,
       public.notifications,
       public.profiles
    to authenticated;

grant select, insert, update, delete
    on public.projects,
       public.asset_types,
       public.asset_statuses,
       public.assets,
       public.documents,
       public.notifications,
       public.profiles
    to service_role;
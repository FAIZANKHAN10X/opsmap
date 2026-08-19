-- =============================================================================
-- OpsMap — First-owner bootstrap.
--
-- Phase 14 added profiles.role with default 'viewer' and admin-only role
-- changes via set_user_role(). A fresh (or pre-Phase-14) deployment therefore
-- has no admin, so the signed-in owner cannot create a development or
-- property: the UI hides write actions (role null/viewer) and requireRole
-- rejects operator+/manager+ mutations.
--
-- This migration is additive: promote the oldest profile to admin when none
-- exists, and make handle_new_user assign admin to the first account.
-- =============================================================================

-- Oldest profile becomes admin iff the workspace has no admin yet.
update public.profiles
   set role = 'admin',
       updated_at = now()
 where id = (
     select id from public.profiles order by created_at asc, id asc limit 1
 )
   and not exists (
     select 1 from public.profiles where role = 'admin'
   );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    has_admin boolean;
begin
    select exists(select 1 from public.profiles where role = 'admin')
      into has_admin;
    insert into public.profiles (id, email, role)
    values (
        new.id,
        new.email,
        case when has_admin then 'viewer' else 'admin' end
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

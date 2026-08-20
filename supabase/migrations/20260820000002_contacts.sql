-- =============================================================================
-- OpsMap — Phase 2: First-class Contacts.
--
-- Adds an additive, non-destructive contact model on top of the existing
-- generalized assets architecture. The legacy free-text fields
-- `assets.owner` / `assets.assignees` are preserved untouched; this migration
-- only creates new tables, backfills them from that existing data, and
-- hardens write access with role-gated RLS (mirroring Phase 14 assets).
--
-- Design constraints honored:
--   * Single contact entity with a `type` category (lead | client | owner |
--     agent | vendor | other) — NOT a CRM pipeline, no lead stages, no
--     conversations/calls.
--   * Multi-property relationships are relational (`property_contacts` join),
--     never comma-separated ID lists; a contact may relate to many properties
--     without duplication.
--   * DATABASE stays property-focused — only two new tables.
--   * `whatsapp` is a stored field only; no messaging behavior.
--
-- Write capabilities (mirrored by the action-layer `requireRole` guard):
--   * contacts, property_contacts → operator+ (insert/update),
--                                    manager+ (delete)
-- The service layer remains authoritative; RLS is defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
create table public.contacts (
    id uuid primary key,
    type varchar(32) not null default 'other'
        check (type in ('lead', 'client', 'owner', 'agent', 'vendor', 'other')),
    full_name varchar(255) not null,
    company varchar(255),
    email varchar(320),
    phone varchar(64),
    whatsapp varchar(64),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz
);

create index ix_contacts_deleted_at on public.contacts (deleted_at);
create index ix_contacts_type on public.contacts (type);
create index ix_contacts_full_name on public.contacts (full_name);

create trigger handle_contacts_updated_at
    before update on public.contacts
    for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- property_contacts — relational join between a property (asset) and a contact.
-- `role` is the contact's relationship to THAT property (legacy owner/assignee
-- semantics plus first-class agent/client/vendor/other).
-- -----------------------------------------------------------------------------
create table public.property_contacts (
    id uuid primary key,
    asset_id uuid not null
        references public.assets (id) on delete cascade,
    contact_id uuid not null
        references public.contacts (id) on delete cascade,
    role varchar(32) not null default 'other'
        check (role in ('owner', 'assignee', 'agent', 'client', 'vendor', 'other')),
    created_at timestamptz not null default now(),
    constraint uq_property_contacts unique (asset_id, contact_id, role)
);

create index ix_property_contacts_asset_id on public.property_contacts (asset_id);
create index ix_property_contacts_contact_id on public.property_contacts (contact_id);

-- -----------------------------------------------------------------------------
-- RLS — all authenticated reads; operator+ insert/update; manager+ delete
-- (mirrors the Phase 14 assets policies).
-- -----------------------------------------------------------------------------
alter table public.contacts enable row level security;
alter table public.property_contacts enable row level security;

create policy "contacts_select"
    on public.contacts for select to authenticated using (true);
create policy "contacts_insert"
    on public.contacts for insert to authenticated
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "contacts_update"
    on public.contacts for update to authenticated
    using (public.user_role() in ('admin', 'manager', 'operator'))
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "contacts_delete"
    on public.contacts for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

create policy "property_contacts_select"
    on public.property_contacts for select to authenticated using (true);
create policy "property_contacts_insert"
    on public.property_contacts for insert to authenticated
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "property_contacts_update"
    on public.property_contacts for update to authenticated
    using (public.user_role() in ('admin', 'manager', 'operator'))
    with check (public.user_role() in ('admin', 'manager', 'operator'));
create policy "property_contacts_delete"
    on public.property_contacts for delete to authenticated
    using (public.user_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- Grants. `auto_expose_new_tables` is unset (see 20260730000003_auth.sql), so
-- explicit grants are required for the Data API roles. `anon` gets nothing
-- (denied by default — matching the Phase 14 anon-revocation model).
-- -----------------------------------------------------------------------------
grant select, insert, update, delete
    on public.contacts,
       public.property_contacts
    to authenticated;

grant select, insert, update, delete
    on public.contacts,
       public.property_contacts
    to service_role;

-- -----------------------------------------------------------------------------
-- Backfill: promote existing `assets.owner` / `assets.assignees` free-text
-- names into first-class contacts (non-destructive — assets are untouched).
-- Owners become type 'owner'; assignees become type 'other'. Both merges are
-- by exact full_name so a name shared across properties stays one contact,
-- matching the previous derived-Contacts behavior. Idempotent.
-- -----------------------------------------------------------------------------
insert into public.contacts (id, type, full_name, created_at)
select gen_random_uuid(), 'owner', owner, now()
from public.assets
where owner is not null
  and trim(owner) <> ''
  and deleted_at is null
  and not exists (
      select 1 from public.contacts c
      where c.type = 'owner'
        and c.full_name = public.assets.owner
        and c.deleted_at is null
  );

insert into public.contacts (id, type, full_name, created_at)
select gen_random_uuid(), 'other', name, now()
from (
    select distinct trim(x.value) as name
    from public.assets,
         jsonb_array_elements_text(public.assets.assignees) as x(value)
    where public.assets.deleted_at is null
      and trim(x.value) <> ''
) s
where not exists (
    select 1 from public.contacts c
    where c.type = 'other'
      and c.full_name = s.name
      and c.deleted_at is null
);

insert into public.property_contacts (id, asset_id, contact_id, role)
select gen_random_uuid(), a.id, c.id, 'owner'
from public.assets a
join public.contacts c
  on c.type = 'owner'
 and c.full_name = a.owner
 and c.deleted_at is null
where a.owner is not null
  and a.deleted_at is null
on conflict (asset_id, contact_id, role) do nothing;

insert into public.property_contacts (id, asset_id, contact_id, role)
select gen_random_uuid(), a.id, c.id, 'assignee'
from public.assets a
join lateral jsonb_array_elements_text(a.assignees) as x(value) on true
join public.contacts c
  on c.type = 'other'
 and c.full_name = trim(x.value)
 and c.deleted_at is null
where a.deleted_at is null
  and trim(x.value) <> ''
on conflict (asset_id, contact_id, role) do nothing;
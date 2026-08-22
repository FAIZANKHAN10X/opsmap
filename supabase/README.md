# Supabase

OpsMap's Supabase project configuration, migrations, and database types.

## Layout

```
supabase/
├── config.toml            # Supabase CLI project config
└── migrations/
    ├── 20260730000001_initial_schema.sql        # 6 tables + indexes + FKs + updated_at triggers
    ├── 20260730000002_enable_rls.sql            # RLS on all tables + authenticated placeholder policies
    ├── 20260730000003_auth.sql                  # profiles table + auth.uid()-scoped RLS + grants
    ├── 20260730000004_storage.sql               # documents + reports Storage buckets
    ├── 20260730000005_revoke_anon.sql           # Revoke anon grants auto-exposed pre-RLS
    ├── 20260818000001_phase14_roles.sql         # profiles.role + user_role()/set_user_role() + role-gated RLS
    ├── 20260819000001_bootstrap_first_admin.sql # Bootstrap first admin helper
    ├── 20260820000001_default_asset_types.sql   # Idempotent Villa seed (slug: villa)
    ├── 20260820000002_contacts.sql              # contacts + property_contacts + backfill from assets.owner/assignees
    ├── 20260821000001_schema_hardening.sql      # UUID/JSONB defaults, CHECKs, partial uniques, anon/least-privilege grants
    ├── 20260822000001_canonical_property_types.sql # Canonical Villa/House/Apartment/Land/Commercial/Other
    └── 20260822000002_asset_geo_coordinates.sql # assets.latitude/longitude numeric(9,6) + CHECKs
```

## Migrations

Migrations translate the final state of the Python SQLAlchemy models and the
Alembic chain `20260730_0001` → `20260730_0006` (see `docs/MIGRATION.md`), then
the 8AM HUB hardening phases 14–15 (roles, contacts, schema hardening,
canonical types, geo coordinates). The `organizations` table that Alembic
created and later dropped is not recreated.

## Storage (Phase 4)

`20260730000004_storage.sql` creates two private Storage buckets that replace
the Python `LocalFileStorage` `uploads/` directory:

- **documents** — original uploads + image derivatives (resized/thumbnail);
  `file_size_limit` 10 MiB and the allowed MIME types are
  `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
  `image/svg+xml`, `text/plain` (mirrored in
  `frontend/lib/server/constants.ts`).
- **reports** — generated JSON report summaries.

Buckets are `public = false`. Binaries are read/written server-side through
the service-role client in `frontend/lib/server/storage.ts` and served to the
browser via Route Handlers (`/api/documents/[id]/download|preview|thumbnail`),
so no client-facing storage RLS is required.

Apply locally (requires Docker):

```bash
supabase start          # start local stack
supabase db reset       # apply migrations + reset local DB
```

Apply to a remote project:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Auth & Row Level Security

- **profiles** — one row per Auth user (`id` → `auth.users(id)`, created
  automatically by the `handle_new_user` trigger). A user may read/update only
  their own row (`auth.uid() = id`). `profiles.role` (`admin|manager|
  operator|viewer`, default `viewer`) drives authorization; role changes flow
  only through the SECURITY DEFINER `public.set_user_role()` (admin-only,
  self-escalation guarded; see `20260818000001_phase14_roles.sql`, ADR-014).
- **notifications** — a user may read/update only notifications addressed to
  them, matched by email: `recipient_email = auth.jwt() ->> 'email'` or
  `recipient = auth.jwt() ->> 'email'`. Notification *creation* stays a
  privileged server-side operation (service_role), so `authenticated` has no
  insert/delete policy here.
- **shared tables** — role-gated writes (Phase 14). Reads remain
  `authenticated` + `using (true)` (single-company shared workspace, no
  per-user row ownership). Writes require `public.user_role()`:
  `projects`/`asset_types`/`asset_statuses` → `manager+`; `assets`/
  `documents` → `operator+` (`20260818000001_phase14_roles.sql:106-186`).
  Action-layer `requireRole` gates mirror the same hierarchy
  (`viewer < operator < manager < admin`).

Grants are explicit because `auto_expose_new_tables` is unset in
`config.toml`. The `anon` role gets no table grants (including `contacts` /
`property_contacts` via `20260821000001_schema_hardening.sql`); `authenticated`
gets SELECT/UPDATE on `notifications` and full CRUD on the remaining tables
(RLS governs rows) — `INSERT`/`DELETE` on `notifications` were revoked in
`20260821000001` (least-privilege; creation/deletion is `service_role`-only);
`service_role` bypasses RLS and is used only for privileged server-side
operations.

Note: the four tables created in migration `0001` existed before RLS was
enabled, so Supabase auto-exposed them to `anon` with full CRUD grants.
Migration `20260730000005_revoke_anon.sql` revokes those grants and
`20260821000001_schema_hardening.sql:121` extends the revoke to `contacts` /
`property_contacts` (created after the initial revoke) so `anon` has no access
at the privilege layer (denied before RLS is even evaluated). RLS verification
confirms this end-to-end: `anon` queries fail with `permission denied for
table`, while `authenticated` reads/inserts are governed by the policies above.

## Database types

`frontend/types/database.ts` mirrors the schema (including `profiles`).
Regenerate whenever the live schema changes (requires a linked project):

```bash
supabase gen types typescript --linked > ../frontend/types/database.ts
```
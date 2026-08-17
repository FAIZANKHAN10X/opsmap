# Supabase

OpsMap's Supabase project configuration, migrations, and database types.

## Layout

```
supabase/
├── config.toml            # Supabase CLI project config
└── migrations/
    ├── 20260730000001_initial_schema.sql   # All 6 tables + indexes + FKs + updated_at triggers
    ├── 20260730000002_enable_rls.sql       # RLS on all tables + authenticated placeholder policies
    ├── 20260730000003_auth.sql             # profiles table + auth.uid()-scoped RLS + grants
    ├── 20260730000004_storage.sql          # documents + reports Storage buckets
    └── 20260730000005_revoke_anon.sql      # Revoke anon table grants auto-exposed pre-RLS (Phase 14)
```

## Migrations

Migrations translate the final state of the Python SQLAlchemy models and the
Alembic chain `20260730_0001` → `20260730_0006` (see `docs/MIGRATION.md`). The
`organizations` table that Alembic created and later dropped is not recreated.

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

Phase 3 added Supabase Auth. The design has no org/role system:

- **profiles** — one row per Auth user (`id` → `auth.users(id)`, created
  automatically by the `handle_new_user` trigger). A user may read/update only
  their own row (`auth.uid() = id`).
- **notifications** — a user may read/update only notifications addressed to
  them, matched by email: `recipient_email = auth.jwt() ->> 'email'` or
  `recipient = auth.jwt() ->> 'email'`. Notification *creation* stays a
  privileged server-side operation (service_role), so `authenticated` has no
  insert/delete policy here.
- **projects, asset_types, asset_statuses, assets, documents** — keep
  `authenticated` + `using (true)` because the product is a single-company
  shared workspace with no per-user row ownership. These are intentional
  policies, not placeholders.

Grants are explicit because `auto_expose_new_tables` is unset in
`config.toml`. The `anon` role gets no table grants; `authenticated` gets full
CRUD on all tables (RLS governs rows); `service_role` bypasses RLS and is used
only for privileged server-side operations.

Note: the four tables created in migration `0001` existed before RLS was
enabled, so Supabase auto-exposed them to `anon` with full CRUD grants.
Migration `20260730000005_revoke_anon.sql` revokes those grants so `anon` has
no access at the privilege layer (denied before RLS is even evaluated). RLS
verification confirms this end-to-end: `anon` queries fail with `permission
denied for table`, while `authenticated` reads/inserts are governed by the
policies above.

## Database types

`frontend/types/database.ts` mirrors the schema (including `profiles`).
Regenerate whenever the live schema changes (requires a linked project):

```bash
supabase gen types typescript --linked > ../frontend/types/database.ts
```
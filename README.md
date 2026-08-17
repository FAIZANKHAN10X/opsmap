# OpsMap

Operations management platform for physical assets on an interactive map.

Users manage real-world environments—villas, hotels, warehouses, factories, hospitals, stadiums, parking, solar farms, data centers—through a visual workspace rather than spreadsheets.

## Architecture

```
Next.js (UI + Server Actions + Route Handlers) → Supabase (PostgreSQL, Auth, Storage)
```

- **Next.js + TypeScript** owns all business logic (server-side services and repositories).
- **Supabase** is the single source of truth: PostgreSQL (data), Auth, and Storage.
- The frontend is a visual projection of that state.

See [`docs/`](docs/) for the full source of truth: architecture, principles, API, database, security, and roadmap. The completed FastAPI → Next.js migration is recorded in [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | Next.js, React, TypeScript, Tailwind CSS |
| Backend      | Next.js server-side layer (Server Actions, Route Handlers) |
| Database     | Supabase PostgreSQL                 |
| Auth         | Supabase Auth                       |
| Storage      | Supabase Storage                    |
| Future AI    | LangChain, RAG, MCP (no local models) |

## Repository layout

```
OpsMap/
  docs/           # Architecture and standards (source of truth)
  frontend/       # Next.js application (UI + server-side layer + tests)
  supabase/       # Supabase config + SQL migrations (schema, RLS, storage)
  scripts/        # Developer helpers
  .env.example
```

## Setup

### Prerequisites

- Node.js 20+

### Bootstrap

```bash
cp .env.example .env
# Edit .env with your Supabase project values as needed

./scripts/dev-setup.sh
# or manually:
#   cd frontend && npm install
```

Frontend environment values go into `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for the
browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed
with `NEXT_PUBLIC_` or used as the default database client.

No Supabase project is required to develop: the application is architecturally
ready and renders graceful "not configured" states until credentials are added.

### Connect a real Supabase project

```bash
# 1. Create a project at https://supabase.com (or reuse one), then authenticate the CLI
supabase login

# 2. Link the CLI to the project
supabase link --project-ref <your-project-ref>

# 3. Apply the committed schema, RLS, and storage buckets
supabase db push

# 4. Regenerate the typed client from the live schema
supabase gen types typescript --linked > frontend/types/database.ts
```

Then fill `frontend/.env.local` with the project values (URL, anon key,
service-role key — see `.env.example`). Enabling **Auth** (Email provider) and
adding at least one user in the Supabase dashboard completes the setup; the
`handle_new_user` trigger creates the matching `profiles` row automatically.

Optional quality hooks:

```bash
pip install pre-commit   # or: uv tool install pre-commit
pre-commit install
```

## Commands

```bash
cd frontend
npm run dev          # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run format
npm run format:check
```

- Health: http://localhost:3000/api/health

## Current phase

The migration is complete: Next.js + TypeScript + Supabase replaces the former
FastAPI/Python architecture (Phases 0–13), and Phase 14 of the migration
record (production hardening) is done — including end-to-end verification
against a live Supabase project (auth, RLS, core data,
storage/document/report workflows, notifications, and a real user flow all
checked green). The 255-test suite, lint, typecheck, and the production
build pass. See `docs/MIGRATION.md` for the migration record, and follow
`docs/ROADMAP.md` for the product feature roadmap (its phase numbers are
independent of the migration's).

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PROJECT.md](docs/PROJECT.md) | Product vision |
| [docs/SYSTEM_PRINCIPLES.md](docs/SYSTEM_PRINCIPLES.md) | Engineering rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased delivery |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Conventions |
| [docs/API_SPEC.md](docs/API_SPEC.md) | API contract (historical + current HTTP surface) |
| [docs/DATABASE.md](docs/DATABASE.md) | Data model principles |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model |
| [docs/DECISIONS.md](docs/DECISIONS.md) | ADRs |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration record |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | State management |
| [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md) | Design system |
| [docs/AI.md](docs/AI.md) | AI roadmap |

## License

Proprietary — all rights reserved unless otherwise stated.
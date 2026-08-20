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
| AI / advanced | Not active — future ideas live in [docs/IDEAS.md](docs/IDEAS.md) |

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

> **Default property/villa types:** `supabase db push` applies
> `supabase/migrations/20260820000001_default_asset_types.sql`, which
> idempotently seeds the default `Villa` asset type (`slug: villa`) so a fresh
> database already has a usable property type for the owner workflow and Demo
> Mode. For already-deployed databases, the same defaults can be restored at
> runtime from **Settings → General → Property Types → Seed defaults**
> (idempotent, manager+ access, mirrors the Status Engine seed mechanism).

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

OpsMap is delivered as the **8AM HUB** — a real-estate business/owner
application (subtitle "INTERNAL OPERATIONS"), defined by Figma-derived
product/design requirements provided externally. Its user-facing navigation is
DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS (with SIGN OUT and
PROPERTY ADDRESS).

The 8AM HUB foundation is complete and verified:

- **DASHBOARD** — operational overview with data-driven KPI cards (PLACED
  (OPS), VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT) plus status
  distribution and recent properties.
- **ULLUWATU "26** — the property/project workspace: interactive property
  map + villa list, filtering, click-to-place, and full property details
  (identity, operations, characteristics, media, documents, related contacts).
- **CONTACTS** — first-class contacts (Lead/Client/Owner/Agent/Vendor/Other)
  with CRUD, canonical detail route, and property↔contact relationships.
- **DATABASE** — central structured-record management (Properties, Contacts,
  Documents, Media, Activity) over the canonical systems, reusing canonical
  detail routes.
- **SETTINGS** — configuration center (General / Users & Access / Integrations
  [Supabase, WhatsApp] / Notifications / System). Supabase is
  deployment/bootstrap configuration via environment variables; runtime
  switching is not supported and is not pretended. WhatsApp is a foundation
  slot only (not implemented).
- **Demo Mode is read-only** — every mutation surface is gated; writes are
  never accepted in demo mode.
- **Authorization** — existing server-side `requireRole` gates + Supabase RLS
  remain authoritative; no secrets reach the client.

The reconciliation phase (`chore(phase5)` — see `docs/MIGRATION.md`) audited
the repository against this locked specification and closed the remaining
gaps. The 474-test suite, typecheck, lint, and the production build pass.

The active roadmap (`docs/ROADMAP.md`) is scoped to the 8AM HUB product;
future work (durable audit log, notifications expansion, WhatsApp
integration, customer-facing dashboard, production readiness/deployment) is
tracked there. Advanced capabilities previously planned (recommendations,
analytics, AI, vector search, RAG, MCP, enterprise features, performance) are
**not** active — they are captured as future ideas in
[`docs/IDEAS.md`](docs/IDEAS.md).

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PROJECT.md](docs/PROJECT.md) | Product vision |
| [docs/SYSTEM_PRINCIPLES.md](docs/SYSTEM_PRINCIPLES.md) | Engineering rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased delivery (8AM HUB product) |
| [docs/IDEAS.md](docs/IDEAS.md) | Future ideas / advanced capabilities (not active) |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Conventions |
| [docs/API_SPEC.md](docs/API_SPEC.md) | API contract (historical + current HTTP surface) |
| [docs/DATABASE.md](docs/DATABASE.md) | Data model principles |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model |
| [docs/DECISIONS.md](docs/DECISIONS.md) | ADRs |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration record |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | State management |
| [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md) | Design system |
| [docs/AI.md](docs/AI.md) | AI notes (future ideas; superseded by docs/IDEAS.md) |

## License

Proprietary — all rights reserved unless otherwise stated.
# ARCHITECTURE.md

# OpsMap Architecture

> **Scope note (2026-08):** the active roadmap (`docs/ROADMAP.md`) is scoped
> only to finishing the core **8AM HUB** real-estate owner product. Sections
> of this document that describe future capabilities (recommendations,
> vector search, RAG, MCP) are **reference material for future ideas** — they
> are tracked in `docs/IDEAS.md` and are not active commitments.

> This document describes the technical architecture of OpsMap. It explains how the system is organized, how services communicate, and where responsibilities belong.

---

# Architecture Philosophy

OpsMap follows a modular service-oriented architecture.

The system should remain easy to understand while allowing future expansion.

Every module owns one responsibility.

Every dependency must exist for a reason.

---

# High-Level Architecture

```
                        Browser

                           │

                      Next.js Frontend
                 (React + TypeScript + Tailwind)

                           │
                     Server Actions /
                     Route Handlers
                           │

                  Next.js Server-side Layer
            (lib/server: repositories + services)

                           │

                       Supabase Platform
      ┌──────────────┼──────────────┐
      │              │              │
   PostgreSQL      Storage        Auth
                           │

              External AI Services
      ┌──────────────┼──────────────┐
      │              │              │
      LLM API     Vector DB     Future MCP
```

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- TailwindCSS

Responsibilities

- Dashboard
- Interactive map
- Forms
- Tables
- Filters
- API communication
- Client-side interactions

The frontend should never contain business logic.

---

## Backend

The Next.js server-side layer (`lib/server/`).

Responsibilities

- Server Actions and Route Handlers
- Authentication (Supabase Auth)
- Validation
- Business rules
- Service orchestration

Business logic lives server-side; the browser never runs it.

---

## Database

Supabase

Using

- PostgreSQL
- Authentication
- Storage

Supabase is the single source of truth.

---

## Data Access

Typed Supabase client (`@supabase/supabase-js`) + PostgreSQL schema.

Responsibilities

- Repositories (`lib/server/repositories/`)
- Row→domain mappers
- Queries
- Relationships

Business logic should never live inside data-access models.

---

## Background Processing

None. Reports and image derivatives run synchronously in the server-side
layer; email runs synchronously and is log-only until SMTP is configured.

The API should remain fast.

Anything slow belongs outside the request path (a future decision).

---

# Repository Structure

```
opsmap/

docs/

frontend/

supabase/

scripts/

README.md
```

---

# Frontend Structure

```
frontend/

app/             # App Router pages + Route Handlers (app/api/*, app/auth/*)

actions/         # Server Actions ("use server")

components/      # Reusable UI

features/        # Feature-scoped UI (incl. features/map/ — Google Maps, features/assets/PropertyEditor — single-page anchored editor)

hooks/           # Shared React hooks

lib/             # Config, constants, helpers (incl. lib/demo/, lib/workspace-layout.ts)

lib/server/      # Server-only services/repositories/storage + authorize/revalidate/email

middleware.ts    # Supabase session refresh + deny-by-default route gate

services/        # Thin client wrappers over Server Actions / Route Handlers

stores/          # Client UI stores

styles/          # Shared style modules (tokens.css)

types/           # Shared TypeScript types (incl. database.ts)

tests/           # Vitest suite (65 files / 505 tests)
```

---

## app/

Contains routing.

Responsible only for page composition.

No business logic.

---

## components/

Reusable UI.

Examples

Sidebar

Topbar

Button

Card

Modal

Status Badge

Asset Card

---

## features/

Feature-specific UI.

Examples

Asset Management

Search

Authentication

Projects

Dashboard

Map

Contacts

Each feature owns its own components.

---

## hooks/

Reusable React hooks.

Examples

useAssets()

useProjects()

useSearch()

---

## services/

Frontend API layer.

Responsibilities

- HTTP requests
- Authentication
- Error handling

React components should never call fetch directly.

---

## lib/

Utilities

Formatting

Constants

Helpers

Configuration

---

## types/

Shared TypeScript types.

---

# Server-side Structure

```
frontend/lib/server/

errors.ts          AppError hierarchy + envelopes

action-context.ts  wraps Server Actions (incl. requireRole/requireAuth guards)

http.ts            wraps Route Handler responses

audit.ts           redacting audit logger

authorize.ts       role helpers (user_role / requireRole) mirroring RLS

revalidate.ts      Next.js cache revalidation helpers

documentFile.ts    document file validation + helpers

email/             SMTP delivery (nodemailer) + log-only fallback (ADR-015)

repositories/      data access

services/          business logic

storage.ts         Supabase Storage (documents, reports)

constants.ts       shared constants (DEFAULT_ASSET_TYPES etc.)

pagination.ts      pagination math

validation.ts      input validation + normalizeOperationalMetadata / normalizeCoordinates

mappers.ts         row → domain mappers

payloads.ts        request/response payload shapes
```

---

## repositories/

Database access.

Responsibilities

Queries

CRUD

Pagination

Filtering

Handlers should never talk directly to Supabase clients.

---

## services/

Business logic.

Examples

AssetService

ProjectService

ContactService

PropertyContactRepository (contact↔property joins) lives in
`repositories/contacts.ts` alongside ContactRepository.

SearchService

NotificationService

DocumentService

ReportService

---

## services/storage.ts

Supabase Storage bucket access for document binaries and generated report
artifacts.

---

# API Layer

## actions/

Server Actions ("use server") — mutations and reads consumed by components.

Responsibilities

Receive inputs

Validate

Call services

Return envelopes

Nothing more.

---

## app/api/

Route Handlers — external HTTP surface.

Examples

/health

/asset-statuses/seed-defaults

/asset-types/seed-defaults

/documents/[id]/download

/documents/[id]/preview

/documents/[id]/thumbnail

---

# Services

---

## Authentication Service

Auth is provided by Supabase Auth, not an in-app service.

Login

Password sign-in via `signInWithPassword` (client) on `/login`

Logout

`POST /auth/signout` (Route Handler; POST-only so a plain link can never log anyone out)

Session validation

`middleware.ts` refreshes the cookie session on every matched request and
gates protected routes (deny-by-default → redirect to `/login`); the
dashboard layout re-verifies `auth.getUser()` server-side.

Authorization

RLS + action-layer `requireRole` gates enforce business roles
(`viewer < operator < manager < admin` via `profiles.role`,
`public.user_role()` / `public.set_user_role()`, ADR-014).

---

## Project Service

Owns

Projects

Project settings

Project metadata

---

## Asset Service

Owns

Assets

Status

Assignment

Availability

Operations

---

## Search Service

Responsibilities

Keyword search

Filtering

Sorting

Ranking

Initially uses PostgreSQL.

Later can use semantic search.

---

## Recommendation Service

Future (see `docs/ROADMAP.md`).

Initially

Rule-based

Future

AI-assisted

Responsibilities

Related assets

Nearby assets

Similar assets

Risk suggestions

---

## Document Service

Responsibilities

Upload

Download

Storage

Metadata

Permissions

Future

Document indexing

---

## Notification Service

Responsibilities

Emails

Alerts

Future

Slack

Teams

WhatsApp

---

# API Design

The HTTP surface is deliberately small. Business mutations are Server Actions
(`actions/`), not HTTP endpoints. Route Handlers (`app/api/`) exist only where
a raw HTTP response is required:

```
GET  /api/health
POST /api/asset-statuses/seed-defaults
POST /api/asset-types/seed-defaults
GET  /api/documents/[id]/download
GET  /api/documents/[id]/preview
GET  /api/documents/[id]/thumbnail
GET  /auth/callback
POST /auth/signout
```

Every action and Route Handler returns the shared envelope
`{success, data, pagination, error}` with stable error codes (see
`lib/server/errors.ts`). The historical FastAPI `/api/v1` REST contract is
recorded in `docs/API_SPEC.md`.

---

# Request Flow

```
Browser

↓

Server Action / Route Handler

↓

Validation

↓

Service

↓

Repository

↓

Supabase (PostgreSQL / Storage / Auth)

↓

Service

↓

Response

↓

Frontend
```

Business logic lives only inside services.

---

# Data Flow

```
User

↓

Frontend

↓

API

↓

Service

↓

Database

↓

Computed Result

↓

Frontend

↓

UI
```

---

# Image Derivative Flow

```
User uploads image

↓

Server Action stores original

↓

Synchronous derivative pipeline

↓

Resize

↓

Generate Thumbnail

↓

Update Database (paths)

↓

Frontend receives update
```

---

# Search Architecture

Phase 1

PostgreSQL

Full-text search (ILIKE over `name,code,description,owner,notes,assignees->>0..7` plus `metadata->>address/view/furnishing/floor/features`)

Ranking

Filters

Sorting

**Phase A — Professional Filters (2026-08):** single authoritative filter state
`useShell().filters: AssetFilterState` (`search, statusSlugs, typeSlugs, placement, priceMin/priceMax/currency, bedroomsMin/bathroomsMin, areaMin/areaMax, furnishing, features`). Primary bar: `[Search] [Type] [Status] [Price] [Beds & Baths] [More Filters]`. Price uses currency+min/max inputs (no slider, handles large IDR values). Bedrooms/bathrooms are `≥` thresholds, area is `min..max` on `metadata area_sqm`. Secondary filters live in `More Filters` popover (desktop) / drawer (mobile): placement (`latitude IS NOT NULL`), furnishing exact, features `AND` (every selected). Active chips show each applied filter with individual `×` (`removeFilter`) and `Clear all` (`clearFilters`). Result count from `listAssets.pagination.total`. Filter state is session-local (not URL-persisted) — `DashboardUrlSync` still hydrates `search/status/type/project/asset` only; professional filters stay in-memory, documented as intentional to avoid URL bloat at current scale. No `map filters` vs `list filters` split: `DevelopmentWorkspace` builds one `queryParams` and `assets` array feeds both `MapContainer` and `VillaListView`; filtered-out markers disappear, selection sync via `mapFocusRequest` (list→map pan) and `selectedAssetId` (map→list highlight + scrollIntoView). Unplaced properties never receive fake coordinates.

**Repository:** `AssetRepository:listFiltered` resolves slug filters via `resolveSlugIds`, applies ILIKE search (extended to metadata), then server-side post-filters numeric metadata fields (price/bedrooms/bathrooms/area/currency/furnishing/features) in memory after base DB fetch (bounded window ≤1000, pagination after filtering). Total is post-filter count. This preserves the `metadata JSONB` decision (no typed-column migration now); documented limitation — if dataset grows to thousands, promote to typed columns with DB indexes. Demo parity via `lib/demo/provider:listDemoAssets`.

**Phase C — Dashboard Command Center (2026-08):** `DashboardOverview` hierarchy `Header → KPIs → Operational overview → Needs Attention → Properties requiring attention → Recent Activity`. Header shows `8AM HUB · INTERNAL OPERATIONS`, greeting, project context (demo `16` vs real `n`). KPIs via `summarizeProject` shared path (`HubKpis`). Operational overview `ClickableStatusDistribution` renders `summary.by_status` with `Click to filter` → `router.push(/dashboard/development?status=slug)`. Needs Attention via `buildProjectAttention` (active `available/reserved/occupied/pending` only): `withoutPhotos` (image docs `storage_path`), `unplaced` (`latitude IS NULL`), `missingOps` (`capacity/price` null), `withoutContacts` (`property_contacts` count), `maintenance` (`status maintenance`), each `AttentionIssue` with `href` (`unplaced` via `setPlacementFilter`, `maintenance` via status query). Properties list max 8, issues chips, `View → /dashboard/properties/[id]`. Recent Activity via `buildProjectRecentActivity` (project-scoped `assets/contacts/documents` `updated_at` desc, 8 items, no audit table — `Derived from record timestamps — not audited history`). `getDashboardData` parallel `summary+attention+recentActivity` (single server action, demo via `buildDemoDashboardData` with 16/maintenance 1/5 recent). Respects `selectedProjectId/demoMode/refreshKey`, RLS, no map/filters duplication, empty `0 → Your property workspace is ready.`, loading skeletons, error retry.

---

Phase 2

Semantic Search

Embeddings

Vector Database

Similarity

Natural language search

Frontend remains unchanged.

---

# Recommendation Architecture

Phase 1

Deterministic

Price

Location

Status

Category

Owner

---

Phase 2

AI-assisted

Embeddings

Similarity

Behavior

Usage

---

# File Storage

Supabase Storage, two private buckets

```
documents/   original uploads + image derivatives (resized/thumbnail)
reports/     generated JSON report summaries
```

Buckets are `public = false`. Binaries are read/written server-side through
the service-role client (`lib/server/storage.ts`) and served via the
document Route Handlers; client-facing storage RLS is therefore not required.

Never store files inside PostgreSQL.

---

# Security

Authentication

Authorization

Role-Based Access

Validation

Rate Limiting

Audit Logs

Every endpoint should verify permissions.

---

# Authorization

Row access is governed by Supabase RLS plus action-layer `requireRole` gates
(ADR-014 — `profiles.role` `admin|manager|operator|viewer` via
`public.user_role()` / `public.set_user_role()`; `viewer < operator < manager
< admin`):

- `profiles` — a user may read/update only their own row (`auth.uid()`); role
  changes flow only through SECURITY DEFINER `public.set_user_role()`
  (admin-only, self-escalation guarded).
- `notifications` — a user may read/update only notifications addressed to
  them (matched by email). Creation is privileged (service_role, server-side).
- shared tables — role-gated writes, open reads. Reads remain `authenticated` +
  `using (true)` (single-company shared workspace, no per-user row ownership);
  writes require `public.user_role()`: `projects`/`asset_types`/
  `asset_statuses` → `manager+`, `assets`/`documents` → `operator+`
  (`20260818000001_phase14_roles.sql:106-186`). Every mutation also validates
  via `requireRole` in `lib/server/`.

The `anon` role has no table grants (migration `0005` revokes the pre-RLS
auto-exposed grants; `20260821000001` extends the revoke to `contacts` /
`property_contacts`); `notifications` grants are least-privilege
(`authenticated` retains only `SELECT`/`UPDATE` — `INSERT`/`DELETE` revoked in
`20260821000001` because creation/deletion is `service_role`-only);
`service_role` bypasses RLS and is used only for privileged server-side
operations.

---

# Logging

Log

Authentication

Errors

Uploads

Changes

Permission updates

Background jobs

Search failures

Logs should explain actions.

Not simply failures.

---

# Future AI Layer

The AI layer is optional.

The application must function completely without it.

Future AI services include

Property summaries

Natural language search

Document Q&A

Recommendations

Workflow automation

---

# Future RAG

```
Documents

↓

Chunking

↓

Embeddings

↓

Vector Database

↓

Relevant Chunks

↓

LLM

↓

Answer
```

Used only where semantic understanding is valuable.

---

# Future MCP

The application exposes internal capabilities as tools.

Examples

search_assets()

update_asset()

assign_user()

create_task()

upload_document()

schedule_inspection()

AI should call tools instead of inventing answers.

---

# Scalability

The architecture should support

Single project

Multiple projects

Thousands of assets

Role isolation (authentication is live; authorization is RLS + action-layer `requireRole` — ADR-014)

Cloud deployment

OpsMap is a single-company internal deployment. There is no multi-tenant organization layer.

The frontend should remain unchanged as the backend grows.

---

# Deployment

Frontend

Vercel (or any Node host)

Database

Supabase

Storage

Supabase Storage

Vector Database

Cloud provider

No local infrastructure is required beyond development.

---

# Architectural Goal

The architecture should make it easy to:

- Add new asset types
- Replace services
- Introduce AI
- Scale to larger datasets
- Integrate external systems
- Maintain the codebase over time

A developer joining the project should understand where new functionality belongs without needing to refactor existing modules.

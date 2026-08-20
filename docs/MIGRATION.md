# MIGRATION.md

# OpsMap Migration Plan — FastAPI + Redis → Next.js + Supabase

> Phase 0 deliverable: a complete migration map from the current
> Next.js + FastAPI/Python + Redis/RQ architecture to a single
> Next.js/TypeScript application backed by Supabase (PostgreSQL,
> Auth, Storage). This document is the technical source of truth for
> the migration. Functional requirements continue to come from
> `README.md`, `docs/ROADMAP.md`, and the other product docs.

---

# 1. Current Architecture (As Built)

## 1.1 Repository Layout

```
OpsMap/
├── docs/                    # 14 product/architecture docs
├── frontend/                # Next.js 16.2.12 + React 19 + TS + Tailwind v4
├── backend/                 # FastAPI + SQLAlchemy 2 + Alembic + Redis/RQ + Pillow
├── scripts/                 # dev-setup.sh
├── docker-compose.yml       # Redis only
├── .env.example             # mixed backend + frontend vars
└── user_notes.txt
```

- Git history: 8 commits, features built through "Phase 10 notifications"
  (matching the old `docs/ROADMAP.md` numbering).
- No `.env` committed. Supabase is not configured anywhere
  (URLs/keys are empty placeholders).
- Frontend has zero server-side code today: no async server
  components, no route handlers, no server actions, no `route.ts`.
  All 22 feature files are `"use client"`.

## 1.2 Backend Dependencies (`backend/pyproject.toml`)

| Package | Role |
|---|---|
| `fastapi`, `uvicorn[standard]` | HTTP framework + server |
| `sqlalchemy>=2`, `alembic` | ORM + migrations |
| `pydantic`, `pydantic-settings`, `python-dotenv` | Validation + config |
| `redis`, `rq` | Background jobs |
| `psycopg[binary]`, `greenlet` | Postgres driver |
| `python-multipart` | Document uploads |
| `pillow` | Image resize/thumbnail derivatives |

Dev: `ruff`, `pytest`, `pytest-asyncio`, `pre-commit`, `fakeredis`, `httpx`.

Code layout (`backend/app/`):
`api/v1/*` (10 routers) → `services/*` (8) → `repositories/*` (6) →
`models/*` (6) + `schemas/*` (8) + `core/*` (settings, exceptions,
queue, constants) + `tasks/*` (images, email, reports) +
`workers/worker.py` (RQ) + `utils/*`.

## 1.3 Database Schema (Alembic 0001 → 0006)

| Table | Key columns | Notes |
|---|---|---|
| `projects` | id (uuid PK), name, slug, description, status (`active`/`archived`), created_at, updated_at, created_by, updated_by, deleted_at | unique slug; soft delete |
| `assets` | project_id FK, asset_type_id FK, asset_status_id FK, name, code, description, owner (text), notes, assignees (JSONB), metadata (JSONB), audit, deleted_at | indexes on (project_id, asset_status_id), (project_id, asset_type_id) |
| `asset_types` | name, slug, description, sort_order | unique slug (global) |
| `asset_statuses` | name, slug, description, color, sort_order | unique slug; **color is visual source of truth** |
| `documents` | asset_id FK, name, filename, mime_type, size_bytes, storage_path, thumbnail_path, resized_path, category, notes | indexes on asset_id, category, deleted_at |
| `notifications` | severity, kind, title, message, recipient, recipient_email, entity_type, entity_id, read_at, metadata (JSONB) | no soft delete |

Conventions to preserve: UUID PKs, `now()` timestamps, JSONB for
metadata/assignees, universal soft delete (`deleted_at`), snake_case,
`_id` FK suffix.

## 1.4 API Surface (`/api/v1`)

Uniform envelope `{success, data|error, pagination, message}` with
stable error codes.

- `/health`
- `/projects` (CRUD, slug conflict → `PROJECT_SLUG_EXISTS`)
- `/assets` (list w/ project/type/status/search/owner/assigned-to/
  date filters, sort, pagination; CRUD; assignment notifications)
- `/asset-types` (CRUD minus delete; `/seed-defaults`: idempotent seed of
  the default `villa` property type — Phase 1)
- `/asset-statuses` (CRUD + `/seed-defaults`; **Status Engine**:
  hex color validation, slug conflict, delete blocked while in use,
  7 seeded defaults)
- `/documents` + `/assets/{id}/documents` + upload/download/preview/
  thumbnail (multipart; MIME allowlist; size cap; category inference;
  local FS storage; image job enqueue)
- `/search` + `/search/suggestions` (ILIKE, incl. `cast(assignees, String)`)
- `/jobs/{id}` + `/reports/generate` + `/jobs/email` (Redis/RQ)
- `/notifications` + `/unread-count` + `/read-all`

## 1.5 Storage, Jobs, Auth

- **Storage:** `LocalFileStorage` → `uploads/assets/{asset_id}/documents/`
  and `uploads/assets/{asset_id}/derivatives/`; binary served via
  `/documents/{id}/download|preview|thumbnail`.
- **Jobs:** Redis + RQ; `enqueue()` never raises when Redis is down.
  Tasks: Pillow resize (1920) + thumbnail (256); SMTP email
  (log-only fallback); `project_summary` JSON report.
- **Auth:** none. `created_by`/`updated_by` nullable; `assignees` is a
  free-text `string[]` placeholder; `recipient` is free text.

## 1.6 Frontend Data Layer

All 9 services are `const USE_MOCK = true` with in-memory mock store
(`services/mock/data.ts`):

- `assets`, `asset-statuses`, `asset-types`, `dashboard`, `documents`
  (in-memory Blob URLs), `notifications`, `projects`, `search`,
  `jobs` — all mock-backed.
- `health` + `api-client` — real fetch layer but **dead code**
  (imported nowhere).
- Mock leakage into UI: `features/dashboard/InfoPanel.tsx:11` imports
  `MOCK_ASSET_STATUSES`/`MOCK_ASSET_TYPES` directly.
- State: two client contexts (`shell-context`, `toast-context`) +
  local `useState`/`useEffect`. No React Query/SWR.
- Frontend→backend coupling points:
  1. `lib/env.ts` → `NEXT_PUBLIC_API_URL` / `http://localhost:8000`.
  2. `services/api-client.ts` (used only by dead `health.ts`).
  3. 9 mock services with `USE_MOCK = true`.
  4. Copy/`JobStatus` referencing Redis + RQ.
  5. `frontend/README.md` + root `.env.example` `NEXT_PUBLIC_API_URL`.

---

# 2. Target Architecture

A single Next.js (App Router) application:

- **Database:** Supabase PostgreSQL, managed via SQL migrations.
- **Auth:** Supabase Auth (email/password), sessions via cookies,
  RLS as defense-in-depth.
- **Storage:** Supabase Storage buckets for documents/derivatives.
- **Data access:** `@supabase/supabase-js` (authenticated server client
  + RLS for normal user operations) and server-side service-role client
  for genuinely elevated operations only (never in the browser, never
  the default client).
- **Server code:** Server Components for reads; Server Actions for
  mutations; Route Handlers where an HTTP-style endpoint is genuinely
  needed (file serving, health, webhooks).
- **Async:** No Redis/RQ. Image derivatives and reports generated
  synchronously at current scale; escalate to Edge Functions /
  pg_cron only if measurement proves it necessary.

---

# 3. Component-by-Component Mapping (Old → New)

| Old (Python/FastAPI) | New (Next.js + Supabase) |
|---|---|
| SQLAlchemy models + Alembic 0001–0006 | Supabase SQL migrations (`supabase/migrations/*.sql`), same tables/columns/indexes/FKs + RLS policies |
| Pydantic schemas | `types/database.ts` (generated) + domain types in `frontend/types/` |
| `repositories/*` (base list/pagination/soft-delete, ILIKE search, slug checks) | TypeScript data-access modules using Supabase query builder (`.ilike()`, `.range()`, `eq('deleted_at', null)`); keep filter/pagination semantics |
| `services/*` (asset validation, status engine, notification diff, search validation, report aggregation) | `frontend/lib/server/services/*.ts` (server-side), same business rules; RLS is defense-in-depth, service layer remains authoritative |
| `api/v1/*` FastAPI routers | Server Components (reads) + Server Actions (mutations) + Route Handlers (file serving/health); do not 1:1 clone routers |
| `DataResponse`/`ListResponse`/`ErrorResponse` + error codes | Preserved as internal TS contract (`types/api.ts`); keeps Phase 5/6 UI compatible |
| Auth (none) | Supabase Auth (Phase 3): `/login` + middleware, protected routes/layouts, `profiles` table, RLS by `auth.uid()`/JWT email |
| `LocalFileStorage` + `/download|preview|thumbnail` | Supabase Storage buckets (`documents`, `reports`; `20260730000004_storage.sql`); files served via Route Handlers using the service-role client; derivative paths in DB |
| Pillow image jobs | Synchronous derivative generation in upload path (Phase 9 decision) |
| SMTP email jobs | Trigger path for assignment emails; preserve log-only fallback |
| RQ report job | Synchronous server-side generation (Phase 9 decision) |
| Redis/RQ queue + `/jobs` | Removed; no async infra unless measured |
| `notifications` table + service diff | Same table; server-side assignment-diff logic; read/unread/counts |
| 9 mock services + `USE_MOCK = true` + `mock/data.ts` | Real data access (Server Components + Actions/Route Handlers); mock removed |
| Python pytest suite | Vitest suite; port behavior tests; delete Python tests after parity (Phase 12/13) |
| `.env.example` backend vars, `docker-compose.yml`, `scripts/dev-setup.sh`, `.pre-commit-config.yaml`, `backend/` | Removed in cleanup phases (Phase 13) |
| Vercel + VM + managed Redis | Vercel + Supabase only |

---

# 4. Phase Plan

Phased migration. Each phase: implement only the current phase, remove
obsolete code for it, update docs/tests, run lint + typecheck + tests +
build, verify the app runs, summarize, then stop.

1. **Phase 0 — Architecture Audit** (this document). ✅ done.
2. **Phase 1 — Supabase Foundation**: install `@supabase/supabase-js`
   + `@supabase/ssr`; add env accessors; create Supabase clients
   (browser, authenticated server + RLS, server-only admin); update
   setup docs. ✅ done.
3. **Phase 2 — Supabase Database**: SQL migrations for the 6 tables +
   indexes/FKs; RLS policies; generated TS types. ✅ done
   (`supabase/migrations/`, `frontend/types/database.ts`).
4. **Phase 3 — Supabase Auth**: login/logout/session, protected routes,
   user identity. ✅ done (`profiles` table + `auth.uid()`-scoped RLS in
   `supabase/migrations/20260730000003_auth.sql`; `middleware.ts`;
   `/login` + `/auth/*` routes; protected dashboard layout + sidebar
   identity/sign-out).
5. **Phase 4 — Data layer**: real data access replacing mock services;
   remove `USE_MOCK` + `mock/data.ts` where replaced. ✅ done
   (server-side services + repositories under `frontend/lib/server/`,
   Server Actions in `frontend/actions/`, Route Handlers for
   health/seed-defaults/document serving/job polling, storage
   migration `20260730000004_storage.sql`; mock services remain
   until each feature port).
6. **Phase 5 — Feature ports**: all client features switched from mock to
   the Phase 4 server layer. ✅ done (`services/*` are now thin wrappers over
   Server Actions + Route Handlers; `services/mock/` deleted; multi-status
   legend filter via `status_slugs`; dashboard summary via a dedicated
   `getProjectSummary` action; ReportsPage adapted to synchronous report
   generation; no migrated feature depends on `USE_MOCK`/mock data).
 7. **Phase 6 — Core domain verification**: behavioral parity of the
    migrated TS layer against the Python services and docs, locked by a
    Vitest suite that runs without live Supabase credentials. ✅ done
    (`npm test`: 97 tests across validation / pagination / errors /
    mappers plus project, asset-type, asset-status, asset, notification,
    search, document, and dashboard services; `npm run typecheck`, `npm
    run lint`, `npm run build` all pass). Regressions found and fixed
    during the Python↔TS parity review: asset type/status could not be
    cleared to `null` on update, status/type list ordering lost the
    `name` tiebreaker, document `is_previewable` ignored the MIME
    allowlist, and document `category` lost its `"other"` fallback.
 8. **Phase 7 — Interactive workspace**: the map/canvas workspace is
    fully wired to the Phase 4/5 server layer and verified against it.
    ✅ done. Status/type colors derive from `AssetStatus.color` /
    `AssetType` domain data via `lib/status-colors.ts` (server data, not
    hardcoded/mock constants); the workspace (`features/dashboard/`,
    `features/workspace/`) imports no `services/mock`/`USE_MOCK` code.
    Type filtering was completed end-to-end (the `typeSlugs` filter state
    existed but was unwired): `toggleTypeFilter` in shell-context, type
    chips in `FilterControls`, `type_slugs` array support in
    `AssetRepository.listFiltered` / the `listAssets` action + service,
    and the workspace passes `type_slugs` to the server action. Asset
    highlight rules were extracted from `InteractiveCanvas` into the pure
    `lib/workspace-highlights.ts` (`computeHighlightIds`) so search/
    status/type highlight behavior is unit-tested. Added focused tests:
    `tests/workspace/workspace-layout.test.ts` (ported from the
    standalone `lib/workspace-layout.test.ts`, which was not in the
    vitest suite), `tests/workspace/status-colors.test.ts`,
    `tests/workspace/workspace-highlights.test.ts`, and a `type_slugs`
    filter case in `tests/services/assets.test.ts` — suite now 120 tests,
    all green. `selectedProjectId` remains client-memory only (seeds to
    the first project on refresh); URL persistence is not an existing
    product requirement, so it was left out of scope per the migration
    plan.     Project selection → workspace data flow, asset selection,
    pan/zoom/hover/highlight, and loading/error/empty states are
    preserved as built.
 9. **Phase 8 — Documents & storage**: the document/storage feature is
    verified end-to-end against the original Python implementation
    (`backend/app/services/document.py` + `storage.py` +
    `core/document_constants.py` + `api/v1/documents.py` +
    `tasks/images.py`). ✅ done. Parity confirmed across the full
    lifecycle: metadata create, multipart upload (empty-file, size,
    MIME-allowlist, category-inference validation), storage path layout
    (`assets/{asset_id}/documents/{document_id}_{safe}`, safe-filename
    sanitization + path-traversal protection), listing (per-asset and
    all, category + name/filename/notes ILIKE search, `created_at` desc
    + pagination), retrieval, download/preview route handlers
    (`attachment`/`inline`), thumbnail serving with MIME sniffing by
    extension, soft-delete that removes original + thumbnail + resized
    binaries, asset-existence enforcement, and the `is_previewable` /
    `has_file` / `has_thumbnail` mapper flags (parity with Python
    `to_read`). Constants match exactly (10 MiB upload cap, 1920/256 px
    derivative edges, identical MIME/category sets). Image derivatives
    are generated synchronously in the upload path (sharp) instead of the
    Python RQ job — the documented Phase 9 decision; failures are
    swallowed so a bad image never fails the upload. Added focused tests
    (mocked storage + fake client): `readFile` FILE_NOT_FOUND for
    metadata-only and missing-storage rows, listAll category/search/
    pagination, `"other"` category fallback, delete removing all three
    stored binaries, and `tests/services/storage.test.ts` covering
    `safeFilename`/`buildRelativePath` sanitization + traversal
    protection. Suite now 136 tests, all green; `npm run lint`,
    `npm run typecheck`, `npm run build` pass (lint unchanged: 2
    pre-existing `NotificationCenter.tsx` errors).
10. **Phase 9 — Background job removal & async verification**: the old
    Redis/RQ architecture is confirmed completely replaced; the app has
    no job system and no dependency on it. ✅ done. Full-repo search for
    Redis/RQ/queue/worker/job-poling references found them only in the
    Python backend (reference code, kept for Phase 13), root-level legacy
    docs/dev files (`README.md`, `docker-compose.yml`,
    `scripts/dev-setup.sh`, `.env.example`), and `docs/` — none in the
    active Next.js application. Verified: image derivatives run
    synchronously via Sharp in the upload path (new test exercises the
    real Sharp pipeline on a PNG and records the derivative saves);
    `generateReport` is fully synchronous server-side (new test covers
    aggregation, validation, and storage write); the UI polls no job
    endpoints (the only `setInterval` is the 30 s notification refresh);
    no migrated feature requires a worker. Reworked: assignment email was
    the one dead end — `sendEmail` (log-only when no SMTP) existed but
    was never called. `notifyAssetAssignments` now invokes it
    synchronously for email-looking assignees, replacing the Python RQ
    email enqueue (no job IDs invented). Removed: the obsolete
    `GET /api/jobs/[jobId]` compatibility route (no callers anywhere;
    documented, not replaced — a 404 now) and the unused
    `EmailEnqueueInput` payload type (a leftover enqueue abstraction).
    Added focused tests: `tests/services/email.test.ts` (log-only
    validation/truncation), `tests/services/reports.test.ts` (sync
    report), `tests/services/images.test.ts` (sync Sharp derivatives +
    skip/failure paths), and an assignment-email assertion in
    `tests/services/notifications.test.ts`. Suite now 150 tests, all
    green; lint (2 pre-existing), typecheck, build pass. The old Python
    Redis/RQ implementation remains untouched as reference code; Phase 13
    removes it.
11. **Phase 10 — Notifications**: the notification system is fully
    migrated and verified against the Python implementation
    (`services/notification.py`, `repositories/notification.py`,
    `api/v1/notifications.py`, `schemas/notification.py`, the model, and
    constants). ✅ done. All 16 lifecycle items verified: assignment
    notification creation + difference detection, persistence via the
    privileged (service-role) create path, listing (kind/unread-only
    filters, `created_at` desc, pagination), unread count, mark read /
    unread, read-all (returns the number updated), severity + kind
    validation with identical constant sets, recipient handling,
    email-looking recipient detection, synchronous `sendEmail`
    invocation, and the log-only email fallback (Phase 9 wiring). Reads
    and read/unread/read-all mutations all use the authenticated server
    client (RLS-scoped); only creation is privileged, matching the
    `notifications_select_own` / `notifications_update_own` policies
    (`recipient_email = auth.jwt()->>'email' OR recipient = ...`).
    Cleanups: removed a dead, never-forwarded `recipient` field from the
    client `ListNotificationsParams` (the Python list/count/read-all
    `recipient` query param is superseded by RLS scoping in the
    authenticated path; the repository still supports the filter for
    admin/global use) and removed a stale "for mock/offline" comment in
    `NotificationCenter`. Added focused tests: `get` → NOTIFICATION_NOT_
    FOUND, `unreadCount`, `markAllRead` (marks unread + returns count),
    unread-only/kind list filtering + pagination, and create passthrough
    of recipient/entity/metadata. Suite now 155 tests, all green; lint
    (2 pre-existing `NotificationCenter.tsx` errors), typecheck, build
    pass. No mock notification implementation remains; no Redis/RQ/job
    dependencies in the active app (matches stay only as log-tag strings
    and comments). Intentional differences documented in §5. RLS-scoped
    reads and the 30 s UI refresh are runtime-only verification (no live
    project/credentials).

12. **Phase 11 — Auditing & reliability**: the new app is auditable,
    error-safe, validated, and honestly health-checked. ✅ done. Audit:
    added a lightweight server-side audit helper
    (`frontend/lib/server/audit.ts`, `server-only` guarded) that emits
    structured `[audit] <action>` log records with sensitive-key redaction
    for the business-critical mutations the docs require to be traceable
    (asset create/update/delete, project create/update/delete, asset
    status/type create/update/delete + seed, document upload/delete,
    notification create, report generation). Records are created
    server-side only — nothing is exposed to the browser and no complex
    audit/event system was introduced. The DATABASE.md traceability model
    (`created_by`/`updated_by` nullable, `deleted_at` soft deletes) is
    preserved in the schema; a durable immutable audit-log table remains
    the original ROADMAP Phase 13 item. Error handling: fixed
    `toErrorDetail` so unexpected (non-AppError) failures no longer leak
    `Error.message` to clients — they now return a generic
    `INTERNAL_ERROR` and the real cause is logged server-side
    (`console.error("unhandled_error", ...)`). Storage failures now
    surface as stable AppErrors (`STORAGE_UPLOAD_FAILED` /
    `STORAGE_READ_FAILED` / `STORAGE_DELETE_FAILED`, 502) instead of raw
    supabase messages. Health: `/api/health` reports `status: "ok"` when
    Supabase is configured and `"degraded"` (with
    `supabase: "unavailable"`) when not; no Redis/obsolete checks were
    reintroduced (the Python reference pinged Redis). Verified: server-side
    validation is authoritative across assets, projects, statuses, types,
    documents, notifications, and reports (slugs, hex colors, assignees,
    allowed statuses/kinds/categories/mime types/report types, UUIDs); no
    client code imports server-only modules or the service-role key
    (`services/features/components/hooks` grep clean); service-role is used
    only where genuinely privileged — storage bucket writes and notification
    creation, which RLS cannot grant (no `notifications` insert policy), and
    the read/delete asset paths intentionally pass the authenticated client;
    email can never throw (log-only) so assignment ops are never corrupted;
    document image-derivative failures still cannot fail an upload
    (`.catch(() => undefined)`). Added tests: `audit` (prefix, redaction,
    non-throwing), storage failure-path AppErrors, and a non-leak assertion
    in `errors.test.ts`. Suite now 162 tests, all green; lint (2
    pre-existing `NotificationCenter.tsx` errors), typecheck, and build
    pass. Intentional differences and risks in §5/§6.

13. **Phase 12 — Full testing & migration coverage**: a dedicated
    testing phase that builds on (not replaces) the existing suite, with
    broader test infrastructure allowed. ✅ done. Layers added:
    (a) **Server/domain unit tests** — extended `mappers.test.ts` with
    `toAsset`/`toAssetType`/`toAssetStatus` (assignee filtering, metadata
    normalization); (b) **Server Action tests** — new
    `tests/actions/{projects,assets,documents,notifications,reports,search-statuses}.test.ts`
    drive the real action → service → repository stack against an
    in-memory fake Supabase client + mocked storage/images, asserting both
    success envelopes and error-code envelopes (validation, missing
    entities, slug conflicts, unread-count math, assignee-only
    notifications, report by-status grouping, search filters);
    (c) **Route handler tests** — `tests/routes/{health,documents,asset-statuses}.test.ts`
    cover `/api/health` (ok vs degraded), the documents download/preview/
    thumbnail handlers (200 inline/attachment, 404 missing doc/thumbnail,
    422 bad UUID, 503 unconfigured, 405 wrong method, cache headers), and
    seed-defaults (idempotent seeding, 405s, 503); (d) **Authorization /
    security tests** — `tests/security/middleware.test.ts` (deny-by-default
    redirects to `/login` when Supabase is unconfigured or unauthenticated,
    authenticated redirect away from `/login`), `tests/security/http.test.ts`
    (error envelopes, 404/422/500 status mapping, non-leak of unexpected
    errors), and `tests/security/boundaries.test.ts` static scans (client
    bundles never import `server-only`/`@/lib/server`/admin client, no
    service-role references outside server/env files, and RLS guards:
    notifications has select/update policies scoped to the recipient email
    and no authenticated insert policy, keeping creation service-role-only);
    (e) **Component tests** — `tests/components/{login-form,filter-controls,
    notification-center,reports-page}.test.tsx` (jsdom) cover login state
    and auth errors, status/type filter toggling + clear, the notification
    dialog with unread badge + mark-read + empty state, and report
    generation with summary render + failure alert; (f) **E2E (local)** —
    `tests/e2e/journeys.test.ts` drives a full
    project → type → status → asset → document upload → list → notification
    → report journey through the real action stack with fakes; clearly
    local/deterministic, not browser E2E and not proof of live RLS;
    (g) **Python parity** — behavior checks mirror the
    `backend/tests/*` coverage (CRUD, status engine, search, documents,
    notifications, report totals, health). Regression greps confirm no
    mock-frontend architecture, no Redis/RQ/celery/worker usage, and no
    Python invocation from the frontend (only doc comments referencing the
    removed system). Suite: **253 tests / 37 files, all green**; lint
    (2 pre-existing `NotificationCenter.tsx` errors), typecheck, and
    production build pass. Coverage is not configured (no
    `@vitest/coverage-v8` provider installed); the suite is behavior-based.
    Live-Supabase-only behavior (real RLS enforcement, DB/storage/email
    reachability, browser E2E) remains runtime verification with a
    provisioned project; see §6.

14. **Phase 13 — Remove the legacy Python architecture**: the FastAPI /
    SQLAlchemy / Alembic / Redis / RQ / Pillow stack is deleted. ✅ done.
    Removed: `backend/` (FastAPI app, SQLAlchemy models + Alembic
    migrations + `alembic.ini`, RQ workers + task modules, Pydantic
    schemas, pytest suite, `pyproject.toml`, `uv.lock`, `.venv`), the
    Redis-only `docker-compose.yml`, the Python dev-setup script
    (`scripts/dev-setup.sh` rewritten to Next.js-only), the ruff/pre-commit
    Python hooks, `user_notes.txt` (obsolete scratch note), and every
    Python/Redis/RQ variable in `.env.example`. The root `README.md`,
    `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CODING_STANDARDS.md`,
    `docs/SECURITY.md`, `docs/AI.md`, `docs/SYSTEM_PRINCIPLES.md`, and
    `frontend/README.md` were updated to describe the Next.js +
    TypeScript + Supabase architecture only. Historical decisions
    (`docs/DECISIONS.md`) and this migration record are preserved as
    reference. Audit findings before deletion: the active Next.js app
    never imports `backend/` (server-only boundary scan, Phase 12), reads
    only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
    `SUPABASE_SERVICE_ROLE_KEY` (no Redis/RQ/backend env vars), has no
    Redis/RQ/worker/celery usage (only doc comments), and never invokes
    Python. The audit also confirmed `supabase/config.toml`
    `backend = "postgres"` is Supabase's own option key (false positive),
    and `frontend/lib/status-colors.ts` / `frontend/tests/helpers/
    fakeClient.ts` "backend" wording is a generic noun (false positives).
    After deletion: 253 tests pass, lint clean (2 pre-existing
    `NotificationCenter.tsx` errors), typecheck clean, production build
    succeeds. The final dev setup is Next.js + TypeScript + Supabase only;
    no live Supabase project is connected yet (architecturally ready).

15. **Phase 14 — Production hardening + real Supabase integration**:
    in progress. Completed offline: verified `frontend/types/database.ts`
    matches the committed migrations (tables, columns, FK relationships,
    required/optional insert fields all agree with 0001–0004; regenerating
    once linked is still the source of truth); confirmed `.env.example`
    documents exactly the 3 runtime env vars; security review found and
    fixed a raw-database-error leak — repositories previously wrapped the
    Supabase client's raw `error.message` into a `DATABASE_ERROR` AppError
    (39 sites) which surfaced verbatim to clients via `toErrorDetail`;
    now they throw via `toDatabaseError` (generic "The database request
    failed." message to clients, real cause logged server-side) with static
    + behavior regression tests added to `tests/security/boundaries.test.ts`.
    Phase 14 hardening (implemented, offline): business-user roles
    (ADR-014) — `20260818000001_phase14_roles.sql` adds `profiles.role` with
    a CHECK constraint, SECURITY DEFINER `public.user_role()` /
    `public.set_user_role()` (the only role-change path, admin-checked),
    profile self-update guard + admin policies, and role-scoped RLS write
    policies (projects/asset_types/asset_statuses manager+; assets
    operator+ insert/update + manager+ delete; documents operator+
    insert/update + manager+ delete); action-layer `requireRole` gates in
    `lib/server/authorize.ts` (viewer < operator < manager < admin,
    unauthenticated actors fail closed with 403) threaded through
    `withServerContext` (which now resolves the actor from the session +
    profiles); `created_by`/`updated_by` populated from the actor across
    projects/assets/types/statuses/documents with the actor id added to
    audit lines; admin-only `setUserRole` action (`actions/profiles.ts`);
    permission-aware UI via `usePermissions` (`stores/user-context.tsx`);
    URL state via `DashboardUrlSync` (project/asset/search/status/type,
    `router.replace`, demoMode stays session-local); SMTP email (ADR-015) —
    nodemailer transport engaged when `SMTP_HOST` is set
    (`lib/server/email/{config,transport}.ts`, `sendViaSmtp` never throws)
    with a validated log-only fallback, `.env.example` documents
    `SMTP_*`/`MAIL_FROM`/`APP_URL`, and `/api/health` now reports the email
    mode. Remaining live steps (blocked, no fake success): CLI is not logged in
    (`supabase login`), no project linked (`supabase link`), Docker absent
    for local stack, and no Supabase credentials exist. Suite at Phase 14:
    255 tests / 37 files pass, lint unchanged (2 pre-existing
    `NotificationCenter.tsx` errors), typecheck clean, build succeeds.
    **Live verification (done, no longer blocked)**: CLI authenticated,
    project `ovnqbxvjtnpcgsodqhrs` linked, migrations 0001–0004 applied
    plus 0005 (revoke auto-exposed anon table grants found on tables
    created before RLS). `.env.local` had the Dashboard URL instead of the
    API URL — fixed to `https://ovnqbxvjtnpcgsodqhrs.supabase.co`
    (new-style `sb_publishable_`/`sb_secret_` keys work with
    `@supabase/supabase-js`). Middleware matcher now excludes `api/health`.
    Live checks green: auth (signin/session refresh/rotation/POST-only
    signout/callback), profiles trigger + self-scoped RLS, 16/16 RLS
    checks incl. anon privilege denial, 18/18 core-data checks
    (seed-defaults, pagination, filters, JSONB assignee search, summary,
    soft-delete), 29/29 storage + document workflow + reports +
    notifications checks (upload/preview/download/thumbnail, path-traversal
    sanitization, empty/oversize/invalid-MIME rejection, soft-delete +
    blob removal, report aggregation, assignment→notification + read/
    unread/mark-all + recipient scoping), 19/19 real user flow. Two real
    fixes surfaced: `assets.ts` search/`assigned_to` filter now uses
    `assignees->>i` or() predicates (PostgREST rejects casts inside or()
    trees and ignores casts for like/ilike), and the test fake client was
    kept in sync. Final suite: 255/255 tests, typecheck clean, build
    succeeds, lint unchanged. All live test data cleaned up. Phase 14
    hardening suite: 289/289 tests / 44 files pass, typecheck clean,
    lint clean, build succeeds.

---

# 5. Decisions (recorded)

1. **API contract**: preserve `{success, data, error, pagination}` +
   error codes as the internal TypeScript contract.
2. **Pre-auth fields**: keep `assignees`/`owner`/`recipient` as
   free-text during migration; do not redesign the user/assignment data
   model yet.
3. **Image derivatives**: generated synchronously during upload for the
   current scale; no async infra unless genuinely necessary.
4. **Reports**: generated synchronously server-side; no async infra
   unless performance proves otherwise.
5. **Testing**: Vitest (with an in-memory, typed fake Supabase client in
   `tests/helpers/fakeClient.ts`) is introduced in Phase 6 to lock
   migrated behavior without live credentials; Phase 12 expands coverage
   to DB-backed integration and ports the Python pytest parity cases.
6. **Clients**: authenticated Supabase server client + RLS for normal
   user operations; service-role client only for elevated operations,
   strictly server-side, never the default.
7. **Phase 3 auth scoping**: no org/role system. A minimal `profiles`
   table (row per Auth user) is added; `notifications` RLS matches the
   signed-in user's email against `recipient`/`recipient_email`;
   shared tables (projects/assets/types/statuses/documents) keep
   `authenticated` + `using (true)` because the product is a
   single-company workspace with no per-user row ownership.
8. **Phase 3 session handling**: `middleware.ts` refreshes sessions and
   is the authoritative route gate; dashboard layout re-verifies
   `auth.getUser()` server-side (defense-in-depth). Deny-by-default:
   when Supabase isn't configured, every protected route redirects to
   `/login`. Sign-out is a POST-only route handler.
9. **Phase 4 server-side location**: the migrated service/repository
   layer lives under `frontend/lib/server/` (services, repositories,
   storage, mappers, action-context, http helpers) rather than a
   separate `services/server/` folder — one typed, colocated server
   namespace, no extra abstraction.
10. **Phase 4 jobs**: Redis/RQ is gone. Report generation and image
    derivatives run synchronously server-side; `sendEmail` keeps the
    Python log-only fallback (validates + logs intent) since there is no
    SMTP, and `notifyAssetAssignments` calls it synchronously (Phase 9).
    The `GET /api/jobs/[jobId]` compatibility route initially returned
    the Redis-unavailable 422 for legacy callers; Phase 9 confirmed it
    had no callers and removed it (no replacement job system — legacy
    job-polling paths now 404).
11. **Phase 4 notifications**: notification creation is privileged
    (service-role client) per the auth migration; reads/unread/mark-read
    use the authenticated client so RLS scopes them to the signed-in
    user's email.
12. **Phase 5 wrappers**: `services/*` keep their original exported
    signatures and delegate to Server Actions (`actions/`) or Route
    Handlers (`app/api/`); `services/helpers.ts` converts action error
    envelopes back into thrown `Error`s so component `try/catch` +
    `err.message` handling is unchanged. The dashboard legend's
    multi-status filter is supported server-side via `status_slugs`
    (slugs resolved to ids in `AssetRepository.listFiltered`), and the
    dashboard summary is served by a dedicated `getProjectSummary`
    action (`actions/dashboard.ts`) that returns full status id/slug/
    name/color instead of the report action's name-only breakdown.
13. **Phase 6 verification approach**: Vitest tests drive the real
    repository/service code through a fake Supabase client, so no live
    project is required. Documented, accepted behavioral differences vs
    the Python API (all defensive/lenient in TS): invalid `sort`/`order`
    query values fall back to `created_at`/`desc` (Python's FastAPI
    router rejects them with 422; the Python service layer has the same
    fallback); `mark_read` on an already-read notification refreshes
    `read_at` instead of preserving the original timestamp; notification
    `recipient` filtering does not strip the input; report grouping maps
    soft-deleted status/type rows to "Unassigned".
14. **Phase 10 recipient scoping**: the Python list/count/read-all
    endpoints accepted an explicit `recipient` query param because there
    was no auth. In the Next.js app the authenticated server client's RLS
    policies (`notifications_select_own`/`notifications_update_own`, rows
    where `recipient_email` OR `recipient` equals the signed-in user's
    JWT email) provide that scoping, so the user-facing action/service
    layer takes no recipient argument; the repository keeps
    `recipient`/`recipient_email` filters for admin/global use. The dead
    `recipient` field was removed from the client `ListNotificationsParams`.
    No org/role/permission system was introduced; the free-text
    recipient model is preserved.

15. **Phase 11 error/audit strategy**: unexpected server failures return a
    generic `INTERNAL_ERROR` to clients while the real cause is logged
    server-side (never leak `Error.message`). Audit records are structured
    server-side log lines (`[audit] ...`) with sensitive-key redaction —
    not a durable table (that stays the original ROADMAP Phase 13 audit
    log). Storage failures are mapped to stable AppError codes (502) so
    clients get useful, non-leaking messages.

16. **Phase 12 test strategy**: fakes over integration. Server Action /
    route / journey tests mock only the Supabase boundary (the server and
    admin clients) and storage, exercising the real service + repository +
    validation code with an in-memory store; component tests run in jsdom
    with the UI-facing services mocked. Static scans (not mocked tests)
    guard the security boundaries that a fake client cannot prove — client
    bundles never import server-only modules, and the RLS migrations must
    keep notification inserts service-role-only. E2E is interpreted as
    lightweight local journeys through the real action stack; browser E2E
    and live RLS enforcement are explicitly runtime-only with a provisioned
    project. List actions return a success-typed envelope (the error
    envelope is cast internally by `runListAction`), so tests assert list
    errors via `toMatchObject` rather than property access.

17. **Phase 14 database-error handling**: the Supabase client's raw
    `error.message` is never surfaced to clients. Repositories throw via
    `toDatabaseError` (`lib/server/errors.ts`), which logs the real cause
    server-side and returns a generic `DATABASE_ERROR` message; other
    error classes (`ValidationAppError`, `NotFoundError`, storage 502s)
    keep their curated, user-safe messages. Regression tests live in
    `tests/security/boundaries.test.ts` (static scan that no repository
    wraps a raw DB message + behavior check on `toDatabaseError`).

---

# 6. Risks / Open Items

Resolved during Phase 14 (live verification, project `ovnqbxvjtnpcgsodqhrs`):

- ✅ Login/logout/session persistence, session refresh/rotation, callback,
  and POST-only signout verified end-to-end against the live project.
- ✅ RLS verified end-to-end (16/16 checks, incl. `anon` privilege denial
  after migration `0005`); storage uploads/downloads/deletes, the Sharp
  derivative pipeline, and notification email-scoping exercised against
  live buckets and the real PostgREST API.
- ✅ `frontend/types/database.ts` regenerated/verified against the linked
  schema (`supabase gen types typescript --linked` is now the source of
  truth and includes `profiles`).
- ✅ `/api/health` now reflects configuration and returns 200 when
  Supabase is configured; middleware no longer intercepts it.

Remaining open items:

- `selectedProjectId` lives only in client memory (resets on refresh);
  consider URL state during feature ports.
- Notification RLS matches by email (`recipient`/`recipient_email`);
  name-only recipients (free text, non-email) are invisible to the
  signed-in user until a profiles↔recipient link is introduced later.
- Audit records are server log lines only; a durable, immutable audit
  table (original ROADMAP Phase 13 "Audit Logs") and login audit are not
  implemented. `created_by`/`updated_by` are populated from the actor for
  new records (Phase 14) but stay nullable for legacy rows. Document
  uploads can orphan a blob in
  storage if the DB insert fails after the storage write (no cleanup).
- Email runs synchronously and is log-only by default; real SMTP delivery
  engages when `SMTP_HOST` is configured (ADR-015, nodemailer). No SMTP
  credentials exist in this environment, so delivery is verified by mocked
  unit tests only (never throws; failures are returned, not raised).
- Test coverage: 289 behavior tests / 44 files (Phase 14 hardening).
  Coverage
  metrics are not generated (no `@vitest/coverage-v8`); the mocked suite
  cannot prove live RLS, storage bucket I/O, or real auth — those were
  verified once at Phase 14 runtime verification. Static guards
  (server-only boundary scan, RLS policy presence scan, no-raw-DB-message
  scan) mitigate the gaps that mocked tests cannot assert. Future live
  changes should be re-verified against the linked project.
- Docker is not installed on the development machine, so `supabase
  db dump`/local-stack operations are unavailable; all verification used
  the CLI against the linked remote project.
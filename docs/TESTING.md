# TESTING.md

# Testing

> This document describes how OpsMap's frontend is tested: the framework,
> the fake-Supabase strategy, test layout, and the commands to run.

---

# Framework

Tests run with **Vitest** (node environment), configured in
`frontend/vitest.config.mts`:

- `include`: `tests/**/*.test.{ts,tsx}`
- `setupFiles`: `tests/helpers/setup.ts`
- `@/` path alias resolves to the frontend root (same alias as the app).

Current suite: **65 test files / 505 tests, all passing** (Phase A added professional filter tests; Phase B added `tests/components/property-editor.test.tsx` covering 9-section anchor nav, validation, embedded map, multi-photo, contacts search/quick-create, and `development-workspace` staged save).

## Commands

Run from `frontend/`:

```bash
npm test              # vitest run — one-shot suite (CI-friendly)
npm run typecheck     # tsc --noEmit — static type gate
npm run lint          # eslint .
npm run build         # production build (also type-checks)
npm run format:check  # prettier --check .
```

There is no coverage package (`@vitest/coverage-v8`) configured; coverage
metrics are not generated.

---

# Strategy

The app talks to Supabase through a typed client. Tests never need a live
project:

- **`tests/helpers/fakeClient.ts`** — an in-memory, typed fake Supabase
  client that mirrors the subset of the real client the code uses
  (`select/insert/update/delete`, filters, `or` logic trees, `ilike`,
  pagination counts, soft-delete `is(...)`, storage operations). It stays
  in lockstep with the real client behaviour, including PostgREST quirks
  (for example casts inside `or()` trees, and `assignees->>i` predicates).
- Repositories and services are tested against the fake; the tests lock in
  the exact query shapes the app generates.
- `tests/helpers/setup.ts` provides global test setup.

Static guards complement the mocked suite:

- server-only boundary scan (service code stays server-side),
- RLS policy presence scan (migrations keep policies),
- no-raw-DB-message scan (repositories never surface raw Supabase errors —
  see `lib/server/errors.ts` `toDatabaseError`).

## Why this approach

Local, deterministic tests cannot prove live RLS, real storage bucket I/O,
or real auth. Those were verified once, end-to-end, against a live Supabase
project during Phase 14 (see `docs/MIGRATION.md`). The mocked suite keeps
behavior locked so the live verification stays representative.

---

# Layout

```
frontend/tests/
  actions/       # Server Action behavior (validation, envelopes, service calls)
  components/    # UI component behavior
  e2e/           # Multi-step flows through actions/services
  helpers/       # fakeClient.ts + setup.ts
  routes/        # Route Handler behavior (download/preview/thumbnail/health/seed)
  security/      # Secrets, RLS-presence, error-leak, boundary scans
  services/      # Service + repository logic (incl. PostgREST query shapes)
  workspace/     # Workspace/feature logic
```

Top-level spec files (`errors.test.ts`, `mappers.test.ts`,
`pagination.test.ts`, `validation.test.ts`) cover the shared
`lib/server` helpers directly.

---

# Rules

- Business behavior is asserted at the service/repository layer, not just
  the UI.
- Tests must not require Supabase credentials, network access, or a Docker
  stack.
- Keep `fakeClient.ts` in sync whenever the app relies on a new query
  shape or storage call.
- Fix or remove flaky tests rather than skipping them.
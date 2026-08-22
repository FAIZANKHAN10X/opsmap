# OpsMap Frontend

Next.js application that projects server state onto the interactive operations workspace.

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage)
- ESLint + Prettier

## Setup

```bash
npm install
```

Copy repository-root `.env.example` values into `frontend/.env.local` as needed:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for
the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be
prefixed with `NEXT_PUBLIC_` or used as the default database client.
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` power the
property map (`@vis.gl/react-google-maps`); restrict the API key by HTTP
referrer in Google Cloud Console and create the Map ID under Maps → Map
Management (required for `AdvancedMarkerElement`).

## Supabase clients

- `lib/supabase/client.ts` — browser client (anon key; RLS enforced).
- `lib/supabase/server.ts` — authenticated server client (anon key + auth
  cookies; RLS enforced). Default for all normal user operations.
- `lib/supabase/admin.ts` — service-role admin client. Server-only (build
  guard via `server-only`); use only for operations that genuinely require
  elevated privileges.

## Server-side layer

Business logic lives under `lib/server/`, consumed by Server Actions
(`actions/`) and Route Handlers (`app/api/`):

- `lib/server/repositories/` — typed Supabase data access (list/pagination,
  soft-delete, ILIKE search, slug lookups).
- `lib/server/services/` — business logic (projects, asset types/statuses,
  assets incl. assignment notifications, documents, notifications, search,
  email, reports, image derivatives). Services remain authoritative; RLS is
  defense-in-depth.
- `lib/server/errors.ts` — `AppError` hierarchy with stable error codes +
  the `{success, error}` envelope. `lib/server/action-context.ts` wraps Server
  Actions; `lib/server/http.ts` wraps Route Handler responses.
- `lib/server/storage.ts` — Supabase Storage-backed document/report storage
  (buckets `documents`, `reports`).
- `lib/server/{constants,pagination,validation,mappers,payloads,audit}.ts` —
  shared server constants, pagination math, input validation, row→domain
  mappers, and a redacting audit logger.

Notification creation is a privileged server-side operation and uses the
admin (service-role) client; notification reads/unread/mark-read use the
authenticated client so RLS scopes them to the signed-in user's email.

There is no job system: reports and image derivatives run synchronously
server-side; email runs synchronously and is log-only until SMTP is
configured.

## Auth

- `middleware.ts` refreshes sessions on every matched request and is the
  authoritative route gate: unauthenticated users are redirected to `/login`;
  signed-in users are kept off `/login`. Deny-by-default — if Supabase isn't
  configured, all protected routes redirect to `/login`.
- `/login` (email + password via `signInWithPassword`) and `features/auth/`
  components. `GET /auth/callback` exchanges the auth code (email
  confirmation / OAuth redirects). `POST /auth/signout` clears the session
  (POST-only so a plain link can never log anyone out).
- The dashboard layout re-verifies `auth.getUser()` server-side and passes the
  signed-in user to the shell (sidebar identity + sign-out).
- Set the Supabase Auth redirect URL for this project to
  `http://localhost:3000/auth/callback`. `supabase/config.toml` uses
  `127.0.0.1:3000` as the local site URL (`localhost` and `127.0.0.1`
  both resolve to the local dev server).

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run — 64 files / 498 tests
npm run format
npm run format:check
```

## Layout

```
app/           # Routes / page composition only (incl. app/api/* Route Handlers)
actions/       # Server Actions ("use server" mutations)
components/    # Reusable UI
features/      # Feature-scoped UI (incl. features/map/ — Google Maps via @vis.gl/react-google-maps)
hooks/         # Shared React hooks
lib/           # Config, constants, helpers
lib/server/    # Server-only services/repositories/storage
services/      # Client service layer — thin wrappers over Server Actions +
               # Route Handlers; no mock data and no direct fetch
               # from components. `services/helpers.ts` converts action
               # envelopes back into thrown Errors for component catch blocks.
stores/        # Client UI stores (theme, etc.)
styles/        # Shared style modules
types/         # Shared TypeScript types
tests/         # Vitest suite (64 files / 498 tests)
```

## Rules

- No business logic in React components.
- All HTTP goes through `services/`; server data access goes through
  `lib/server/` (never query Supabase directly from components).
- Server state is owned by the backend; UI state is local or URL-scoped.

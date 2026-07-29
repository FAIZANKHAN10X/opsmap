# OpsMap Frontend

Next.js application that projects backend state onto the interactive operations workspace.

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- ESLint + Prettier

## Setup

```bash
npm install
```

Copy repository-root `.env.example` values into `frontend/.env.local` as needed:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
npm run format
npm run format:check
```

## Layout

```
app/           # Routes / page composition only
components/    # Reusable UI
features/      # Feature-scoped UI
hooks/         # Shared React hooks
lib/           # Config, constants, helpers
services/      # API layer (no fetch in components)
stores/        # Client UI stores (theme, etc.)
styles/        # Shared style modules
types/         # Shared TypeScript types
utils/         # Pure utilities
public/        # Static assets
```

## Rules

- No business logic in React components.
- All HTTP goes through `services/`.
- Server state is owned by the backend; UI state is local or URL-scoped.

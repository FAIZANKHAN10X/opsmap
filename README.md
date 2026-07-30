# OpsMap

Operations management platform for physical assets on an interactive map.

Users manage real-world environments—villas, hotels, warehouses, factories, hospitals, stadiums, parking, solar farms, data centers—through a visual workspace rather than spreadsheets.

## Architecture

```
Database → Business Logic → Computed State → UI
```

- **Backend** owns all business logic.
- **Frontend** is a visual projection of backend state.
- **Supabase PostgreSQL** is the source of truth.
- **Redis + RQ** handle background work (image derivatives, email, reports).

See [`docs/`](docs/) for the full source of truth: architecture, principles, API, database, security, and roadmap.

## Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | Next.js, React, TypeScript, Tailwind CSS |
| Backend      | FastAPI, SQLAlchemy, Alembic        |
| Database     | Supabase PostgreSQL                 |
| Storage      | Supabase Storage                    |
| Jobs         | Redis, RQ                           |
| Future AI    | LangChain, RAG, MCP (no local models) |

## Repository layout

```
OpsMap/
  docs/           # Architecture and standards (source of truth)
  frontend/       # Next.js application
  backend/        # FastAPI application
  scripts/        # Developer helpers
  docker-compose.yml   # Redis only
  .env.example
```

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- Docker (for Redis)

### Bootstrap

```bash
cp .env.example .env
# Edit .env with Supabase and other secrets as needed

./scripts/dev-setup.sh
# or manually:
#   cd frontend && npm install
#   cd backend && uv sync --extra dev
#   docker compose up -d
```

Optional quality hooks:

```bash
pip install pre-commit   # or: uv tool install pre-commit
pre-commit install
```

## Frontend commands

```bash
cd frontend
npm run dev          # http://localhost:3000
npm run build
npm run start
npm run lint
npm run format
npm run format:check
```

## Backend commands

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Quality (Ruff handles lint + format)
uv run ruff check .
uv run ruff format .
uv run ruff format --check .
uv run pytest
```

- Health: http://localhost:8000/health  
- OpenAPI (dev): http://localhost:8000/docs  

## Docker

```bash
docker compose up -d      # starts Redis only
docker compose down
```

Frontend and backend run on the host during development.

## Current phase

**Phase 10 — Notifications** (success/error toasts, in-app notification center, assignment alerts, email via RQ).

Follow `docs/ROADMAP.md` for the ordered build plan.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PROJECT.md](docs/PROJECT.md) | Product vision |
| [docs/SYSTEM_PRINCIPLES.md](docs/SYSTEM_PRINCIPLES.md) | Engineering rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased delivery |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Conventions |
| [docs/API_SPEC.md](docs/API_SPEC.md) | API contract |
| [docs/DATABASE.md](docs/DATABASE.md) | Data model principles |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model |
| [docs/DECISIONS.md](docs/DECISIONS.md) | ADRs |

## License

Proprietary — all rights reserved unless otherwise stated.

# OpsMap Backend

FastAPI application for OpsMap. Owns all business logic; the frontend is a projection of backend state.

## Stack

- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic Settings
- Redis + RQ (workers; not wired in foundation phase)

## Setup

```bash
# From repo root (or this directory)
uv sync

# Optional: install dev tools
uv sync --extra dev
```

Copy root `.env.example` to `.env` at the repository root (or export variables).

## Run

```bash
# Requires DATABASE_URL for domain endpoints
export DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME"

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

## Migrations (Alembic)

```bash
export DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME"

# Apply all migrations
uv run alembic upgrade head

# Autogenerate a new migration after model changes
uv run alembic revision --autogenerate -m "describe change"

# Downgrade one revision
uv run alembic downgrade -1
```

## Layout

```
app/
  api/           # Route modules (thin)
  core/          # Settings, logging, shared config
  db/            # Engine, session, declarative base
  models/        # SQLAlchemy models
  schemas/       # Pydantic schemas
  repositories/  # Data access
  services/      # Business logic
  middleware/    # HTTP middleware
  dependencies/  # FastAPI dependencies
  workers/       # RQ worker processes / entrypoints
  tasks/         # Individual job callables (invoked by workers)
  utils/         # Pure helpers
alembic/         # Migrations
```

## Quality

```bash
# Ruff is the sole Python linter and formatter
uv run ruff check .
uv run ruff format .
uv run ruff format --check .
uv run pytest
```

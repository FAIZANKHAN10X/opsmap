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
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

## Layout

```
app/
  api/           # Route modules (thin)
  core/          # Settings, shared config
  db/            # Engine, session, declarative base
  models/        # SQLAlchemy models (none yet)
  schemas/       # Pydantic schemas
  repositories/  # Data access
  services/      # Business logic
  middleware/    # HTTP middleware
  dependencies/  # FastAPI dependencies
  workers/       # RQ workers / job entrypoints
  utils/         # Pure helpers
```

## Quality

```bash
uv run ruff check .
uv run ruff format .
uv run black --check .
uv run pytest
```

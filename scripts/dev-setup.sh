#!/usr/bin/env bash
# Bootstrap local development dependencies for OpsMap.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> OpsMap development setup"

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
else
  echo "==> .env already exists (skipping)"
fi

echo "==> Installing frontend dependencies"
(cd frontend && npm install)

echo "==> Installing backend dependencies (uv)"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install: https://docs.astral.sh/uv/"
  exit 1
fi
(cd backend && uv sync)

echo "==> Starting Redis (docker compose)"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d redis
else
  echo "Docker not found; start Redis manually (REDIS_URL in .env)."
fi

echo "==> Optional: install pre-commit hooks"
if command -v pre-commit >/dev/null 2>&1; then
  pre-commit install || true
else
  echo "pre-commit not installed. pip install pre-commit && pre-commit install"
fi

echo ""
echo "Setup complete."
echo "  Frontend:  cd frontend && npm run dev"
echo "  Backend:   cd backend && uv run uvicorn app.main:app --reload"
echo "  Worker:    cd backend && uv run python -m app.workers.worker"
echo "  Health:    http://localhost:8000/health"

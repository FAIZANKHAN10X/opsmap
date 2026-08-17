#!/usr/bin/env bash
# Bootstrap local development dependencies for OpsMap.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> OpsMap development setup"

echo "==> Installing frontend dependencies"
(cd frontend && npm install)

echo "==> Optional: install pre-commit hooks"
if command -v pre-commit >/dev/null 2>&1; then
  pre-commit install || true
else
  echo "pre-commit not installed. pip install pre-commit && pre-commit install"
fi

echo ""
echo "Setup complete."
echo "  Frontend: cd frontend && npm run dev  (http://localhost:3000)"
echo "  Health:   http://localhost:3000/api/health"
echo ""
echo "Next steps:"
echo "  - Add Supabase credentials to frontend/.env.local (see .env.example)."
echo "  - Without credentials the app renders graceful 'not configured' states."
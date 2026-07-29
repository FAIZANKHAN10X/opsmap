"""Database-related FastAPI dependencies."""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.database import get_db as _get_db


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session."""
    yield from _get_db()

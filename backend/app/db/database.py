"""Database engine and session factory.

Connection is established lazily when DATABASE_URL is configured.
No models or migrations are applied in the foundation phase.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import get_settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine | None:
    """Create (once) and return the SQLAlchemy engine, or None if unconfigured."""
    global _engine, _SessionLocal

    settings = get_settings()
    if not settings.database_url:
        return None

    if _engine is None:
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            future=True,
        )
        _SessionLocal = sessionmaker(
            bind=_engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            class_=Session,
        )

    return _engine


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session.

    Raises RuntimeError if DATABASE_URL is not set.
    """
    get_engine()
    if _SessionLocal is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in the environment before using the database."
        )

    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""Database engine and session factory."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import get_settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def reset_engine() -> None:
    """Dispose engine/session factory. Used by tests when rebinding URLs."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def configure_engine(database_url: str, *, echo: bool = False) -> Engine:
    """Create (or recreate) the global engine for the given URL."""
    global _engine, _SessionLocal
    reset_engine()
    _engine = create_engine(
        database_url,
        pool_pre_ping=True,
        future=True,
        echo=echo,
    )
    _SessionLocal = sessionmaker(
        bind=_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )
    return _engine


def get_engine() -> Engine | None:
    """Return the SQLAlchemy engine, creating it from settings when needed."""
    global _engine

    if _engine is not None:
        return _engine

    settings = get_settings()
    if not settings.database_url:
        return None

    return configure_engine(settings.database_url)


def get_session_factory() -> sessionmaker[Session]:
    """Return the session factory. Raises if the database is not configured."""
    get_engine()
    if _SessionLocal is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in the environment before using the database."
        )
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()

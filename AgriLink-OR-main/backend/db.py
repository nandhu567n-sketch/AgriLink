"""SQLAlchemy engine, session factory and declarative base."""
from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.config import get_settings


class Base(DeclarativeBase):
    pass


_engine: Engine | None = None
_SessionFactory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine, _SessionFactory
    if _engine is None:
        settings = get_settings()
        kwargs: dict = {"echo": settings.echo_sql, "future": True, "pool_pre_ping": True}
        if settings.db_kind == "sqlite":
            # SQLite is only the zero-setup fallback / test path. check_same_thread=False
            # lets uvicorn's threadpool share one connection pool safely.
            kwargs["connect_args"] = {"check_same_thread": False}
        _engine = create_engine(settings.database_url, **kwargs)
        _SessionFactory = sessionmaker(bind=_engine, expire_on_commit=False, future=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    get_engine()
    assert _SessionFactory is not None
    return _SessionFactory


def new_session() -> Session:
    return get_session_factory()()


def session_scope() -> Iterator[Session]:
    """FastAPI dependency."""
    session = new_session()
    try:
        yield session
    finally:
        session.close()


def get_db() -> Iterator[Session]:
    yield from session_scope()

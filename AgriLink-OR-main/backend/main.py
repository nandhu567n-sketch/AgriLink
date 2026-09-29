"""FastAPI application entrypoint.

    uvicorn backend.main:app --reload --port 8000      (or: make backend)

The frontend is a separate process that talks to this one over HTTP, so the two can be
started, stopped and restarted independently.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.exc import SQLAlchemyError

from backend import __version__
from backend.config import get_settings
from backend.db import new_session
from backend.routers import decision, export, params, system

log = logging.getLogger("agrilink.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        with new_session() as session:
            from backend.services import repository as repo
            loaded = repo.is_loaded(session)
            counts = repo.table_counts(session) if loaded else {}
        state = f"prices={counts.get('prices', 0)} mandis={counts.get('mandis', 0)}"
    except SQLAlchemyError as exc:
        state = f"UNREACHABLE ({exc.__class__.__name__})"
        log.warning("database not reachable at startup: %s", exc)
    log.info("AgriLink-OR API v%s on %s/%s -> %s", __version__, settings.db_kind,
             settings.database_url.rsplit("@", 1)[-1], state)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="AgriLink-OR API",
        version=__version__,
        description=("Decision support for FPOs: STL price cycles, net-in-hand mandi "
                     "ranking, MILP hold-vs-sell and knapsack lot aggregation over "
                     "PostgreSQL. Deterministic - no machine learning."),
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "PUT", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        log.exception("database error", exc_info=exc)
        return JSONResponse(status_code=503,
                            content={"detail": f"database unavailable: {exc.__class__.__name__}"})

    @app.exception_handler(ValueError)
    async def _value_error(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.get("/", include_in_schema=False)
    def _root() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    app.include_router(system.router, prefix="/api")
    app.include_router(decision.router, prefix="/api")
    app.include_router(params.router, prefix="/api")
    app.include_router(export.router, prefix="/api")
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    s = get_settings()
    uvicorn.run("backend.main:app", host=s.api_host, port=s.api_port, reload=True)

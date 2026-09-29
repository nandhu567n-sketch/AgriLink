"""CSV export of exactly the rows in view, so a decision can be audited outside the app."""
from __future__ import annotations

import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.services import repository as repo
from backend.services.decision import view_of

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/clean-slice.csv", summary="Download the Karnataka slice in view")
def clean_slice(crop: str = Query(...), as_of: date = Query(...), variety: str = Query("All"),
                session: Session = Depends(get_db)) -> StreamingResponse:
    if not repo.is_loaded(session):
        raise HTTPException(503, "database is empty -- run: python -m backend.seed.load_db")
    df = view_of(repo.read_prices(session), crop, variety, as_of=as_of)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    filename = f"karnataka_{crop.lower()}_{str(variety).lower()}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

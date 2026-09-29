"""Database schema. These ORM models are the single source of truth for the tables --
`python -m backend.seed.load_db` creates them with `create_all`, so the same definition
works on PostgreSQL (the real target) and on SQLite (the zero-setup fallback).

Tables
------
prices          one row per mandi quote (the Agmarknet fact table)
mandis          mandi master data: district + coordinates + how it was geocoded
farms           FPO ship-from points
farm_distances  cached farm -> mandi distance matrix (audit / default farm)
params          assumption sets (params.yaml shape, stored as JSON)
dataset_meta    provenance: source file, row counts, coverage window, load timestamp
"""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base


class Price(Base):
    __tablename__ = "prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    state: Mapped[str] = mapped_column(String(64), nullable=False)
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    market: Mapped[str] = mapped_column(String(160), nullable=False)
    commodity: Mapped[str] = mapped_column(String(64), nullable=False)
    variety: Mapped[str] = mapped_column(String(96), nullable=False)
    grade: Mapped[str] = mapped_column(String(32), nullable=True)
    min_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    modal_price: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        # The decision queries are always "one crop, one mandi, up to a date".
        Index("ix_prices_crop_market_date", "commodity", "market", "date"),
        Index("ix_prices_date", "date"),
        Index("ix_prices_crop_date", "commodity", "date"),
    )


class Mandi(Base):
    __tablename__ = "mandis"

    market: Mapped[str] = mapped_column(String(160), primary_key=True)
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    # geocode provenance, as written by src/geo/geocode_mandis.py:
    # "market" = the market itself resolved, "district_fallback" = pinned to the
    # district centroid because Nominatim could not resolve the market name
    source: Mapped[str] = mapped_column(String(48), nullable=True)


class Farm(Base):
    __tablename__ = "farms"

    farm_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)


class FarmDistance(Base):
    __tablename__ = "farm_distances"

    farm_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    market: Mapped[str] = mapped_column(String(160), primary_key=True)
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    km: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (Index("ix_farm_distances_farm", "farm_id"),)


class ParamSet(Base):
    """One row per named assumption set. `payload` mirrors data/ref/params.yaml."""

    __tablename__ = "params"

    name: Mapped[str] = mapped_column(String(48), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DatasetMeta(Base):
    """Provenance of the loaded slice, shown in the dashboard's freshness panel."""

    __tablename__ = "dataset_meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


TABLES = ("prices", "mandis", "farms", "farm_distances", "params", "dataset_meta")

"""API Integration test suite for AgriLink-OR backend endpoints.

Validates that the FastAPI service serves all decision support queries deterministically
without machine learning, matching the pure mathematical modules.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app

@pytest.fixture(scope="module")
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "empty")
    assert "api_version" in data


def test_api_meta(client):
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "Onion" in data["crops"]
    assert "date_min" in data
    assert "date_max" in data
    assert len(data["districts"]) > 0
    assert len(data["states"]) > 0


def test_api_decision_default_onion(client):
    res = client.get("/api/decision?crop=Onion&as_of=2025-06-11")
    assert res.status_code == 200
    data = res.json()
    assert data["cards"]["sell_at"] is not None
    assert data["cards"]["hold"] is not None
    assert data["cards"]["hold"]["available"] is True
    assert data["cards"]["bulk_order"] is not None
    assert data["cards"]["m1_error"] is None

    # M2 cost walk verification
    cw = data["m2"]["cost_walk"]
    assert cw["board_price"] > cw["net_per_qtl"]


def test_api_decision_thin_crop_degrades_gracefully(client):
    res = client.get("/api/decision?crop=Tomato&as_of=2025-06-11")
    assert res.status_code == 200
    data = res.json()
    # Tomato has partial season: M1 error and M3 unavailable, but API does not crash
    assert data["cards"]["m1_error"] is not None
    assert "two full annual cycles" in data["cards"]["m1_error"]
    assert data["m3"]["available"] is False


def test_api_decision_with_overrides(client):
    res = client.get(
        '/api/decision?crop=Onion&as_of=2025-06-11&volume=500&horizon=120&overrides={"freight.diesel_price":115.0}'
    )
    assert res.status_code == 200
    data = res.json()
    assert data["selection"]["volume"] == 500
    assert data["selection"]["horizon"] == 120
    assert data["params"]["freight"]["diesel_price"] == 115.0


def test_api_decision_interstate(client):
    res = client.get("/api/decision?crop=Onion&as_of=2025-06-11&target_state=Maharashtra")
    assert res.status_code == 200
    data = res.json()
    assert data["m2"]["count"] > 0
    assert data["cards"]["sell_at"] is not None


def test_api_export_clean_slice_csv(client):
    res = client.get("/api/export/clean-slice.csv?crop=Onion&as_of=2025-06-11")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert len(res.text) > 100

import pytest
from app import create_app
from app.extensions import db
from app.models import Vehicle
from app.services.treel_provider import MockTreelAdapter


def test_mock_treel_normalization():
    adapter = MockTreelAdapter()
    raw = {
        "gateway_id": "GW-9901",
        "timestamp": "2026-10-12T07:00:00Z",
        "readings": [
            {"sensor_id": "SN-01", "position": "FL", "pressure": 7.58, "pressure_unit": "bar", "temperature": 113.0, "temp_unit": "f"},
        ],
    }
    success, norm, quaran = adapter.ingest_payload(raw)
    assert success is True
    assert len(norm) == 1
    # 7.58 bar * 14.5038 ~= 109.9 psi
    assert 109.0 <= norm[0]["pressure_psi"] <= 111.0
    # (113 - 32) * 5/9 = 45 C
    assert norm[0]["temperature_c"] == 45.0
    assert norm[0]["provenance"] == "TREEL_MOCK"


def test_mock_treel_quarantine_bad_values():
    adapter = MockTreelAdapter()
    raw = {
        "gateway_id": "GW-9901",
        "readings": [
            {"sensor_id": "SN-01", "position": "FL", "pressure": -5.0, "pressure_unit": "psi"},
            {"sensor_id": "SN-02", "position": "FR", "pressure": 950.0, "pressure_unit": "psi"},
            {"sensor_id": "SN-03", "position": "RL", "temperature": 250.0, "temp_unit": "c"},
        ],
    }
    success, norm, quaran = adapter.ingest_payload(raw)
    assert len(norm) == 0
    assert len(quaran) == 3
    assert "quarantined" in quaran[0].lower()

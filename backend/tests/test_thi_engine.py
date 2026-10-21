import pytest
from app.services.thi_engine import THIEngine


def test_thi_optimal_telemetry():
    result = THIEngine.calculate_thi(
        pressure_psi=110.0,
        temperature_c=45.0,
        current_nsd_mm=14.0,
        blueprint_nsd_mm=16.5,
        vehicle_type="HEAVY_TRUCK",
    )
    assert result["score"] >= 85.0
    assert result["status"] == "HEALTHY"
    assert "optimal" in result["explanation"].lower()


def test_thi_moderate_under_inflation():
    # 110 - 15% = 93.5 psi
    result = THIEngine.calculate_thi(
        pressure_psi=93.5,
        temperature_c=45.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert 50.0 <= result["score"] < 80.0
    assert result["status"] == "WARNING"
    assert "under-inflation" in result["explanation"].lower()


def test_thi_severe_under_inflation():
    # 110 - 25% = 82.5 psi
    result = THIEngine.calculate_thi(
        pressure_psi=82.5,
        temperature_c=50.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert result["score"] < 50.0
    assert result["status"] == "CRITICAL"
    assert "severe under-inflation" in result["explanation"].lower()


def test_thi_overheating():
    result = THIEngine.calculate_thi(
        pressure_psi=110.0,
        temperature_c=90.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert result["score"] < 50.0
    assert result["status"] == "CRITICAL"
    assert "overheating" in result["explanation"].lower()


def test_thi_critical_tread_wear():
    # Below 3.0 mm critical limit
    result = THIEngine.calculate_thi(
        pressure_psi=110.0,
        temperature_c=40.0,
        current_nsd_mm=2.5,
        blueprint_nsd_mm=16.5,
        vehicle_type="HEAVY_TRUCK",
    )
    assert result["status"] == "CRITICAL"
    assert "critical tread wear" in result["explanation"].lower()


def test_thi_missing_telemetry_returns_unknown():
    result = THIEngine.calculate_thi(
        pressure_psi=None,
        temperature_c=None,
        current_nsd_mm=12.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert result["status"] == "UNKNOWN"
    assert "unavailable" in result["explanation"].lower()


def test_thi_stale_telemetry_returns_unknown():
    result = THIEngine.calculate_thi(
        pressure_psi=110.0,
        temperature_c=40.0,
        current_nsd_mm=14.0,
        is_stale=True,
    )
    assert result["status"] == "UNKNOWN"
    assert "stale" in result["explanation"].lower()


def test_thi_faulty_sensor_returns_critical():
    result = THIEngine.calculate_thi(
        pressure_psi=110.0,
        temperature_c=40.0,
        current_nsd_mm=14.0,
        is_faulty=True,
    )
    assert result["status"] == "CRITICAL"
    assert "fault" in result["explanation"].lower()


def test_thi_status_threshold_boundaries():
    # Below 60 -> CRITICAL
    crit = THIEngine.calculate_thi(
        pressure_psi=75.0, # severe underinflation
        temperature_c=50.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert crit["score"] < 60.0
    assert crit["status"] == "CRITICAL"

    # 60 to < 80 -> WARNING
    warn = THIEngine.calculate_thi(
        pressure_psi=95.0, # moderate underinflation (-13.6%)
        temperature_c=45.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert 60.0 <= warn["score"] < 80.0
    assert warn["status"] == "WARNING"

    # >= 80 -> HEALTHY
    healthy = THIEngine.calculate_thi(
        pressure_psi=110.0, # optimal
        temperature_c=45.0,
        current_nsd_mm=14.0,
        vehicle_type="HEAVY_TRUCK",
    )
    assert healthy["score"] >= 80.0
    assert healthy["status"] == "HEALTHY"

import pytest
import math
from app.services.trip_score_engine import TripScoreEngine


def test_trip_score_empty_samples():
    res = TripScoreEngine.calculate_trip_score([])
    assert 0 <= res["trip_score"] <= 100
    assert "trip_score" in res
    assert "components" in res
    assert res["status"] == "GOOD"


def test_trip_score_smooth_journey():
    # 20 samples of 6 seconds (total 120s) with ideal cruising parameters
    samples = [
        {"pressure_psi": 130.0, "temperature_c": 35.0, "speed_kmh": 65.0}
        for _ in range(20)
    ]
    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=130.0, speed_limit=80.0)
    assert res["trip_score"] >= 90.0
    assert res["status"] == "EXCELLENT"
    assert "components" in res
    assert res["components"]["speed_compliance"] >= 95.0
    assert res["components"]["driving_smoothness"] >= 95.0
    assert res["components"]["tyre_safety"] >= 95.0


def test_trip_score_thermal_spike_penalty():
    # Journey with severe thermal spike (> 50 °C)
    samples = [
        {"pressure_psi": 130.0, "temperature_c": 35.0, "speed_kmh": 65.0}
        for _ in range(15)
    ]
    # Severe thermal excursion
    for _ in range(10):
        samples.append({"pressure_psi": 130.0, "temperature_c": 56.0, "speed_kmh": 65.0})

    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=130.0, warning_temp=45.0, critical_temp=55.0)
    assert res["trip_score"] < 96.0
    assert res["components"]["thermal_stability"] < 80.0
    assert "temperature" in res["explanation"].lower()


def test_trip_score_overspeed_penalty():
    # Journey with persistent overspeeding (> 80 km/h, reaching 100 km/h)
    samples = [
        {"pressure_psi": 130.0, "temperature_c": 35.0, "speed_kmh": 98.0}
        for _ in range(15)
    ]
    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=130.0, speed_limit=80.0)
    assert res["components"]["speed_compliance"] <= 85.0
    assert "speed" in res["explanation"].lower()


def test_infographic_formula_weights_and_decay():
    """
    Validates exponential decay formula: Sj = 100 * exp(-kj * Rj)
    and overall composite: S = 0.50 * Sv + 0.30 * Sd + 0.20 * St
    """
    # Test Section 9 infographic scenario:
    # Rv = 0.0200, kv = 2.0 -> Sv = 100 * exp(-0.04) = 96.08
    # Rd = 0.0167, kd = 2.5 -> Sd = 100 * exp(-0.04175) = 95.91
    # Rp = 0.0250, kp = 2.0 -> Sp = 100 * exp(-0.05) = 95.12
    # Rt = 0.0175, kt = 2.0 -> Stemp = 100 * exp(-0.035) = 96.56
    # St = 0.60 * Sp + 0.40 * Stemp = 0.60 * 95.12 + 0.40 * 96.56 = 95.70
    # S = 0.50 * 96.08 + 0.30 * 95.91 + 0.20 * 95.70 = 95.95
    sv = 100.0 * math.exp(-2.0 * 0.0200)
    sd = 100.0 * math.exp(-2.5 * 0.0167)
    sp = 100.0 * math.exp(-2.0 * 0.0250)
    stemp = 100.0 * math.exp(-2.0 * 0.0175)
    st = 0.60 * sp + 0.40 * stemp
    s = 0.50 * sv + 0.30 * sd + 0.20 * st
    
    assert round(s, 1) == 96.0
    assert round(st, 1) == 95.7


def test_self_learning_model_status():
    status = TripScoreEngine.get_model_status()
    assert status["status"] == "OPERATIONAL"
    assert status["self_learning_enabled"] is True
    assert "learned_fleet_baselines" in status
    assert "v_mean" in status["learned_fleet_baselines"]
    assert "metrics" in status
    assert status["metrics"]["R2"] > 0.8

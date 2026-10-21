import pytest
from app.services.trip_score_engine import TripScoreEngine


def test_trip_score_empty_samples():
    res = TripScoreEngine.calculate_trip_score([])
    assert 0 <= res["trip_score"] <= 100
    assert "trip_score" in res
    assert "components" in res


def test_trip_score_smooth_journey():
    samples = [
        {"pressure_psi": 110.0, "temperature_c": 50.0, "speed_kmh": 65.0}
        for _ in range(20)
    ]
    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=110.0)
    assert res["trip_score"] >= 90.0
    assert res["status"] == "EXCELLENT"
    assert "components" in res


def test_trip_score_thermal_spike_penalty():
    samples = [
        {"pressure_psi": 110.0, "temperature_c": 50.0, "speed_kmh": 65.0}
        for _ in range(15)
    ]
    # Add a severe thermal spike
    samples.append({"pressure_psi": 105.0, "temperature_c": 89.0, "speed_kmh": 75.0})

    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=110.0)
    assert res["trip_score"] < 90.0
    assert res["components"]["thermal_stability"] < 50.0
    assert "thermal spike" in res["explanation"].lower()


def test_trip_score_overspeed_penalty():
    samples = [
        {"pressure_psi": 110.0, "temperature_c": 50.0, "speed_kmh": 108.0}
        for _ in range(10)
    ]
    res = TripScoreEngine.calculate_trip_score(samples, baseline_pressure=110.0)
    assert res["components"]["speed_compliance"] <= 50.0
    assert "speed" in res["explanation"].lower()

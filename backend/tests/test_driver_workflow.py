import pytest
from app import create_app
from app.extensions import db
from app.models import User, Vehicle, Trip, Tyre


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_driver_trip_start_and_end_lifecycle(client):
    # 1. Login as Driver 1
    login_res = client.post("/api/v1/auth/login", json={
        "email": "driver1@translogistics.com",
        "password": "Driver@12345",
    })
    token = login_res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch assigned vehicle
    veh_res = client.get("/api/v1/driver/assigned-vehicle", headers=headers)
    assert veh_res.status_code == 200
    veh = veh_res.get_json()["vehicle"]
    assert veh is not None

    current_odo = veh["current_odometer"]

    # 3. Start Trip with invalid decreasing odometer (must fail)
    bad_start = client.post("/api/v1/driver/start-trip", headers=headers, json={
        "vehicle_id": veh["id"],
        "origin": "Delhi",
        "destination": "Jaipur",
        "start_odometer": current_odo - 100,
    })
    assert bad_start.status_code == 400

    # 4. Start Trip with valid odometer
    start_res = client.post("/api/v1/driver/start-trip", headers=headers, json={
        "vehicle_id": veh["id"],
        "origin": "Delhi Depot",
        "destination": "Jaipur Logistics Hub",
        "start_odometer": current_odo + 5.0,
    })
    assert start_res.status_code == 201
    trip = start_res.get_json()["trip"]
    trip_id = trip["id"]
    assert trip["status"] == "IN_PROGRESS"

    # 5. End Trip with invalid lower odometer (must fail)
    bad_end = client.post("/api/v1/driver/end-trip", headers=headers, json={
        "trip_id": trip_id,
        "end_odometer": current_odo + 2.0,
    })
    assert bad_end.status_code == 400

    # 6. End Trip with valid higher odometer
    end_res = client.post("/api/v1/driver/end-trip", headers=headers, json={
        "trip_id": trip_id,
        "end_odometer": current_odo + 280.0,
    })
    assert end_res.status_code == 200
    completed_trip = end_res.get_json()["trip"]
    assert completed_trip["status"] == "COMPLETED"
    assert completed_trip["distance_km"] == 275.0
    assert completed_trip["trip_score"] is not None

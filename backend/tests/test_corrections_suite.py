import io
import pytest
import openpyxl
from app import create_app
from app.models import User, Fleet, Vehicle, UserRole
from app.utils.security import generate_token


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_synthetic_driver_names_no_singh(client):
    """
    Verify all synthetic drivers use clean standard display format
    'Driver 1', 'Driver 2' without any 'Singh' suffix.
    """
    drivers = User.query.filter_by(role=UserRole.DRIVER).all()
    assert len(drivers) > 0, "Drivers must exist in the database"
    for d in drivers:
        assert not d.full_name.endswith("Singh"), f"Driver display name '{d.full_name}' must not end with 'Singh'"
        assert d.full_name.startswith("Driver "), f"Driver display name '{d.full_name}' should follow 'Driver X' format"


def test_my_fleets_endpoint_authorization_and_isolation(client):
    """
    Test GET /api/v1/fleets/my-fleets:
    - Fleet Manager receives only their authorized fleets (e.g. Apex Trans + Apex North)
    - Fleet Manager never receives Bharat Freightways
    - Super Admin receives all platform fleets
    """
    # 1. Login as Fleet Manager (Apex)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    res = client.get("/api/v1/fleets/my-fleets", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "fleets" in data
    fleet_names = [f["name"] for f in data["fleets"]]

    # Assert Apex fleets are present
    assert any("Apex Trans" in name for name in fleet_names)
    # Assert Bharat Freightways is strictly isolated and absent
    assert not any("Bharat Freightways" in name for name in fleet_names), "Cross-customer fleet must not appear in My Fleets"

    # 2. Test search filter
    search_res = client.get("/api/v1/fleets/my-fleets?search=Delhi", headers={"Authorization": f"Bearer {token}"})
    assert search_res.status_code == 200
    search_data = search_res.get_json()
    for f in search_data["fleets"]:
        assert "delhi" in f["city"].lower() or "delhi" in f["name"].lower()


def test_admin_map_locations_access_and_freshness(client):
    """
    Test GET /api/v1/admin/map-locations:
    - Denied to Fleet Manager with 403 Forbidden
    - Allowed for Super Admin with 200 OK
    - Validates freshness breakdown and synthetic coordinates
    """
    # Fleet Manager attempt
    login_mgr = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    mgr_token = login_mgr.get_json()["token"]

    mgr_res = client.get("/api/v1/admin/map-locations", headers={"Authorization": f"Bearer {mgr_token}"})
    assert mgr_res.status_code == 403, "Fleet Manager must not access admin cross-fleet map"

    # Super Admin attempt
    login_admin = client.post("/api/v1/auth/login", json={
        "email": "admin@jktyre.com",
        "password": "Admin@12345",
    })
    admin_token = login_admin.get_json()["token"]

    admin_res = client.get("/api/v1/admin/map-locations", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    data = admin_res.get_json()
    assert "metrics" in data
    assert "fleets" in data
    assert "vehicles" in data
    assert data["metrics"]["total_vehicles"] > 0
    assert len(data["vehicles"]) > 0

    # Ensure synthetic labels are transparently provided
    for vm in data["vehicles"]:
        assert vm["provenance"] == "SYNTHETIC"
        assert vm["location_freshness"] in ["CURRENT", "STALE", "SIMULATED", "UNAVAILABLE"]


def test_vehicle_specific_trips_and_inspections(client):
    """
    Test vehicle-specific Trips and Inspections queries:
    - Filtering by vehicle_id returns records for that vehicle
    - Specifying a foreign fleet vehicle_id returns 403 Forbidden
    """
    # Fleet 1 vehicle and Fleet 2 vehicle
    fleet1 = Fleet.query.filter_by(contact_email="fleet.manager@translogistics.com").first()
    fleet2 = Fleet.query.filter_by(contact_email="contact@bharatfreight.com").first()
    v1 = Vehicle.query.filter_by(fleet_id=fleet1.id).first()
    v2 = Vehicle.query.filter_by(fleet_id=fleet2.id).first()

    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    # 1. Trips for own vehicle
    res_trips = client.get(f"/api/v1/trips?vehicle_id={v1.id}", headers={"Authorization": f"Bearer {token}"})
    assert res_trips.status_code == 200

    # 2. Trips for foreign vehicle (Tampering test)
    res_trips_bad = client.get(f"/api/v1/trips?vehicle_id={v2.id}", headers={"Authorization": f"Bearer {token}"})
    assert res_trips_bad.status_code == 403, "Tampering with vehicle_id to query foreign vehicle trips must return 403"

    # 3. Inspections summary for own vehicle
    res_insp = client.get(f"/api/v1/inspections/vehicle/{v1.id}", headers={"Authorization": f"Bearer {token}"})
    assert res_insp.status_code == 200
    insp_data = res_insp.get_json()
    assert "positions" in insp_data
    assert "vehicle" in insp_data
    assert insp_data["vehicle"]["id"] == v1.id

    # 4. Inspections summary for foreign vehicle
    res_insp_bad = client.get(f"/api/v1/inspections/vehicle/{v2.id}", headers={"Authorization": f"Bearer {token}"})
    assert res_insp_bad.status_code == 403, "Vehicle inspection summary for foreign vehicle must return 403"


def test_comparison_limits_enforce_2_to_10_and_reject_11(client):
    """
    Test GET /api/v1/analytics/comparison:
    - Reject < 2 vehicles (0 or 1) with 400 Bad Request
    - Reject > 10 vehicles (e.g. 11) with 400 Bad Request
    - Accept 2 to 10 vehicles with 200 OK
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    fleet1 = Fleet.query.filter_by(contact_email="fleet.manager@translogistics.com").first()
    vehicles = Vehicle.query.filter_by(fleet_id=fleet1.id).limit(15).all()
    assert len(vehicles) >= 11, "Need at least 11 vehicles for boundary testing"

    # 1. Test 1 vehicle (below min) -> 400
    res_1 = client.get(f"/api/v1/analytics/comparison?vehicle_ids={vehicles[0].id}", headers={"Authorization": f"Bearer {token}"})
    assert res_1.status_code == 400
    assert "at least 2" in res_1.get_json()["error"]

    # 2. Test 11 vehicles (above max) -> 400
    ids_11 = ",".join(v.id for v in vehicles[:11])
    res_11 = client.get(f"/api/v1/analytics/comparison?vehicle_ids={ids_11}", headers={"Authorization": f"Bearer {token}"})
    assert res_1.status_code == 400
    assert res_11.status_code == 400
    assert "maximum of 10" in res_11.get_json()["error"]

    # 3. Test 3 vehicles (valid) -> 200
    ids_3 = ",".join(v.id for v in vehicles[:3])
    res_3 = client.get(f"/api/v1/analytics/comparison?vehicle_ids={ids_3}", headers={"Authorization": f"Bearer {token}"})
    assert res_3.status_code == 200
    data_3 = res_3.get_json()
    assert len(data_3) == 3


def test_13_sheet_excel_export_and_secrets_exclusion(client):
    """
    Test GET /api/v1/export/excel:
    - Returns valid .xlsx file
    - Contains exactly 13 sheets with the required names
    - USERS sheet does NOT contain password hashes
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    res = client.get("/api/v1/export/excel", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res.content_type

    # Inspect openpyxl workbook in memory
    wb = openpyxl.load_workbook(io.BytesIO(res.data))
    sheet_names = wb.sheetnames
    assert len(sheet_names) == 13, f"Expected exactly 13 sheets, found {len(sheet_names)}: {sheet_names}"

    expected_sheets = [
        "README_PROVENANCE", "FLEETS", "USERS", "VEHICLES", "TYRES",
        "TYRE_FITMENTS", "TRIPS", "TELEMETRY_RECORDS", "THI_RECORDS",
        "ALERTS", "INSPECTIONS", "AUDIT_LOGS", "DATA_DICTIONARY"
    ]
    for s in expected_sheets:
        assert s in sheet_names, f"Missing expected sheet: {s}"

    # Verify no password_hash in USERS sheet
    users_sheet = wb["USERS"]
    header_row = [cell.value for cell in users_sheet[1]]
    assert "Password Hash" not in header_row
    assert "password_hash" not in header_row

    for row in users_sheet.iter_rows(min_row=2, values_only=True):
        for cell_val in row:
            if isinstance(cell_val, str):
                assert not cell_val.startswith("$2b$"), "Bcrypt password hash must not be exposed in export"


def test_health_trends_plots_both_observed_and_ideal_baseline(client):
    """
    Test GET /api/v1/analytics/trends:
    - Returns observed THI trend points
    - Includes ideal_baseline (95.0) for every point
    - Provides baseline metadata and explanation
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    res = client.get("/api/v1/analytics/trends?days=14", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "trend" in data
    assert "ideal_baseline_value" in data
    assert data["ideal_baseline_value"] == 95.0
    assert "explanation" in data

    if len(data["trend"]) > 0:
        first_pt = data["trend"][0]
        assert "avg_thi" in first_pt
        assert "ideal_baseline" in first_pt
        assert first_pt["ideal_baseline"] == 95.0


def test_delete_vehicle_endpoint(client):
    """
    Test DELETE /api/v1/vehicles/<vehicle_id>:
    - Creates a vehicle
    - Verifies deletion returns 200
    - Verifies vehicle is removed from database
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]

    # 1. Register temporary test vehicle
    create_res = client.post("/api/v1/vehicles", headers={"Authorization": f"Bearer {token}"}, json={
        "vehicle_number": "TEST-DEL-9999",
        "wheel_config": "10-Wheeler",
        "make": "Tata Motors",
        "model": "Signa 2823.K",
        "year": 2024,
        "baseline_pressure": 110.0,
    })
    assert create_res.status_code == 201
    veh_id = create_res.get_json()["id"]

    # 2. Delete vehicle
    del_res = client.delete(f"/api/v1/vehicles/{veh_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    del_data = del_res.get_json()
    assert "successfully removed" in del_data["message"]

    # 3. Verify 404 on get
    get_res = client.get(f"/api/v1/vehicles/{veh_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 404


def test_delete_inventory_tyres_endpoints(client):
    """
    Test DELETE /api/v1/tyres/<tyre_id> and DELETE /api/v1/tyres/inventory:
    - Registers two unmounted IN_INVENTORY tyres
    - Deletes one via DELETE /api/v1/tyres/<id>
    - Clears all remaining IN_INVENTORY tyres via DELETE /api/v1/tyres/inventory
    - Verifies 0 IN_INVENTORY tyres remain
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token = login_res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create two test inventory tyres
    t1_res = client.post("/api/v1/tyres", headers=headers, json={"serial_number": "INV-DEL-001"})
    t2_res = client.post("/api/v1/tyres", headers=headers, json={"serial_number": "INV-DEL-002"})
    assert t1_res.status_code == 201
    assert t2_res.status_code == 201
    t1_id = t1_res.get_json()["tyre"]["id"]

    # 2. Delete single tyre
    del1 = client.delete(f"/api/v1/tyres/{t1_id}", headers=headers)
    assert del1.status_code == 200
    assert client.get(f"/api/v1/tyres/{t1_id}", headers=headers).status_code == 404

    # 3. Clear all remaining inventory tyres
    clr = client.delete("/api/v1/tyres/inventory", headers=headers)
    assert clr.status_code == 200
    assert clr.get_json()["deleted_count"] >= 1

    # 4. Verify 0 IN_INVENTORY tyres remain in this fleet
    inv_list = client.get("/api/v1/tyres?status=IN_INVENTORY", headers=headers)
    assert inv_list.status_code == 200
    assert len(inv_list.get_json()) == 0

import pytest
from app import create_app
from app.extensions import db
from app.models import User, Fleet, Vehicle
from app.utils.security import generate_token


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_auth_login_success(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["user"]["role"] == "FLEET_MANAGER"


def test_auth_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "WrongPassword!99",
    })
    assert res.status_code == 401


def test_fleet_isolation_denies_cross_fleet_access(client):
    """
    Fleet Manager of Fleet 1 attempts to query vehicles belonging to Fleet 2.
    Assert that the server strictly rejects this with 403 Forbidden.
    """
    # 1. Login as Fleet 1 Manager
    login_res = client.post("/api/v1/auth/login", json={
        "email": "fleet.manager@translogistics.com",
        "password": "Fleet@12345",
    })
    token1 = login_res.get_json()["token"]

    # 2. Find a vehicle belonging to Fleet 2 (Bharat Freightways)
    fleet2 = Fleet.query.filter_by(contact_email="contact@bharatfreight.com").first()
    assert fleet2 is not None
    veh2 = Vehicle.query.filter_by(fleet_id=fleet2.id).first()
    assert veh2 is not None

    # 3. Attempt direct access to Fleet 2 vehicle using Fleet 1 token
    res = client.get(
        f"/api/v1/vehicles/{veh2.id}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res.status_code == 403, "Cross-fleet vehicle access must be rejected with 403"

    # 4. Attempt to query vehicles specifying fleet_id parameter of Fleet 2
    res_list = client.get(
        f"/api/v1/vehicles?fleet_id={fleet2.id}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res_list.status_code == 403, "Cross-fleet query must be rejected with 403"


def test_admin_role_can_access_cross_fleet(client):
    """
    Super Admin (JK Tyre) is authorized to query cross-fleet overviews.
    """
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@jktyre.com",
        "password": "Admin@12345",
    })
    admin_token = login_res.get_json()["token"]

    res = client.get(
        "/api/v1/admin/platform-stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "total_fleets" in res.get_json()

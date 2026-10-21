import pytest
from app import create_app
from app.extensions import db
from app.models import Alert, AlertStatus, Vehicle
from app.services.alert_engine import AlertEngine


@pytest.fixture
def app_ctx():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        yield app


def test_alert_generation_and_deduplication(app_ctx):
    vehicle = Vehicle.query.first()
    assert vehicle is not None

    # Clear any pre-existing test alert for PR02 on this vehicle to guarantee test idempotency
    Alert.query.filter_by(vehicle_id=vehicle.id, code="PR02").delete()
    db.session.commit()

    # Trigger severe under-inflation: 75 psi on 110 psi baseline (-31% deviation -> PR02)
    alerts1 = AlertEngine.evaluate_telemetry(
        fleet_id=vehicle.fleet_id,
        vehicle_id=vehicle.id,
        tyre_id=None,
        wheel_position="FL",
        pressure_psi=75.0,
        temperature_c=45.0,
        battery_soc=90.0,
        baseline_pressure=vehicle.baseline_pressure,
    )
    db.session.commit()

    assert len(alerts1) > 0
    assert any(a.code == "PR02" for a in alerts1)

    # Immediately evaluate identical telemetry within cooldown window
    alerts2 = AlertEngine.evaluate_telemetry(
        fleet_id=vehicle.fleet_id,
        vehicle_id=vehicle.id,
        tyre_id=None,
        wheel_position="FL",
        pressure_psi=75.0,
        temperature_c=45.0,
        battery_soc=90.0,
        baseline_pressure=vehicle.baseline_pressure,
    )
    # Deduplication must suppress duplicate alert
    assert len(alerts2) == 0


def test_alert_ack_does_not_resolve(app_ctx):
    alert = Alert.query.filter_by(status=AlertStatus.ACTIVE).first()
    if not alert:
        alert = Alert(
            fleet_id=Vehicle.query.first().fleet_id,
            code="PR01",
            category="PRESSURE",
            severity="WARNING",
            explanation="Test warning",
            recommended_action="Recheck",
            status=AlertStatus.ACTIVE,
        )
        db.session.add(alert)
        db.session.commit()

    alert.status = AlertStatus.ACKNOWLEDGED
    db.session.commit()

    # Re-fetch from db
    refreshed = Alert.query.get(alert.id)
    assert refreshed.status == AlertStatus.ACKNOWLEDGED
    assert refreshed.status != AlertStatus.RESOLVED

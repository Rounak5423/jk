import pytest
from app import create_app
from app.extensions import db
from app.models import Vehicle, Tyre, TyreFitment, WheelConfig, get_default_layout


@pytest.fixture
def app_ctx():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        yield app


def test_wheel_configurations_layout():
    layout10 = get_default_layout(WheelConfig.TEN_WHEELER)
    assert layout10["total_wheels"] == 10
    assert layout10["axle_count"] == 3

    layout12 = get_default_layout(WheelConfig.TWELVE_WHEELER)
    assert layout12["total_wheels"] == 12
    assert layout12["axle_count"] == 4

    layout14 = get_default_layout(WheelConfig.FOURTEEN_WHEELER)
    assert layout14["total_wheels"] == 14
    assert layout14["axle_count"] == 5

    layout16 = get_default_layout(WheelConfig.SIXTEEN_WHEELER)
    assert layout16["total_wheels"] == 16
    assert layout16["axle_count"] == 5


def test_permanent_tyre_identity_preservation(app_ctx):
    vehicle = Vehicle.query.first()
    assert vehicle is not None

    fit = vehicle.active_fitments[0]
    tyre = fit.tyre
    initial_serial = tyre.serial_number
    initial_km = tyre.total_km_run

    # Dismount tyre
    fit.removed_at = db.func.current_timestamp()
    fit.removal_reason = "SCHEDULED_ROTATION"
    tyre.status = "IN_INVENTORY"
    db.session.commit()

    # Verify tyre still exists with all its history
    refetched = Tyre.query.filter_by(serial_number=initial_serial).first()
    assert refetched is not None
    assert refetched.total_km_run == initial_km
    assert len(refetched.fitments) >= 1
    assert refetched.active_fitment is None  # no active fitment right now

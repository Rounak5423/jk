import json
import uuid
from datetime import datetime, timezone
from app.extensions import db


class VehicleType:
    HEAVY_TRUCK = "HEAVY_TRUCK"
    LIGHT_TRUCK = "LIGHT_TRUCK"
    BUS = "BUS"
    PASSENGER_CAR = "PASSENGER_CAR"


class WheelConfig:
    FOUR_WHEELER = "4-Wheeler"
    SIX_WHEELER = "6-Wheeler"
    TEN_WHEELER = "10-Wheeler"
    TWELVE_WHEELER = "12-Wheeler"


def get_default_layout(wheel_config: str):
    """
    Returns standard physical configuration for commercial vehicle wheel layouts.
    Wheel positions:
    - FL: Front Left (Steer)
    - FR: Front Right (Steer)
    - Axle 2+ Dual: LIO (Left Inner/Outer), RIO (Right Inner/Outer)
      Convention:
        LIO: Left Inner/Outer - specifically:
        LO: Left Outer
        LI: Left Inner
        RI: Right Inner
        RO: Right Outer
    """
    if wheel_config == WheelConfig.FOUR_WHEELER:
        return {
            "layout_type": WheelConfig.FOUR_WHEELER,
            "axle_count": 2,
            "total_wheels": 4,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 1.6},
                {"index": 2, "type": "DRIVE", "dual": False, "positions": ["RL", "RR"], "x_offset": -1.6},
            ],
        }
    elif wheel_config == WheelConfig.SIX_WHEELER:
        return {
            "layout_type": WheelConfig.SIX_WHEELER,
            "axle_count": 2,
            "total_wheels": 6,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 2.2},
                {"index": 2, "type": "DRIVE", "dual": True, "positions": ["R1_LO", "R1_LI", "R1_RI", "R1_RO"], "x_offset": -2.0},
            ],
        }
    elif wheel_config == WheelConfig.TWELVE_WHEELER:
        return {
            "layout_type": WheelConfig.TWELVE_WHEELER,
            "axle_count": 4,
            "total_wheels": 12,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 3.0},
                {"index": 2, "type": "STEER_AUX", "dual": False, "positions": ["FL2", "FR2"], "x_offset": 1.7},
                {"index": 3, "type": "DRIVE_FORWARD", "dual": True, "positions": ["R1_LO", "R1_LI", "R1_RI", "R1_RO"], "x_offset": -1.4},
                {"index": 4, "type": "DRIVE_REAR", "dual": True, "positions": ["R2_LO", "R2_LI", "R2_RI", "R2_RO"], "x_offset": -2.7},
            ],
        }
    else:  # Default to TEN_WHEELER (standard 3-axle heavy hauler)
        return {
            "layout_type": WheelConfig.TEN_WHEELER,
            "axle_count": 3,
            "total_wheels": 10,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 2.6},
                {"index": 2, "type": "DRIVE_FORWARD", "dual": True, "positions": ["R1_LO", "R1_LI", "R1_RI", "R1_RO"], "x_offset": -1.4},
                {"index": 3, "type": "DRIVE_REAR", "dual": True, "positions": ["R2_LO", "R2_LI", "R2_RI", "R2_RO"], "x_offset": -2.7},
            ],
        }


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_number = db.Column(db.String(32), nullable=False, index=True)
    vehicle_type = db.Column(db.String(32), nullable=False, default=VehicleType.HEAVY_TRUCK)
    wheel_config = db.Column(db.String(32), nullable=False, default=WheelConfig.TEN_WHEELER)
    axle_count = db.Column(db.Integer, nullable=False, default=3)
    layout_json = db.Column(db.Text, nullable=False)
    make = db.Column(db.String(64), nullable=True)
    model = db.Column(db.String(64), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    baseline_pressure = db.Column(db.Float, nullable=False, default=110.0)  # psi
    baseline_mileage = db.Column(db.Float, nullable=False, default=4.5)     # km/L
    current_odometer = db.Column(db.Float, nullable=False, default=0.0)     # km
    current_latitude = db.Column(db.Float, nullable=True)
    current_longitude = db.Column(db.Float, nullable=True)
    current_location_name = db.Column(db.String(120), nullable=True)
    location_updated_at = db.Column(db.DateTime, nullable=True)
    location_source = db.Column(db.String(32), nullable=False, default="SIMULATED")
    status = db.Column(db.String(24), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    fleet = db.relationship("Fleet", back_populates="vehicles")
    fitments = db.relationship("TyreFitment", back_populates="vehicle", cascade="all, delete-orphan", lazy="select")
    trips = db.relationship("Trip", back_populates="vehicle", cascade="all, delete-orphan", lazy="select")
    alerts = db.relationship("Alert", back_populates="vehicle", cascade="all, delete-orphan", lazy="select")
    inspections = db.relationship("Inspection", back_populates="vehicle", cascade="all, delete-orphan", lazy="select")
    telemetry_records = db.relationship("TelemetryRecord", back_populates="vehicle", cascade="all, delete-orphan", lazy="dynamic")

    @property
    def layout(self):
        try:
            return json.loads(self.layout_json)
        except Exception:
            return get_default_layout(self.wheel_config)

    @layout.setter
    def layout(self, value):
        if isinstance(value, dict):
            self.layout_json = json.dumps(value)
        else:
            self.layout_json = value

    @property
    def active_fitments(self):
        return [f for f in self.fitments if f.removed_at is None]

    def to_dict(self, include_fitments=True):
        active_fits = self.active_fitments
        res = {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "fleet_name": self.fleet.name if self.fleet else None,
            "vehicle_number": self.vehicle_number,
            "vehicle_type": self.vehicle_type,
            "wheel_config": self.wheel_config,
            "axle_count": self.axle_count,
            "layout": self.layout,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "baseline_pressure": self.baseline_pressure,
            "baseline_mileage": self.baseline_mileage,
            "current_odometer": self.current_odometer,
            "latitude": self.current_latitude,
            "longitude": self.current_longitude,
            "location_name": self.current_location_name,
            "location_updated_at": self.location_updated_at.isoformat() if self.location_updated_at else None,
            "location_source": self.location_source,
            "status": self.status,
            "fitted_tyre_count": len(active_fits),
            "expected_tyre_count": self.layout.get("total_wheels", 10),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_fitments:
            res["fitments"] = [f.to_dict() for f in active_fits]
        return res

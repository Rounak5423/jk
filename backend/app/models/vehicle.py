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
    TEN_WHEELER = "10-Wheeler"
    TWELVE_WHEELER = "12-Wheeler"
    FOURTEEN_WHEELER = "14-Wheeler"
    SIXTEEN_WHEELER = "16-Wheeler"
    # Legacy / not selectable in fleet truck registry:
    FOUR_WHEELER = "4-Wheeler"
    SIX_WHEELER = "6-Wheeler"


def get_default_layout(wheel_config: str):
    """
    Returns standard physical configuration for commercial vehicle wheel layouts.
    Wheel positions:
    - FL, FR: Steer Axle 1
    - FL2, FR2: Steer Axle 2 (for 12W / 14W / 16W)
    - FL3, FR3: Pusher/Lift Axle (for 14W)
    - Axle Duals: LIO (Left Inner/Outer), RIO (Right Inner/Outer):
      LO: Left Outer, LI: Left Inner, RI: Right Inner, RO: Right Outer
    """
    if wheel_config == WheelConfig.TWELVE_WHEELER:
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
    elif wheel_config == WheelConfig.FOURTEEN_WHEELER:
        return {
            "layout_type": WheelConfig.FOURTEEN_WHEELER,
            "axle_count": 5,
            "total_wheels": 14,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 3.4},
                {"index": 2, "type": "STEER_AUX", "dual": False, "positions": ["FL2", "FR2"], "x_offset": 2.2},
                {"index": 3, "type": "PUSHER_LIFT", "dual": False, "positions": ["FL3", "FR3"], "x_offset": 0.8},
                {"index": 4, "type": "DRIVE_FORWARD", "dual": True, "positions": ["R1_LO", "R1_LI", "R1_RI", "R1_RO"], "x_offset": -1.4},
                {"index": 5, "type": "DRIVE_REAR", "dual": True, "positions": ["R2_LO", "R2_LI", "R2_RI", "R2_RO"], "x_offset": -2.7},
            ],
        }
    elif wheel_config == WheelConfig.SIXTEEN_WHEELER:
        return {
            "layout_type": WheelConfig.SIXTEEN_WHEELER,
            "axle_count": 5,
            "total_wheels": 16,
            "axles": [
                {"index": 1, "type": "STEER", "dual": False, "positions": ["FL", "FR"], "x_offset": 3.4},
                {"index": 2, "type": "STEER_AUX", "dual": False, "positions": ["FL2", "FR2"], "x_offset": 2.2},
                {"index": 3, "type": "DRIVE_FORWARD", "dual": True, "positions": ["R1_LO", "R1_LI", "R1_RI", "R1_RO"], "x_offset": -0.8},
                {"index": 4, "type": "DRIVE_MID", "dual": True, "positions": ["R2_LO", "R2_LI", "R2_RI", "R2_RO"], "x_offset": -2.0},
                {"index": 5, "type": "DRIVE_REAR", "dual": True, "positions": ["R3_LO", "R3_LI", "R3_RI", "R3_RO"], "x_offset": -3.2},
            ],
        }
    else:  # Default to TEN_WHEELER (standard 3-axle heavy hauler, fleet minimum is 10 wheels)
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

    def calculate_thi(self):
        """
        Calculates vehicle THI as the weighted average of all currently fitted tyres,
        giving higher priority/weight to critical and degraded tyres so that
        safety risks and severe tyre faults impact the vehicle's THI more heavily.
        
        Weighting Policy:
        - Critical tyre (THI < 70 or CRITICAL): weight = 4.0
        - Warning tyre (70 <= THI < 85 or WARNING): weight = 2.0
        - Healthy tyre (THI >= 85 or HEALTHY): weight = 1.0
        """
        active_fits = self.active_fitments
        if not active_fits:
            return {
                "thi": 100.0,
                "unweighted_thi": 100.0,
                "thi_status": "HEALTHY",
                "critical_tyres_count": 0,
                "warning_tyres_count": 0,
                "healthy_tyres_count": 0,
                "lowest_tyre_thi": 100.0,
            }

        total_weight = 0.0
        weighted_sum = 0.0
        unweighted_sum = 0.0
        crit_count = 0
        warn_count = 0
        healthy_count = 0
        lowest_thi = 100.0

        for f in active_fits:
            tyre = f.tyre
            if not tyre:
                continue

            score = tyre.current_thi if tyre.current_thi is not None else 100.0
            status = (tyre.thi_status or "HEALTHY").upper()

            lowest_thi = min(lowest_thi, score)
            unweighted_sum += score

            # Priority Weight: Critical tyres affect the vehicle THI 4x more, Warning 2x more
            if score < 70.0 or status == "CRITICAL":
                weight = 4.0
                crit_count += 1
            elif score < 85.0 or status == "WARNING":
                weight = 2.0
                warn_count += 1
            else:
                weight = 1.0
                healthy_count += 1

            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0.0:
            return {
                "thi": 100.0,
                "unweighted_thi": 100.0,
                "thi_status": "HEALTHY",
                "critical_tyres_count": 0,
                "warning_tyres_count": 0,
                "healthy_tyres_count": 0,
                "lowest_tyre_thi": 100.0,
            }

        veh_thi = round(weighted_sum / total_weight, 1)
        unweighted_thi = round(unweighted_sum / len(active_fits), 1)

        if veh_thi < 70.0 or crit_count > 0:
            overall_status = "CRITICAL"
        elif veh_thi < 85.0 or warn_count > 0:
            overall_status = "WARNING"
        else:
            overall_status = "HEALTHY"

        return {
            "thi": veh_thi,
            "unweighted_thi": unweighted_thi,
            "thi_status": overall_status,
            "critical_tyres_count": crit_count,
            "warning_tyres_count": warn_count,
            "healthy_tyres_count": healthy_count,
            "lowest_tyre_thi": round(lowest_thi, 1),
        }

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
        res.update(self.calculate_thi())
        if include_fitments:
            res["fitments"] = [f.to_dict() for f in active_fits]
        return res

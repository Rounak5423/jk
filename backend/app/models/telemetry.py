import uuid
from datetime import datetime, timezone
from app.extensions import db


class TelemetryProvenance:
    SYNTHETIC = "SYNTHETIC"
    TREEL_MOCK = "TREEL_MOCK"
    TREEL_LIVE = "TREEL_LIVE"
    MANUAL = "MANUAL"


class TelemetryRecord(db.Model):
    __tablename__ = "telemetry_records"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="SET NULL"), nullable=True, index=True)
    wheel_position = db.Column(db.String(16), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    pressure_psi = db.Column(db.Float, nullable=True)
    temperature_c = db.Column(db.Float, nullable=True)
    speed_kmh = db.Column(db.Float, nullable=True)
    battery_soc = db.Column(db.Float, nullable=True)
    odometer_km = db.Column(db.Float, nullable=True)
    is_stale = db.Column(db.Boolean, nullable=False, default=False)
    is_faulty = db.Column(db.Boolean, nullable=False, default=False)
    provenance = db.Column(db.String(32), nullable=False, default=TelemetryProvenance.SYNTHETIC)

    # Relationships
    vehicle = db.relationship("Vehicle", back_populates="telemetry_records")
    tyre = db.relationship("Tyre", foreign_keys=[tyre_id])

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "vehicle_id": self.vehicle_id,
            "tyre_id": self.tyre_id,
            "wheel_position": self.wheel_position,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "pressure_psi": round(self.pressure_psi, 1) if self.pressure_psi is not None else None,
            "temperature_c": round(self.temperature_c, 1) if self.temperature_c is not None else None,
            "speed_kmh": round(self.speed_kmh, 1) if self.speed_kmh is not None else None,
            "battery_soc": round(self.battery_soc, 1) if self.battery_soc is not None else None,
            "odometer_km": round(self.odometer_km, 1) if self.odometer_km is not None else None,
            "is_stale": self.is_stale,
            "is_faulty": self.is_faulty,
            "provenance": self.provenance,
        }

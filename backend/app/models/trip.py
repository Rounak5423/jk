import json
import uuid
from datetime import datetime, timezone
from app.extensions import db


class TripStatus:
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(db.Model):
    __tablename__ = "trips"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    trip_code = db.Column(db.String(32), nullable=False, unique=True, index=True)
    origin = db.Column(db.String(120), nullable=False)
    destination = db.Column(db.String(120), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    start_odometer = db.Column(db.Float, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    end_odometer = db.Column(db.Float, nullable=True)
    distance_km = db.Column(db.Float, nullable=True)
    trip_score = db.Column(db.Float, nullable=True)
    trip_score_status = db.Column(db.String(16), nullable=True)
    score_breakdown_json = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(24), nullable=False, default=TripStatus.IN_PROGRESS)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    fleet = db.relationship("Fleet", back_populates="trips")
    vehicle = db.relationship("Vehicle", back_populates="trips")
    driver = db.relationship("User", back_populates="trips")

    @property
    def score_breakdown(self):
        try:
            return json.loads(self.score_breakdown_json) if self.score_breakdown_json else None
        except Exception:
            return None

    @score_breakdown.setter
    def score_breakdown(self, val):
        self.score_breakdown_json = json.dumps(val) if val is not None else None

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "driver_id": self.driver_id,
            "driver_name": self.driver.full_name if self.driver else None,
            "trip_code": self.trip_code,
            "origin": self.origin,
            "destination": self.destination,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "start_odometer": self.start_odometer,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "end_odometer": self.end_odometer,
            "distance_km": round(self.distance_km, 1) if self.distance_km is not None else None,
            "trip_score": round(self.trip_score, 1) if self.trip_score is not None else None,
            "trip_score_status": self.trip_score_status,
            "score_breakdown": self.score_breakdown,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

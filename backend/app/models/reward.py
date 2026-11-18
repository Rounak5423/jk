import uuid
import json
from datetime import datetime, timezone
from app.extensions import db


class DriverActivity(db.Model):
    __tablename__ = "driver_activities"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    trip_id = db.Column(db.String(36), db.ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)

    activity_type = db.Column(db.String(32), nullable=False)  # REFUELING, STOP_ODOMETER, TYRE_CHECK, TRIP_SCORE_REWARD
    title = db.Column(db.String(140), nullable=False)
    odometer = db.Column(db.Float, nullable=True)
    location = db.Column(db.String(160), nullable=True)
    points_earned = db.Column(db.Float, nullable=False, default=0.0)
    discount_value = db.Column(db.Float, nullable=False, default=0.0)  # INR discount on JK Tyre products
    activity_metadata_json = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(24), nullable=False, default="APPROVED")
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    driver = db.relationship("User", backref=db.backref("activities", lazy="select", cascade="all, delete-orphan"))
    vehicle = db.relationship("Vehicle")
    trip = db.relationship("Trip")
    fleet = db.relationship("Fleet")

    @property
    def activity_metadata(self):
        try:
            return json.loads(self.activity_metadata_json) if self.activity_metadata_json else {}
        except Exception:
            return {}

    @activity_metadata.setter
    def activity_metadata(self, val):
        self.activity_metadata_json = json.dumps(val) if val is not None else None

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "driver_id": self.driver_id,
            "driver_name": self.driver.full_name if self.driver else None,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "trip_id": self.trip_id,
            "trip_code": self.trip.trip_code if self.trip else None,
            "activity_type": self.activity_type,
            "title": self.title,
            "odometer": round(self.odometer, 1) if self.odometer is not None else None,
            "location": self.location,
            "points_earned": round(self.points_earned, 1),
            "discount_value": round(self.discount_value, 1),
            "metadata": self.activity_metadata,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DriverReward(db.Model):
    __tablename__ = "driver_rewards"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id = db.Column(db.String(36), db.ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_id = db.Column(db.String(36), db.ForeignKey("driver_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    
    reward_type = db.Column(db.String(32), nullable=False, default="TRIP_SCORE_REWARD")
    trip_score = db.Column(db.Float, nullable=True)
    trip_distance_km = db.Column(db.Float, nullable=True)
    points_earned = db.Column(db.Float, nullable=False, default=0.0)
    discount_value = db.Column(db.Float, nullable=False, default=0.0)  # INR discount on JK Tyre products
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    driver = db.relationship("User", backref=db.backref("reward_entries", lazy="select", cascade="all, delete-orphan"))
    trip = db.relationship("Trip", backref=db.backref("reward_entries", lazy="select"))
    activity = db.relationship("DriverActivity", backref=db.backref("reward_entries", lazy="select"))
    fleet = db.relationship("Fleet")

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "driver_id": self.driver_id,
            "trip_id": self.trip_id,
            "activity_id": self.activity_id,
            "trip_code": self.trip.trip_code if self.trip else None,
            "reward_type": self.reward_type,
            "trip_score": round(self.trip_score, 1) if self.trip_score is not None else None,
            "trip_distance_km": round(self.trip_distance_km, 1) if self.trip_distance_km is not None else None,
            "points_earned": round(self.points_earned, 1),
            "discount_value": round(self.discount_value, 1),
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DriverRedemption(db.Model):
    __tablename__ = "driver_redemptions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    voucher_code = db.Column(db.String(32), nullable=False, unique=True, index=True)
    points_redeemed = db.Column(db.Float, nullable=False, default=0.0)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)  # INR discount on JK Tyre products
    product_category = db.Column(db.String(120), nullable=False, default="JK Commercial Radial Tyres & Retread Services")
    status = db.Column(db.String(24), nullable=False, default="ACTIVE")
    redeemed_by = db.Column(db.String(32), nullable=False, default="DRIVER")
    notes = db.Column(db.Text, nullable=True)
    redeemed_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    driver = db.relationship("User", backref=db.backref("redemptions", lazy="select", cascade="all, delete-orphan"))
    fleet = db.relationship("Fleet")

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "driver_id": self.driver_id,
            "driver_name": self.driver.full_name if self.driver else None,
            "voucher_code": self.voucher_code,
            "points_redeemed": round(self.points_redeemed, 1),
            "discount_amount": round(self.discount_amount, 1),
            "product_category": self.product_category,
            "status": self.status,
            "redeemed_by": self.redeemed_by,
            "notes": self.notes,
            "redeemed_at": self.redeemed_at.isoformat() if self.redeemed_at else None,
        }


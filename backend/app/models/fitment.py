import uuid
from datetime import datetime, timezone
from app.extensions import db


class TyreFitment(db.Model):
    __tablename__ = "tyre_fitments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    axle_number = db.Column(db.Integer, nullable=False, default=1)
    wheel_position = db.Column(db.String(16), nullable=False, index=True)
    is_dual = db.Column(db.Boolean, nullable=False, default=False)
    is_inner = db.Column(db.Boolean, nullable=False, default=False)
    fitted_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fitted_odometer = db.Column(db.Float, nullable=False, default=0.0)
    fitted_nsd = db.Column(db.Float, nullable=False, default=16.5)
    removed_at = db.Column(db.DateTime, nullable=True)
    removed_odometer = db.Column(db.Float, nullable=True)
    removal_reason = db.Column(db.String(64), nullable=True)

    # Relationships
    tyre = db.relationship("Tyre", back_populates="fitments")
    vehicle = db.relationship("Vehicle", back_populates="fitments")

    @property
    def is_currently_fitted(self):
        return self.removed_at is None

    def to_dict(self, include_tyre=True, include_vehicle=False):
        res = {
            "id": self.id,
            "tyre_id": self.tyre_id,
            "vehicle_id": self.vehicle_id,
            "axle_number": self.axle_number,
            "wheel_position": self.wheel_position,
            "is_dual": self.is_dual,
            "is_inner": self.is_inner,
            "fitted_at": self.fitted_at.isoformat() if self.fitted_at else None,
            "fitted_odometer": self.fitted_odometer,
            "fitted_nsd": self.fitted_nsd,
            "removed_at": self.removed_at.isoformat() if self.removed_at else None,
            "removed_odometer": self.removed_odometer,
            "removal_reason": self.removal_reason,
            "is_active": self.is_currently_fitted,
        }
        if include_tyre and self.tyre:
            res["tyre"] = {
                "serial_number": self.tyre.serial_number,
                "model": self.tyre.model,
                "size": self.tyre.size,
                "current_nsd": self.tyre.current_nsd,
                "current_thi": self.tyre.current_thi,
                "thi_status": self.tyre.thi_status,
                "total_km_run": self.tyre.total_km_run,
            }
        if include_vehicle and self.vehicle:
            res["vehicle"] = {
                "vehicle_number": self.vehicle.vehicle_number,
                "vehicle_type": self.vehicle.vehicle_type,
                "wheel_config": self.wheel_config if hasattr(self, 'wheel_config') else self.vehicle.wheel_config,
            }
        return res

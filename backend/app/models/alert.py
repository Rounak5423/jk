import uuid
from datetime import datetime, timezone
from app.extensions import db


class AlertSeverity:
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    RISK = "RISK"
    CRITICAL = "CRITICAL"


class AlertStatus:
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True, index=True)
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="CASCADE"), nullable=True, index=True)
    wheel_position = db.Column(db.String(16), nullable=True)
    code = db.Column(db.String(16), nullable=False, index=True)
    category = db.Column(db.String(32), nullable=False)
    severity = db.Column(db.String(16), nullable=False, default=AlertSeverity.WARNING)
    observed_value = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(16), nullable=True)
    explanation = db.Column(db.Text, nullable=False)
    recommended_action = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(24), nullable=False, default=AlertStatus.ACTIVE)
    acknowledged_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    fleet = db.relationship("Fleet", back_populates="alerts")
    vehicle = db.relationship("Vehicle", back_populates="alerts")
    tyre = db.relationship("Tyre", back_populates="alerts")
    ack_user = db.relationship("User", foreign_keys=[acknowledged_by])
    res_user = db.relationship("User", foreign_keys=[resolved_by])

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "tyre_id": self.tyre_id,
            "tyre_serial": self.tyre.serial_number if self.tyre else None,
            "wheel_position": self.wheel_position,
            "code": self.code,
            "category": self.category,
            "severity": self.severity,
            "observed_value": round(self.observed_value, 2) if self.observed_value is not None else None,
            "unit": self.unit,
            "explanation": self.explanation,
            "recommended_action": self.recommended_action,
            "status": self.status,
            "acknowledged_by": self.ack_user.full_name if self.ack_user else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "resolved_by": self.res_user.full_name if self.res_user else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_note": self.resolution_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

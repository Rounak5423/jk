import uuid
from datetime import datetime, timezone
from app.extensions import db


class TyreLifecycleHistory(db.Model):
    __tablename__ = "tyre_lifecycle_history"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="CASCADE"), nullable=False, index=True)
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_lifecycle_type = db.Column(db.String(16), nullable=False)
    new_lifecycle_type = db.Column(db.String(16), nullable=False)
    previous_status = db.Column(db.String(24), nullable=True)
    new_status = db.Column(db.String(24), nullable=True)
    related_inspection_id = db.Column(db.String(36), db.ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True)
    related_fitment_id = db.Column(db.String(36), db.ForeignKey("tyre_fitments.id", ondelete="SET NULL"), nullable=True)
    changed_by_user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reason = db.Column(db.String(256), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    nsd_at_change = db.Column(db.Float, nullable=True)
    km_at_change = db.Column(db.Float, nullable=True)
    retread_count = db.Column(db.Integer, nullable=True)
    scrap_reason = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    tyre = db.relationship("Tyre", back_populates="lifecycle_history")
    fleet = db.relationship("Fleet")
    changed_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "tyre_id": self.tyre_id,
            "fleet_id": self.fleet_id,
            "previous_lifecycle_type": self.previous_lifecycle_type,
            "new_lifecycle_type": self.new_lifecycle_type,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "related_inspection_id": self.related_inspection_id,
            "related_fitment_id": self.related_fitment_id,
            "changed_by_user_id": self.changed_by_user_id,
            "changed_by_name": self.changed_by.full_name if self.changed_by else None,
            "reason": self.reason,
            "remarks": self.remarks,
            "nsd_at_change": self.nsd_at_change,
            "km_at_change": self.km_at_change,
            "retread_count": self.retread_count,
            "scrap_reason": self.scrap_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

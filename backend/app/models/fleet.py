import uuid
from datetime import datetime, timezone
from app.extensions import db


class Fleet(db.Model):
    __tablename__ = "fleets"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(120), nullable=False)
    registration_no = db.Column(db.String(64), nullable=True)
    contact_name = db.Column(db.String(120), nullable=False)
    contact_email = db.Column(db.String(120), nullable=True, unique=True, index=True)
    contact_phone = db.Column(db.String(32), nullable=True)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(64), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(24), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    users = db.relationship("User", back_populates="fleet", cascade="all, delete-orphan", lazy="select")
    vehicles = db.relationship("Vehicle", back_populates="fleet", cascade="all, delete-orphan", lazy="select")
    tyres = db.relationship("Tyre", back_populates="fleet", cascade="all, delete-orphan", lazy="select")
    trips = db.relationship("Trip", back_populates="fleet", cascade="all, delete-orphan", lazy="select")
    alerts = db.relationship("Alert", back_populates="fleet", cascade="all, delete-orphan", lazy="select")
    inspections = db.relationship("Inspection", back_populates="fleet", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        healthy_tyres = sum(1 for t in self.tyres if t.thi_status == "HEALTHY") if self.tyres else 0
        warning_tyres = sum(1 for t in self.tyres if t.thi_status == "WARNING") if self.tyres else 0
        critical_tyres = sum(1 for t in self.tyres if t.thi_status == "CRITICAL") if self.tyres else 0
        active_alerts_count = sum(1 for a in self.alerts if a.status == "ACTIVE") if self.alerts else 0

        return {
            "id": self.id,
            "name": self.name,
            "registration_no": self.registration_no,
            "contact_name": self.contact_name,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "vehicle_count": len(self.vehicles) if self.vehicles else 0,
            "fitted_tyres_count": sum(len(v.active_fitments) for v in self.vehicles) if self.vehicles else 0,
            "active_alerts_count": active_alerts_count,
            "health_summary": {
                "healthy": healthy_tyres,
                "warning": warning_tyres,
                "critical": critical_tyres,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

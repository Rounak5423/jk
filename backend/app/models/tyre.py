import uuid
from datetime import datetime, timezone
from app.extensions import db


class TyreStatus:
    FITTED = "FITTED"
    IN_INVENTORY = "IN_INVENTORY"
    RETREADING = "RETREADING"
    SCRAPPED = "SCRAPPED"


class HealthStatus:
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class LifecycleType:
    NEW = "NEW"
    REUSE = "REUSE"
    RETREAD = "RETREAD"
    SCRAP = "SCRAP"


class Tyre(db.Model):
    __tablename__ = "tyres"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    serial_number = db.Column(db.String(64), nullable=False, unique=True, index=True)
    brand = db.Column(db.String(64), nullable=False, default="JK Tyre")
    model = db.Column(db.String(64), nullable=False, default="Jetway JUH5")
    size = db.Column(db.String(32), nullable=False, default="295/80R22.5")
    blueprint_nsd = db.Column(db.Float, nullable=False, default=16.5)  # virgin depth in mm
    current_nsd = db.Column(db.Float, nullable=False, default=16.5)    # latest depth in mm
    retread_count = db.Column(db.Integer, nullable=False, default=0)
    total_km_run = db.Column(db.Float, nullable=False, default=0.0)
    current_thi = db.Column(db.Float, nullable=True, default=100.0)
    thi_status = db.Column(db.String(16), nullable=False, default=HealthStatus.HEALTHY)
    status = db.Column(db.String(24), nullable=False, default=TyreStatus.IN_INVENTORY)
    lifecycle_type = db.Column(db.String(16), nullable=False, default=LifecycleType.NEW)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    fleet = db.relationship("Fleet", back_populates="tyres")
    fitments = db.relationship("TyreFitment", back_populates="tyre", cascade="all, delete-orphan", lazy="select", order_by="desc(TyreFitment.fitted_at)")
    thi_records = db.relationship("THIRecord", back_populates="tyre", cascade="all, delete-orphan", lazy="dynamic")
    alerts = db.relationship("Alert", back_populates="tyre", cascade="all, delete-orphan", lazy="select")
    inspections = db.relationship("Inspection", back_populates="tyre", cascade="all, delete-orphan", lazy="select")
    lifecycle_history = db.relationship("TyreLifecycleHistory", back_populates="tyre", cascade="all, delete-orphan", lazy="select", order_by="desc(TyreLifecycleHistory.created_at)")

    @property
    def active_fitment(self):
        for f in self.fitments:
            if f.removed_at is None:
                return f
        return None

    @property
    def wear_percentage(self):
        if self.blueprint_nsd and self.blueprint_nsd > 0:
            worn = self.blueprint_nsd - self.current_nsd
            return max(0.0, min(100.0, round((worn / self.blueprint_nsd) * 100.0, 1)))
        return 0.0

    def calculate_total_km(self):
        """
        Calculates cumulative distance run by the tyre across all fitments (past and present)
        and inspection odometer milestones.
        """
        total = 0.0

        # 1. Sum distance from all historical closed fitments
        for fit in self.fitments:
            if fit.removed_at is not None and fit.removed_odometer is not None and fit.fitted_odometer is not None:
                delta = fit.removed_odometer - fit.fitted_odometer
                if delta > 0:
                    total += delta

        # 2. Add distance from active fitment
        af = self.active_fitment
        if af and af.fitted_odometer is not None:
            latest_odo = af.fitted_odometer
            if af.vehicle and af.vehicle.current_odometer is not None:
                latest_odo = max(latest_odo, af.vehicle.current_odometer)

            for insp in self.inspections:
                if insp.odometer_at_inspection and insp.odometer_at_inspection > latest_odo:
                    latest_odo = insp.odometer_at_inspection

            delta = latest_odo - af.fitted_odometer
            if delta > 0:
                total += delta
        elif not self.fitments and self.inspections:
            odos = [i.odometer_at_inspection for i in self.inspections if i.odometer_at_inspection is not None]
            if odos:
                total = max(0.0, max(odos) - min(odos))

        persisted = self.total_km_run or 0.0
        return max(persisted, round(total, 1))

    def to_dict(self, include_history=False):
        af = self.active_fitment
        total_km = round(self.calculate_total_km(), 1)
        if self.total_km_run != total_km:
            self.total_km_run = total_km

        res = {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "serial_number": self.serial_number,
            "brand": self.brand,
            "model": self.model,
            "size": self.size,
            "blueprint_nsd": self.blueprint_nsd,
            "current_nsd": round(self.current_nsd, 2) if self.current_nsd is not None else None,
            "wear_percentage": self.wear_percentage,
            "retread_count": self.retread_count,
            "total_km_run": total_km,
            "current_thi": round(self.current_thi, 1) if self.current_thi is not None else None,
            "thi_status": self.thi_status,
            "status": self.status,
            "lifecycle_type": self.lifecycle_type,
            "active_fitment": af.to_dict(include_tyre=False) if af else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_history:
            res["fitment_history"] = [f.to_dict(include_tyre=False) for f in self.fitments]
        return res

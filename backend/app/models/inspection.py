import uuid
from datetime import datetime, timezone
from app.extensions import db


class InspectionCondition:
    NORMAL = "NORMAL"
    UNEVEN_WEAR = "UNEVEN_WEAR"
    SIDEWALL_CUT = "SIDEWALL_CUT"
    BULGE = "BULGE"
    PUNCTURE = "PUNCTURE"


class InspectionResult:
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"
    FURTHER_ASSESSMENT = "FURTHER_ASSESSMENT"


class Inspection(db.Model):
    __tablename__ = "inspections"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    measured_nsd = db.Column(db.Float, nullable=False)
    measured_pressure = db.Column(db.Float, nullable=True)
    odometer_at_inspection = db.Column(db.Float, nullable=False)
    visual_condition = db.Column(db.String(32), nullable=False, default=InspectionCondition.NORMAL)
    photo_url = db.Column(db.String(256), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    inspected_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    # New fields
    inspection_result = db.Column(db.String(24), nullable=False, default=InspectionResult.PASS)
    lifecycle_type_change = db.Column(db.String(16), nullable=True)
    lifecycle_reason = db.Column(db.String(256), nullable=True)
    retread_date = db.Column(db.DateTime, nullable=True)
    retread_provider = db.Column(db.String(128), nullable=True)
    retread_count_after = db.Column(db.Integer, nullable=True)
    temperature_at_inspection = db.Column(db.Float, nullable=True)

    # Relationships
    fleet = db.relationship("Fleet", back_populates="inspections")
    vehicle = db.relationship("Vehicle", back_populates="inspections")
    tyre = db.relationship("Tyre", back_populates="inspections")
    inspector = db.relationship("User", back_populates="inspections")

    def to_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "tyre_id": self.tyre_id,
            "tyre_serial": self.tyre.serial_number if self.tyre else None,
            "inspector_id": self.inspector_id,
            "inspector_name": self.inspector.full_name if self.inspector else None,
            "measured_nsd": round(self.measured_nsd, 2),
            "measured_pressure": round(self.measured_pressure, 1) if self.measured_pressure is not None else None,
            "odometer_at_inspection": self.odometer_at_inspection,
            "visual_condition": self.visual_condition,
            "photo_url": self.photo_url,
            "notes": self.notes,
            "inspected_at": self.inspected_at.isoformat() if self.inspected_at else None,
            "inspection_result": self.inspection_result,
            "lifecycle_type_change": self.lifecycle_type_change,
            "lifecycle_reason": self.lifecycle_reason,
            "retread_date": self.retread_date.isoformat() if self.retread_date else None,
            "retread_provider": self.retread_provider,
            "retread_count_after": self.retread_count_after,
            "temperature_at_inspection": self.temperature_at_inspection,
        }


class VehicleInspectionReport(db.Model):
    __tablename__ = "vehicle_inspection_reports"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    odometer = db.Column(db.Float, nullable=False)
    total_wheels = db.Column(db.Integer, nullable=False, default=0)
    inspected_wheels = db.Column(db.Integer, nullable=False, default=0)
    pass_count = db.Column(db.Integer, nullable=False, default=0)
    warning_count = db.Column(db.Integer, nullable=False, default=0)
    fail_count = db.Column(db.Integer, nullable=False, default=0)
    roadworthiness_status = db.Column(db.String(32), nullable=False, default="CERTIFIED_ROADWORTHY")
    summary_notes = db.Column(db.Text, nullable=True)
    details = db.Column(db.JSON, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    fleet = db.relationship("Fleet")
    vehicle = db.relationship("Vehicle")
    inspector = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "report_number": self.report_number,
            "fleet_id": self.fleet_id,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "inspector_id": self.inspector_id,
            "inspector_name": self.inspector.full_name if self.inspector else None,
            "odometer": self.odometer,
            "total_wheels": self.total_wheels,
            "inspected_wheels": self.inspected_wheels,
            "pass_count": self.pass_count,
            "warning_count": self.warning_count,
            "fail_count": self.fail_count,
            "roadworthiness_status": self.roadworthiness_status,
            "summary_notes": self.summary_notes,
            "details": self.details or [],
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


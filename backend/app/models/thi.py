import json
import uuid
from datetime import datetime, timezone
from app.extensions import db


class THIRecord(db.Model):
    __tablename__ = "thi_records"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tyre_id = db.Column(db.String(36), db.ForeignKey("tyres.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    calculated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(16), nullable=False)  # HEALTHY, WARNING, CRITICAL, UNKNOWN
    pressure_score = db.Column(db.Float, nullable=True)
    temp_score = db.Column(db.Float, nullable=True)
    wear_score = db.Column(db.Float, nullable=True)
    rrc_score = db.Column(db.Float, nullable=True)
    inputs_json = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text, nullable=False)
    rule_version = db.Column(db.String(32), nullable=False, default="v1.0.0-demo-provisional")

    # Relationships
    tyre = db.relationship("Tyre", back_populates="thi_records")
    vehicle = db.relationship("Vehicle")

    @property
    def inputs(self):
        try:
            return json.loads(self.inputs_json) if self.inputs_json else {}
        except Exception:
            return {}

    @inputs.setter
    def inputs(self, val):
        self.inputs_json = json.dumps(val) if val is not None else "{}"

    def to_dict(self):
        return {
            "id": self.id,
            "tyre_id": self.tyre_id,
            "vehicle_id": self.vehicle_id,
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None,
            "score": round(self.score, 1),
            "status": self.status,
            "components": {
                "pressure_score": round(self.pressure_score, 1) if self.pressure_score is not None else None,
                "temp_score": round(self.temp_score, 1) if self.temp_score is not None else None,
                "wear_score": round(self.wear_score, 1) if self.wear_score is not None else None,
                "rrc_score": round(self.rrc_score, 1) if self.rrc_score is not None else None,
            },
            "inputs": self.inputs,
            "explanation": self.explanation,
            "rule_version": self.rule_version,
        }

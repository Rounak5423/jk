import uuid
from datetime import datetime, timezone
from app.extensions import db


class OEMFleetVault(db.Model):
    """
    Dedicated OEM (JK Tyre) Ingest & Telemetry Vault.
    Captures complete operational, asset, and telemetry state fleetwise for central
    OEM intelligence, predictive R&D, and corporate oversight.
    """
    __tablename__ = "oem_fleet_vault"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fleet_id = db.Column(db.String(36), db.ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False, index=True)
    fleet_name = db.Column(db.String(128), nullable=False)
    snapshot_type = db.Column(db.String(32), nullable=False, default="FULL_FLEET_TELEMETRY")
    captured_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    total_vehicles = db.Column(db.Integer, nullable=False, default=0)
    total_tyres = db.Column(db.Integer, nullable=False, default=0)
    average_thi = db.Column(db.Float, nullable=False, default=100.0)
    active_alerts_count = db.Column(db.Integer, nullable=False, default=0)
    total_km_run = db.Column(db.Float, nullable=False, default=0.0)
    payload = db.Column(db.JSON, nullable=False)
    sync_channel = db.Column(db.String(32), nullable=False, default="OEM_INCOGNITO_CHANNEL")
    data_hash = db.Column(db.String(64), nullable=True)

    # Relationships
    fleet = db.relationship("Fleet")

    def to_summary_dict(self):
        return {
            "id": self.id,
            "fleet_id": self.fleet_id,
            "fleet_name": self.fleet_name,
            "snapshot_type": self.snapshot_type,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "total_vehicles": self.total_vehicles,
            "total_tyres": self.total_tyres,
            "average_thi": round(self.average_thi, 1) if self.average_thi is not None else 100.0,
            "active_alerts_count": self.active_alerts_count,
            "total_km_run": round(self.total_km_run, 1) if self.total_km_run is not None else 0.0,
            "sync_channel": self.sync_channel,
            "data_hash": self.data_hash,
            "payload_size_kb": round(len(str(self.payload)) / 1024.0, 1),
        }

    def to_dict(self):
        summary = self.to_summary_dict()
        summary["payload"] = self.payload
        return summary

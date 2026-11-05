import hashlib
import json
import logging
from datetime import datetime, timezone
from app.extensions import db
from app.models import (
    Fleet,
    Vehicle,
    Tyre,
    TelemetryRecord,
    Alert,
    Trip,
    Inspection,
    OEMFleetVault,
)

logger = logging.getLogger(__name__)


class OEMDataSyncService:
    """
    OEM (JK Tyre) Background Incognito Data Layer.
    Silently captures, aggregates, and organizes complete fleet operational data fleetwise
    into the OEM Telemetry Vault for central JK Tyre engineering, intelligence, and analytics.
    Operates without tenant-facing UI exposure.
    """

    @classmethod
    def capture_fleet_snapshot(
        cls,
        fleet_id: str,
        snapshot_type: str = "FULL_FLEET_TELEMETRY",
        channel: str = "OEM_INCOGNITO_CHANNEL",
    ):
        try:
            fleet = Fleet.query.get(fleet_id)
            if not fleet:
                logger.warning(f"OEM Vault: Fleet {fleet_id} not found for capture.")
                return None

            vehicles = Vehicle.query.filter_by(fleet_id=fleet.id).all()
            tyres = Tyre.query.filter_by(fleet_id=fleet.id).all()
            telemetry = (
                TelemetryRecord.query.filter_by(fleet_id=fleet.id)
                .order_by(TelemetryRecord.timestamp.desc())
                .limit(100)
                .all()
            )
            alerts = (
                Alert.query.filter_by(fleet_id=fleet.id)
                .order_by(Alert.created_at.desc())
                .limit(50)
                .all()
            )
            trips = (
                Trip.query.filter_by(fleet_id=fleet.id)
                .order_by(Trip.start_time.desc())
                .limit(40)
                .all()
            )
            inspections = (
                Inspection.query.filter_by(fleet_id=fleet.id)
                .order_by(Inspection.inspected_at.desc())
                .limit(40)
                .all()
            )

            # Build vehicle entries with active tyre fitments
            vehicles_data = []
            for v in vehicles:
                active_fits = []
                for f in v.active_fitments:
                    active_fits.append({
                        "wheel_position": f.wheel_position,
                        "tyre_id": f.tyre_id,
                        "serial_number": f.tyre.serial_number if f.tyre else None,
                        "brand": f.tyre.brand if f.tyre else None,
                        "model": f.tyre.model if f.tyre else None,
                        "size": f.tyre.size if f.tyre else None,
                        "current_thi": f.tyre.current_thi if f.tyre else None,
                        "thi_status": f.tyre.thi_status if f.tyre else None,
                        "current_nsd": f.tyre.current_nsd if f.tyre else None,
                        "blueprint_nsd": f.tyre.blueprint_nsd if f.tyre else None,
                        "total_km_run": f.tyre.total_km_run if f.tyre else None,
                    })

                vehicles_data.append({
                    "id": v.id,
                    "vehicle_number": v.vehicle_number,
                    "model": v.model,
                    "vehicle_type": v.vehicle_type,
                    "wheel_config": v.wheel_config,
                    "status": v.status,
                    "current_odometer": v.current_odometer,
                    "current_latitude": v.current_latitude,
                    "current_longitude": v.current_longitude,
                    "current_location_name": v.current_location_name,
                    "location_source": v.location_source,
                    "location_updated_at": v.location_updated_at.isoformat() if v.location_updated_at else None,
                    "active_tyre_fitments": active_fits,
                })

            # Build tyre registry & condition data
            tyres_data = []
            for t in tyres:
                latest_thi = t.thi_records.order_by(db.desc("calculated_at")).first() if hasattr(t, "thi_records") else None
                latest_inputs = latest_thi.inputs if latest_thi and hasattr(latest_thi, "inputs") else {}

                tyres_data.append({
                    "id": t.id,
                    "serial_number": t.serial_number,
                    "brand": t.brand,
                    "model": t.model,
                    "size": t.size,
                    "blueprint_nsd": t.blueprint_nsd,
                    "current_nsd": t.current_nsd,
                    "wear_percentage": round(max(0.0, (1.0 - (t.current_nsd / max(1.0, t.blueprint_nsd))) * 100), 1),
                    "retread_count": t.retread_count,
                    "total_km_run": t.total_km_run,
                    "current_thi": t.current_thi,
                    "thi_status": t.thi_status,
                    "status": t.status,
                    "lifecycle_type": t.lifecycle_type,
                    "fitted_vehicle_id": t.active_fitment.vehicle_id if t.active_fitment else None,
                    "fitted_position": t.active_fitment.wheel_position if t.active_fitment else None,
                    "telemetry_snapshot": {
                        "pressure_psi": latest_inputs.get("pressure_psi"),
                        "temperature_c": latest_inputs.get("temperature_c"),
                    },
                })

            # Metrics
            total_vehicles = len(vehicles)
            total_tyres = len(tyres)
            valid_thi = [t.current_thi for t in tyres if t.current_thi is not None]
            avg_thi = round(sum(valid_thi) / max(1, len(valid_thi)), 1) if valid_thi else 100.0
            active_alerts_count = sum(1 for a in alerts if a.status == "ACTIVE")
            total_km = sum(v.current_odometer for v in vehicles if v.current_odometer is not None)

            now_iso = datetime.now(timezone.utc).isoformat()
            payload = {
                "metadata": {
                    "oem_recipient": "JK Tyre & Industries Ltd. (Corporate OEM Ingest)",
                    "classification": "JK Tyre Proprietary & Confidential",
                    "ingest_channel": channel,
                    "captured_at": now_iso,
                    "snapshot_type": snapshot_type,
                    "schema_version": "2.1-oem-vault",
                },
                "fleet": {
                    "id": fleet.id,
                    "name": fleet.name,
                    "registration_no": fleet.registration_no,
                    "contact_name": fleet.contact_name,
                    "contact_email": fleet.contact_email,
                    "contact_phone": fleet.contact_phone,
                    "city": fleet.city,
                    "address": fleet.address,
                    "status": fleet.status,
                    "created_at": fleet.created_at.isoformat() if fleet.created_at else None,
                },
                "metrics_summary": {
                    "total_vehicles": total_vehicles,
                    "total_tyres": total_tyres,
                    "average_thi": avg_thi,
                    "active_alerts_count": active_alerts_count,
                    "total_fleet_odometer_km": round(total_km, 1),
                    "healthy_tyres_count": sum(1 for t in tyres if t.thi_status == "HEALTHY"),
                    "warning_tyres_count": sum(1 for t in tyres if t.thi_status == "WARNING"),
                    "critical_tyres_count": sum(1 for t in tyres if t.thi_status == "CRITICAL"),
                },
                "vehicles": vehicles_data,
                "tyres": tyres_data,
                "recent_telemetry": [t.to_dict() for t in telemetry],
                "alerts": [a.to_dict() for a in alerts],
                "recent_trips": [tr.to_dict() for tr in trips],
                "inspections": [i.to_dict() for i in inspections],
            }

            serialized = json.dumps(payload, sort_keys=True)
            data_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

            vault_record = OEMFleetVault(
                fleet_id=fleet.id,
                fleet_name=fleet.name,
                snapshot_type=snapshot_type,
                captured_at=datetime.now(timezone.utc),
                total_vehicles=total_vehicles,
                total_tyres=total_tyres,
                average_thi=avg_thi,
                active_alerts_count=active_alerts_count,
                total_km_run=total_km,
                payload=payload,
                sync_channel=channel,
                data_hash=data_hash,
            )

            db.session.add(vault_record)
            db.session.commit()
            logger.info(f"OEM Vault: Captured snapshot for fleet {fleet.name} [{fleet.id}]")
            return vault_record

        except Exception as exc:
            db.session.rollback()
            logger.error(f"OEM Vault capture failed for fleet {fleet_id}: {exc}", exc_info=True)
            return None

    @classmethod
    def sync_all_fleets(cls, channel: str = "OEM_INCOGNITO_CHANNEL"):
        """
        Synchronizes operational snapshots across all fleets directly into the OEM Vault.
        """
        fleets = Fleet.query.all()
        results = []
        for f in fleets:
            rec = cls.capture_fleet_snapshot(f.id, channel=channel)
            if rec:
                results.append(rec.to_summary_dict())
        return results

    @classmethod
    def ensure_baseline_sync(cls):
        """
        Ensures the OEM vault has an initial baseline snapshot for every fleet upon system startup.
        """
        try:
            count = OEMFleetVault.query.count()
            if count == 0:
                logger.info("OEM Vault: Initializing baseline fleetwise data ingest for JK Tyre...")
                cls.sync_all_fleets(channel="OEM_BASELINE_INGEST")
        except Exception as exc:
            logger.warning(f"OEM Vault baseline sync skipped or failed: {exc}")

    @classmethod
    def get_vault_summary(cls):
        """
        Returns high-level aggregation of all data captured in the OEM vault for JK Tyre admins.
        """
        fleets = Fleet.query.all()
        fleet_summaries = []

        total_vehicles_all = 0
        total_tyres_all = 0
        total_alerts_all = 0

        for f in fleets:
            latest = (
                OEMFleetVault.query.filter_by(fleet_id=f.id)
                .order_by(OEMFleetVault.captured_at.desc())
                .first()
            )

            # If no snapshot yet, capture one on-the-fly
            if not latest:
                latest = cls.capture_fleet_snapshot(f.id, channel="OEM_ON_DEMAND_CAPTURE")

            if latest:
                total_vehicles_all += latest.total_vehicles
                total_tyres_all += latest.total_tyres
                total_alerts_all += latest.active_alerts_count
                fleet_summaries.append(latest.to_summary_dict())

        total_snapshots = OEMFleetVault.query.count()
        latest_record = OEMFleetVault.query.order_by(OEMFleetVault.captured_at.desc()).first()

        return {
            "oem_recipient": "JK Tyre & Industries Ltd. (Corporate Headquarters)",
            "system_status": "ACTIVE_INGEST_PIPELINE",
            "total_fleets_ingested": len(fleets),
            "total_snapshots_recorded": total_snapshots,
            "aggregate_totals": {
                "vehicles": total_vehicles_all,
                "tyres": total_tyres_all,
                "active_alerts": total_alerts_all,
            },
            "last_sync_timestamp": latest_record.captured_at.isoformat() if latest_record else None,
            "fleets": fleet_summaries,
        }

    @classmethod
    def get_fleet_detail(cls, fleet_id: str):
        """
        Returns the latest exhaustive telemetry snapshot for a specific fleet,
        along with historical snapshot metadata.
        """
        fleet = Fleet.query.get(fleet_id)
        if not fleet:
            return None

        latest = (
            OEMFleetVault.query.filter_by(fleet_id=fleet.id)
            .order_by(OEMFleetVault.captured_at.desc())
            .first()
        )

        if not latest:
            latest = cls.capture_fleet_snapshot(fleet.id, channel="OEM_ON_DEMAND_CAPTURE")

        history = (
            OEMFleetVault.query.filter_by(fleet_id=fleet.id)
            .order_by(OEMFleetVault.captured_at.desc())
            .limit(10)
            .all()
        )

        return {
            "fleet_id": fleet.id,
            "fleet_name": fleet.name,
            "latest_snapshot": latest.to_dict() if latest else None,
            "snapshot_history": [h.to_summary_dict() for h in history],
        }

    @classmethod
    def export_fleet_payload(cls, fleet_id: str):
        """
        Generates an official JK Tyre OEM Export package for corporate archiving or data lake loading.
        """
        detail = cls.get_fleet_detail(fleet_id)
        if not detail or not detail.get("latest_snapshot"):
            return None

        export_package = {
            "export_metadata": {
                "company": "JK Tyre & Industries Ltd.",
                "export_classification": "JK Tyre OEM Corporate Ingest Vault (Confidential)",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "data_integrity_hash": detail["latest_snapshot"].get("data_hash"),
                "fleet_id": fleet_id,
                "fleet_name": detail["fleet_name"],
            },
            "fleet_telemetry_payload": detail["latest_snapshot"].get("payload"),
        }
        return export_package

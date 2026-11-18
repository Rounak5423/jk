import io
import hashlib
import json
import logging
from datetime import datetime, timezone
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
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
    DriverActivity,
    DriverReward,
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
            driver_activities = (
                DriverActivity.query.filter_by(fleet_id=fleet.id)
                .order_by(DriverActivity.created_at.desc())
                .all()
            )

            # Build categorized driver duty telemetry (refueling, stoppages, tyre checks)
            refuel_logs = []
            stop_logs = []
            tyre_logs = []
            total_fuel_litres = 0.0
            total_fuel_cost = 0.0

            for act in driver_activities:
                meta = act.activity_metadata or {}
                if act.activity_type == "REFUELING":
                    litres = float(meta.get("fuel_litres") or 0.0)
                    cost = float(meta.get("fuel_cost") or 0.0)
                    total_fuel_litres += litres
                    total_fuel_cost += cost
                    refuel_logs.append({
                        "id": act.id,
                        "driver_id": act.driver_id,
                        "driver_name": act.driver.full_name if act.driver else None,
                        "vehicle_id": act.vehicle_id,
                        "vehicle_number": act.vehicle.vehicle_number if act.vehicle else None,
                        "odometer_km": act.odometer,
                        "station_location": act.location,
                        "fuel_litres": litres,
                        "fuel_cost_inr": cost,
                        "receipt_no": meta.get("receipt_no"),
                        "notes": act.notes,
                        "points_earned": act.points_earned,
                        "timestamp": act.created_at.isoformat() if act.created_at else None,
                    })
                elif act.activity_type == "STOP_ODOMETER":
                    stop_logs.append({
                        "id": act.id,
                        "driver_id": act.driver_id,
                        "driver_name": act.driver.full_name if act.driver else None,
                        "vehicle_id": act.vehicle_id,
                        "vehicle_number": act.vehicle.vehicle_number if act.vehicle else None,
                        "odometer_km": act.odometer,
                        "stop_location": act.location,
                        "stop_reason": meta.get("stop_reason"),
                        "notes": act.notes,
                        "points_earned": act.points_earned,
                        "timestamp": act.created_at.isoformat() if act.created_at else None,
                    })
                elif act.activity_type == "TYRE_CHECK":
                    tyre_logs.append({
                        "id": act.id,
                        "driver_id": act.driver_id,
                        "driver_name": act.driver.full_name if act.driver else None,
                        "vehicle_id": act.vehicle_id,
                        "vehicle_number": act.vehicle.vehicle_number if act.vehicle else None,
                        "odometer_km": act.odometer,
                        "tyres_checked": meta.get("tyres_checked"),
                        "visual_condition": meta.get("visual_condition"),
                        "notes": act.notes,
                        "points_earned": act.points_earned,
                        "timestamp": act.created_at.isoformat() if act.created_at else None,
                    })

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
                    "total_driver_activities": len(driver_activities),
                    "driver_refueling_count": len(refuel_logs),
                    "driver_stoppage_count": len(stop_logs),
                    "driver_tyre_inspection_count": len(tyre_logs),
                    "total_fuel_litres_logged": round(total_fuel_litres, 1),
                    "total_fuel_cost_logged_inr": round(total_fuel_cost, 2),
                },
                "vehicles": vehicles_data,
                "tyres": tyres_data,
                "recent_telemetry": [t.to_dict() for t in telemetry],
                "alerts": [a.to_dict() for a in alerts],
                "recent_trips": [tr.to_dict() for tr in trips],
                "inspections": [i.to_dict() for i in inspections],
                "driver_activities": [a.to_dict() for a in driver_activities],
                "driver_duty_telemetry": {
                    "total_activities_count": len(driver_activities),
                    "total_fuel_litres": round(total_fuel_litres, 1),
                    "total_fuel_cost_inr": round(total_fuel_cost, 2),
                    "refueling_logs": refuel_logs,
                    "stoppage_logs": stop_logs,
                    "tyre_walkaround_logs": tyre_logs,
                },
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
        Ensures any new driver activities or trip completions trigger an automatic fresh snapshot.
        """
        fleet = Fleet.query.get(fleet_id)
        if not fleet:
            return None

        latest = (
            OEMFleetVault.query.filter_by(fleet_id=fleet.id)
            .order_by(OEMFleetVault.captured_at.desc())
            .first()
        )

        # Check if snapshot is missing driver activities or older than the most recent driver activity
        latest_act = (
            DriverActivity.query.filter_by(fleet_id=fleet.id)
            .order_by(DriverActivity.created_at.desc())
            .first()
        )
        needs_refresh = False
        if not latest or not latest.payload or "driver_activities" not in latest.payload:
            needs_refresh = True
        elif latest_act and latest.captured_at and latest_act.created_at > latest.captured_at:
            needs_refresh = True

        if needs_refresh:
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

    @classmethod
    def generate_fleet_excel_export(cls, fleet_id: str):
        """
        Builds a comprehensive multi-sheet Excel (.xlsx) workbook containing complete fleetwise
        operational records: driver activities (stoppages, refuelings, tyre inspections), vehicle
        status, tyre registry, trip scoring, and operational alerts.
        """
        fleet = Fleet.query.get(fleet_id)
        if not fleet:
            return None, None

        # Ensure latest snapshot has fresh data
        detail = cls.get_fleet_detail(fleet_id)
        payload = detail["latest_snapshot"].get("payload", {}) if detail and detail.get("latest_snapshot") else {}

        wb = openpyxl.Workbook()
        wb.remove(wb.active)  # remove default sheet

        def apply_header_style(ws, cols):
            header_fill = PatternFill(start_color="292D32", end_color="292D32", fill_type="solid")
            header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            thin_border = Border(
                left=Side(style='thin', color='D0D5DD'),
                right=Side(style='thin', color='D0D5DD'),
                top=Side(style='thin', color='D0D5DD'),
                bottom=Side(style='thin', color='D0D5DD')
            )
            for col_idx in range(1, len(cols) + 1):
                cell = ws.cell(row=1, column=col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.border = thin_border

        # 1. Sheet: README_PROVENANCE
        ws_readme = wb.create_sheet(title="README_PROVENANCE")
        ws_readme.views.sheetView[0].showGridLines = True
        readme_rows = [
            ["JK TYRE & INDUSTRIES LTD. — OEM FLEET INTELLIGENCE & TELEMETRY EXPORT"],
            [],
            ["Export Timestamp (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")],
            ["Fleet Operator", fleet.name],
            ["Fleet ID", fleet.id],
            ["Registration No", fleet.registration_no or "N/A"],
            ["Headquarters City", fleet.city or "N/A"],
            ["Data Classification", "JK Tyre Corporate OEM Ingest (Confidential)"],
            ["File Format", "Microsoft Excel (.xlsx) - Multi-Sheet Structured Workbook"],
            [],
            ["WORKBOOK CONTENTS:"],
            ["1. README_PROVENANCE", "Export metadata, provenance statement, and classification"],
            ["2. FLEET_SUMMARY", "Executive KPI summary (vehicles, tyres, THI, odometer km, driver activities)"],
            ["3. DRIVER_ACTIVITIES", "Complete driver duty updates (refueling, stoppages, walkaround checks)"],
            ["4. STOPPAGES_AND_ODOMETERS", "Detailed stoppage checkpoint records (halt reasons, locations, odometers)"],
            ["5. REFUELING_LOGS", "Detailed fuel logs (station names, litres, costs, odometer readings, receipts)"],
            ["6. TYRE_WALKAROUNDS", "Physical tyre inspection records (tyres checked count, visual condition, notes)"],
            ["7. VEHICLES", "Commercial vehicle inventory, status, odometer readings, and fitted tyre counts"],
            ["8. TYRES_REGISTRY", "Permanent tyre asset ledger (serials, NSD, wear %, THI composite scores)"],
            ["9. TRIPS_AND_SCORES", "Driver journey records, start/end odometers, distances, and trip scores"],
            ["10. ALERTS", "Active and historical operational alerts (pressure, temperature, tread wear)"],
        ]
        for r_idx, row in enumerate(readme_rows, 1):
            for c_idx, val in enumerate(row, 1):
                cell = ws_readme.cell(row=r_idx, column=c_idx, value=val)
                if r_idx == 1:
                    cell.font = Font(name="Calibri", size=14, bold=True, color="292D32")
                elif len(row) == 1 and val.endswith(":"):
                    cell.font = Font(name="Calibri", size=11, bold=True, color="292D32")
        ws_readme.column_dimensions["A"].width = 32
        ws_readme.column_dimensions["B"].width = 80

        # 2. Sheet: FLEET_SUMMARY
        ws_summary = wb.create_sheet(title="FLEET_SUMMARY")
        cols_summary = ["Metric / Parameter", "Value", "Unit / Scope", "Notes"]
        ws_summary.append(cols_summary)
        apply_header_style(ws_summary, cols_summary)

        metrics = payload.get("metrics_summary", {})
        fleet_meta = payload.get("fleet", {})
        summary_data = [
            ["Fleet Name", fleet_meta.get("name", fleet.name), "Organization", "Registered commercial operator"],
            ["Total Commercial Vehicles", metrics.get("total_vehicles", 0), "Units", "Active fleet trucks"],
            ["Total Tyre Assets", metrics.get("total_tyres", 0), "Tyres", "Mounted & inventory radials"],
            ["Average Fleet THI Score", metrics.get("average_thi", 100.0), "/ 100", "Tyre Health Index"],
            ["Total Fleet Odometer", metrics.get("total_fleet_odometer_km", 0), "km", "Accumulated commercial distance"],
            ["Active Alerts Count", metrics.get("active_alerts_count", 0), "Alerts", "Unresolved TPMS/THI warnings"],
            ["Total Driver Duty Activities", metrics.get("total_driver_activities", 0), "Submissions", "Logged duty submissions"],
            ["Driver Stoppages Logged", metrics.get("driver_stoppage_count", 0), "Checkpoints", "En-route rest/toll/loading stops"],
            ["Driver Refuelings Logged", metrics.get("driver_refueling_count", 0), "Refills", "Fuel station updates"],
            ["Driver Tyre Inspections", metrics.get("driver_tyre_inspection_count", 0), "Inspections", "Walkaround visual checks"],
            ["Total Fuel Logged", metrics.get("total_fuel_litres_logged", 0), "Litres", "Verified fuel pumped"],
            ["Total Fuel Cost Logged", metrics.get("total_fuel_cost_logged_inr", 0), "INR (₹)", "Expenditure logged by drivers"],
        ]
        for row in summary_data:
            ws_summary.append(row)

        # Query all DriverActivity records for this fleet
        driver_acts = (
            DriverActivity.query.filter_by(fleet_id=fleet_id)
            .order_by(DriverActivity.created_at.desc())
            .all()
        )

        # 3. Sheet: DRIVER_ACTIVITIES (All duty updates)
        ws_acts = wb.create_sheet(title="DRIVER_ACTIVITIES")
        cols_acts = [
            "Activity ID", "Date & Time (UTC)", "Driver Name", "Vehicle Number", "Activity Type",
            "Reported Odometer (km)", "Location / Station", "Details / Data", "Points Awarded",
            "Discount (₹)", "Driver Remarks", "Audit Status"
        ]
        ws_acts.append(cols_acts)
        apply_header_style(ws_acts, cols_acts)
        for a in driver_acts:
            meta = a.activity_metadata or {}
            detail_str = ""
            if a.activity_type == "REFUELING":
                detail_str = f"{meta.get('fuel_litres', '—')} L | ₹{meta.get('fuel_cost', '—')} | Inv: {meta.get('receipt_no', 'N/A')}"
            elif a.activity_type == "STOP_ODOMETER":
                detail_str = f"Reason: {meta.get('stop_reason', 'En-Route Stop')}"
            elif a.activity_type == "TYRE_CHECK":
                detail_str = f"{meta.get('tyres_checked', 10)} Tyres | Condition: {meta.get('visual_condition', 'Normal')}"
            else:
                detail_str = a.title

            ws_acts.append([
                a.id,
                a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
                a.driver.full_name if a.driver else "Driver",
                a.vehicle.vehicle_number if a.vehicle else "Fleet Vehicle",
                a.activity_type,
                a.odometer,
                a.location,
                detail_str,
                a.points_earned,
                a.discount_value,
                a.notes,
                a.status,
            ])

        # 4. Sheet: STOPPAGES_AND_ODOMETERS
        ws_stops = wb.create_sheet(title="STOPPAGES_AND_ODOMETERS")
        cols_stops = ["Date & Time (UTC)", "Driver Name", "Vehicle Number", "Stop Checkpoint", "Reported Odometer (km)", "Stop Reason", "Remarks / Notes"]
        ws_stops.append(cols_stops)
        apply_header_style(ws_stops, cols_stops)
        for a in [x for x in driver_acts if x.activity_type == "STOP_ODOMETER"]:
            meta = a.activity_metadata or {}
            ws_stops.append([
                a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
                a.driver.full_name if a.driver else "Driver",
                a.vehicle.vehicle_number if a.vehicle else "Fleet Vehicle",
                a.location,
                a.odometer,
                meta.get("stop_reason", "En-Route Stop"),
                a.notes,
            ])

        # 5. Sheet: REFUELING_LOGS
        ws_fuel = wb.create_sheet(title="REFUELING_LOGS")
        cols_fuel = ["Date & Time (UTC)", "Driver Name", "Vehicle Number", "Station / Pump Location", "Odometer (km)", "Fuel Litres (L)", "Total Cost (₹)", "Receipt / Invoice #", "Notes"]
        ws_fuel.append(cols_fuel)
        apply_header_style(ws_fuel, cols_fuel)
        for a in [x for x in driver_acts if x.activity_type == "REFUELING"]:
            meta = a.activity_metadata or {}
            ws_fuel.append([
                a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
                a.driver.full_name if a.driver else "Driver",
                a.vehicle.vehicle_number if a.vehicle else "Fleet Vehicle",
                a.location or meta.get("station_name"),
                a.odometer,
                meta.get("fuel_litres"),
                meta.get("fuel_cost"),
                meta.get("receipt_no"),
                a.notes,
            ])

        # 6. Sheet: TYRE_WALKAROUNDS
        ws_tyre_insp = wb.create_sheet(title="TYRE_WALKAROUNDS")
        cols_tyre_insp = ["Date & Time (UTC)", "Driver Name", "Vehicle Number", "Odometer (km)", "Tyres Checked Count", "Visual Tyre Condition", "Physical Observations / Notes"]
        ws_tyre_insp.append(cols_tyre_insp)
        apply_header_style(ws_tyre_insp, cols_tyre_insp)
        for a in [x for x in driver_acts if x.activity_type == "TYRE_CHECK"]:
            meta = a.activity_metadata or {}
            ws_tyre_insp.append([
                a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
                a.driver.full_name if a.driver else "Driver",
                a.vehicle.vehicle_number if a.vehicle else "Fleet Vehicle",
                a.odometer,
                meta.get("tyres_checked"),
                meta.get("visual_condition"),
                a.notes,
            ])

        # 7. Sheet: VEHICLES
        ws_vehs = wb.create_sheet(title="VEHICLES")
        cols_vehs = ["Vehicle Number", "Model", "Vehicle Type", "Wheel Config", "Axles", "Current Odometer (km)", "Current Location", "Status", "Fitted Tyres Count"]
        ws_vehs.append(cols_vehs)
        apply_header_style(ws_vehs, cols_vehs)
        for v in Vehicle.query.filter_by(fleet_id=fleet_id).all():
            ws_vehs.append([
                v.vehicle_number, v.model, v.vehicle_type, v.wheel_config, v.axle_count,
                v.current_odometer, v.current_location_name or "En-route", v.status, len(v.active_fitments)
            ])

        # 8. Sheet: TYRES_REGISTRY
        ws_tyres = wb.create_sheet(title="TYRES_REGISTRY")
        cols_tyres = ["Serial Number", "Brand", "Model", "Size", "Blueprint NSD (mm)", "Current NSD (mm)", "Wear %", "THI Score", "THI Status", "Total KM Run", "Fitted Vehicle", "Wheel Position"]
        ws_tyres.append(cols_tyres)
        apply_header_style(ws_tyres, cols_tyres)
        for t in Tyre.query.filter_by(fleet_id=fleet_id).all():
            wear_pct = round(max(0.0, (1.0 - (t.current_nsd / max(1.0, t.blueprint_nsd))) * 100), 1) if (t.current_nsd and t.blueprint_nsd) else 0.0
            veh_num = t.active_fitment.vehicle.vehicle_number if (t.active_fitment and t.active_fitment.vehicle) else None
            pos = t.active_fitment.wheel_position if t.active_fitment else None
            ws_tyres.append([
                t.serial_number, t.brand, t.model, t.size, t.blueprint_nsd, t.current_nsd,
                wear_pct, t.current_thi, t.thi_status, t.total_km_run, veh_num, pos
            ])

        # 9. Sheet: TRIPS_AND_SCORES
        ws_trips = wb.create_sheet(title="TRIPS_AND_SCORES")
        cols_trips = ["Trip Code", "Driver Name", "Vehicle Number", "Origin", "Destination", "Distance (km)", "Start Odometer", "End Odometer", "Trip Score", "Score Status", "Status", "Start Time"]
        ws_trips.append(cols_trips)
        apply_header_style(ws_trips, cols_trips)
        for tr in Trip.query.filter_by(fleet_id=fleet_id).order_by(Trip.start_time.desc()).limit(1500).all():
            ws_trips.append([
                tr.trip_code,
                tr.driver.full_name if tr.driver else "Driver",
                tr.vehicle.vehicle_number if tr.vehicle else None,
                tr.origin, tr.destination, tr.distance_km, tr.start_odometer, tr.end_odometer,
                tr.trip_score, tr.trip_score_status, tr.status,
                tr.start_time.strftime("%Y-%m-%d %H:%M") if tr.start_time else None
            ])

        # 10. Sheet: ALERTS
        ws_alerts = wb.create_sheet(title="ALERTS")
        cols_alerts = ["Date & Time (UTC)", "Vehicle Number", "Tyre Position", "Code", "Category", "Severity", "Observed Value", "Unit", "Explanation", "Status"]
        ws_alerts.append(cols_alerts)
        apply_header_style(ws_alerts, cols_alerts)
        for al in Alert.query.filter_by(fleet_id=fleet_id).order_by(Alert.created_at.desc()).limit(1000).all():
            ws_alerts.append([
                al.created_at.strftime("%Y-%m-%d %H:%M:%S") if al.created_at else None,
                al.vehicle.vehicle_number if al.vehicle else None,
                al.wheel_position, al.code, al.category, al.severity, al.observed_value, al.unit, al.explanation, al.status
            ])

        # Auto-fit column widths across all sheets
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 48)

        output_stream = io.BytesIO()
        wb.save(output_stream)
        output_stream.seek(0)

        safe_fleet_name = "".join(c if c.isalnum() or c in (' ', '_') else '_' for c in fleet.name).replace(" ", "_")
        filename = f"JK_TYRE_OEM_INGEST_{safe_fleet_name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
        return output_stream, filename

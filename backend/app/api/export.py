import io
import csv
from datetime import datetime, timezone
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from flask import Blueprint, request, jsonify, g, send_file
from app.extensions import db
from app.models import (
    Fleet, User, Vehicle, Tyre, TyreFitment, Trip,
    TelemetryRecord, THIRecord, Alert, Inspection, AuditLog, UserRole
)
from app.utils.security import jwt_required, enforce_fleet_access, get_effective_fleet_id

export_bp = Blueprint("export", __name__)


def create_header_style(ws, cols):
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


@export_bp.route("/excel", methods=["GET"])
@jwt_required
def export_excel_dataset():
    """
    Builds a downloadable 13-sheet .xlsx workbook containing actual database-derived
    synthetic fleet records, schema provenance, and data dictionary.
    Excludes sensitive secrets such as password hashes.
    """
    user = g.current_user
    fleet_id = get_effective_fleet_id()

    # Super admin can view all or filter; fleet managers strictly access authorized fleet
    is_super_admin = (user.role == UserRole.SUPER_ADMIN)
    if not is_super_admin:
        if not fleet_id or not enforce_fleet_access(fleet_id):
            return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # 1. Sheet 1: README_PROVENANCE
    ws_readme = wb.create_sheet(title="README_PROVENANCE")
    ws_readme.views.sheetView[0].showGridLines = True
    readme_content = [
        ["JK TYRE THI FLEET INTELLIGENCE PLATFORM — SYNTHETIC DATASET EXPORT"],
        [],
        ["Export Date (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")],
        ["Exported By User", f"{user.full_name} ({user.email})"],
        ["User Role", user.role],
        ["Target Fleet Scope", fleet_id if fleet_id else "CROSS-FLEET (ADMIN OVERVIEW)"],
        ["Provenance", "SYNTHETIC (Deterministic physically-correlated simulation)"],
        ["Total Sheets", 13],
        [],
        ["DISCLAIMER & RESEARCH COMPLIANCE:"],
        ["1. All vehicle telemetry, pressure, temperature, NSD wear, and alerts in this export are synthetically"],
        ["   generated based on physical commercial vehicle physics models and JK Tyre benchmark parameters."],
        ["2. Under strict research protocol, sheets named 'NSD Inspection Data' in legacy workbooks were excluded."],
        ["3. No actual customer confidential telemetry or Treel sensor hardware serial numbers are disclosed."],
        ["4. System authentication secrets (such as bcrypt password hashes) are strictly excluded from this export."],
        [],
        ["WORKBOOK STRUCTURE (13 SHEETS):"],
        ["Sheet 1: README_PROVENANCE - Dataset description, provenance statement, and metadata"],
        ["Sheet 2: FLEETS - Commercial fleet operators and operating headquarters"],
        ["Sheet 3: USERS - Authorized roles and operators (excluding credential hashes)"],
        ["Sheet 4: VEHICLES - Commercial vehicles, wheel layouts, and GPS/simulated hubs"],
        ["Sheet 5: TYRES - Permanent tyre assets, NSD history, and cumulative mileage"],
        ["Sheet 6: TYRE_FITMENTS - Wheel position mounting and dismounting lifecycles"],
        ["Sheet 7: TRIPS - Monotonic driver journeys, start/end odometers, and trip scores"],
        ["Sheet 8: TELEMETRY_RECORDS - TPMS sensor frames (pressure, temperature, speed, battery)"],
        ["Sheet 9: THI_RECORDS - Explainable Tyre Health Index evaluations and risk breakdowns"],
        ["Sheet 10: ALERTS - Configurable operational alerts (pressure, temperature, wear)"],
        ["Sheet 11: INSPECTIONS - Manual tread depth (NSD) and visual physical inspection records"],
        ["Sheet 12: AUDIT_LOGS - Security and administration audit trails"],
        ["Sheet 13: DATA_DICTIONARY - Entity specifications, descriptions, and alert codes"],
    ]
    for r_idx, row in enumerate(readme_content, 1):
        for c_idx, val in enumerate(row, 1):
            cell = ws_readme.cell(row=r_idx, column=c_idx, value=val)
            if r_idx == 1:
                cell.font = Font(name="Calibri", size=14, bold=True, color="292D32")
            elif len(row) == 1 and val.endswith(":"):
                cell.font = Font(name="Calibri", size=11, bold=True, color="292D32")
    ws_readme.column_dimensions["A"].width = 30
    ws_readme.column_dimensions["B"].width = 80

    # Helper query filter
    def scope_query(model_cls, fleet_attr="fleet_id"):
        q = model_cls.query
        if fleet_id and hasattr(model_cls, fleet_attr):
            q = q.filter(getattr(model_cls, fleet_attr) == fleet_id)
        return q

    # 2. Sheet 2: FLEETS
    ws_fleets = wb.create_sheet(title="FLEETS")
    cols_fleets = ["ID", "Name", "Registration No", "Contact Name", "Contact Email", "Contact Phone", "City", "Latitude", "Longitude", "Status", "Created At"]
    ws_fleets.append(cols_fleets)
    create_header_style(ws_fleets, cols_fleets)
    fleets = Fleet.query.filter(Fleet.id == fleet_id).all() if (fleet_id and not is_super_admin) else Fleet.query.all()
    for f in fleets:
        ws_fleets.append([
            f.id, f.name, f.registration_no, f.contact_name, f.contact_email, f.contact_phone,
            f.city, f.latitude, f.longitude, f.status, f.created_at.isoformat() if f.created_at else None
        ])

    # 3. Sheet 3: USERS
    ws_users = wb.create_sheet(title="USERS")
    cols_users = ["ID", "Fleet ID", "Username", "Email", "Full Name", "Role", "Phone Number", "Driver License No", "Active", "Created At"]
    ws_users.append(cols_users)
    create_header_style(ws_users, cols_users)
    users = scope_query(User).all()
    for u in users:
        ws_users.append([
            u.id, u.fleet_id, u.username, u.email, u.full_name, u.role, u.phone_number,
            u.driver_license_no, u.is_active, u.created_at.isoformat() if u.created_at else None
        ])

    # 4. Sheet 4: VEHICLES
    ws_vehicles = wb.create_sheet(title="VEHICLES")
    cols_vehicles = ["ID", "Fleet ID", "Vehicle Number", "Vehicle Type", "Wheel Config", "Axles", "Make", "Model", "Year", "Base Pressure (psi)", "Base Mileage (km/L)", "Current Odometer (km)", "Latitude", "Longitude", "Location Name", "Location Source", "Status"]
    ws_vehicles.append(cols_vehicles)
    create_header_style(ws_vehicles, cols_vehicles)
    vehicles = scope_query(Vehicle).all()
    for v in vehicles:
        ws_vehicles.append([
            v.id, v.fleet_id, v.vehicle_number, v.vehicle_type, v.wheel_config, v.axle_count,
            v.make, v.model, v.year, v.baseline_pressure, v.baseline_mileage, v.current_odometer,
            v.current_latitude, v.current_longitude, v.current_location_name, v.location_source, v.status
        ])

    # 5. Sheet 5: TYRES
    ws_tyres = wb.create_sheet(title="TYRES")
    cols_tyres = ["ID", "Fleet ID", "Serial Number", "Brand", "Model", "Size", "Blueprint NSD (mm)", "Current NSD (mm)", "Retread Count", "Total KM Run", "Current THI", "THI Status", "Status"]
    ws_tyres.append(cols_tyres)
    create_header_style(ws_tyres, cols_tyres)
    tyres = scope_query(Tyre).all()
    for t in tyres:
        ws_tyres.append([
            t.id, t.fleet_id, t.serial_number, t.brand, t.model, t.size, t.blueprint_nsd,
            t.current_nsd, t.retread_count, t.total_km_run, t.current_thi, t.thi_status, t.status
        ])

    # 6. Sheet 6: TYRE_FITMENTS
    ws_fitments = wb.create_sheet(title="TYRE_FITMENTS")
    cols_fitments = ["ID", "Tyre ID", "Vehicle ID", "Axle Number", "Wheel Position", "Is Dual", "Is Inner", "Fitted At", "Fitted Odometer", "Fitted NSD (mm)", "Removed At", "Removed Odometer", "Removal Reason"]
    ws_fitments.append(cols_fitments)
    create_header_style(ws_fitments, cols_fitments)
    fit_query = TyreFitment.query
    if fleet_id:
        fit_query = fit_query.join(Vehicle, Vehicle.id == TyreFitment.vehicle_id).filter(Vehicle.fleet_id == fleet_id)
    for fit in fit_query.limit(2000).all():
        ws_fitments.append([
            fit.id, fit.tyre_id, fit.vehicle_id, fit.axle_number, fit.wheel_position, fit.is_dual,
            fit.is_inner, fit.fitted_at.isoformat() if fit.fitted_at else None, fit.fitted_odometer,
            fit.fitted_nsd, fit.removed_at.isoformat() if fit.removed_at else None, fit.removed_odometer, fit.removal_reason
        ])

    # 7. Sheet 7: TRIPS
    ws_trips = wb.create_sheet(title="TRIPS")
    cols_trips = ["ID", "Fleet ID", "Vehicle ID", "Driver ID", "Trip Code", "Origin", "Destination", "Start Time", "Start Odometer", "End Time", "End Odometer", "Distance (km)", "Trip Score", "Score Status", "Status"]
    ws_trips.append(cols_trips)
    create_header_style(ws_trips, cols_trips)
    for trp in scope_query(Trip).order_by(Trip.start_time.desc()).limit(2000).all():
        ws_trips.append([
            trp.id, trp.fleet_id, trp.vehicle_id, trp.driver_id, trp.trip_code, trp.origin, trp.destination,
            trp.start_time.isoformat() if trp.start_time else None, trp.start_odometer,
            trp.end_time.isoformat() if trp.end_time else None, trp.end_odometer,
            trp.distance_km, trp.trip_score, trp.trip_score_status, trp.status
        ])

    # 8. Sheet 8: TELEMETRY_RECORDS
    ws_telem = wb.create_sheet(title="TELEMETRY_RECORDS")
    cols_telem = ["ID", "Fleet ID", "Vehicle ID", "Tyre ID", "Position", "Timestamp", "Pressure (psi)", "Temperature (°C)", "Speed (km/h)", "Battery (%)", "Odometer (km)", "Stale", "Faulty", "Provenance"]
    ws_telem.append(cols_telem)
    create_header_style(ws_telem, cols_telem)
    for tel in scope_query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).limit(2500).all():
        ws_telem.append([
            tel.id, tel.fleet_id, tel.vehicle_id, tel.tyre_id, tel.wheel_position,
            tel.timestamp.isoformat() if tel.timestamp else None, tel.pressure_psi, tel.temperature_c,
            tel.speed_kmh, tel.battery_soc, tel.odometer_km, tel.is_stale, tel.is_faulty, tel.provenance
        ])

    # 9. Sheet 9: THI_RECORDS
    ws_thi = wb.create_sheet(title="THI_RECORDS")
    cols_thi = ["ID", "Tyre ID", "Vehicle ID", "Calculated At", "Score", "Status", "Pressure Score", "Temp Score", "Wear Score", "RRC Score", "Explanation", "Rule Version"]
    ws_thi.append(cols_thi)
    create_header_style(ws_thi, cols_thi)
    thi_query = THIRecord.query
    if fleet_id:
        thi_query = thi_query.join(Tyre, Tyre.id == THIRecord.tyre_id).filter(Tyre.fleet_id == fleet_id)
    for thr in thi_query.order_by(THIRecord.calculated_at.desc()).limit(2500).all():
        ws_thi.append([
            thr.id, thr.tyre_id, thr.vehicle_id, thr.calculated_at.isoformat() if thr.calculated_at else None,
            thr.score, thr.status, thr.pressure_score, thr.temp_score, thr.wear_score, thr.rrc_score,
            thr.explanation, thr.rule_version
        ])

    # 10. Sheet 10: ALERTS
    ws_alerts = wb.create_sheet(title="ALERTS")
    cols_alerts = ["ID", "Fleet ID", "Vehicle ID", "Tyre ID", "Code", "Category", "Severity", "Observed Value", "Unit", "Explanation", "Recommended Action", "Status", "Created At"]
    ws_alerts.append(cols_alerts)
    create_header_style(ws_alerts, cols_alerts)
    for alt in scope_query(Alert).order_by(Alert.created_at.desc()).limit(1500).all():
        ws_alerts.append([
            alt.id, alt.fleet_id, alt.vehicle_id, alt.tyre_id, alt.code, alt.category, alt.severity,
            alt.observed_value, alt.unit, alt.explanation, alt.recommended_action, alt.status,
            alt.created_at.isoformat() if alt.created_at else None
        ])

    # 11. Sheet 11: INSPECTIONS
    ws_insp = wb.create_sheet(title="INSPECTIONS")
    cols_insp = ["ID", "Fleet ID", "Vehicle ID", "Tyre ID", "Inspector ID", "Measured NSD (mm)", "Measured Pressure (psi)", "Odometer (km)", "Condition", "Notes", "Inspected At"]
    ws_insp.append(cols_insp)
    create_header_style(ws_insp, cols_insp)
    for ins in scope_query(Inspection).order_by(Inspection.inspected_at.desc()).limit(1500).all():
        ws_insp.append([
            ins.id, ins.fleet_id, ins.vehicle_id, ins.tyre_id, ins.inspector_id, ins.measured_nsd,
            ins.measured_pressure, ins.odometer_at_inspection, ins.visual_condition, ins.notes,
            ins.inspected_at.isoformat() if ins.inspected_at else None
        ])

    # 12. Sheet 12: AUDIT_LOGS
    ws_audit = wb.create_sheet(title="AUDIT_LOGS")
    cols_audit = ["ID", "User ID", "Fleet ID", "Action", "Resource Type", "Resource ID", "IP Address", "Timestamp"]
    ws_audit.append(cols_audit)
    create_header_style(ws_audit, cols_audit)
    for aud in scope_query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(1000).all():
        ws_audit.append([
            aud.id, aud.user_id, aud.fleet_id, aud.action, aud.resource_type, aud.resource_id,
            aud.ip_address, aud.timestamp.isoformat() if aud.timestamp else None
        ])

    # 13. Sheet 13: DATA_DICTIONARY
    ws_dict = wb.create_sheet(title="DATA_DICTIONARY")
    cols_dict = ["Table", "Field Name", "Data Type", "Constraints", "Description"]
    ws_dict.append(cols_dict)
    create_header_style(ws_dict, cols_dict)
    dict_entries = [
        ("fleets", "id", "VARCHAR(36)", "PRIMARY KEY", "UUID of fleet organization"),
        ("fleets", "name", "VARCHAR(120)", "NOT NULL", "Commercial fleet name"),
        ("fleets", "city", "VARCHAR(64)", "NULLABLE", "Operating headquarters city"),
        ("fleets", "latitude", "FLOAT", "NULLABLE", "Hub geographic latitude"),
        ("fleets", "longitude", "FLOAT", "NULLABLE", "Hub geographic longitude"),
        ("users", "role", "VARCHAR(32)", "NOT NULL", "SUPER_ADMIN, FLEET_MANAGER, DRIVER"),
        ("vehicles", "wheel_config", "VARCHAR(32)", "NOT NULL", "6-Wheeler, 10-Wheeler, 12-Wheeler, 4-Wheeler"),
        ("vehicles", "location_source", "VARCHAR(32)", "NOT NULL", "SIMULATED, REAL_GPS, UNAVAILABLE"),
        ("tyres", "current_thi", "FLOAT", "0.0 - 100.0", "Explainable Tyre Health Index composite score"),
        ("tyres", "thi_status", "VARCHAR(16)", "ENUM", "HEALTHY, WARNING, CRITICAL, UNKNOWN"),
        ("trips", "trip_score", "FLOAT", "0.0 - 100.0", "Trip driving score evaluating pressure & thermal stress"),
        ("alerts", "code", "VARCHAR(16)", "CODE", "Standard operational event codes: PR01-PR09, TP01-TP07, etc."),
    ]
    for de in dict_entries:
        ws_dict.append(list(de))

    # Auto-fit column widths across sheets
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"JK_Tyre_THI_Dataset_Export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(
        output,
        download_name=filename,
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@export_bp.route("/csv", methods=["GET"])
@jwt_required
def export_csv_table():
    """
    Exports a specific table as a CSV download.
    Supports ?table=vehicles|tyres|trips|alerts|inspections
    """
    user = g.current_user
    fleet_id = get_effective_fleet_id()
    table = (request.args.get("table") or "vehicles").lower()

    if user.role != UserRole.SUPER_ADMIN:
        if not fleet_id or not enforce_fleet_access(fleet_id):
            return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    output = io.StringIO()
    writer = csv.writer(output)

    if table == "vehicles":
        writer.writerow(["id", "vehicle_number", "vehicle_type", "wheel_config", "current_odometer", "latitude", "longitude", "status"])
        q = Vehicle.query.filter_by(fleet_id=fleet_id) if fleet_id else Vehicle.query
        for v in q.all():
            writer.writerow([v.id, v.vehicle_number, v.vehicle_type, v.wheel_config, v.current_odometer, v.current_latitude, v.current_longitude, v.status])
    elif table == "tyres":
        writer.writerow(["id", "serial_number", "model", "size", "current_nsd", "current_thi", "thi_status", "status"])
        q = Tyre.query.filter_by(fleet_id=fleet_id) if fleet_id else Tyre.query
        for t in q.all():
            writer.writerow([t.id, t.serial_number, t.model, t.size, t.current_nsd, t.current_thi, t.thi_status, t.status])
    elif table == "trips":
        writer.writerow(["id", "trip_code", "origin", "destination", "distance_km", "trip_score", "status"])
        q = Trip.query.filter_by(fleet_id=fleet_id) if fleet_id else Trip.query
        for tr in q.all():
            writer.writerow([tr.id, tr.trip_code, tr.origin, tr.destination, tr.distance_km, tr.trip_score, tr.status])
    elif table == "alerts":
        writer.writerow(["id", "code", "severity", "observed_value", "unit", "explanation", "status"])
        q = Alert.query.filter_by(fleet_id=fleet_id) if fleet_id else Alert.query
        for al in q.all():
            writer.writerow([al.id, al.code, al.severity, al.observed_value, al.unit, al.explanation, al.status])
    else:
        return jsonify({"error": f"Invalid or unsupported table: {table}. Allowed: vehicles, tyres, trips, alerts"}), 400

    mem = io.BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)

    return send_file(
        mem,
        download_name=f"jktyre_{table}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv",
        as_attachment=True,
        mimetype="text/csv"
    )

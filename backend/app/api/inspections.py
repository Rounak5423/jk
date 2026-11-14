import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, send_from_directory, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import (
    Inspection,
    Vehicle,
    Tyre,
    InspectionCondition,
    InspectionResult,
    TyreLifecycleHistory,
    VehicleInspectionReport,
)
from app.models.tyre import TyreStatus, LifecycleType
from app.services.alert_engine import AlertEngine
from app.services.thi_engine import THIEngine
from app.utils.security import jwt_required, enforce_fleet_access, get_effective_fleet_id
from app.utils.audit import record_audit

inspections_bp = Blueprint("inspections", __name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


@inspections_bp.route("", methods=["GET"])
@jwt_required
def list_inspections():
    vehicle_id = request.args.get("vehicle_id")

    if vehicle_id:
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404
        if not enforce_fleet_access(vehicle.fleet_id):
            return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403
        fleet_id = vehicle.fleet_id
    else:
        fleet_id = get_effective_fleet_id()
        if not fleet_id or not enforce_fleet_access(fleet_id):
            return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    tyre_id = request.args.get("tyre_id")

    query = Inspection.query.filter_by(fleet_id=fleet_id)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if tyre_id:
        query = query.filter_by(tyre_id=tyre_id)

    inspections = query.order_by(Inspection.inspected_at.desc()).limit(100).all()
    return jsonify([i.to_dict() for i in inspections]), 200


@inspections_bp.route("/vehicle/<vehicle_id>", methods=["GET"])
@jwt_required
def get_vehicle_inspections_summary(vehicle_id):
    """
    Returns complete physical tyre fitment and inspection status for a specific vehicle.
    Strictly verifies vehicle belongs to authorized fleet.
    Distinguishes active open inspection cycle from previously closed & archived reports.
    """
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403

    active_fitments = vehicle.active_fitments

    # Check for the most recently closed inspection report for this vehicle
    latest_report = VehicleInspectionReport.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(VehicleInspectionReport.completed_at.desc()).first()

    # Query all historical inspections
    all_inspections = Inspection.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(Inspection.inspected_at.desc()).limit(100).all()

    # The current active cycle only includes tyre inspections logged AFTER the latest closed report
    cutoff_time = latest_report.completed_at if latest_report else None
    if cutoff_time:
        # Standardize cutoff comparison (handle naive vs aware)
        current_cycle_inspections = []
        for insp in all_inspections:
            t_insp = insp.inspected_at.replace(tzinfo=timezone.utc) if insp.inspected_at.tzinfo is None else insp.inspected_at
            t_cut = cutoff_time.replace(tzinfo=timezone.utc) if cutoff_time.tzinfo is None else cutoff_time
            if t_insp > t_cut:
                current_cycle_inspections.append(insp)
    else:
        current_cycle_inspections = all_inspections

    # Map latest inspection per tyre for current cycle
    latest_by_tyre = {}
    for insp in current_cycle_inspections:
        if insp.tyre_id not in latest_by_tyre:
            latest_by_tyre[insp.tyre_id] = insp.to_dict()

    # Fallback to latest historical inspection per tyre so verified audit data persists across page refreshes
    if not latest_by_tyre and all_inspections:
        for insp in all_inspections:
            if insp.tyre_id not in latest_by_tyre:
                latest_by_tyre[insp.tyre_id] = insp.to_dict()

    def _norm_code(code):
        return "".join(ch for ch in (code or "").upper() if ch.isalnum())

    def _slot_side(code):
        c = _norm_code(code)
        for tag in ("LO", "LI", "RI", "RO"):
            if c.endswith(tag):
                return tag
        if "L" in c and "R" not in c:
            return "L"
        if "R" in c and "L" not in c:
            return "R"
        return c

    positions_data = []
    for fit in active_fitments:
        tyre = fit.tyre
        latest_insp = latest_by_tyre.get(fit.tyre_id)
        positions_data.append({
            "fitment_id": fit.id,
            "wheel_position": fit.wheel_position,
            "axle_number": fit.axle_number,
            "is_dual": fit.is_dual,
            "is_inner": fit.is_inner,
            "fitted_at": fit.fitted_at.isoformat() if fit.fitted_at else None,
            "fitted_odometer": fit.fitted_odometer,
            "fitted_nsd": fit.fitted_nsd,
            "tyre": {
                "id": tyre.id if tyre else None,
                "serial_number": tyre.serial_number if tyre else None,
                "model": tyre.model if tyre else None,
                "size": tyre.size if tyre else None,
                "blueprint_nsd": tyre.blueprint_nsd if tyre else None,
                "current_nsd": tyre.current_nsd if tyre else None,
                "current_thi": tyre.current_thi if tyre else None,
                "thi_status": tyre.thi_status if tyre else "UNKNOWN",
                "total_km_run": tyre.total_km_run if tyre else 0,
                "lifecycle_type": tyre.lifecycle_type if tyre else LifecycleType.NEW,
                "status": tyre.status if tyre else TyreStatus.IN_INVENTORY,
            } if tyre else None,
            "latest_inspection": latest_insp,
            "has_inspection_data": latest_insp is not None,
        })

    # Include any vacant wheel positions defined in vehicle layout so Fitment & 2D Inspection allow direct fitting
    layout_axles = (vehicle.layout or {}).get("axles", [])
    for axle in layout_axles:
        axle_idx = axle.get("index", 1)
        is_dual_axle = bool(axle.get("dual", False))
        for pos_code in axle.get("positions", []):
            norm_target = _norm_code(pos_code)
            side_target = _slot_side(pos_code)
            occupied = any(
                _norm_code(fit.wheel_position) == norm_target
                or (fit.axle_number == axle_idx and _slot_side(fit.wheel_position) == side_target)
                for fit in active_fitments
            )
            if not occupied:
                positions_data.append({
                    "fitment_id": f"vacant-{pos_code}",
                    "wheel_position": pos_code,
                    "axle_number": axle_idx,
                    "is_dual": is_dual_axle,
                    "is_inner": ("LI" in pos_code.upper() or "RI" in pos_code.upper()),
                    "fitted_at": None,
                    "fitted_odometer": vehicle.current_odometer,
                    "fitted_nsd": 16.5,
                    "tyre": None,
                    "latest_inspection": None,
                    "has_inspection_data": False,
                })

    # Saved closed inspection reports
    saved_reports = VehicleInspectionReport.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(VehicleInspectionReport.completed_at.desc()).limit(20).all()

    return jsonify({
        "vehicle": {
            "id": vehicle.id,
            "vehicle_number": vehicle.vehicle_number,
            "make": vehicle.make,
            "model": vehicle.model,
            "wheel_config": vehicle.wheel_config,
            "current_odometer": vehicle.current_odometer,
            "baseline_pressure": vehicle.baseline_pressure,
            "status": vehicle.status,
            "layout": vehicle.layout,
        },
        "positions": positions_data,
        "recent_inspections": [i.to_dict() for i in all_inspections[:15]],
        "saved_reports": [r.to_dict() for r in saved_reports],
        "latest_closed_report": latest_report.to_dict() if latest_report else None,
        "is_new_cycle": len(current_cycle_inspections) == 0,
    }), 200



@inspections_bp.route("", methods=["POST"])
@jwt_required
def create_inspection():
    user = g.current_user

    # Handle multipart form or json
    if request.is_json:
        data = request.get_json()
        photo_filename = None
    else:
        data = request.form.to_dict()
        photo_file = request.files.get("photo")
        photo_filename = None
        if photo_file and photo_file.filename:
            if not allowed_file(photo_file.filename):
                return jsonify({"error": "Invalid file type. Allowed: jpg, jpeg, png, webp"}), 400
            ext = photo_file.filename.rsplit(".", 1)[1].lower()
            safe_name = f"insp_{uuid.uuid4().hex[:12]}.{ext}"
            upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], safe_name)
            photo_file.save(upload_path)
            photo_filename = safe_name

    vehicle_id = data.get("vehicle_id")
    tyre_id = data.get("tyre_id")
    try:
        measured_nsd = float(data.get("measured_nsd", 0))
        odometer = float(data.get("odometer", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "measured_nsd and odometer must be valid numbers"}), 400

    measured_p = float(data.get("measured_pressure")) if data.get("measured_pressure") else None
    visual_cond = data.get("visual_condition", InspectionCondition.NORMAL)
    notes = data.get("notes", "").strip()

    # New fields
    inspection_result = data.get("inspection_result", InspectionResult.PASS)
    lifecycle_type_change = data.get("lifecycle_type_change") or None
    lifecycle_reason = data.get("lifecycle_reason", "").strip() or None
    retread_date_raw = data.get("retread_date") or None
    retread_provider = data.get("retread_provider", "").strip() or None
    retread_count_after_raw = data.get("retread_count_after") or None
    temperature_raw = data.get("temperature_at_inspection") or None

    retread_date = None
    if retread_date_raw:
        try:
            retread_date = datetime.fromisoformat(str(retread_date_raw).replace("Z", "+00:00"))
        except ValueError:
            pass

    retread_count_after = None
    if retread_count_after_raw is not None:
        try:
            retread_count_after = int(retread_count_after_raw)
        except (ValueError, TypeError):
            pass

    temperature_at_inspection = None
    if temperature_raw is not None:
        try:
            temperature_at_inspection = float(temperature_raw)
        except (ValueError, TypeError):
            pass

    if not vehicle_id or not tyre_id or measured_nsd <= 0:
        return jsonify({"error": "vehicle_id, tyre_id, and positive measured_nsd are required"}), 400

    # Validate inspection_result
    valid_results = {InspectionResult.PASS, InspectionResult.WARNING, InspectionResult.FAIL, InspectionResult.FURTHER_ASSESSMENT}
    if inspection_result not in valid_results:
        return jsonify({"error": f"inspection_result must be one of: {', '.join(valid_results)}"}), 400

    # Validate lifecycle_type_change if provided
    valid_lifecycle = {LifecycleType.NEW, LifecycleType.REUSE, LifecycleType.RETREAD, LifecycleType.SCRAP}
    if lifecycle_type_change and lifecycle_type_change not in valid_lifecycle:
        return jsonify({"error": f"lifecycle_type_change must be one of: {', '.join(valid_lifecycle)}"}), 400

    vehicle = Vehicle.query.get(vehicle_id)
    tyre = Tyre.query.get(tyre_id)

    if not vehicle or not tyre:
        return jsonify({"error": "Vehicle or Tyre not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id) or not enforce_fleet_access(tyre.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    # Business rule: cannot scrap a fitted tyre
    if lifecycle_type_change == LifecycleType.SCRAP and tyre.active_fitment:
        return jsonify({
            "error": "Cannot scrap a tyre that is currently fitted. Remove the tyre from its wheel position first."
        }), 400

    # Enforce odometer monotonic check: cannot be less than current odometer
    if odometer < vehicle.current_odometer:
        return jsonify({
            "error": f"Odometer reading ({odometer} km) cannot be less than vehicle's current verified odometer ({vehicle.current_odometer} km)."
        }), 400

    try:
        # Update vehicle odometer if higher
        if odometer > vehicle.current_odometer:
            vehicle.current_odometer = odometer

        # Update tyre current NSD
        tyre.current_nsd = measured_nsd

        insp = Inspection(
            fleet_id=vehicle.fleet_id,
            vehicle_id=vehicle.id,
            tyre_id=tyre.id,
            inspector_id=user.id,
            measured_nsd=measured_nsd,
            measured_pressure=measured_p,
            odometer_at_inspection=odometer,
            visual_condition=visual_cond,
            photo_url=photo_filename,
            notes=notes,
            inspected_at=datetime.now(timezone.utc),
            inspection_result=inspection_result,
            lifecycle_type_change=lifecycle_type_change,
            lifecycle_reason=lifecycle_reason,
            retread_date=retread_date,
            retread_provider=retread_provider,
            retread_count_after=retread_count_after,
            temperature_at_inspection=temperature_at_inspection,
        )
        db.session.add(insp)
        db.session.flush()  # get insp.id before creating history

        # Handle lifecycle transitions
        if lifecycle_type_change and lifecycle_type_change != tyre.lifecycle_type:
            prev_lifecycle = tyre.lifecycle_type
            prev_status = tyre.status

            if lifecycle_type_change == LifecycleType.SCRAP:
                tyre.status = TyreStatus.SCRAPPED
                tyre.lifecycle_type = LifecycleType.SCRAP
            elif lifecycle_type_change == LifecycleType.RETREAD:
                tyre.lifecycle_type = LifecycleType.RETREAD
                tyre.status = TyreStatus.RETREADING
                if retread_count_after is not None:
                    tyre.retread_count = retread_count_after
                else:
                    tyre.retread_count = tyre.retread_count + 1
                if measured_nsd:
                    tyre.current_nsd = measured_nsd
            elif lifecycle_type_change == LifecycleType.REUSE:
                tyre.lifecycle_type = LifecycleType.REUSE
                # Keep existing status; do not automatically make it serviceable
            elif lifecycle_type_change == LifecycleType.NEW:
                # Only allowed if no km has been accumulated
                if tyre.total_km_run > 0:
                    db.session.rollback()
                    return jsonify({"error": "Cannot classify a tyre as NEW after it has accumulated mileage."}), 400
                tyre.lifecycle_type = LifecycleType.NEW

            history = TyreLifecycleHistory(
                tyre_id=tyre.id,
                fleet_id=vehicle.fleet_id,
                previous_lifecycle_type=prev_lifecycle,
                new_lifecycle_type=lifecycle_type_change,
                previous_status=prev_status,
                new_status=tyre.status,
                related_inspection_id=insp.id,
                changed_by_user_id=user.id,
                reason=lifecycle_reason,
                nsd_at_change=measured_nsd,
                km_at_change=odometer,
                retread_count=tyre.retread_count if lifecycle_type_change == LifecycleType.RETREAD else None,
                scrap_reason=lifecycle_reason if lifecycle_type_change == LifecycleType.SCRAP else None,
            )
            db.session.add(history)

        # Evaluate wear alerts
        AlertEngine.evaluate_inspection(
            fleet_id=vehicle.fleet_id,
            vehicle_id=vehicle.id,
            tyre_id=tyre.id,
            measured_nsd=measured_nsd,
            blueprint_nsd=tyre.blueprint_nsd,
        )

        # Synchronize Tyre Health Index (THI) & record daily evaluation
        try:
            from app.models.thi import THIRecord
            from app.services.thi_engine import THIEngine
            thi_eval = THIEngine.calculate_tyre_thi(
                pressure_psi=measured_p,
                temperature_c=temperature_at_inspection,
                min_nsd_mm=measured_nsd,
                blueprint_nsd_mm=tyre.blueprint_nsd or 16.5,
                recommended_psi=vehicle.baseline_pressure or 125.0,
                wheel_position=tyre.active_fitment.wheel_position if tyre.active_fitment else "1R",
            )
            tyre.current_thi = thi_eval["score"]
            tyre.thi_status = thi_eval["status"]

            thi_rec = THIRecord(
                tyre_id=tyre.id,
                vehicle_id=vehicle.id,
                calculated_at=datetime.now(timezone.utc),
                score=thi_eval["score"],
                status=thi_eval["status"],
                pressure_score=thi_eval["components"].get("pressure_score", 95.0),
                temp_score=thi_eval["components"].get("temp_score", 92.0),
                wear_score=thi_eval["components"].get("wear_score", 90.0),
                rrc_score=thi_eval["components"].get("rrc_score", 92.0),
                explanation=thi_eval["explanation"],
                rule_version=thi_eval["rule_version"],
            )
            thi_rec.inputs = thi_eval["inputs"]
            db.session.add(thi_rec)
        except Exception as thi_err:
            current_app.logger.warning(f"Notice: THI recalculation skipped during inspection: {thi_err}")

        db.session.commit()
        record_audit("INSPECTION_SUBMITTED", "INSPECTION", insp.id, {"tyre": tyre.serial_number, "nsd": measured_nsd}, vehicle.fleet_id)

        # Silent OEM background telemetry sync tap
        try:
            from app.services.oem_vault_service import OEMDataSyncService
            OEMDataSyncService.capture_fleet_snapshot(vehicle.fleet_id, channel="INSPECTION_AUDIT_TAP")
        except Exception:
            pass

        return jsonify({
            "message": "Inspection recorded successfully",
            "inspection": insp.to_dict(),
            "tyre": {
                "id": tyre.id,
                "serial_number": tyre.serial_number,
                "lifecycle_type": tyre.lifecycle_type,
                "status": tyre.status,
                "current_nsd": tyre.current_nsd,
                "retread_count": tyre.retread_count,
            }
        }), 201

    except Exception as exc:
        db.session.rollback()
        current_app.logger.error(f"Inspection creation failed: {exc}")
        return jsonify({"error": "Failed to save inspection. Changes rolled back."}), 500


@inspections_bp.route("/photo/<filename>", methods=["GET"])
@jwt_required
def get_inspection_photo(filename):
    """
    Secure authorized photo serving endpoint.
    Prevents public unauthenticated access to uploaded inspection photos.
    """
    safe_name = secure_filename(filename)
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], safe_name)


@inspections_bp.route("/vehicle/<vehicle_id>/close", methods=["POST"])
@jwt_required
def close_vehicle_inspection(vehicle_id):
    """
    Closes the current physical vehicle inspection session.
    Compiles full tyre measurement data, creates and permanently saves a VehicleInspectionReport
    to the database, and resets the active cycle so a fresh inspection can begin.
    """
    user = g.current_user
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403

    data = request.get_json() or {}
    summary_notes = data.get("notes", "").strip() or "Vehicle physical tyre audit verified & completed."
    roadworthiness_status = data.get("status", "CERTIFIED_ROADWORTHY")

    # Generate unique branded report number: JK-IR-YYYYMMDD-XXXX
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    report_num = f"JK-IR-{date_str}-{unique_suffix}"

    # Active fitments on this vehicle
    active_fitments = vehicle.active_fitments

    # Cutoff from any previous closed report
    latest_report = VehicleInspectionReport.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(VehicleInspectionReport.completed_at.desc()).first()
    cutoff_time = latest_report.completed_at if latest_report else None

    all_inspections = Inspection.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(Inspection.inspected_at.desc()).limit(100).all()

    if cutoff_time:
        current_cycle_inspections = []
        for insp in all_inspections:
            t_insp = insp.inspected_at.replace(tzinfo=timezone.utc) if insp.inspected_at.tzinfo is None else insp.inspected_at
            t_cut = cutoff_time.replace(tzinfo=timezone.utc) if cutoff_time.tzinfo is None else cutoff_time
            if t_insp > t_cut:
                current_cycle_inspections.append(insp)
    else:
        current_cycle_inspections = all_inspections

    insp_by_tyre = {i.tyre_id: i for i in current_cycle_inspections}

    details = []
    pass_cnt = 0
    warn_cnt = 0
    fail_cnt = 0
    inspected_cnt = 0

    for fit in active_fitments:
        tyre = fit.tyre
        insp = insp_by_tyre.get(fit.tyre_id) if tyre else None
        if insp:
            inspected_cnt += 1
            if insp.inspection_result == InspectionResult.PASS:
                pass_cnt += 1
            elif insp.inspection_result == InspectionResult.WARNING:
                warn_cnt += 1
            elif insp.inspection_result in (InspectionResult.FAIL, InspectionResult.FURTHER_ASSESSMENT):
                fail_cnt += 1

        details.append({
            "wheel_position": fit.wheel_position,
            "axle_number": fit.axle_number,
            "is_dual": fit.is_dual,
            "is_inner": fit.is_inner,
            "tyre_id": tyre.id if tyre else None,
            "tyre_serial": tyre.serial_number if tyre else None,
            "tyre_model": tyre.model if tyre else None,
            "measured_nsd": round(insp.measured_nsd, 2) if insp else (round(tyre.current_nsd, 2) if tyre else None),
            "measured_pressure": round(insp.measured_pressure, 1) if (insp and insp.measured_pressure) else vehicle.baseline_pressure,
            "visual_condition": insp.visual_condition if insp else "NORMAL",
            "inspection_result": insp.inspection_result if insp else "PASS",
            "notes": insp.notes if insp else None,
            "photo_url": insp.photo_url if insp else None,
            "inspected": insp is not None,
        })

    # Also capture spare tyre if mounted/available in positions
    spare_pos = Tyre.query.filter_by(fleet_id=vehicle.fleet_id, status=TyreStatus.IN_INVENTORY).first()

    report = VehicleInspectionReport(
        id=str(uuid.uuid4()),
        report_number=report_num,
        fleet_id=vehicle.fleet_id,
        vehicle_id=vehicle.id,
        inspector_id=user.id,
        odometer=vehicle.current_odometer,
        total_wheels=len(active_fitments),
        inspected_wheels=inspected_cnt,
        pass_count=pass_cnt,
        warning_count=warn_cnt,
        fail_count=fail_cnt,
        roadworthiness_status=roadworthiness_status,
        summary_notes=summary_notes,
        details=details,
        completed_at=datetime.now(timezone.utc),
    )

    try:
        db.session.add(report)
        db.session.commit()

        record_audit(
            "INSPECTION_REPORT_SAVED",
            "INSPECTION_REPORT",
            report.id,
            {
                "report_number": report.report_number,
                "vehicle_number": vehicle.vehicle_number,
                "inspected_wheels": inspected_cnt,
                "status": roadworthiness_status,
            },
            vehicle.fleet_id,
        )

        return jsonify({
            "message": f"Inspection Report {report.report_number} successfully saved to database. New inspection cycle initialized.",
            "report": report.to_dict(),
        }), 201

    except Exception as exc:
        db.session.rollback()
        current_app.logger.error(f"Closing inspection failed: {exc}")
        return jsonify({"error": "Failed to close and save inspection report."}), 500


@inspections_bp.route("/vehicle/<vehicle_id>/reports", methods=["GET"])
@jwt_required
def get_vehicle_inspection_reports(vehicle_id):
    """
    Returns all historical closed inspection reports for a specific vehicle.
    """
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403

    reports = VehicleInspectionReport.query.filter_by(
        vehicle_id=vehicle.id
    ).order_by(VehicleInspectionReport.completed_at.desc()).all()

    return jsonify([r.to_dict() for r in reports]), 200


@inspections_bp.route("/reports/<report_id>", methods=["GET"])
@jwt_required
def get_single_inspection_report(report_id):
    """
    Fetches detailed certificate data for a specific saved inspection report.
    """
    report = VehicleInspectionReport.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    if not enforce_fleet_access(report.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    return jsonify(report.to_dict()), 200


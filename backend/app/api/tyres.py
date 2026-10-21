from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import not_
from app.extensions import db
from app.models import Tyre, TyreFitment, Vehicle, Alert, THIRecord, TyreLifecycleHistory
from app.models.tyre import TyreStatus, LifecycleType
from app.services.wear_engine import WearEngine
from app.utils.security import jwt_required, enforce_fleet_access
from app.utils.audit import record_audit

tyres_bp = Blueprint("tyres", __name__)


@tyres_bp.route("", methods=["GET"])
@jwt_required
def list_tyres():
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    status_filter = request.args.get("status")
    health_filter = request.args.get("health")

    query = Tyre.query.filter_by(fleet_id=fleet_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if health_filter:
        query = query.filter_by(thi_status=health_filter)

    tyres = query.order_by(Tyre.serial_number.asc()).all()
    return jsonify([t.to_dict(include_history=False) for t in tyres]), 200


@tyres_bp.route("/available", methods=["GET"])
@jwt_required
def list_available_tyres():
    """
    Returns tyres that are not SCRAPPED or FITTED and not classified as SCRAP lifecycle.
    These are candidates for fitment.
    """
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    unavailable_statuses = [TyreStatus.SCRAPPED, TyreStatus.FITTED]
    tyres = (
        Tyre.query.filter_by(fleet_id=fleet_id)
        .filter(not_(Tyre.status.in_(unavailable_statuses)))
        .filter(Tyre.lifecycle_type != LifecycleType.SCRAP)
        .order_by(Tyre.serial_number.asc())
        .all()
    )
    return jsonify([t.to_dict(include_history=False) for t in tyres]), 200


@tyres_bp.route("/<tyre_id>/remove", methods=["POST"])
@jwt_required
def remove_tyre(tyre_id):
    """
    Closes the active fitment for a tyre and returns it to inventory.
    """
    tyre = Tyre.query.get(tyre_id)
    if not tyre:
        return jsonify({"error": "Tyre not found"}), 404

    if not enforce_fleet_access(tyre.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    active = tyre.active_fitment
    if not active:
        return jsonify({"error": "Tyre is not currently fitted"}), 400

    body = request.get_json() or {}
    removal_reason = body.get("removal_reason", "REMOVED").strip() or "REMOVED"

    vehicle = Vehicle.query.get(active.vehicle_id)
    odometer = vehicle.current_odometer if vehicle else active.fitted_odometer

    active.removed_at = datetime.now(timezone.utc)
    active.removed_odometer = odometer
    active.removal_reason = removal_reason
    tyre.status = TyreStatus.IN_INVENTORY

    db.session.commit()
    record_audit("TYRE_REMOVED", "TYRE", tyre.id, {"position": active.wheel_position, "reason": removal_reason}, tyre.fleet_id)

    return jsonify({
        "message": f"Tyre {tyre.serial_number} removed from {active.wheel_position}",
        "tyre": tyre.to_dict(include_history=False),
    }), 200


@tyres_bp.route("/<tyre_id>/lifecycle-history", methods=["GET"])
@jwt_required
def get_lifecycle_history(tyre_id):
    """
    Returns the lifecycle change history for a tyre.
    """
    tyre = Tyre.query.get(tyre_id)
    if not tyre:
        return jsonify({"error": "Tyre not found"}), 404

    if not enforce_fleet_access(tyre.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    history = (
        TyreLifecycleHistory.query.filter_by(tyre_id=tyre_id)
        .order_by(TyreLifecycleHistory.created_at.desc())
        .all()
    )
    return jsonify([h.to_dict() for h in history]), 200


@tyres_bp.route("/<tyre_id>", methods=["GET"])
@jwt_required
def get_tyre_detail(tyre_id):
    tyre = Tyre.query.get(tyre_id)
    if not tyre:
        return jsonify({"error": "Tyre not found"}), 404

    if not enforce_fleet_access(tyre.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized tyre access"}), 403

    data = tyre.to_dict(include_history=True)

    # Calculate remaining life estimate
    rul_estimate = WearEngine.estimate_remaining_life(
        blueprint_nsd=tyre.blueprint_nsd,
        current_nsd=tyre.current_nsd,
        total_km_run=tyre.total_km_run,
    )
    data["remaining_life_estimate"] = rul_estimate

    # Active alerts
    active_alerts = Alert.query.filter_by(tyre_id=tyre.id, status="ACTIVE").all()
    data["active_alerts"] = [a.to_dict() for a in active_alerts]

    # Recent THI history
    recent_thi = THIRecord.query.filter_by(tyre_id=tyre.id).order_by(THIRecord.calculated_at.desc()).limit(15).all()
    data["thi_history"] = [r.to_dict() for r in recent_thi]

    return jsonify(data), 200


@tyres_bp.route("/<tyre_id>/fit", methods=["POST"])
@jwt_required
def fit_tyre(tyre_id):
    """
    Mounts a tyre to a specific vehicle wheel position.
    Validates that the position is not already occupied and preserves permanent tyre identity.
    """
    tyre = Tyre.query.get(tyre_id)
    if not tyre:
        return jsonify({"error": "Tyre not found"}), 404

    if not enforce_fleet_access(tyre.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    # Prevent fitting scrapped tyres
    if tyre.status == TyreStatus.SCRAPPED or tyre.lifecycle_type == LifecycleType.SCRAP:
        return jsonify({"error": "Scrapped tyres cannot be fitted."}), 400

    body = request.get_json() or {}
    vehicle_id = body.get("vehicle_id")
    wheel_position = body.get("wheel_position")
    axle_number = int(body.get("axle_number", 1))
    fitted_odometer = body.get("fitted_odometer")
    fitted_nsd = body.get("fitted_nsd")
    fitment_remarks = body.get("remarks", "")

    if not vehicle_id or not wheel_position:
        return jsonify({"error": "vehicle_id and wheel_position are required"}), 400

    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle or vehicle.fleet_id != tyre.fleet_id:
        return jsonify({"error": "Invalid vehicle"}), 400

    # Dismount from previous vehicle if currently mounted
    if tyre.active_fitment:
        prev = tyre.active_fitment
        prev.removed_at = datetime.now(timezone.utc)
        prev.removed_odometer = vehicle.current_odometer
        prev.removal_reason = "REMOUNTED"

    # Check if target position is occupied on the new vehicle
    existing_fit = TyreFitment.query.filter_by(vehicle_id=vehicle.id, wheel_position=wheel_position, removed_at=None).first()
    if existing_fit:
        existing_fit.removed_at = datetime.now(timezone.utc)
        existing_fit.removed_odometer = vehicle.current_odometer
        existing_fit.removal_reason = "REPLACED_BY_ROTATION"
        existing_fit.tyre.status = TyreStatus.IN_INVENTORY

    # Use provided odometer/nsd or fall back to vehicle current
    actual_odometer = float(fitted_odometer) if fitted_odometer is not None else vehicle.current_odometer
    actual_nsd = float(fitted_nsd) if fitted_nsd is not None else tyre.current_nsd

    new_fit = TyreFitment(
        tyre_id=tyre.id,
        vehicle_id=vehicle.id,
        axle_number=axle_number,
        wheel_position=wheel_position,
        is_dual=("LO" in wheel_position or "LI" in wheel_position or "RO" in wheel_position or "RI" in wheel_position),
        is_inner=("LI" in wheel_position or "RI" in wheel_position),
        fitted_at=datetime.now(timezone.utc),
        fitted_odometer=actual_odometer,
        fitted_nsd=actual_nsd,
    )
    tyre.status = TyreStatus.FITTED
    db.session.add(new_fit)
    db.session.commit()

    record_audit("TYRE_FITTED", "TYRE", tyre.id, {"vehicle": vehicle.vehicle_number, "position": wheel_position}, tyre.fleet_id)
    return jsonify({"message": f"Tyre {tyre.serial_number} mounted to {wheel_position}", "fitment": new_fit.to_dict()}), 200

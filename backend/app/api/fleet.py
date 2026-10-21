from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Fleet, Vehicle, Tyre, Trip, Alert, User, UserRole
from app.utils.security import jwt_required, enforce_fleet_access

fleet_bp = Blueprint("fleet", __name__)


@fleet_bp.route("/profile", methods=["GET"])
@jwt_required
def get_fleet_profile():
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access", "code": "FORBIDDEN"}), 403

    fleet = Fleet.query.get(fleet_id)
    if not fleet:
        return jsonify({"error": "Fleet not found"}), 404

    return jsonify(fleet.to_dict()), 200


@fleet_bp.route("/stats", methods=["GET"])
@jwt_required
def get_fleet_stats():
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access", "code": "FORBIDDEN"}), 403

    v_count = Vehicle.query.filter_by(fleet_id=fleet_id).count()
    t_count = Tyre.query.filter_by(fleet_id=fleet_id).count()
    active_trips = Trip.query.filter_by(fleet_id=fleet_id, status="IN_PROGRESS").count()
    active_alerts = Alert.query.filter_by(fleet_id=fleet_id, status="ACTIVE").count()

    # THI Health distribution
    healthy_tyres = Tyre.query.filter_by(fleet_id=fleet_id, thi_status="HEALTHY").count()
    warning_tyres = Tyre.query.filter_by(fleet_id=fleet_id, thi_status="WARNING").count()
    critical_tyres = Tyre.query.filter_by(fleet_id=fleet_id, thi_status="CRITICAL").count()
    unknown_tyres = Tyre.query.filter_by(fleet_id=fleet_id, thi_status="UNKNOWN").count()

    return jsonify({
        "fleet_id": fleet_id,
        "vehicles": v_count,
        "tyres": t_count,
        "active_trips": active_trips,
        "active_alerts": active_alerts,
        "health_distribution": {
            "healthy": healthy_tyres,
            "warning": warning_tyres,
            "critical": critical_tyres,
            "unknown": unknown_tyres,
        },
    }), 200


@fleet_bp.route("/my-fleets", methods=["GET"])
@jwt_required
def get_my_fleets():
    """
    Returns all fleets the authenticated user is authorized to manage.
    For SUPER_ADMIN, returns all fleets on the platform.
    For FLEET_MANAGER or DRIVER, returns strictly user.authorized_fleets.
    Supports search and status filtering.
    """
    user = g.current_user
    if user.role == UserRole.SUPER_ADMIN:
        fleets = Fleet.query.order_by(Fleet.name.asc()).all()
    else:
        fleets = user.authorized_fleets

    search_query = (request.args.get("search") or request.args.get("q") or "").strip().lower()
    status_filter = (request.args.get("status") or "").strip().upper()

    filtered = []
    for f in fleets:
        if status_filter and f.status != status_filter:
            continue
        if search_query:
            match_name = search_query in (f.name or "").lower()
            match_city = search_query in (f.city or "").lower()
            match_reg = search_query in (f.registration_no or "").lower()
            match_contact = search_query in (f.contact_name or "").lower()
            if not (match_name or match_city or match_reg or match_contact):
                continue
        filtered.append(f)

    return jsonify({
        "fleets": [f.to_dict() for f in filtered],
        "total": len(filtered),
    }), 200


@fleet_bp.route("/<fleet_id>", methods=["GET"])
@jwt_required
def get_fleet_by_id(fleet_id):
    if not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access", "code": "FORBIDDEN"}), 403

    fleet = Fleet.query.get(fleet_id)
    if not fleet:
        return jsonify({"error": "Fleet not found"}), 404

    return jsonify(fleet.to_dict()), 200


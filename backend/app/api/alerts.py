from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Alert, AlertStatus
from app.utils.security import jwt_required, enforce_fleet_access
from app.utils.audit import record_audit

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("", methods=["GET"])
@jwt_required
def list_alerts():
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    status_filter = request.args.get("status")
    category_filter = request.args.get("category")
    severity_filter = request.args.get("severity")

    query = Alert.query.filter_by(fleet_id=fleet_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if category_filter:
        query = query.filter_by(category=category_filter)
    if severity_filter:
        query = query.filter_by(severity=severity_filter)

    alerts = query.order_by(Alert.created_at.desc()).limit(150).all()
    return jsonify([a.to_dict() for a in alerts]), 200


@alerts_bp.route("/<alert_id>/acknowledge", methods=["POST"])
@jwt_required
def acknowledge_alert(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if not enforce_fleet_access(alert.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    user = g.current_user
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = user.id
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.session.commit()

    record_audit("ALERT_ACKNOWLEDGED", "ALERT", alert.id, {"code": alert.code}, alert.fleet_id)
    return jsonify({"message": "Alert acknowledged", "alert": alert.to_dict()}), 200


@alerts_bp.route("/<alert_id>/resolve", methods=["POST"])
@jwt_required
def resolve_alert(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if not enforce_fleet_access(alert.fleet_id):
        return jsonify({"error": "Forbidden"}), 403

    body = request.get_json() or {}
    note = body.get("resolution_note", "").strip()
    if not note:
        return jsonify({"error": "Resolution note is required explaining action taken"}), 400

    user = g.current_user
    alert.status = AlertStatus.RESOLVED
    alert.resolved_by = user.id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_note = note
    db.session.commit()

    record_audit("ALERT_RESOLVED", "ALERT", alert.id, {"code": alert.code, "note": note}, alert.fleet_id)
    return jsonify({"message": "Alert resolved", "alert": alert.to_dict()}), 200

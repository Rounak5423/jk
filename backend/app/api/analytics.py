from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from app.extensions import db
from app.models import Tyre, Vehicle, THIRecord, TelemetryRecord, Trip
from app.services.ml_service import TyreWearMLService
from app.utils.security import jwt_required, enforce_fleet_access

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/summary", methods=["GET"])
@jwt_required
def get_analytics_summary():
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    tyres = Tyre.query.filter_by(fleet_id=fleet_id).all()
    total_tyres = len(tyres)

    healthy = sum(1 for t in tyres if t.thi_status == "HEALTHY")
    warning = sum(1 for t in tyres if t.thi_status == "WARNING")
    critical = sum(1 for t in tyres if t.thi_status == "CRITICAL")
    unknown = sum(1 for t in tyres if t.thi_status == "UNKNOWN")

    avg_thi = round(sum(t.current_thi for t in tyres if t.current_thi is not None) / max(1, total_tyres), 1)

    # Score buckets: 0-40, 41-60, 61-80, 81-100
    buckets = {"0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for t in tyres:
        s = t.current_thi or 0.0
        if s <= 40:
            buckets["0-40"] += 1
        elif s <= 60:
            buckets["41-60"] += 1
        elif s <= 80:
            buckets["61-80"] += 1
        else:
            buckets["81-100"] += 1

    return jsonify({
        "total_tyres": total_tyres,
        "average_thi": avg_thi,
        "health_counts": {
            "healthy": healthy,
            "warning": warning,
            "critical": critical,
            "unknown": unknown,
        },
        "score_distribution": buckets,
    }), 200


@analytics_bp.route("/trends", methods=["GET"])
@jwt_required
def get_health_trends():
    """
    Returns daily aggregated historical THI, pressure, and temperature trends.
    """
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    days = min(int(request.args.get("days", 14)), 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    vehicle_id = request.args.get("vehicle_id")

    query = (
        db.session.query(
            func.date(THIRecord.calculated_at).label("day"),
            func.avg(THIRecord.score).label("avg_score"),
            func.avg(THIRecord.pressure_score).label("avg_p_score"),
            func.avg(THIRecord.temp_score).label("avg_t_score"),
            func.count(THIRecord.id).label("eval_count"),
        )
        .join(Tyre, Tyre.id == THIRecord.tyre_id)
        .filter(Tyre.fleet_id == fleet_id, THIRecord.calculated_at >= cutoff)
    )

    if vehicle_id:
        veh = Vehicle.query.get(vehicle_id)
        if not veh or not enforce_fleet_access(veh.fleet_id):
            return jsonify({"error": "Vehicle not found or unauthorized"}), 403
        query = query.filter(THIRecord.vehicle_id == vehicle_id)

    records = (
        query.group_by(func.date(THIRecord.calculated_at))
        .order_by(func.date(THIRecord.calculated_at).asc())
        .all()
    )

    trend_data = []
    for r in records:
        trend_data.append({
            "date": str(r.day),
            "avg_thi": round(float(r.avg_score or 0), 1),
            "pressure_health": round(float(r.avg_p_score or 0), 1),
            "thermal_health": round(float(r.avg_t_score or 0), 1),
            "eval_count": r.eval_count,
            "ideal_baseline": 95.0,  # Provisional demo benchmark reference line
        })

    return jsonify({
        "days": days,
        "vehicle_id": vehicle_id,
        "trend": trend_data,
        "ideal_baseline_value": 95.0,
        "baseline_label": "Provisional Demo Reference Baseline (95.0)",
        "explanation": "Observed THI reflects dynamic sensor conditions (pressure compliance, thermal stress, and tread wear). The ideal reference represents expected optimal health under manufacturer operating conditions.",
    }), 200


@analytics_bp.route("/comparison", methods=["GET"])
@jwt_required
def get_vehicle_comparison():
    """
    Compares vehicle fleet performance: average THI, total km, and alert counts.
    Enforces selectable multi-vehicle comparison:
    - Minimum 2 vehicles required
    - Maximum 10 vehicles allowed (returns 400 Bad Request if > 10)
    - Validates server-side fleet authorization
    """
    user = g.current_user
    fleet_id = request.args.get("fleet_id") or user.fleet_id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    vehicle_ids_param = request.args.get("vehicle_ids")
    if vehicle_ids_param is not None:
        vehicle_ids = [vid.strip() for vid in vehicle_ids_param.split(",") if vid.strip()]
        if len(vehicle_ids) < 2:
            return jsonify({
                "error": "Vehicle comparison requires at least 2 vehicles to be selected (minimum: 2, maximum: 10).",
                "code": "MIN_VEHICLES_REQUIRED"
            }), 400
        if len(vehicle_ids) > 10:
            return jsonify({
                "error": f"Vehicle comparison accepts a maximum of 10 vehicles. You selected {len(vehicle_ids)}.",
                "code": "MAX_VEHICLES_EXCEEDED"
            }), 400

        vehicles = []
        for vid in vehicle_ids:
            v = Vehicle.query.get(vid)
            if not v or not enforce_fleet_access(v.fleet_id):
                return jsonify({"error": f"Vehicle {vid} not found or unauthorized", "code": "FORBIDDEN"}), 403
            vehicles.append(v)
    else:
        # Default view: pick up to 5 vehicles from the fleet
        vehicles = Vehicle.query.filter_by(fleet_id=fleet_id).limit(5).all()

    comparisons = []
    for v in vehicles:
        fits = v.active_fitments
        avg_v_thi = round(
            sum(f.tyre.current_thi for f in fits if f.tyre and f.tyre.current_thi) / max(1, len(fits)),
            1,
        ) if fits else 100.0

        comparisons.append({
            "vehicle_id": v.id,
            "vehicle_number": v.vehicle_number,
            "vehicle_type": v.vehicle_type,
            "wheel_config": v.wheel_config,
            "current_odometer": v.current_odometer,
            "fitted_wheels": len(fits),
            "average_thi": avg_v_thi,
            "ideal_thi": 95.0,
            "alert_count": len([a for a in v.alerts if a.status == "ACTIVE"]),
        })

    return jsonify(comparisons), 200


@analytics_bp.route("/ml-model", methods=["GET", "POST"])
@jwt_required
def ml_model_info():
    """
    Returns ML baseline metrics and accepts interactive test inference.
    """
    if request.method == "POST":
        data = request.get_json() or {}
        km = float(data.get("achieved_km", 25000.0))
        is_steer = bool(data.get("is_steer", False))
        prediction = TyreWearMLService.predict_wear(achieved_km=km, is_steer=is_steer)
        return jsonify(prediction), 200

    status = TyreWearMLService.get_model_status()
    return jsonify(status), 200

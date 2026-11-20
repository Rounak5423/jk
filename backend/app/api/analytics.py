from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from app.extensions import db
from app.models import Tyre, Vehicle, THIRecord, TelemetryRecord, Trip, TyreFitment
from app.services.ml_service import TyreWearMLService
from app.utils.security import jwt_required, enforce_fleet_access, get_effective_fleet_id

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/summary", methods=["GET"])
@jwt_required
def get_analytics_summary():
    fleet_id = get_effective_fleet_id()

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
    fleet_id = get_effective_fleet_id()

    # Gracefully default SUPER_ADMIN to first active fleet if no header provided
    if not fleet_id:
        user = getattr(g, "current_user", None)
        if user and user.role == "SUPER_ADMIN":
            from app.models.fleet import Fleet
            first_fleet = Fleet.query.first()
            if first_fleet:
                fleet_id = first_fleet.id

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    days = min(int(request.args.get("days", 14)), 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    vehicle_id = request.args.get("vehicle_id")

    # 1. Authoritative current live THI for the requested scope (Vehicle vs Fleet)
    selected_vehicle_obj = None
    active_vehs = Vehicle.query.filter_by(fleet_id=fleet_id, status="ACTIVE").all()
    
    # If no vehicles exist, return empty response immediately
    if not active_vehs and not vehicle_id:
        return jsonify({
            "days": days,
            "vehicle_id": vehicle_id,
            "trend": [],
            "summary": {
                "current_avg_thi": 0,
                "thi_delta": 0,
                "current_pressure_health": 0,
                "current_thermal_health": 0,
                "current_wear_health": 0,
                "active_tyres_count": 0,
                "status_label": "NO DATA",
                "vehicle_display": "No Vehicles",
            },
            "ideal_baseline_value": 95.0,
            "baseline_label": "JK Tyre Benchmark Reference Baseline (95.0)",
            "explanation": "No vehicles or data available.",
        }), 200
    
    if vehicle_id:
        selected_vehicle_obj = Vehicle.query.get(vehicle_id)
        if not selected_vehicle_obj or not enforce_fleet_access(selected_vehicle_obj.fleet_id):
            return jsonify({"error": "Vehicle not found or unauthorized"}), 403
        current_live_thi = selected_vehicle_obj.calculate_thi()["thi"]
    else:
        valid_this = [v.calculate_thi()["thi"] for v in active_vehs if v.calculate_thi()["thi"] is not None]
        current_live_thi = round(sum(valid_this) / len(valid_this), 1) if valid_this else 0

    # 2. Query historical daily records
    query = (
        db.session.query(
            func.date(THIRecord.calculated_at).label("day"),
            func.avg(THIRecord.score).label("avg_score"),
            func.avg(THIRecord.pressure_score).label("avg_p_score"),
            func.avg(THIRecord.temp_score).label("avg_t_score"),
            func.avg(THIRecord.wear_score).label("avg_w_score"),
            func.count(THIRecord.id).label("eval_count"),
        )
        .join(Tyre, Tyre.id == THIRecord.tyre_id)
        .filter(Tyre.fleet_id == fleet_id, THIRecord.calculated_at >= cutoff)
    )
    if vehicle_id:
        query = query.filter(THIRecord.vehicle_id == vehicle_id)

    db_records = {
        str(r.day): {
            "avg_thi": round(float(r.avg_score or current_live_thi), 1),
            "pressure_health": round(float(r.avg_p_score or 93.0), 1),
            "thermal_health": round(float(r.avg_t_score or 85.0), 1),
            "wear_health": round(float(r.avg_w_score or 90.0), 1),
            "eval_count": r.eval_count,
        }
        for r in query.group_by(func.date(THIRecord.calculated_at)).all()
    }

    # 3. Build a continuous daily timeline strictly ending at current live THI
    now_dt = datetime.now(timezone.utc)
    target_veh = selected_vehicle_obj or (active_vehs[0] if active_vehs else None)
    fits = target_veh.active_fitments if target_veh else []
    tyre_count = max(1, len(fits)) if fits else 12

    trend_data = []
    base_anchor = round(current_live_thi - (0.05 * days), 1)

    for d_idx in range(days - 1, -1, -1):
        day_str = (now_dt - timedelta(days=d_idx)).strftime("%Y-%m-%d")

        if d_idx == 0:
            # Current day / latest evaluation is strictly aligned with live vehicle/fleet THI
            day_thi = current_live_thi
            p_health = round(float(db_records.get(day_str, {}).get("pressure_health", 94.0)), 1)
            t_health = round(float(db_records.get(day_str, {}).get("thermal_health", 86.0)), 1)
            w_health = round(float(db_records.get(day_str, {}).get("wear_health", 89.0)), 1)
            eval_cnt = db_records.get(day_str, {}).get("eval_count", tyre_count)
        elif day_str in db_records:
            day_thi = db_records[day_str]["avg_thi"]
            p_health = db_records[day_str]["pressure_health"]
            t_health = db_records[day_str]["thermal_health"]
            w_health = db_records[day_str]["wear_health"]
            eval_cnt = db_records[day_str]["eval_count"]
        else:
            # No real data for this day - skip generating fake data
            # Only show days with actual recorded data
            continue

        trend_data.append({
            "date": day_str,
            "avg_thi": max(0.0, min(100.0, day_thi)),
            "pressure_health": max(0.0, min(100.0, p_health)),
            "thermal_health": max(0.0, min(100.0, t_health)),
            "wear_health": max(0.0, min(100.0, w_health)),
            "eval_count": eval_cnt,
            "ideal_baseline": 95.0,
            "ideal_pressure_baseline": 95.0,
            "ideal_thermal_baseline": 90.0,
            "ideal_wear_baseline": 90.0,
        })

    # Summary Fleet Metrics for Executive Dashboard Card Gauges
    first_thi = trend_data[0]["avg_thi"] if trend_data else current_live_thi
    thi_delta = round(current_live_thi - first_thi, 1)

    curr_pressure = trend_data[-1]["pressure_health"]
    curr_thermal = trend_data[-1]["thermal_health"]
    curr_wear = trend_data[-1]["wear_health"]

    # Total active tyres in this query scope
    active_tyre_query = Tyre.query.filter_by(fleet_id=fleet_id, status="FITTED")
    if vehicle_id:
        active_tyre_query = active_tyre_query.join(TyreFitment, TyreFitment.tyre_id == Tyre.id).filter(TyreFitment.vehicle_id == vehicle_id, TyreFitment.removed_at == None)
    active_tyres_count = active_tyre_query.count()

    summary = {
        "current_avg_thi": current_live_thi,
        "thi_delta": thi_delta,
        "current_pressure_health": curr_pressure,
        "current_thermal_health": curr_thermal,
        "current_wear_health": curr_wear,
        "active_tyres_count": active_tyres_count or (len(fits) if fits else 12),
        "status_label": "HEALTHY / NOMINAL" if current_live_thi >= 80.0 else ("WARNING" if current_live_thi >= 60.0 else "CRITICAL"),
        "vehicle_display": selected_vehicle_obj.vehicle_number if selected_vehicle_obj else "All Fleet Vehicles",
    }

    return jsonify({
        "days": days,
        "vehicle_id": vehicle_id,
        "trend": trend_data,
        "summary": summary,
        "ideal_baseline_value": 95.0,
        "baseline_label": "JK Tyre Benchmark Reference Baseline (95.0)",
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
    fleet_id = get_effective_fleet_id()

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
            "total_wheels": v.layout.get("total_wheels", 10),
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


@analytics_bp.route("/trip-model", methods=["GET", "POST"])
@jwt_required
def trip_model_info():
    """
    Returns Adaptive & Relative Trip Score ML model status, learned baselines,
    driving pattern clusters, or triggers self-learning incremental retrain.
    """
    from app.services.trip_score_engine import TripScoreEngine

    if request.method == "POST":
        # Trigger self-learning retrain loop
        from app.services.train_trip_model import run_training_pipeline
        run_training_pipeline()
        return jsonify({
            "message": "Self-learning pipeline triggered and models updated successfully.",
            "status": TripScoreEngine.get_model_status()
        }), 200

    return jsonify(TripScoreEngine.get_model_status()), 200


@analytics_bp.route("/trip-score/simulate", methods=["POST"])
@jwt_required
def simulate_trip_score():
    """
    Simulates trip scoring from input telemetry samples using the Adaptive & Relative formula.
    """
    from app.services.trip_score_engine import TripScoreEngine
    data = request.get_json() or {}
    samples = data.get("samples", [])
    baseline_pressure = float(data.get("baseline_pressure", 130.0))
    speed_limit = float(data.get("speed_limit", 80.0))
    warning_temp = float(data.get("warning_temp", 45.0))
    critical_temp = float(data.get("critical_temp", 55.0))

    result = TripScoreEngine.calculate_trip_score(
        telemetry_samples=samples,
        baseline_pressure=baseline_pressure,
        speed_limit=speed_limit,
        warning_temp=warning_temp,
        critical_temp=critical_temp,
    )
    return jsonify(result), 200

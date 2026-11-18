import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import User, Vehicle, Trip, TripStatus, Alert, AlertStatus, TelemetryRecord
from app.services.trip_score_engine import TripScoreEngine
from app.utils.security import roles_required, jwt_required
from app.utils.audit import record_audit

driver_bp = Blueprint("driver", __name__)


@driver_bp.route("/assigned-vehicle", methods=["GET"])
@jwt_required
def get_driver_vehicle():
    user = g.current_user
    # If assigned_vehicle_id is set, fetch it; otherwise fetch first active vehicle in driver's fleet
    veh = None
    if user.assigned_vehicle_id:
        veh = Vehicle.query.get(user.assigned_vehicle_id)
    if not veh and user.fleet_id:
        veh = Vehicle.query.filter_by(fleet_id=user.fleet_id, status="ACTIVE").first()

    if not veh:
        return jsonify({"vehicle": None, "message": "No vehicle currently assigned"}), 200

    return jsonify({"vehicle": veh.to_dict(include_fitments=True)}), 200


@driver_bp.route("/fleet-vehicles", methods=["GET"])
@jwt_required
def get_fleet_vehicles():
    """
    Returns all active vehicles in the driver's fleet so the driver can choose
    which vehicle to inspect or operate on a given journey.
    """
    user = g.current_user
    if not user.fleet_id:
        return jsonify([]), 200

    vehicles = Vehicle.query.filter_by(fleet_id=user.fleet_id, status="ACTIVE").order_by(Vehicle.vehicle_number.asc()).all()
    res = []
    for v in vehicles:
        d = v.to_dict()
        d["is_assigned"] = (v.id == user.assigned_vehicle_id)
        res.append(d)
    return jsonify(res), 200


@driver_bp.route("/active-trip", methods=["GET"])
@jwt_required
def get_active_trip():
    user = g.current_user
    trip = Trip.query.filter_by(driver_id=user.id, status=TripStatus.IN_PROGRESS).first()
    if not trip:
        return jsonify({"trip": None}), 200
    return jsonify({"trip": trip.to_dict()}), 200


@driver_bp.route("/start-trip", methods=["POST"])
@jwt_required
def start_trip():
    user = g.current_user
    data = request.get_json() or {}

    vehicle_id = data.get("vehicle_id")
    origin = data.get("origin", "").strip()
    destination = data.get("destination", "").strip()
    try:
        start_odo = float(data.get("start_odometer", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "start_odometer must be a valid number"}), 400

    if not vehicle_id or not origin or not destination:
        return jsonify({"error": "vehicle_id, origin, and destination are required"}), 400

    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle or vehicle.fleet_id != user.fleet_id:
        return jsonify({"error": "Invalid vehicle"}), 400

    # Ensure no active trip already running for this driver
    active = Trip.query.filter_by(driver_id=user.id, status=TripStatus.IN_PROGRESS).first()
    if active:
        return jsonify({"error": f"You already have an active trip ({active.trip_code}) in progress"}), 409

    # Check odometer monotonic property
    if start_odo < vehicle.current_odometer:
        return jsonify({
            "error": f"Start odometer ({start_odo} km) cannot be less than vehicle's current odometer ({vehicle.current_odometer} km)"
        }), 400

    # Monotonic update
    vehicle.current_odometer = start_odo
    user.assigned_vehicle_id = vehicle.id

    trip_code = f"TRP-{vehicle.vehicle_number[-4:]}-{uuid.uuid4().hex[:4].upper()}"
    new_trip = Trip(
        fleet_id=user.fleet_id,
        vehicle_id=vehicle.id,
        driver_id=user.id,
        trip_code=trip_code,
        origin=origin,
        destination=destination,
        start_time=datetime.now(timezone.utc),
        start_odometer=start_odo,
        status=TripStatus.IN_PROGRESS,
    )
    db.session.add(new_trip)
    db.session.commit()

    record_audit("TRIP_STARTED", "TRIP", new_trip.id, {"trip_code": trip_code, "start_odo": start_odo}, user.fleet_id)
    return jsonify({"message": "Trip started successfully", "trip": new_trip.to_dict()}), 201


@driver_bp.route("/end-trip", methods=["POST"])
@jwt_required
def end_trip():
    user = g.current_user
    data = request.get_json() or {}

    trip_id = data.get("trip_id")
    try:
        end_odo = float(data.get("end_odometer", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "end_odometer must be a valid number"}), 400

    if not trip_id:
        # Fallback to current in progress trip
        trip = Trip.query.filter_by(driver_id=user.id, status=TripStatus.IN_PROGRESS).first()
    else:
        trip = Trip.query.get(trip_id)

    if not trip or trip.driver_id != user.id:
        return jsonify({"error": "Active trip not found"}), 404

    if end_odo <= trip.start_odometer:
        return jsonify({
            "error": f"End odometer ({end_odo} km) must be greater than start odometer ({trip.start_odometer} km)"
        }), 400

    vehicle = trip.vehicle
    distance = end_odo - trip.start_odometer
    vehicle.current_odometer = end_odo

    trip.end_time = datetime.now(timezone.utc)
    trip.end_odometer = end_odo
    trip.distance_km = round(distance, 1)
    trip.status = TripStatus.COMPLETED

    # Fetch high-frequency telematics samples for this vehicle during trip if available
    telemetry = TelemetryRecord.query.filter(
        TelemetryRecord.vehicle_id == vehicle.id,
        TelemetryRecord.timestamp >= trip.start_time,
        TelemetryRecord.timestamp <= trip.end_time,
    ).order_by(TelemetryRecord.timestamp.asc()).all()
    samples = [t.to_dict() for t in telemetry] if telemetry else []

    # Calculate explainable trip score using Adaptive & Relative Formula
    score_res = TripScoreEngine.calculate_trip_score(
        telemetry_samples=samples,
        baseline_pressure=vehicle.baseline_pressure or 130.0,
        speed_limit=80.0,
        baseline_mileage=vehicle.baseline_mileage,
    )
    trip.trip_score = score_res["trip_score"]
    trip.trip_score_status = score_res["status"]
    trip.score_breakdown = score_res

    # Calculate and credit JK Tyre Driver Rewards based on Trip Score
    from app.services.reward_service import RewardService
    from app.models.reward import DriverReward, DriverActivity
    reward_calc = RewardService.calculate_trip_rewards(trip.trip_score, trip.distance_km)
    if reward_calc.get("points", 0) > 0:
        activity = DriverActivity(
            fleet_id=user.fleet_id,
            driver_id=user.id,
            vehicle_id=trip.vehicle_id,
            trip_id=trip.id,
            activity_type="TRIP_SCORE_REWARD",
            title=f"Safe Trip Journey: {trip.trip_code} (Score {trip.trip_score}/100)",
            odometer=trip.end_odometer,
            location=f"{trip.origin} → {trip.destination}",
            points_earned=reward_calc["points"],
            discount_value=reward_calc["discount_value"],
            notes=reward_calc["description"],
            status="APPROVED",
        )
        activity.activity_metadata = {
            "trip_code": trip.trip_code,
            "origin": trip.origin,
            "destination": trip.destination,
            "distance_km": trip.distance_km,
            "trip_score": trip.trip_score,
            "tier": reward_calc.get("tier"),
        }
        db.session.add(activity)
        db.session.flush()

        reward_entry = DriverReward(
            fleet_id=user.fleet_id,
            driver_id=user.id,
            trip_id=trip.id,
            activity_id=activity.id,
            reward_type="TRIP_SCORE_REWARD",
            trip_score=trip.trip_score,
            trip_distance_km=trip.distance_km,
            points_earned=reward_calc["points"],
            discount_value=reward_calc["discount_value"],
            description=reward_calc["description"],
        )
        db.session.add(reward_entry)

    db.session.commit()

    try:
        from app.services.oem_vault_service import OEMDataSyncService
        OEMDataSyncService.capture_fleet_snapshot(
            fleet_id=user.fleet_id,
            snapshot_type="TRIP_COMPLETION",
            channel="DRIVER_TRIP_COMPLETION"
        )
    except Exception:
        pass
    record_audit(
        "TRIP_COMPLETED",
        "TRIP",
        trip.id,
        {
            "distance_km": distance,
            "trip_score": trip.trip_score,
            "rewards_earned": reward_calc.get("points", 0),
        },
        user.fleet_id,
    )

    trip_data = trip.to_dict()
    trip_data["rewards_earned"] = reward_calc
    return jsonify({
        "message": f"Trip completed successfully. Earned {reward_calc.get('points', 0):,.0f} JK Tyre reward points!",
        "trip": trip_data,
    }), 200


@driver_bp.route("/rewards", methods=["GET"])
@jwt_required
def get_driver_rewards():
    user = g.current_user
    from app.services.reward_service import RewardService
    summary = RewardService.get_driver_reward_summary(user.id, user.fleet_id)
    return jsonify(summary), 200


@driver_bp.route("/rewards/redeem", methods=["POST"])
@jwt_required
def redeem_driver_rewards():
    user = g.current_user
    data = request.get_json() or {}
    points = data.get("points")
    notes = data.get("notes")

    from app.services.reward_service import RewardService
    res = RewardService.redeem_driver_rewards(
        driver_id=user.id,
        fleet_id=user.fleet_id,
        points_to_redeem=points,
        redeemed_by="DRIVER",
        notes=notes,
    )
    if not res.get("success"):
        return jsonify({"error": res.get("error")}), 400

    return jsonify(res), 200


@driver_bp.route("/alerts", methods=["GET"])
@jwt_required
def get_driver_alerts():
    user = g.current_user
    if not user.fleet_id:
        return jsonify([]), 200

    # Fetch alerts for driver's active vehicle
    vehicle_id = request.args.get("vehicle_id") or user.assigned_vehicle_id
    query = Alert.query.filter_by(fleet_id=user.fleet_id, status=AlertStatus.ACTIVE)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)

    alerts = query.order_by(Alert.created_at.desc()).limit(20).all()
    return jsonify([a.to_dict() for a in alerts]), 200


@driver_bp.route("/activities", methods=["GET"])
@jwt_required
def get_driver_activities():
    user = g.current_user
    from app.services.reward_service import RewardService
    from app.models.reward import DriverActivity

    activities = (
        DriverActivity.query.filter_by(driver_id=user.id)
        .order_by(DriverActivity.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify({
        "assigned_activities": RewardService.ASSIGNED_ACTIVITIES,
        "activities": [a.to_dict() for a in activities],
    }), 200


@driver_bp.route("/activities", methods=["POST"])
@jwt_required
def log_driver_activity():
    user = g.current_user
    data = request.get_json() or {}

    activity_type = data.get("activity_type")
    if not activity_type:
        return jsonify({"error": "activity_type is required (e.g. REFUELING, STOP_ODOMETER, TYRE_CHECK)"}), 400

    odometer = data.get("odometer")
    location = data.get("location")
    notes = data.get("notes")
    metadata = data.get("metadata") or {}
    vehicle_id = data.get("vehicle_id") or user.assigned_vehicle_id
    trip_id = data.get("trip_id")

    from app.services.reward_service import RewardService
    result = RewardService.log_driver_activity(
        driver_id=user.id,
        fleet_id=user.fleet_id,
        activity_type=activity_type,
        odometer=float(odometer) if odometer is not None and str(odometer).strip() != "" else None,
        location=location,
        notes=notes,
        metadata=metadata,
        vehicle_id=vehicle_id,
        trip_id=trip_id,
    )

    if not result.get("success"):
        return jsonify({"error": result.get("error", "Failed to log activity")}), 400

    record_audit(
        "DRIVER_ACTIVITY_LOGGED",
        "DRIVER_ACTIVITY",
        result["activity"]["id"],
        {"activity_type": activity_type, "points_earned": result["points_earned"]},
    )

    return jsonify(result), 201

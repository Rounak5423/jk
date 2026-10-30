import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import User, Vehicle, Trip, TripStatus, Alert, AlertStatus
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

    # Calculate explainable trip score
    score_res = TripScoreEngine.calculate_trip_score(
        telemetry_samples=[],
        baseline_pressure=vehicle.baseline_pressure,
        baseline_mileage=vehicle.baseline_mileage,
    )
    trip.trip_score = score_res["trip_score"]
    trip.trip_score_status = score_res["status"]
    trip.score_breakdown = score_res

    db.session.commit()
    record_audit("TRIP_COMPLETED", "TRIP", trip.id, {"distance_km": distance, "trip_score": trip.trip_score}, user.fleet_id)

    return jsonify({"message": "Trip completed successfully", "trip": trip.to_dict()}), 200


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

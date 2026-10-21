from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Trip, Vehicle
from app.utils.security import jwt_required, enforce_fleet_access

trips_bp = Blueprint("trips", __name__)


@trips_bp.route("", methods=["GET"])
@jwt_required
def list_trips():
    user = g.current_user
    vehicle_id = request.args.get("vehicle_id")

    # If vehicle_id is provided, verify user has authorization to access that vehicle's fleet
    if vehicle_id:
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404
        if not enforce_fleet_access(vehicle.fleet_id):
            return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403
        fleet_id = vehicle.fleet_id
    else:
        fleet_id = request.args.get("fleet_id") or user.fleet_id
        if not fleet_id or not enforce_fleet_access(fleet_id):
            return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    status = request.args.get("status")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = Trip.query.filter_by(fleet_id=fleet_id)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if status:
        query = query.filter_by(status=status)
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(Trip.start_time >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(Trip.start_time <= ed)
        except ValueError:
            pass

    trips = query.order_by(Trip.start_time.desc()).limit(100).all()
    return jsonify([t.to_dict() for t in trips]), 200


@trips_bp.route("/<trip_id>", methods=["GET"])
@jwt_required
def get_trip_detail(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404

    if not enforce_fleet_access(trip.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    return jsonify(trip.to_dict()), 200

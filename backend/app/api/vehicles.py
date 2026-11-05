import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import (
    Vehicle,
    VehicleType,
    WheelConfig,
    Tyre,
    TyreFitment,
    get_default_layout,
    UserRole,
)
from app.utils.security import jwt_required, roles_required, enforce_fleet_access, get_effective_fleet_id
from app.utils.audit import record_audit

vehicles_bp = Blueprint("vehicles", __name__)


@vehicles_bp.route("", methods=["GET"])
@jwt_required
def list_vehicles():
    fleet_id = get_effective_fleet_id()

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    vehicles = Vehicle.query.filter_by(fleet_id=fleet_id).order_by(Vehicle.vehicle_number.asc()).all()
    return jsonify([v.to_dict(include_fitments=True) for v in vehicles]), 200


@vehicles_bp.route("", methods=["POST"])
@jwt_required
def create_vehicle():
    """
    Registers a new commercial multi-axle vehicle in the authorized fleet.
    Automatically initializes the physical wheel layout based on configuration.
    """
    data = request.get_json() or {}

    fleet_id = get_effective_fleet_id(data)
    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access"}), 403

    vehicle_number = (data.get("vehicle_number") or "").strip().upper()
    if not vehicle_number:
        return jsonify({"error": "Vehicle registration number is required"}), 400

    existing = Vehicle.query.filter_by(fleet_id=fleet_id, vehicle_number=vehicle_number).first()
    if existing:
        return jsonify({"error": f"Vehicle '{vehicle_number}' is already registered in this fleet"}), 400

    wheel_config = (data.get("wheel_config") or WheelConfig.TEN_WHEELER).strip()
    if wheel_config in ["4-Wheeler", "6-Wheeler", WheelConfig.FOUR_WHEELER, WheelConfig.SIX_WHEELER]:
        return jsonify({
            "error": "Commercial fleet vehicles must be heavy multi-axle trucks starting from 10-Wheeler (10-Wheeler, 12-Wheeler, 14-Wheeler, 16-Wheeler)."
        }), 400

    valid_configs = [
        WheelConfig.TEN_WHEELER,
        WheelConfig.TWELVE_WHEELER,
        WheelConfig.FOURTEEN_WHEELER,
        WheelConfig.SIXTEEN_WHEELER,
    ]
    if wheel_config not in valid_configs:
        wheel_config = WheelConfig.TEN_WHEELER

    layout_dict = get_default_layout(wheel_config)

    vehicle_type = data.get("vehicle_type") or VehicleType.HEAVY_TRUCK
    make = (data.get("make") or "Tata Motors").strip()
    
    if wheel_config == WheelConfig.SIXTEEN_WHEELER:
        default_model = "Signa 4825.TK"
        default_p = 135.0
    elif wheel_config == WheelConfig.FOURTEEN_WHEELER:
        default_model = "Signa 4225.T"
        default_p = 130.0
    elif wheel_config == WheelConfig.TWELVE_WHEELER:
        default_model = "Signa 3525.K"
        default_p = 130.0
    else:  # 10-Wheeler
        default_model = "Signa 2823.K"
        default_p = 110.0

    model = (data.get("model") or default_model).strip()

    try:
        year = int(data.get("year") or datetime.now().year)
    except (ValueError, TypeError):
        year = datetime.now().year

    try:
        baseline_pressure = float(data.get("baseline_pressure") or default_p)
    except (ValueError, TypeError):
        baseline_pressure = default_p

    try:
        baseline_mileage = float(data.get("baseline_mileage") or 4.5)
    except (ValueError, TypeError):
        baseline_mileage = 4.5

    try:
        current_odometer = float(data.get("current_odometer") or 0.0)
    except (ValueError, TypeError):
        current_odometer = 0.0

    location_name = (data.get("current_location_name") or "Depot Registry").strip()

    veh = Vehicle(
        id=str(uuid.uuid4()),
        fleet_id=fleet_id,
        vehicle_number=vehicle_number,
        vehicle_type=vehicle_type,
        wheel_config=wheel_config,
        axle_count=layout_dict.get("axle_count", 3),
        make=make,
        model=model,
        year=year,
        baseline_pressure=baseline_pressure,
        baseline_mileage=baseline_mileage,
        current_odometer=current_odometer,
        current_location_name=location_name,
        location_source="MANUAL_REGISTRY",
        status="ACTIVE",
    )
    veh.layout = layout_dict

    db.session.add(veh)
    db.session.commit()

    record_audit(
        action="ADD_VEHICLE",
        resource_type="VEHICLE",
        resource_id=veh.id,
        fleet_id=fleet_id,
        details={"vehicle_number": vehicle_number, "wheel_config": wheel_config, "model": model},
    )

    return jsonify(veh.to_dict(include_fitments=True)), 201


@vehicles_bp.route("/<vehicle_id>", methods=["GET"])
@jwt_required
def get_vehicle_detail(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized vehicle access"}), 403

    return jsonify(vehicle.to_dict(include_fitments=True)), 200


@vehicles_bp.route("/<vehicle_id>/3d-twin", methods=["GET"])
@jwt_required
def get_vehicle_3d_twin(vehicle_id):
    """
    Returns dedicated digital-twin 3D metadata:
    - Physical axle layout and coordinates
    - Linked real tyre IDs and position codes
    - Real-time THI scores, pressures, temperatures, and health colors
    """
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    layout = vehicle.layout
    active_fits = {f.wheel_position: f for f in vehicle.active_fitments}

    wheels_3d = []
    for axle in layout.get("axles", []):
        axle_idx = axle["index"]
        axle_type = axle["type"]
        x_offset = axle.get("x_offset", 0.0)
        is_dual = axle.get("dual", False)

        for pos in axle["positions"]:
            fit = active_fits.get(pos)
            tyre_data = None
            health_color = "#9ca3af"  # default Grey (UNKNOWN)
            status_text = "UNKNOWN"

            if fit and fit.tyre:
                tyre = fit.tyre
                thi_status = tyre.thi_status
                status_text = thi_status
                if thi_status == "HEALTHY":
                    health_color = "#10b981"  # Emerald Green
                elif thi_status == "WARNING":
                    health_color = "#f97316"  # Orange
                elif thi_status == "CRITICAL":
                    health_color = "#ef4444"  # Red
                else:
                    health_color = "#9ca3af"  # Grey

                # Check latest telemetry
                latest_telem = fit.tyre.thi_records.order_by(db.desc("calculated_at")).first()
                inputs = latest_telem.inputs if latest_telem else {}

                tyre_data = {
                    "tyre_id": tyre.id,
                    "serial_number": tyre.serial_number,
                    "model": tyre.model,
                    "size": tyre.size,
                    "current_thi": tyre.current_thi,
                    "thi_status": tyre.thi_status,
                    "current_nsd": tyre.current_nsd,
                    "blueprint_nsd": tyre.blueprint_nsd,
                    "pressure_psi": inputs.get("pressure_psi"),
                    "temperature_c": inputs.get("temperature_c"),
                    "total_km_run": tyre.total_km_run,
                    "explanation": latest_telem.explanation if latest_telem else "No anomalies detected.",
                }

            wheels_3d.append({
                "axle_index": axle_idx,
                "axle_type": axle_type,
                "wheel_position": pos,
                "x_offset": x_offset,
                "is_dual": is_dual,
                "is_left": ("L" in pos),
                "is_inner": ("LI" in pos or "RI" in pos),
                "health_color": health_color,
                "status": status_text,
                "tyre": tyre_data,
            })

    return jsonify({
        "vehicle_id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_type": vehicle.vehicle_type,
        "wheel_config": vehicle.wheel_config,
        "axle_count": vehicle.axle_count,
        "baseline_pressure": vehicle.baseline_pressure,
        "current_odometer": vehicle.current_odometer,
        "wheels": wheels_3d,
    }), 200


@vehicles_bp.route("/<vehicle_id>/fitment-history", methods=["GET"])
@jwt_required
def get_fitment_history(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if not enforce_fleet_access(vehicle.fleet_id):
        return jsonify({"error": "Forbidden: unauthorized access"}), 403

    fits = TyreFitment.query.filter_by(vehicle_id=vehicle.id).order_by(TyreFitment.fitted_at.desc()).all()
    return jsonify([f.to_dict(include_tyre=True) for f in fits]), 200

import uuid
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Fleet, Vehicle, Tyre, Trip, Alert, User, UserRole
from app.utils.security import jwt_required, enforce_fleet_access, get_effective_fleet_id
from app.utils.audit import record_audit

fleet_bp = Blueprint("fleet", __name__)


@fleet_bp.route("/profile", methods=["GET"])
@jwt_required
def get_fleet_profile():
    fleet_id = get_effective_fleet_id()

    if not fleet_id or not enforce_fleet_access(fleet_id):
        return jsonify({"error": "Forbidden: unauthorized fleet access", "code": "FORBIDDEN"}), 403

    fleet = Fleet.query.get(fleet_id)
    if not fleet:
        return jsonify({"error": "Fleet not found"}), 404

    return jsonify(fleet.to_dict()), 200


@fleet_bp.route("/stats", methods=["GET"])
@jwt_required
def get_fleet_stats():
    fleet_id = get_effective_fleet_id()

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


@fleet_bp.route("", methods=["POST"])
@fleet_bp.route("/", methods=["POST"])
@jwt_required
def create_fleet():
    """
    Registers a new commercial transport fleet or subsidiary.
    Accessible to FLEET_MANAGER and SUPER_ADMIN.
    """
    user = g.current_user
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER]:
        return jsonify({"error": "Forbidden: Only fleet managers and administrators can register new fleets", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Fleet company name is required"}), 400

    contact_email = (data.get("contact_email") or "").strip().lower()
    if not contact_email:
        slug = "".join(c for c in name.lower() if c.isalnum())[:16] or "fleet"
        contact_email = f"ops@{slug}.com"

    existing_fleet = Fleet.query.filter_by(contact_email=contact_email).first()
    if existing_fleet:
        return jsonify({"error": f"A fleet with contact email '{contact_email}' is already registered."}), 400

    contact_name = (data.get("contact_name") or user.full_name or "Fleet Operations Lead").strip()
    registration_no = (data.get("registration_no") or "").strip() or None
    contact_phone = (data.get("contact_phone") or user.phone_number or "+91 98110 00000").strip()
    city = (data.get("city") or "New Delhi").strip()
    address = (data.get("address") or f"Commercial Logistics Hub, {city}").strip()

    CITY_COORDS = {
        "new delhi": (28.5355, 77.2610),
        "delhi": (28.6139, 77.2090),
        "pune": (18.6517, 73.7686),
        "mumbai": (19.0760, 72.8777),
        "bengaluru": (12.9716, 77.5946),
        "bangalore": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
        "hyderabad": (17.3850, 78.4867),
        "ahmedabad": (23.0225, 72.5714),
        "jaipur": (26.9124, 75.7873),
        "lucknow": (26.8467, 80.9462),
        "indore": (22.7196, 75.8577),
        "gurugram": (28.4595, 77.0266),
        "noida": (28.5355, 77.3910),
        "chandigarh": (30.7333, 76.7794),
        "nagpur": (21.1458, 79.0882),
        "coimbatore": (11.0168, 76.9558),
        "surat": (21.1702, 72.8311),
        "vadodara": (22.3072, 73.1812),
    }
    default_lat, default_lon = CITY_COORDS.get(city.lower(), (28.6139, 77.2090))
    try:
        latitude = float(data.get("latitude")) if data.get("latitude") is not None else default_lat
    except (ValueError, TypeError):
        latitude = default_lat

    try:
        longitude = float(data.get("longitude")) if data.get("longitude") is not None else default_lon
    except (ValueError, TypeError):
        longitude = default_lon

    status = (data.get("status") or "ACTIVE").strip().upper()
    if status not in ["ACTIVE", "PENDING", "SUSPENDED"]:
        status = "ACTIVE"

    fleet_id = str(uuid.uuid4())
    new_fleet = Fleet(
        id=fleet_id,
        name=name,
        registration_no=registration_no,
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        address=address,
        city=city,
        latitude=latitude,
        longitude=longitude,
        status=status,
    )
    db.session.add(new_fleet)

    # Automatically associate new fleet with user
    if user.role == UserRole.FLEET_MANAGER:
        user.managed_fleets.append(new_fleet)
        if not user.fleet_id:
            user.fleet_id = new_fleet.id

    db.session.commit()

    record_audit(
        action="CREATE_FLEET",
        resource_type="FLEET",
        resource_id=new_fleet.id,
        details={"name": new_fleet.name, "city": new_fleet.city, "registration_no": new_fleet.registration_no},
        fleet_id=new_fleet.id,
    )

    return jsonify(new_fleet.to_dict()), 201


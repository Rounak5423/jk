import random
import string
import uuid
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from app.extensions import db
from app.models import User, UserRole, Fleet
from app.utils.security import generate_token, jwt_required
from app.utils.audit import record_audit

auth_bp = Blueprint("auth", __name__)


def generate_unique_login_id(prefix="JK-FLT") -> str:
    """
    Generates a unique, branded, professional 5-digit login identifier.
    Example: JK-FLT-58219 (Fleet Owner) or JK-DRV-19402 (Commercial Driver)
    """
    for _ in range(200):
        code = "".join(random.choices(string.digits, k=5))
        candidate = f"{prefix}-{code}"
        existing = User.query.filter(func.lower(User.username) == candidate.lower()).first()
        if not existing:
            return candidate
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


@auth_bp.route("/public-fleets", methods=["GET"])
def get_public_fleets():
    """
    Returns public active transport fleets for driver registration selection.
    """
    fleets = Fleet.query.filter_by(status="ACTIVE").order_by(Fleet.name.asc()).all()
    return jsonify([{"id": f.id, "name": f.name, "city": f.city} for f in fleets]), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Registration endpoint for Fleet Owners and Commercial Drivers.
    No email is requested. A unique Login ID is generated and returned,
    which is used for subsequent logins.
    """
    data = request.get_json() or {}
    role = (data.get("role") or UserRole.FLEET_MANAGER).strip().upper()
    password = data.get("password", "")

    if not password:
        return jsonify({"error": "Password is required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if role == UserRole.SUPER_ADMIN:
        return jsonify({"error": "Super Admin accounts cannot be publicly registered. Contact system administration."}), 403

    if role == UserRole.DRIVER:
        # Commercial Truck Driver Registration
        full_name = (data.get("full_name") or data.get("contact_name") or "").strip()
        if not full_name:
            return jsonify({"error": "Driver full name is required"}), 400

        driver_license_no = (data.get("driver_license_no") or "").strip() or None
        phone = (data.get("phone") or "").strip() or None
        fleet_id = data.get("fleet_id") or None

        # If fleet_id not specified, link to first active fleet if available
        if not fleet_id:
            first_fleet = Fleet.query.filter_by(status="ACTIVE").first()
            if first_fleet:
                fleet_id = first_fleet.id

        login_id = generate_unique_login_id(prefix="JK-DRV")
        internal_email = f"{login_id.lower()}@internal.jktyre"

        try:
            user = User(
                fleet_id=fleet_id,
                username=login_id,
                email=internal_email,
                full_name=full_name,
                role=UserRole.DRIVER,
                phone_number=phone,
                driver_license_no=driver_license_no,
                is_active=True,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            token = generate_token(user)
            record_audit("DRIVER_REGISTERED", "USER", user.id, {"login_id": login_id, "name": full_name}, fleet_id)

            return jsonify({
                "message": "Driver registered successfully. Please save your Login ID for future sign in.",
                "login_id": login_id,
                "role": UserRole.DRIVER,
                "token": token,
                "user": user.to_dict(),
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Driver registration failed", "details": str(e)}), 500

    else:
        # Commercial Transport Fleet Registration
        company_name = (data.get("company_name") or "").strip()
        contact_name = (data.get("contact_name") or data.get("full_name") or "").strip()
        registration_no = (data.get("registration_no") or "").strip() or None
        phone = (data.get("phone") or "").strip() or None
        address = (data.get("address") or "").strip() or None
        city = (data.get("city") or "New Delhi").strip()

        if not company_name:
            return jsonify({"error": "Company name is required"}), 400
        if not contact_name:
            return jsonify({"error": "Contact person / Full Name is required"}), 400

        login_id = generate_unique_login_id(prefix="JK-FLT")
        internal_email = f"{login_id.lower()}@internal.jktyre"
        fleet_contact_email = f"fleet_{login_id.lower()}@internal.jktyre"

        try:
            fleet = Fleet(
                name=company_name,
                registration_no=registration_no,
                contact_name=contact_name,
                contact_email=fleet_contact_email,
                contact_phone=phone,
                address=address,
                city=city,
                status="ACTIVE",
            )
            db.session.add(fleet)
            db.session.flush()

            user = User(
                fleet_id=fleet.id,
                username=login_id,
                email=internal_email,
                full_name=contact_name,
                role=UserRole.FLEET_MANAGER,
                phone_number=phone,
                is_active=True,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            token = generate_token(user)
            record_audit("FLEET_REGISTERED", "FLEET", fleet.id, {"company": company_name, "login_id": login_id}, fleet.id)

            return jsonify({
                "message": "Fleet registered successfully. Please save your Login ID for future sign in.",
                "login_id": login_id,
                "role": UserRole.FLEET_MANAGER,
                "token": token,
                "user": user.to_dict(),
                "fleet": fleet.to_dict(),
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Fleet registration failed", "details": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Unified authentication endpoint:
    - Login ID (e.g. JK-FLT-XXXXX or JK-DRV-XXXXX) for Fleet Managers & Drivers
    - Email (e.g. admin@jktyre.com) for Super Admin only
    - Non-Super-Admins entering email will be prompted to use their assigned Login ID
    """
    data = request.get_json() or {}
    identifier = (data.get("identifier") or data.get("login") or data.get("login_id") or data.get("email") or data.get("username") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Login ID and password are required"}), 400

    # Match by Login ID (username), Email address, or exact User ID
    user = User.query.filter(
        db.or_(
            func.lower(User.username) == identifier.lower(),
            func.lower(User.email) == identifier.lower(),
            User.id == identifier,
        )
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid Login ID or password. Please verify your credentials.", "code": "AUTH_FAILED"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is disabled. Please contact support.", "code": "ACCOUNT_DISABLED"}), 403

    token = generate_token(user)
    record_audit("USER_LOGIN", "USER", user.id, {"login_id": user.username, "role": user.role}, user.fleet_id)

    return jsonify({
        "token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user():
    user = g.current_user
    return jsonify({
        "user": user.to_dict(),
        "fleet": user.fleet.to_dict() if user.fleet else None,
    }), 200

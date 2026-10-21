from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import User, UserRole, Fleet
from app.utils.security import generate_token, jwt_required
from app.utils.audit import record_audit

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register_fleet():
    """
    Public fleet owner registration endpoint.
    Creates a new Fleet and a corresponding FLEET_MANAGER User account.
    """
    data = request.get_json() or {}
    company_name = data.get("company_name", "").strip()
    contact_name = data.get("contact_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    registration_no = data.get("registration_no", "").strip()
    address = data.get("address", "").strip()

    if not company_name or not contact_name or not email or not password:
        return jsonify({"error": "Company name, contact name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    if Fleet.query.filter_by(contact_email=email).first():
        return jsonify({"error": "A fleet with this contact email already exists"}), 409

    try:
        # Create Fleet
        fleet = Fleet(
            name=company_name,
            registration_no=registration_no or None,
            contact_name=contact_name,
            contact_email=email,
            contact_phone=phone or None,
            address=address or None,
            status="ACTIVE",
        )
        db.session.add(fleet)
        db.session.flush()

        # Create Manager User
        username = email.split("@")[0] + "_" + str(fleet.id)[:4]
        user = User(
            fleet_id=fleet.id,
            username=username,
            email=email,
            full_name=contact_name,
            role=UserRole.FLEET_MANAGER,
            phone_number=phone or None,
            is_active=True,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        token = generate_token(user)
        record_audit("FLEET_REGISTERED", "FLEET", fleet.id, {"company": company_name, "user": email}, fleet.id)

        return jsonify({
            "message": "Fleet registered successfully",
            "token": token,
            "user": user.to_dict(),
            "fleet": fleet.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed", "details": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Unified authentication endpoint for JK Admin, Fleet Owners, and Drivers.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password", "code": "AUTH_FAILED"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is disabled. Please contact support.", "code": "ACCOUNT_DISABLED"}), 403

    token = generate_token(user)
    record_audit("USER_LOGIN", "USER", user.id, {"email": user.email, "role": user.role}, user.fleet_id)

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

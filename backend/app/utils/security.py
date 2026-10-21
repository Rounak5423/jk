import os
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import request, jsonify, g
from app.config import Config


def generate_token(user) -> str:
    payload = {
        "sub": user.id,
        "fleet_id": user.fleet_id,
        "username": user.username,
        "role": user.role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header", "code": "UNAUTHORIZED"}), 401

        token = auth_header.split(" ")[1]
        try:
            payload = decode_token(token)
            # Lazily load user
            from app.models.user import User
            user = User.query.get(payload["sub"])
            if not user or not user.is_active:
                return jsonify({"error": "User account inactive or not found", "code": "USER_DISABLED"}), 401
            g.current_user = user
        except ValueError as e:
            return jsonify({"error": str(e), "code": "INVALID_TOKEN"}), 401
        except Exception as e:
            return jsonify({"error": "Authentication failure", "details": str(e)}), 401

        return f(*args, **kwargs)
    return decorated


def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user or user.role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden: insufficient role permissions",
                    "code": "FORBIDDEN",
                    "required_roles": list(allowed_roles),
                    "current_role": user.role if user else None,
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def enforce_fleet_access(target_fleet_id: str) -> bool:
    """
    Fleet isolation policy enforcement:
    - SUPER_ADMIN may access any fleet.
    - Other users (FLEET_MANAGER, DRIVER) may ONLY access their own fleet.
    - Returns True if allowed, False if unauthorized.
    """
    user = getattr(g, "current_user", None)
    if not user:
        return False
    if user.role == "SUPER_ADMIN":
        return True
    if user.fleet_id and user.fleet_id == target_fleet_id:
        return True
    if hasattr(user, "authorized_fleets") and target_fleet_id in [f.id for f in user.authorized_fleets]:
        return True
    return False


def get_effective_fleet_id(data=None) -> str:
    """
    Extracts the targeted fleet ID in order of precedence:
    1. Query param: ?fleet_id=...
    2. Header: X-Fleet-ID (sent automatically by axios interceptor from activeFleetId)
    3. Body payload (if data dict provided): data.get("fleet_id")
    4. Default fallback: g.current_user.fleet_id
    """
    from flask import request
    fleet_id = request.args.get("fleet_id")
    if not fleet_id:
        fleet_id = request.headers.get("X-Fleet-ID") or request.headers.get("x-fleet-id")
    if not fleet_id and data and isinstance(data, dict):
        fleet_id = data.get("fleet_id")
    if not fleet_id:
        user = getattr(g, "current_user", None)
        if user:
            fleet_id = user.fleet_id
    return fleet_id

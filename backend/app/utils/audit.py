from flask import request, g
from app.extensions import db
from app.models.audit import AuditLog


def record_audit(action: str, resource_type: str, resource_id: str = None, details: dict = None, fleet_id: str = None):
    try:
        user = getattr(g, "current_user", None)
        user_id = user.id if user else None
        eff_fleet_id = fleet_id or (user.fleet_id if user else None)
        ip_addr = request.remote_addr if request else "127.0.0.1"

        log = AuditLog(
            user_id=user_id,
            fleet_id=eff_fleet_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details_json=None,
            ip_address=ip_addr,
        )
        if details:
            log.details = details
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Audit logging failure should not crash main request, but should be noted
        print(f"[AUDIT LOGGING ERROR] {e}")

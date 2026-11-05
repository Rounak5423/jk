from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import User, UserRole, Fleet, Vehicle, Tyre, Alert, AuditLog
from app.utils.security import roles_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/platform-stats", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def get_platform_stats():
    """
    Cross-fleet summary stats for JK Tyre executives & administrators.
    """
    total_fleets = Fleet.query.count()
    total_vehicles = Vehicle.query.count()
    total_tyres = Tyre.query.count()
    active_alerts = Alert.query.filter_by(status="ACTIVE").count()

    healthy_tyres = Tyre.query.filter_by(thi_status="HEALTHY").count()
    warning_tyres = Tyre.query.filter_by(thi_status="WARNING").count()
    critical_tyres = Tyre.query.filter_by(thi_status="CRITICAL").count()
    unknown_tyres = Tyre.query.filter_by(thi_status="UNKNOWN").count()

    return jsonify({
        "total_fleets": total_fleets,
        "total_vehicles": total_vehicles,
        "total_tyres": total_tyres,
        "active_alerts": active_alerts,
        "tyre_health_summary": {
            "healthy": healthy_tyres,
            "warning": warning_tyres,
            "critical": critical_tyres,
            "unknown": unknown_tyres,
        },
    }), 200


@admin_bp.route("/fleets", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def list_all_fleets():
    fleets = Fleet.query.order_by(Fleet.created_at.desc()).all()
    return jsonify([f.to_dict() for f in fleets]), 200


@admin_bp.route("/fleets", methods=["POST"])
@roles_required(UserRole.SUPER_ADMIN)
def admin_create_fleet():
    from app.api.fleet import create_fleet
    return create_fleet()


@admin_bp.route("/users", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def list_all_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route("/audit-logs", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def list_audit_logs():
    limit = min(int(request.args.get("limit", 100)), 500)
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return jsonify([l.to_dict() for l in logs]), 200


@admin_bp.route("/map-locations", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def get_map_locations():
    """
    Dedicated interactive map data for authorized JK Tyre administrators.
    Provides fleets and vehicles with geographic coordinates, freshness status,
    and platform aggregation metrics.
    """
    now = datetime.now(timezone.utc)
    fleets = Fleet.query.all()
    vehicles = Vehicle.query.all()

    fleet_markers = []
    for f in fleets:
        if f.latitude is not None and f.longitude is not None:
            fleet_markers.append({
                "id": f.id,
                "name": f.name,
                "city": f.city,
                "latitude": f.latitude,
                "longitude": f.longitude,
                "status": f.status,
                "vehicle_count": len(f.vehicles),
                "active_alerts_count": sum(1 for a in f.alerts if a.status == "ACTIVE"),
                "provenance": "SYNTHETIC",
            })

    vehicle_markers = []
    current_count = 0
    stale_count = 0
    simulated_count = 0
    unavailable_count = 0

    for v in vehicles:
        if v.current_latitude is None or v.current_longitude is None:
            unavailable_count += 1
            freshness = "UNAVAILABLE"
        elif v.location_source == "SIMULATED":
            simulated_count += 1
            freshness = "SIMULATED"
        elif v.location_updated_at:
            delta = now - v.location_updated_at.replace(tzinfo=timezone.utc if v.location_updated_at.tzinfo is None else None)
            if delta.total_seconds() > 43200:
                stale_count += 1
                freshness = "STALE"
            else:
                current_count += 1
                freshness = "CURRENT"
        else:
            freshness = "SIMULATED"
            simulated_count += 1

        if v.current_latitude is not None and v.current_longitude is not None:
            active_alerts = len([a for a in v.alerts if a.status == "ACTIVE"])
            active_fits = v.active_fitments
            avg_thi = round(
                sum(f.tyre.current_thi for f in active_fits if f.tyre and f.tyre.current_thi) / max(1, len(active_fits)),
                1
            ) if active_fits else 100.0

            vehicle_markers.append({
                "id": v.id,
                "vehicle_number": v.vehicle_number,
                "fleet_id": v.fleet_id,
                "fleet_name": v.fleet.name if v.fleet else "Unknown",
                "latitude": v.current_latitude,
                "longitude": v.current_longitude,
                "location_name": v.current_location_name or "On Transit Route",
                "location_source": v.location_source,
                "location_freshness": freshness,
                "wheel_config": v.wheel_config,
                "vehicle_type": v.vehicle_type,
                "status": v.status,
                "current_odometer": v.current_odometer,
                "average_thi": avg_thi,
                "active_alerts_count": active_alerts,
                "location_updated_at": v.location_updated_at.isoformat() if v.location_updated_at else None,
                "provenance": "SYNTHETIC",
            })

    total_fleets = len(fleets)
    active_fleets = sum(1 for f in fleets if f.status == "ACTIVE")
    total_vehicles = len(vehicles)

    return jsonify({
        "metrics": {
            "total_fleets": total_fleets,
            "active_fleets": active_fleets,
            "total_vehicles": total_vehicles,
            "mapped_vehicles": len(vehicle_markers),
            "unmapped_vehicles": unavailable_count,
            "freshness_breakdown": {
                "current": current_count,
                "stale": stale_count,
                "simulated": simulated_count,
                "unavailable": unavailable_count,
            },
        },
        "fleets": fleet_markers,
        "vehicles": vehicle_markers,
        "disclaimer": "All coordinates marked SIMULATED are geographically plausible synthetic scenario points generated for demonstration and verification.",
    }), 200


# ==============================================================================
# JK TYRE OEM CENTRAL DATA VAULT & FLEET INTELLIGENCE INGEST
# ==============================================================================

@admin_bp.route("/oem-vault/summary", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def get_oem_vault_summary():
    """
    Fleetwise telemetry & health intelligence repository for JK Tyre corporate oversight.
    """
    from app.services.oem_vault_service import OEMDataSyncService
    summary = OEMDataSyncService.get_vault_summary()
    return jsonify(summary), 200


@admin_bp.route("/oem-vault/fleet/<fleet_id>", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def get_oem_fleet_detail(fleet_id):
    """
    Returns full fleetwise operational data and telemetry payload for a single fleet.
    """
    from app.services.oem_vault_service import OEMDataSyncService
    detail = OEMDataSyncService.get_fleet_detail(fleet_id)
    if not detail:
        return jsonify({"error": "Fleet not found in OEM Vault"}), 404
    return jsonify(detail), 200


@admin_bp.route("/oem-vault/sync-now", methods=["POST"])
@roles_required(UserRole.SUPER_ADMIN)
def trigger_oem_sync_now():
    """
    Executes an on-demand fleetwise snapshot sync across all fleets directly into the vault.
    """
    from app.services.oem_vault_service import OEMDataSyncService
    results = OEMDataSyncService.sync_all_fleets(channel="OEM_ADMIN_MANUAL_TRIGGER")
    return jsonify({
        "status": "SUCCESS",
        "message": f"Successfully synchronized {len(results)} fleet snapshots into JK Tyre OEM Vault.",
        "synced_fleets": results,
    }), 200


@admin_bp.route("/oem-vault/export/<fleet_id>", methods=["GET"])
@roles_required(UserRole.SUPER_ADMIN)
def export_oem_fleet_payload(fleet_id):
    """
    Direct export of complete fleetwise operational and sensor dataset for JK Tyre engineering.
    """
    from app.services.oem_vault_service import OEMDataSyncService
    export_pkg = OEMDataSyncService.export_fleet_payload(fleet_id)
    if not export_pkg:
        return jsonify({"error": "Fleet data not available for export"}), 404
    return jsonify(export_pkg), 200


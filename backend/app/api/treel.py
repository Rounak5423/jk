from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Vehicle, Tyre, TyreFitment, TelemetryRecord, TelemetryProvenance
from app.services.treel_provider import MockTreelAdapter
from app.services.thi_engine import THIEngine
from app.services.alert_engine import AlertEngine
from app.utils.security import jwt_required

treel_bp = Blueprint("treel", __name__)
adapter = MockTreelAdapter()


@treel_bp.route("/ingest", methods=["POST"])
def ingest_treel_telemetry():
    """
    Mock TREEL TPMS gateway ingestion endpoint.
    Accepts raw TPMS payload, applies adapter normalization, quarantines malformed data,
    stores validated telemetry, and triggers THI & alert evaluation.
    """
    payload = request.get_json()
    if not payload:
        return jsonify({"error": "Empty JSON payload"}), 400

    vehicle_id = payload.get("vehicle_id")
    if not vehicle_id:
        return jsonify({"error": "vehicle_id is required in telemetry header"}), 400

    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    success, normalized_records, quarantine_logs = adapter.ingest_payload(payload)

    if not normalized_records and quarantine_logs:
        return jsonify({
            "status": "QUARANTINED",
            "message": "All payload records failed validation and were quarantined.",
            "quarantine_reasons": quarantine_logs,
        }), 422

    active_fits = {f.wheel_position: f for f in vehicle.active_fitments}
    saved_records = []

    for item in normalized_records:
        pos = item["wheel_position"]
        fit = active_fits.get(pos)
        tyre_id = fit.tyre_id if fit else None

        record = TelemetryRecord(
            fleet_id=vehicle.fleet_id,
            vehicle_id=vehicle.id,
            tyre_id=tyre_id,
            wheel_position=pos,
            timestamp=item["timestamp"],
            pressure_psi=item["pressure_psi"],
            temperature_c=item["temperature_c"],
            speed_kmh=item.get("speed_kmh", 0.0),
            battery_soc=item["battery_soc"],
            odometer_km=vehicle.current_odometer,
            provenance=TelemetryProvenance.TREEL_MOCK,
        )
        db.session.add(record)
        saved_records.append(record)

        # Live THI and Alert computation if tyre is fitted
        if fit and fit.tyre:
            thi_eval = THIEngine.calculate_thi(
                pressure_psi=item["pressure_psi"],
                temperature_c=item["temperature_c"],
                current_nsd_mm=fit.tyre.current_nsd,
                blueprint_nsd_mm=fit.tyre.blueprint_nsd,
                vehicle_type=vehicle.vehicle_type,
            )
            fit.tyre.current_thi = thi_eval["score"]
            fit.tyre.thi_status = thi_eval["status"]

            AlertEngine.evaluate_telemetry(
                fleet_id=vehicle.fleet_id,
                vehicle_id=vehicle.id,
                tyre_id=fit.tyre_id,
                wheel_position=pos,
                pressure_psi=item["pressure_psi"],
                temperature_c=item["temperature_c"],
                battery_soc=item["battery_soc"],
                baseline_pressure=vehicle.baseline_pressure,
            )

    db.session.commit()

    # Silent OEM background telemetry sync tap
    try:
        from app.services.oem_vault_service import OEMDataSyncService
        OEMDataSyncService.capture_fleet_snapshot(vehicle.fleet_id, channel="TREEL_INGEST_TAP")
    except Exception:
        pass

    return jsonify({
        "status": "ACCEPTED",
        "ingested_count": len(saved_records),
        "quarantined_count": len(quarantine_logs),
        "quarantine_notes": quarantine_logs,
    }), 200


@treel_bp.route("/provider-info", methods=["GET"])
def get_provider_info():
    return jsonify({
        "provider": MockTreelAdapter.PROVIDER_NAME,
        "mode": "SAFE_MOCK_ADAPTER",
        "description": "Safe simulated TPMS adapter pending official OEM production credentials & schema.",
        "supported_units": {
            "pressure": ["psi", "bar", "kpa"],
            "temperature": ["c", "f"],
        },
    }), 200

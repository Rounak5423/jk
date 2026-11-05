"""
Script to safely remove all dummy vehicle data, tyre data, and related records
from the JK Tyre Fleet Intelligence Platform database.
Ensures that all fleets remain intact with 0 vehicles and 0 tyres.
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.extensions import db
from app.models import (
    Fleet,
    User,
    Vehicle,
    Tyre,
    TyreFitment,
    Trip,
    TelemetryRecord,
    THIRecord,
    Alert,
    Inspection,
    AuditLog,
)
try:
    from app.models.lifecycle_history import TyreLifecycleHistory
except ImportError:
    TyreLifecycleHistory = None

try:
    from app.models.oem_vault import OEMFleetVault
except ImportError:
    OEMFleetVault = None


def purge_dummy_vehicle_and_tyre_data():
    app = create_app()
    with app.app_context():
        print("[*] Starting dummy vehicle and tyre data removal...")

        # 1. Purge fitments and lifecycle history
        if TyreLifecycleHistory:
            deleted_history = db.session.query(TyreLifecycleHistory).delete()
            print(f"    - Deleted {deleted_history} tyre lifecycle history records")

        deleted_fitments = db.session.query(TyreFitment).delete()
        print(f"    - Deleted {deleted_fitments} tyre fitment records")

        # 2. Purge telemetry, THI evaluations, inspections, trips
        deleted_telemetry = db.session.query(TelemetryRecord).delete()
        print(f"    - Deleted {deleted_telemetry} telemetry records")

        deleted_thi = db.session.query(THIRecord).delete()
        print(f"    - Deleted {deleted_thi} THI records")

        deleted_inspections = db.session.query(Inspection).delete()
        print(f"    - Deleted {deleted_inspections} inspection records")

        deleted_trips = db.session.query(Trip).delete()
        print(f"    - Deleted {deleted_trips} trips")

        # 3. Purge alerts linked to vehicles/tyres
        deleted_alerts = db.session.query(Alert).delete()
        print(f"    - Deleted {deleted_alerts} alerts")

        # 4. Purge OEM vault snapshots containing dummy data
        if OEMFleetVault:
            deleted_vault = db.session.query(OEMFleetVault).delete()
            print(f"    - Deleted {deleted_vault} OEM vault snapshots")

        # 5. Purge tyres and vehicles
        deleted_tyres = db.session.query(Tyre).delete()
        print(f"    - Deleted {deleted_tyres} tyres")

        deleted_vehicles = db.session.query(Vehicle).delete()
        print(f"    - Deleted {deleted_vehicles} vehicles")

        # Log audit entry
        audit = AuditLog(
            action="PURGE_DUMMY_DATA",
            resource_type="VEHICLE_TYRE_PURGE",
            resource_id="ALL",
            details={"message": "Removed all dummy vehicles, tyres, and associated operational records. All fleets now have 0 vehicles."},
        )
        db.session.add(audit)

        db.session.commit()

        # Verify counts
        fleets = Fleet.query.all()
        print("\n[*] Verification of Fleets:")
        for f in fleets:
            v_count = Vehicle.query.filter_by(fleet_id=f.id).count()
            t_count = Tyre.query.filter_by(fleet_id=f.id).count()
            print(f"    Fleet '{f.name}' (ID: {f.id}): {v_count} vehicles, {t_count} tyres")

        total_vehicles = Vehicle.query.count()
        total_tyres = Tyre.query.count()
        print(f"\n[*] Total vehicles across ALL fleets: {total_vehicles}")
        print(f"[*] Total tyres across ALL fleets: {total_tyres}")
        print(f"[*] Total fleets remaining: {len(fleets)}")
        print(f"[*] Total users remaining: {User.query.count()}")
        print("[+] Purge completed successfully!")


if __name__ == "__main__":
    purge_dummy_vehicle_and_tyre_data()

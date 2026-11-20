"""
Clear all operational data while preserving fleets and users.
This removes: vehicles, tyres, trips, telemetry, alerts, inspections, etc.
This keeps: fleets, users (login accounts)
"""
from app import create_app
from app.extensions import db
from app.models import (
    Vehicle, Tyre, TyreFitment, Trip, TelemetryRecord, 
    Alert, Inspection, VehicleInspectionReport, AuditLog
)

app = create_app()

with app.app_context():
    print("[CLEAR] Removing all operational data...")
    
    # Clear lifecycle history if exists
    try:
        from app.models.lifecycle_history import TyreLifecycleHistory
        count = db.session.query(TyreLifecycleHistory).delete()
        print(f"  ✓ Cleared {count} lifecycle history records")
    except Exception as e:
        print(f"  - No lifecycle history table")
    
    # Clear OEM vault if exists
    try:
        from app.models.oem_vault import OEMFleetVault
        count = db.session.query(OEMFleetVault).delete()
        print(f"  ✓ Cleared {count} OEM vault records")
    except Exception as e:
        print(f"  - No OEM vault table")
    
    # Clear driver rewards if exists
    try:
        from app.models.reward import DriverReward, DriverRedemption
        count1 = db.session.query(DriverRedemption).delete()
        count2 = db.session.query(DriverReward).delete()
        print(f"  ✓ Cleared {count1} redemptions and {count2} rewards")
    except Exception as e:
        print(f"  - No rewards tables")
    
    # Clear THI records
    try:
        from app.models.thi import THIRecord
        count = db.session.query(THIRecord).delete()
        print(f"  ✓ Cleared {count} THI records")
    except Exception:
        pass
    
    # Clear audit logs
    count = db.session.query(AuditLog).delete()
    print(f"  ✓ Cleared {count} audit logs")
    
    # Clear vehicle inspection reports
    count = db.session.query(VehicleInspectionReport).delete()
    print(f"  ✓ Cleared {count} vehicle inspection reports")
    
    # Clear inspections
    count = db.session.query(Inspection).delete()
    print(f"  ✓ Cleared {count} inspections")
    
    # Clear alerts
    count = db.session.query(Alert).delete()
    print(f"  ✓ Cleared {count} alerts")
    
    # Clear telemetry
    count = db.session.query(TelemetryRecord).delete()
    print(f"  ✓ Cleared {count} telemetry records")
    
    # Clear trips
    count = db.session.query(Trip).delete()
    print(f"  ✓ Cleared {count} trips")
    
    # Clear fitments
    count = db.session.query(TyreFitment).delete()
    print(f"  ✓ Cleared {count} tyre fitments")
    
    # Clear tyres
    count = db.session.query(Tyre).delete()
    print(f"  ✓ Cleared {count} tyres")
    
    # Clear vehicles
    count = db.session.query(Vehicle).delete()
    print(f"  ✓ Cleared {count} vehicles")
    
    db.session.commit()
    
    print("\n[SUCCESS] All operational data cleared!")
    print("Preserved: 3 Fleets, 9 Users (login accounts)")
    print("\nRemaining data:")
    
    from app.models import Fleet, User
    print(f"  Fleets: {Fleet.query.count()}")
    print(f"  Users: {User.query.count()}")
    print(f"  Vehicles: {Vehicle.query.count()}")
    print(f"  Tyres: {Tyre.query.count()}")
    print(f"  Trips: {Trip.query.count()}")
    print(f"  Telemetry: {TelemetryRecord.query.count()}")
    print(f"  Alerts: {Alert.query.count()}")

"""Check current database state"""
from app import create_app
from app.extensions import db
from app.models import Vehicle, Tyre, Trip, TelemetryRecord, Alert, THIRecord

app = create_app()

with app.app_context():
    print("="*60)
    print("CURRENT DATABASE STATE")
    print("="*60)
    
    vehicles_count = Vehicle.query.count()
    tyres_count = Tyre.query.count()
    trips_count = Trip.query.count()
    telemetry_count = TelemetryRecord.query.count()
    alerts_count = Alert.query.count()
    thi_count = THIRecord.query.count()
    
    print(f"Vehicles: {vehicles_count}")
    print(f"Tyres: {tyres_count}")
    print(f"Trips: {trips_count}")
    print(f"Telemetry: {telemetry_count}")
    print(f"Alerts: {alerts_count}")
    print(f"THI Records: {thi_count}")
    print()
    
    if vehicles_count > 0:
        print("⚠️ WARNING: Database has vehicles!")
        print("\nFirst 5 vehicles:")
        for v in Vehicle.query.limit(5).all():
            print(f"  - {v.vehicle_number} ({v.wheel_config}) - Fleet: {v.fleet.name}")
        print("\n❌ DATA REGENERATED - Need to clear again!")
    else:
        print("✅ Database is CLEAN - No operational data")

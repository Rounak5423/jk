"""Show what data remains after clearing operational data"""
from app import create_app
from app.models import Fleet, User

app = create_app()

with app.app_context():
    print("="*50)
    print("DATABASE STATUS - PRESERVED DATA")
    print("="*50)
    print()
    
    fleets = Fleet.query.all()
    print(f"✓ FLEETS: {len(fleets)}")
    for f in fleets:
        print(f"  • {f.name}")
        print(f"    Contact: {f.contact_name} ({f.contact_email})")
        print(f"    Location: {f.city}")
        print()
    
    users = User.query.all()
    print(f"✓ USERS: {len(users)}")
    for u in users:
        print(f"  • {u.username} - {u.full_name}")
        print(f"    Email: {u.email}")
        print(f"    Role: {u.role}")
        print(f"    Password: (hashed - use test password based on role)")
        print()
    
    print("="*50)
    print("CLEARED DATA (All counts = 0):")
    print("="*50)
    from app.models import Vehicle, Tyre, Trip, TelemetryRecord, Alert
    print(f"  Vehicles: {Vehicle.query.count()}")
    print(f"  Tyres: {Tyre.query.count()}")
    print(f"  Trips: {Trip.query.count()}")
    print(f"  Telemetry: {TelemetryRecord.query.count()}")
    print(f"  Alerts: {Alert.query.count()}")
    print()
    print("✓ Database structure intact - ready for fresh data!")

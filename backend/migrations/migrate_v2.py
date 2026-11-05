"""
Database migration script: migrate_v2.py
Adds multi-fleet support, location columns to vehicles and fleets,
and cleans up synthetic driver display names.
"""

import sqlite3
import random
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).resolve().parent.parent / "instance" / "jktyre.db"

# Sample hubs with coordinates in India
HUBS_COORDS = [
    {"name": "Delhi Logistics Hub", "city": "New Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Mumbai Nhava Sheva Terminal", "city": "Navi Mumbai", "lat": 18.9500, "lng": 72.9500},
    {"name": "Bengaluru Peenya Depot", "city": "Bengaluru", "lat": 13.0300, "lng": 77.5200},
    {"name": "Chennai Port Cargo Terminal", "city": "Chennai", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata Dankuni Freight Yard", "city": "Kolkata", "lat": 22.6800, "lng": 88.3000},
    {"name": "Hyderabad Outer Hub", "city": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
    {"name": "Ahmedabad Sanand Freight Depot", "city": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    {"name": "Pune Chakan Logistics Center", "city": "Pune", "lat": 18.7500, "lng": 73.8500},
]


def run_migration():
    if not DB_PATH.exists():
        print(f"[MIGRATION] Database {DB_PATH} not found. Skipping.")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print(f"[MIGRATION] Applying migrate_v2 to {DB_PATH}...")

    # 1. Fleets table alterations
    existing_fleet_cols = [c[1] for c in cursor.execute("PRAGMA table_info(fleets)")]
    if "city" not in existing_fleet_cols:
        cursor.execute("ALTER TABLE fleets ADD COLUMN city VARCHAR(64)")
    if "latitude" not in existing_fleet_cols:
        cursor.execute("ALTER TABLE fleets ADD COLUMN latitude FLOAT")
    if "longitude" not in existing_fleet_cols:
        cursor.execute("ALTER TABLE fleets ADD COLUMN longitude FLOAT")

    # 2. Vehicles table alterations
    existing_veh_cols = [c[1] for c in cursor.execute("PRAGMA table_info(vehicles)")]
    if "current_latitude" not in existing_veh_cols:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN current_latitude FLOAT")
    if "current_longitude" not in existing_veh_cols:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN current_longitude FLOAT")
    if "current_location_name" not in existing_veh_cols:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN current_location_name VARCHAR(120)")
    if "location_updated_at" not in existing_veh_cols:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN location_updated_at DATETIME")
    if "location_source" not in existing_veh_cols:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN location_source VARCHAR(32) DEFAULT 'SIMULATED'")

    # 3. Create user_fleets association table for multi-fleet management
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_fleets (
            user_id VARCHAR(36) NOT NULL,
            fleet_id VARCHAR(36) NOT NULL,
            PRIMARY KEY (user_id, fleet_id),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (fleet_id) REFERENCES fleets (id) ON DELETE CASCADE
        )
    """)

    # 4. Clean up driver names: remove 'Singh' suffix
    cursor.execute("UPDATE users SET full_name = REPLACE(full_name, ' Singh', '') WHERE role = 'DRIVER' AND full_name LIKE '% Singh'")

    # 5. Set default fleet coordinates
    cursor.execute("""
        UPDATE fleets
        SET city = 'New Delhi', latitude = 28.5355, longitude = 77.2610
        WHERE contact_email = 'fleet.manager@translogistics.com' AND (latitude IS NULL OR city IS NULL)
    """)
    cursor.execute("""
        UPDATE fleets
        SET city = 'Pune', latitude = 18.6517, longitude = 73.7686
        WHERE contact_email = 'contact@bharatfreight.com' AND (latitude IS NULL OR city IS NULL)
    """)

    # 6. Associate apex_manager with both fleets to demonstrate multi-fleet access
    apex_user = cursor.execute("SELECT id FROM users WHERE email = 'fleet.manager@translogistics.com'").fetchone()
    fleet_rows = cursor.execute("SELECT id FROM fleets").fetchall()
    if apex_user and len(fleet_rows) >= 2:
        user_id = apex_user[0]
        for f_row in fleet_rows:
            f_id = f_row[0]
            cursor.execute("INSERT OR IGNORE INTO user_fleets (user_id, fleet_id) VALUES (?, ?)", (user_id, f_id))

    # 7. Update vehicles coordinates if null
    veh_rows = cursor.execute("SELECT id FROM vehicles WHERE current_latitude IS NULL").fetchall()
    now_iso = datetime.now(timezone.utc).isoformat()
    for row in veh_rows:
        v_id = row[0]
        hub = random.choice(HUBS_COORDS)
        # Jitter coordinates slightly (+/- 0.15 deg)
        lat = hub["lat"] + random.uniform(-0.15, 0.15)
        lng = hub["lng"] + random.uniform(-0.15, 0.15)
        loc_name = f"Near {hub['name']}"
        cursor.execute("""
            UPDATE vehicles
            SET current_latitude = ?, current_longitude = ?, current_location_name = ?,
                location_updated_at = ?, location_source = 'SIMULATED'
            WHERE id = ?
        """, (lat, lng, loc_name, now_iso, v_id))

    conn.commit()
    conn.close()
    print("[MIGRATION] Migration migrate_v2 completed successfully.")


if __name__ == "__main__":
    run_migration()

"""
Database migration script: migrate_v3.py
Adds lifecycle_type to tyres table, adds new inspection fields,
and creates the tyre_lifecycle_history table.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "instance" / "jktyre.db"


def run_migration():
    if not DB_PATH.exists():
        print(f"[MIGRATION] Database {DB_PATH} not found. Skipping.")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print(f"[MIGRATION] Applying migrate_v3 to {DB_PATH}...")

    # 1. tyres table: add lifecycle_type
    existing_tyre_cols = [c[1] for c in cursor.execute("PRAGMA table_info(tyres)")]
    if "lifecycle_type" not in existing_tyre_cols:
        cursor.execute("ALTER TABLE tyres ADD COLUMN lifecycle_type VARCHAR(16) DEFAULT 'NEW'")
        print("[MIGRATION] Added lifecycle_type to tyres.")

    # 2. inspections table: add new fields
    existing_insp_cols = [c[1] for c in cursor.execute("PRAGMA table_info(inspections)")]
    if "inspection_result" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN inspection_result VARCHAR(24) DEFAULT 'PASS'")
        print("[MIGRATION] Added inspection_result to inspections.")
    if "lifecycle_type_change" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN lifecycle_type_change VARCHAR(16)")
        print("[MIGRATION] Added lifecycle_type_change to inspections.")
    if "lifecycle_reason" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN lifecycle_reason VARCHAR(256)")
        print("[MIGRATION] Added lifecycle_reason to inspections.")
    if "retread_date" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN retread_date DATETIME")
        print("[MIGRATION] Added retread_date to inspections.")
    if "retread_provider" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN retread_provider VARCHAR(128)")
        print("[MIGRATION] Added retread_provider to inspections.")
    if "retread_count_after" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN retread_count_after INTEGER")
        print("[MIGRATION] Added retread_count_after to inspections.")
    if "temperature_at_inspection" not in existing_insp_cols:
        cursor.execute("ALTER TABLE inspections ADD COLUMN temperature_at_inspection FLOAT")
        print("[MIGRATION] Added temperature_at_inspection to inspections.")

    # 3. Create tyre_lifecycle_history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tyre_lifecycle_history (
            id VARCHAR(36) PRIMARY KEY,
            tyre_id VARCHAR(36) NOT NULL,
            fleet_id VARCHAR(36) NOT NULL,
            previous_lifecycle_type VARCHAR(16) NOT NULL,
            new_lifecycle_type VARCHAR(16) NOT NULL,
            previous_status VARCHAR(24),
            new_status VARCHAR(24),
            related_inspection_id VARCHAR(36),
            related_fitment_id VARCHAR(36),
            changed_by_user_id VARCHAR(36) NOT NULL,
            reason VARCHAR(256),
            remarks TEXT,
            nsd_at_change FLOAT,
            km_at_change FLOAT,
            retread_count INTEGER,
            scrap_reason VARCHAR(256),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tyre_id) REFERENCES tyres (id) ON DELETE CASCADE,
            FOREIGN KEY (fleet_id) REFERENCES fleets (id) ON DELETE CASCADE,
            FOREIGN KEY (related_inspection_id) REFERENCES inspections (id) ON DELETE SET NULL,
            FOREIGN KEY (related_fitment_id) REFERENCES tyre_fitments (id) ON DELETE SET NULL,
            FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
        )
    """)
    print("[MIGRATION] Ensured tyre_lifecycle_history table exists.")

    # 4. Backfill lifecycle_type for existing tyres
    cursor.execute("UPDATE tyres SET lifecycle_type = 'NEW' WHERE lifecycle_type IS NULL")

    conn.commit()
    conn.close()
    print("[MIGRATION] Migration migrate_v3 completed successfully.")


if __name__ == "__main__":
    run_migration()

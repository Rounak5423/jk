# JK Tyre THI Fleet Intelligence Platform — Full Project Analysis

**Generated:** 2025  
**Analyst:** Kiro AI (read-only exhaustive investigation)  
**Workspace:** `c:\Users\vaisi\OneDrive\Desktop\tyre-health-index\05_JKT (2)\05_JKT`

---

## 1. Executive Summary

The **JK Tyre THI Fleet Intelligence Platform** is an enterprise-grade, full-stack SaaS application purpose-built for managing commercial vehicle fleets (trucks, buses, tippers, and light commercial vehicles) in India. Its primary users are:

- **JK Tyre Administrators (SUPER_ADMIN)** — cross-fleet oversight, audit logs, platform map
- **Fleet Managers (FLEET_MANAGER)** — vehicle, tyre, trip, alert, and inspection management per fleet
- **Commercial Drivers (DRIVER)** — mobile-optimised trip logging, odometer entry, tyre inspection submission with offline queue support

The platform tracks every tyre from virgin fitment through multiple retread cycles to final scrap, computes an explainable Tyre Health Index (THI) score (0–100) per tyre using real-time telematics (TPMS), raises configurable operational alerts, generates an explainable Trip Score per journey, and delivers an interactive 3D digital-twin inspection experience. It includes a mock TREEL TPMS adapter for future real sensor integration, a 13-sheet Excel export, and an India-map geographic hub view.

All 31 automated backend tests pass. The frontend builds without TypeScript errors (3,020 modules). The project is in "TARGETED CORRECTIONS & ENHANCEMENTS FULLY IMPLEMENTED & VERIFIED" status as of 2026-10-12.

---

## 2. Technology Stack

### Backend

| Library / Framework | Version | Purpose |
|---|---|---|
| Python | 3.12.10 | Runtime |
| Flask | 3.0.3 | Web framework |
| Flask-Cors | 4.0.1 | Cross-Origin Resource Sharing |
| Flask-SQLAlchemy | 3.1.1 | ORM integration |
| SQLAlchemy | 2.0.36 | ORM and database abstraction |
| marshmallow | 3.21.3 | Serialization (imported, not heavily used) |
| PyJWT | 2.8.0 | JWT token generation and validation |
| bcrypt | 4.1.3 | Password hashing |
| python-dotenv | 1.0.1 | Environment variable loading |
| pandas | 2.2.2 | Data manipulation, Excel import |
| openpyxl | 3.1.5 | Excel export (13-sheet workbook) |
| numpy | 1.26.4 | Numerical computation for ML |
| scikit-learn | 1.5.0 | Linear Regression + Random Forest ML |
| pytest | 8.2.2 | Automated testing |
| requests | 2.32.3 | HTTP client (test utilities) |
| Werkzeug | 3.0.3 | WSGI utilities, secure filename |

**Database:** SQLite (`backend/instance/jktyre.db`) for local development; PostgreSQL-compatible schema.

### Frontend

| Library / Framework | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.4.5 | Static typing |
| Vite | 5.3.1 | Build tool and dev server |
| react-router-dom | 6.23.1 | Client-side routing |
| @tanstack/react-query | 5.45.1 | Server state management, caching |
| axios | 1.7.2 | HTTP client with interceptors |
| zustand | 4.5.2 | Client auth/fleet state management |
| recharts | 2.12.7 | Charts (pie, bar, line, composed) |
| three | 0.165.0 | 3D rendering engine |
| @react-three/fiber | 8.16.8 | React bindings for Three.js |
| @react-three/drei | 9.106.0 | Three.js helpers |
| lucide-react | 0.395.0 | Icon library |
| tailwindcss | 3.4.4 | Utility-first CSS |
| clsx | 2.1.1 | Conditional className utility |
| tailwind-merge | 2.3.0 | Tailwind class deduplication |
| postcss | 8.4.38 | CSS post-processing |
| autoprefixer | 10.4.19 | CSS vendor prefixes |

---

## 3. Architecture Overview

```
+──────────────────────────────────────────────────────────────+
│                     BROWSER (React SPA)                       │
│  Vite dev server :5173  →  proxy /api/* → Flask :5000        │
│                                                               │
│  Zustand (authStore) → localStorage → Axios interceptor      │
│  ├── Authorization: Bearer <JWT>                              │
│  └── X-Fleet-ID: <activeFleetId>                             │
│                                                               │
│  TanStack React Query (caching + refetch on focus)           │
+──────────────────────────────────────────────────────────────+
                             │ HTTPS / REST
+──────────────────────────────────────────────────────────────+
│                   FLASK BACKEND (:5000)                       │
│                                                               │
│  Blueprints registered at /api/v1/<module>:                  │
│  auth, admin, fleets, vehicles, tyres, trips,                │
│  inspections, alerts, analytics, driver, treel, export       │
│                                                               │
│  Security middleware:                                         │
│  ├── @jwt_required — validates Bearer JWT                    │
│  ├── @roles_required(*roles) — RBAC check                    │
│  └── enforce_fleet_access(fleet_id) — multi-tenant isolation │
│                                                               │
│  Core Engines:                                               │
│  ├── THIEngine — deterministic 0-100 tyre health score       │
│  ├── TripScoreEngine — 0-100 driver/journey score            │
│  ├── AlertEngine — deduplicated event alerts                 │
│  ├── WearEngine — linear RUL estimation                      │
│  └── TyreWearMLService — sklearn tabular regression          │
│                                                               │
│  Integration Adapters:                                       │
│  └── MockTreelAdapter — TPMS normalization (bar/kPa→psi, F→C)│
+──────────────────────────────────────────────────────────────+
                             │ SQLAlchemy ORM
+──────────────────────────────────────────────────────────────+
│                   SQLite / PostgreSQL                         │
│  Tables: fleets, users, user_fleets, vehicles, tyres,        │
│  tyre_fitments, trips, telemetry_records, thi_records,       │
│  alerts, inspections, tyre_lifecycle_history, audit_logs     │
+──────────────────────────────────────────────────────────────+
```

**Key architectural principles:**
1. Zero direct DB access from frontend — all mutations via REST API
2. Strict multi-tenant isolation: `fleet_id` in every table, `enforce_fleet_access()` in every handler
3. Permanent tyre identity: serial number tracked across fitments, retreads, and scraps
4. Configuration-driven wheel layouts: JSON stored in `vehicles.layout_json`
5. Data provenance: every telemetry record tagged `SYNTHETIC | TREEL_MOCK | TREEL_LIVE | MANUAL`
6. Separation of concerns: THI engine, Trip Score engine, and Alert engine are fully independent

---

## 4. Data Models

### 4.1 Fleet (`fleets` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(120) NOT NULL | Fleet name |
| registration_no | VARCHAR(64) NULLABLE | Transport registration |
| contact_name | VARCHAR(120) NOT NULL | Primary contact |
| contact_email | VARCHAR(120) NOT NULL UNIQUE | Contact email |
| contact_phone | VARCHAR(32) NULLABLE | Phone |
| address | TEXT NULLABLE | HQ address |
| city | VARCHAR(64) NULLABLE | Operating hub city |
| latitude | FLOAT NULLABLE | Hub geo coordinate |
| longitude | FLOAT NULLABLE | Hub geo coordinate |
| status | VARCHAR(24) NOT NULL | `ACTIVE` / `PENDING` / `SUSPENDED` |
| created_at | DATETIME NOT NULL | UTC timestamp |
| updated_at | DATETIME NOT NULL | UTC timestamp |

**Relationships:** has_many users, vehicles, tyres, trips, alerts, inspections (all cascade delete)

**`to_dict()` computed fields:** `vehicle_count`, `fitted_tyres_count`, `active_alerts_count`, `health_summary` (healthy/warning/critical tyre counts)

---

### 4.2 User (`users` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) FK NULLABLE | `fleets.id`, NULL for SUPER_ADMIN |
| username | VARCHAR(64) NOT NULL UNIQUE | Login handle |
| email | VARCHAR(120) NOT NULL UNIQUE | Login email |
| password_hash | VARCHAR(256) NOT NULL | bcrypt hash |
| full_name | VARCHAR(120) NOT NULL | Full name |
| role | VARCHAR(32) NOT NULL | `SUPER_ADMIN` / `FLEET_MANAGER` / `DRIVER` |
| phone_number | VARCHAR(32) NULLABLE | Phone |
| driver_license_no | VARCHAR(64) NULLABLE | Driver license (DRIVER role) |
| assigned_vehicle_id | VARCHAR(36) NULLABLE | For DRIVER role |
| is_active | BOOLEAN NOT NULL | Account enabled flag |
| created_at | DATETIME NOT NULL | |
| updated_at | DATETIME NOT NULL | |

**Relationships:** belongs_to fleet, many_to_many managed_fleets (via `user_fleets`), has_many trips, has_many inspections

**Methods:** `set_password(str)`, `check_password(str) -> bool`, `authorized_fleets` property (primary + managed)

---

### 4.3 UserFleets (`user_fleets` table — junction)

| Field | Type | Notes |
|---|---|---|
| user_id | VARCHAR(36) PK FK | `users.id` CASCADE |
| fleet_id | VARCHAR(36) PK FK | `fleets.id` CASCADE |

Enables FLEET_MANAGER to manage multiple fleets without cross-customer data access.

---

### 4.4 Vehicle (`vehicles` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| vehicle_number | VARCHAR(32) NOT NULL | Registration plate |
| vehicle_type | VARCHAR(32) NOT NULL | `HEAVY_TRUCK` / `LIGHT_TRUCK` / `BUS` / `PASSENGER_CAR` |
| wheel_config | VARCHAR(32) NOT NULL | `4-Wheeler` / `6-Wheeler` / `10-Wheeler` / `12-Wheeler` |
| axle_count | INTEGER NOT NULL | 2, 3, or 4 |
| layout_json | TEXT NOT NULL | JSON: axle types + wheel positions + x_offsets |
| make | VARCHAR(64) NULLABLE | Manufacturer (Tata, Ashok Leyland) |
| model | VARCHAR(64) NULLABLE | Model name |
| year | INTEGER NULLABLE | Year of manufacture |
| baseline_pressure | FLOAT NOT NULL | Recommended cold psi (110 for HEAVY_TRUCK) |
| baseline_mileage | FLOAT NOT NULL | Nominal km/L (4.5 for HEAVY_TRUCK) |
| current_odometer | FLOAT NOT NULL | Verified monotonic km |
| current_latitude | FLOAT NULLABLE | Last known lat |
| current_longitude | FLOAT NULLABLE | Last known lon |
| current_location_name | VARCHAR(120) NULLABLE | Human-readable checkpoint |
| location_updated_at | DATETIME NULLABLE | Last location update |
| location_source | VARCHAR(32) NOT NULL | `SIMULATED` / `LIVE_TPMS_GPS` / `CHECKPOINT` / `UNAVAILABLE` |
| status | VARCHAR(24) NOT NULL | `ACTIVE` / `IN_MAINTENANCE` / `DECOMMISSIONED` |
| created_at | DATETIME NOT NULL | |

**Wheel Layout JSON Structure (example 10-Wheeler):**
```json
{
  "layout_type": "10-Wheeler",
  "axle_count": 3,
  "total_wheels": 10,
  "axles": [
    {"index": 1, "type": "STEER",         "dual": false, "positions": ["FL", "FR"],                         "x_offset": 2.6},
    {"index": 2, "type": "DRIVE_FORWARD", "dual": true,  "positions": ["R1_LO","R1_LI","R1_RI","R1_RO"],   "x_offset": -1.4},
    {"index": 3, "type": "DRIVE_REAR",    "dual": true,  "positions": ["R2_LO","R2_LI","R2_RI","R2_RO"],   "x_offset": -2.7}
  ]
}
```

**Properties:** `layout` (parsed JSON), `active_fitments` (list of TyreFitment where removed_at is None)

---

### 4.5 Tyre (`tyres` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| serial_number | VARCHAR(64) NOT NULL UNIQUE | Permanent barcode/RFID |
| brand | VARCHAR(64) NOT NULL | e.g. `JK Tyre` |
| model | VARCHAR(64) NOT NULL | e.g. `Jetway JUH5`, `Jetsteel JDH3` |
| size | VARCHAR(32) NOT NULL | e.g. `295/80R22.5` |
| blueprint_nsd | FLOAT NOT NULL | Virgin NSD in mm (default 16.5) |
| current_nsd | FLOAT NOT NULL | Latest measured NSD in mm |
| retread_count | INTEGER NOT NULL | Number of retreads (default 0) |
| total_km_run | FLOAT NOT NULL | Cumulative km across all fitments |
| current_thi | FLOAT NULLABLE | Latest THI score (0–100) |
| thi_status | VARCHAR(16) NOT NULL | `HEALTHY`/`WARNING`/`CRITICAL`/`UNKNOWN` |
| status | VARCHAR(24) NOT NULL | `FITTED`/`IN_INVENTORY`/`RETREADING`/`SCRAPPED` |
| lifecycle_type | VARCHAR(16) NOT NULL | `NEW`/`REUSE`/`RETREAD`/`SCRAP` |
| created_at | DATETIME NOT NULL | |
| updated_at | DATETIME NOT NULL | |

**Properties:** `active_fitment`, `wear_percentage` (computed from blueprint vs current NSD)

**Relationships:** belongs_to fleet, has_many fitments (ordered by fitted_at desc), has_many thi_records (dynamic), has_many alerts, has_many inspections, has_many lifecycle_history

---

### 4.6 TyreFitment (`tyre_fitments` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| tyre_id | VARCHAR(36) NOT NULL FK | `tyres.id` CASCADE |
| vehicle_id | VARCHAR(36) NOT NULL FK | `vehicles.id` CASCADE |
| axle_number | INTEGER NOT NULL | 1-indexed axle |
| wheel_position | VARCHAR(16) NOT NULL | `FL`/`FR`/`RL`/`RR`/`R1_LO`/`R1_LI`/`R1_RI`/`R1_RO` etc. |
| is_dual | BOOLEAN NOT NULL | True for dual-wheel positions |
| is_inner | BOOLEAN NOT NULL | True for inner of dual pair |
| fitted_at | DATETIME NOT NULL | Mount timestamp |
| fitted_odometer | FLOAT NOT NULL | Vehicle odometer at mount |
| fitted_nsd | FLOAT NOT NULL | Tyre NSD at mount |
| removed_at | DATETIME NULLABLE | Dismount timestamp (NULL = currently fitted) |
| removed_odometer | FLOAT NULLABLE | Vehicle odometer at removal |
| removal_reason | VARCHAR(64) NULLABLE | `PUNCTURE`/`SCHEDULED_ROTATION`/`RETREAD`/`WORN_OUT`/`REPLACED_BY_ROTATION`/`REMOUNTED`/`DEPOT_REMOVAL` etc. |

**Property:** `is_currently_fitted` (removed_at is None)

---

### 4.7 Trip (`trips` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| vehicle_id | VARCHAR(36) NOT NULL FK | `vehicles.id` CASCADE |
| driver_id | VARCHAR(36) NOT NULL FK | `users.id` RESTRICT |
| trip_code | VARCHAR(32) NOT NULL UNIQUE | e.g. `TRP-1234-A1B2` |
| origin | VARCHAR(120) NOT NULL | Departure hub |
| destination | VARCHAR(120) NOT NULL | Arrival hub |
| start_time | DATETIME NOT NULL | Departure timestamp |
| start_odometer | FLOAT NOT NULL | Vehicle km at departure |
| end_time | DATETIME NULLABLE | Arrival timestamp |
| end_odometer | FLOAT NULLABLE | Vehicle km at arrival |
| distance_km | FLOAT NULLABLE | Computed distance |
| trip_score | FLOAT NULLABLE | 0–100 Trip Score |
| trip_score_status | VARCHAR(16) NULLABLE | `EXCELLENT`/`GOOD`/`AVERAGE`/`POOR` |
| score_breakdown_json | TEXT NULLABLE | JSON with component scores and explanations |
| status | VARCHAR(24) NOT NULL | `IN_PROGRESS`/`COMPLETED`/`CANCELLED` |
| created_at | DATETIME NOT NULL | |

**Property:** `score_breakdown` (parsed JSON)

---

### 4.8 TelemetryRecord (`telemetry_records` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| vehicle_id | VARCHAR(36) NOT NULL FK | `vehicles.id` CASCADE |
| tyre_id | VARCHAR(36) NULLABLE FK | `tyres.id` SET NULL |
| wheel_position | VARCHAR(16) NOT NULL | Wheel position code |
| timestamp | DATETIME NOT NULL | Measurement timestamp |
| pressure_psi | FLOAT NULLABLE | Measured pressure |
| temperature_c | FLOAT NULLABLE | Measured temperature in °C |
| speed_kmh | FLOAT NULLABLE | Vehicle speed |
| battery_soc | FLOAT NULLABLE | TPMS sensor battery % |
| odometer_km | FLOAT NULLABLE | Vehicle odometer at reading |
| is_stale | BOOLEAN NOT NULL | True if reading > 30 min old |
| is_faulty | BOOLEAN NOT NULL | True if sensor anomaly flagged |
| provenance | VARCHAR(32) NOT NULL | `SYNTHETIC`/`TREEL_MOCK`/`TREEL_LIVE`/`MANUAL` |

---

### 4.9 THIRecord (`thi_records` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| tyre_id | VARCHAR(36) NOT NULL FK | `tyres.id` CASCADE |
| vehicle_id | VARCHAR(36) NULLABLE FK | `vehicles.id` SET NULL |
| calculated_at | DATETIME NOT NULL | Evaluation timestamp |
| score | FLOAT NOT NULL | Overall THI 0.0–100.0 |
| status | VARCHAR(16) NOT NULL | `HEALTHY`/`WARNING`/`CRITICAL`/`UNKNOWN` |
| pressure_score | FLOAT NULLABLE | Pressure sub-score |
| temp_score | FLOAT NULLABLE | Temperature sub-score |
| wear_score | FLOAT NULLABLE | Tread wear sub-score |
| rrc_score | FLOAT NULLABLE | Rolling resistance sub-score |
| inputs_json | TEXT NOT NULL | Raw input values with units |
| explanation | TEXT NOT NULL | Plain English explanation |
| rule_version | VARCHAR(32) NOT NULL | `v1.0.0-demo-provisional` |

---

### 4.10 Alert (`alerts` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| vehicle_id | VARCHAR(36) NULLABLE FK | `vehicles.id` CASCADE |
| tyre_id | VARCHAR(36) NULLABLE FK | `tyres.id` CASCADE |
| wheel_position | VARCHAR(16) NULLABLE | Wheel position |
| code | VARCHAR(16) NOT NULL | `PR01`–`PR09`, `TP03`, `TP04`, `TP07`, `TD03`, `TD05`, `TD07`, `BT01` |
| category | VARCHAR(32) NOT NULL | `PRESSURE`/`TEMPERATURE`/`WEAR`/`BATTERY`/`SPEED` |
| severity | VARCHAR(16) NOT NULL | `NORMAL`/`WARNING`/`RISK`/`CRITICAL` |
| observed_value | FLOAT NULLABLE | Triggering measurement |
| unit | VARCHAR(16) NULLABLE | `psi`/`deg C`/`mm`/`km/h`/`%` |
| explanation | TEXT NOT NULL | Physical explanation |
| recommended_action | TEXT NOT NULL | Corrective instruction |
| status | VARCHAR(24) NOT NULL | `ACTIVE`/`ACKNOWLEDGED`/`RESOLVED` |
| acknowledged_by | VARCHAR(36) NULLABLE FK | `users.id` SET NULL |
| acknowledged_at | DATETIME NULLABLE | |
| resolved_by | VARCHAR(36) NULLABLE FK | `users.id` SET NULL |
| resolved_at | DATETIME NULLABLE | |
| resolution_note | TEXT NULLABLE | Work order / action taken |
| created_at | DATETIME NOT NULL | |

---

### 4.11 Inspection (`inspections` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| vehicle_id | VARCHAR(36) NOT NULL FK | `vehicles.id` CASCADE |
| tyre_id | VARCHAR(36) NOT NULL FK | `tyres.id` CASCADE |
| inspector_id | VARCHAR(36) NOT NULL FK | `users.id` RESTRICT |
| measured_nsd | FLOAT NOT NULL | NSD in mm |
| measured_pressure | FLOAT NULLABLE | Cold psi |
| odometer_at_inspection | FLOAT NOT NULL | Vehicle km |
| visual_condition | VARCHAR(32) NOT NULL | `NORMAL`/`UNEVEN_WEAR`/`SIDEWALL_CUT`/`BULGE`/`PUNCTURE` |
| photo_url | VARCHAR(256) NULLABLE | Secure storage path |
| notes | TEXT NULLABLE | Inspector notes |
| inspected_at | DATETIME NOT NULL | |
| inspection_result | VARCHAR(24) NOT NULL | `PASS`/`WARNING`/`FAIL`/`FURTHER_ASSESSMENT` (default PASS) |
| lifecycle_type_change | VARCHAR(16) NULLABLE | `NEW`/`REUSE`/`RETREAD`/`SCRAP` if changed |
| lifecycle_reason | VARCHAR(256) NULLABLE | Reason for lifecycle change |
| retread_date | DATETIME NULLABLE | Retread scheduled date |
| retread_provider | VARCHAR(128) NULLABLE | Retreading vendor |
| retread_count_after | INTEGER NULLABLE | Retread count post-operation |
| temperature_at_inspection | FLOAT NULLABLE | Ambient/tyre temperature at time of inspection |

---

### 4.12 TyreLifecycleHistory (`tyre_lifecycle_history` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| tyre_id | VARCHAR(36) NOT NULL FK | `tyres.id` CASCADE |
| fleet_id | VARCHAR(36) NOT NULL FK | `fleets.id` CASCADE |
| previous_lifecycle_type | VARCHAR(16) NOT NULL | Before transition |
| new_lifecycle_type | VARCHAR(16) NOT NULL | After transition |
| previous_status | VARCHAR(24) NULLABLE | Tyre status before |
| new_status | VARCHAR(24) NULLABLE | Tyre status after |
| related_inspection_id | VARCHAR(36) NULLABLE FK | `inspections.id` SET NULL |
| related_fitment_id | VARCHAR(36) NULLABLE FK | `tyre_fitments.id` SET NULL |
| changed_by_user_id | VARCHAR(36) NOT NULL FK | `users.id` RESTRICT |
| reason | VARCHAR(256) NULLABLE | Reason for change |
| remarks | TEXT NULLABLE | Extended notes |
| nsd_at_change | FLOAT NULLABLE | NSD at time of change |
| km_at_change | FLOAT NULLABLE | Odometer at time of change |
| retread_count | INTEGER NULLABLE | Post-retread count |
| scrap_reason | VARCHAR(256) NULLABLE | Reason for scrapping |
| created_at | DATETIME NOT NULL | |

---

### 4.13 AuditLog (`audit_logs` table)

| Field | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| user_id | VARCHAR(36) NULLABLE FK | `users.id` SET NULL |
| fleet_id | VARCHAR(36) NULLABLE FK | `fleets.id` CASCADE |
| action | VARCHAR(64) NOT NULL | `USER_LOGIN`/`FLEET_REGISTERED`/`TYRE_FITTED`/`TYRE_REMOVED`/`INSPECTION_SUBMITTED`/`TRIP_STARTED`/`TRIP_COMPLETED`/`ALERT_ACKNOWLEDGED`/`ALERT_RESOLVED`/`TYRE_SCRAPPED`/`CONFIG_CHANGED` |
| resource_type | VARCHAR(32) NOT NULL | `USER`/`FLEET`/`TYRE`/`VEHICLE`/`TRIP`/`INSPECTION`/`ALERT` |
| resource_id | VARCHAR(64) NULLABLE | Target entity UUID |
| details_json | TEXT NULLABLE | Before/after state JSON |
| ip_address | VARCHAR(48) NULLABLE | Client IP |
| timestamp | DATETIME NOT NULL | |

---

## 5. API Reference

All endpoints are prefixed `/api/v1/`. JWT token in `Authorization: Bearer <token>` header is required for all endpoints except `/auth/login`, `/auth/register`, and `/treel/provider-info`.

### 5.1 Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns `status`, `service`, `demo_mode`, `rule_version` |

---

### 5.2 Auth (`/api/v1/auth`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | None | `company_name`, `contact_name`, `email`, `password`, `phone?`, `registration_no?`, `address?` | Creates Fleet + FLEET_MANAGER User, returns `{token, user, fleet}` |
| POST | `/auth/login` | None | `email`, `password` | Returns `{token, user}` |
| GET | `/auth/me` | JWT | — | Returns `{user, fleet}` for current session |

---

### 5.3 Admin (`/api/v1/admin`) — SUPER_ADMIN only

| Method | Path | Description |
|---|---|---|
| GET | `/admin/platform-stats` | Cross-fleet totals: fleets, vehicles, tyres, active_alerts, tyre_health_summary |
| GET | `/admin/fleets` | All fleets ordered by created_at desc |
| GET | `/admin/users` | All users ordered by created_at desc |
| GET | `/admin/audit-logs?limit=100` | Audit logs, max 500, ordered by timestamp desc |
| GET | `/admin/map-locations` | Geographic fleet/vehicle markers with freshness indicators for India map |

**Map-locations response shape:**
```json
{
  "metrics": { "total_fleets", "active_fleets", "total_vehicles", "mapped_vehicles", "unmapped_vehicles", "freshness_breakdown": {...} },
  "fleets": [{ "id", "name", "city", "latitude", "longitude", "status", "vehicle_count", "active_alerts_count", "provenance": "SYNTHETIC" }],
  "vehicles": [{ "id", "vehicle_number", "fleet_id", "fleet_name", "latitude", "longitude", "location_name", "location_source", "location_freshness": "CURRENT|STALE|SIMULATED|UNAVAILABLE", "wheel_config", "vehicle_type", "status", "current_odometer", "average_thi", "active_alerts_count", "location_updated_at", "provenance": "SYNTHETIC" }],
  "disclaimer": "..."
}
```

---

### 5.4 Fleets (`/api/v1/fleets`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/fleets/profile?fleet_id=` | JWT | Fleet profile (scoped) |
| GET | `/fleets/stats?fleet_id=` | JWT | Vehicle/tyre/trip/alert counts + health distribution |
| GET | `/fleets/my-fleets?search=&status=` | JWT | All authorized fleets; SUPER_ADMIN returns all; supports search (name, city, registration, contact) and status filter |
| GET | `/fleets/<fleet_id>` | JWT | Specific fleet by ID |

---

### 5.5 Vehicles (`/api/v1/vehicles`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/vehicles?fleet_id=` | JWT | List vehicles sorted by vehicle_number |
| GET | `/vehicles/<id>` | JWT | Vehicle detail with active fitments |
| GET | `/vehicles/<id>/3d-twin` | JWT | 3D digital-twin metadata: wheel layout + live tyre health colors + THI + pressure/temp per position |
| GET | `/vehicles/<id>/fitment-history` | JWT | Full fitment history ordered by fitted_at desc |

**3D-twin response:** `{ vehicle_id, vehicle_number, vehicle_type, wheel_config, axle_count, baseline_pressure, current_odometer, wheels: [{ axle_index, axle_type, wheel_position, x_offset, is_dual, is_left, is_inner, health_color, status, tyre: {...} }] }`

---

### 5.6 Tyres (`/api/v1/tyres`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tyres?fleet_id=&status=&health=` | JWT | List tyres; optional status filter (FITTED/IN_INVENTORY/RETREADING/SCRAPPED), health filter (HEALTHY/WARNING/CRITICAL/UNKNOWN) |
| GET | `/tyres/available` | JWT | Tyres eligible for fitment (excludes SCRAPPED, FITTED, SCRAP lifecycle). **Must be registered before `/<id>` route.** |
| GET | `/tyres/<id>` | JWT | Full tyre detail: wear estimates, active alerts, 15 most recent THI records |
| POST | `/tyres/<id>/fit` | JWT | Mount tyre to vehicle. Body: `{vehicle_id, wheel_position, axle_number, fitted_odometer?, fitted_nsd?, remarks?}`. Rejects SCRAPPED/SCRAP lifecycle. Auto-closes previous fitment, auto-closes existing tyre at target position |
| POST | `/tyres/<id>/remove` | JWT | Dismount tyre. Body: `{removal_reason}`. Returns tyre to IN_INVENTORY |
| GET | `/tyres/<id>/lifecycle-history` | JWT | Ordered lifecycle change history |

---

### 5.7 Trips (`/api/v1/trips`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/trips?fleet_id=&vehicle_id=&status=&start_date=&end_date=` | JWT | List trips (max 100), ordered by start_time desc. vehicle_id filter validates fleet isolation (403 if unauthorized) |
| GET | `/trips/<id>` | JWT | Trip detail with score breakdown |

---

### 5.8 Inspections (`/api/v1/inspections`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inspections?fleet_id=&vehicle_id=&tyre_id=` | JWT | List inspections (max 100) |
| GET | `/inspections/vehicle/<id>` | JWT | Vehicle inspection summary: physical positions + tyre data + latest inspection per tyre + last 10 inspections |
| POST | `/inspections` | JWT | Create inspection (JSON or multipart with photo). Validates odometer monotonic. Handles lifecycle transitions atomically. Triggers alert evaluation |
| GET | `/inspections/photo/<filename>` | JWT | Secure photo serving |

**POST /inspections body fields:** `vehicle_id`*, `tyre_id`*, `measured_nsd`*, `odometer`*, `measured_pressure?`, `visual_condition?`, `notes?`, `inspection_result?` (PASS/WARNING/FAIL/FURTHER_ASSESSMENT), `lifecycle_type_change?` (NEW/REUSE/RETREAD/SCRAP), `lifecycle_reason?`, `retread_date?`, `retread_provider?`, `retread_count_after?`, `temperature_at_inspection?`, `photo` (multipart only)

**Business rules enforced:**
- Cannot scrap a tyre that is currently fitted (400)
- Cannot reclassify as NEW after mileage accumulated (400)
- RETREAD increments `retread_count`, sets status to `RETREADING`, sets `current_nsd`
- All lifecycle changes recorded atomically in `tyre_lifecycle_history`
- Full rollback on any exception

---

### 5.9 Alerts (`/api/v1/alerts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/alerts?fleet_id=&status=&category=&severity=` | JWT | List alerts (max 150) |
| POST | `/alerts/<id>/acknowledge` | JWT | Acknowledge alert; records user + timestamp |
| POST | `/alerts/<id>/resolve` | JWT | Resolve alert; requires `resolution_note` in body |

---

### 5.10 Analytics (`/api/v1/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/summary?fleet_id=` | JWT | Total tyres, avg THI, health counts, score buckets (0-40/41-60/61-80/81-100) |
| GET | `/analytics/trends?fleet_id=&days=14&vehicle_id=` | JWT | Daily aggregated THI + pressure + thermal scores. Returns `ideal_baseline: 95.0` reference line. Max 30 days |
| GET | `/analytics/comparison?fleet_id=&vehicle_ids=v1,v2,...` | JWT | Per-vehicle: avg THI, odometer, fitted wheels, alert count. Min 2, max 10 vehicles (400 if outside) |
| GET | `/analytics/ml-model` | JWT | ML model status: Linear Regression + Random Forest metrics (MAE, RMSE, R2) |
| POST | `/analytics/ml-model` | JWT | Interactive prediction. Body: `{achieved_km, is_steer}`. Returns `{predicted_wear_mm_linear, predicted_wear_mm_rf}` |

---

### 5.11 Driver (`/api/v1/driver`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/driver/assigned-vehicle` | JWT | Returns driver's assigned vehicle or first active vehicle in fleet |
| GET | `/driver/active-trip` | JWT | Returns current IN_PROGRESS trip or null |
| POST | `/driver/start-trip` | JWT | Body: `{vehicle_id, origin, destination, start_odometer}`. Validates monotonic odometer. Prevents duplicate active trips. Returns trip |
| POST | `/driver/end-trip` | JWT | Body: `{trip_id?, end_odometer}`. Validates end_odo > start_odo. Calculates trip score. Updates vehicle odometer |
| GET | `/driver/alerts` | JWT | Active alerts for driver's vehicle (max 20) |

---

### 5.12 TREEL TPMS (`/api/v1/treel`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/treel/ingest` | None | Accepts raw TPMS payload. Normalizes units (bar/kPa→psi, °F→°C). Quarantines malformed records. Stores `TelemetryRecord`. Triggers live THI + alert evaluation per wheel |
| GET | `/treel/provider-info` | None | Returns adapter metadata |

**Payload structure:** `{ vehicle_id, gateway_id?, timestamp, readings: [{ sensor_id, position/wheel_position, pressure, pressure_unit?, temperature, temp_unit?, battery_pct? }] }`

---

### 5.13 Export (`/api/v1/export`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/export/excel?fleet_id=` | JWT | Downloads 13-sheet .xlsx workbook. SUPER_ADMIN can cross-fleet. Excludes password hashes |
| GET | `/export/csv?table=vehicles|tyres|trips|alerts&fleet_id=` | JWT | Downloads CSV for specified table |

---

## 6. Business Logic & Services

### 6.1 THIEngine (`backend/app/services/thi_engine.py`)

**Version:** `v1.0.0-demo-provisional`

**Purpose:** Deterministic, explainable Tyre Health Index calculation in [0, 100].

**Inputs:** `pressure_psi`, `temperature_c`, `current_nsd_mm`, `blueprint_nsd_mm` (default 16.5), `vehicle_type` (for baseline pressure lookup), `speed_kmh`, `is_stale`, `is_faulty`

**Algorithm:**

1. **Faulty sensor check** → returns score 0.0, status CRITICAL, explanation about sensor fault
2. **Stale data check** → returns score 50.0, status UNKNOWN, explanation about no heartbeat
3. **Missing telemetry** (both P and T null) → score 50.0, status UNKNOWN
4. **Pressure evaluation** (weight 0.40):
   - `>20%` under-inflation → 10 pts (CRITICAL)
   - `>10%` under-inflation → 65 pts (WARNING)
   - `>20%` over-inflation → 30 pts (CRITICAL)
   - `>10%` over-inflation → 75 pts (WARNING)
   - Normal → 100 pts
5. **Temperature evaluation** (weight 0.25):
   - `>85°C` → 15 pts (CRITICAL) — immediate cooling required
   - `>65°C` → 65 pts (WARNING)
   - `<0°C` → 85 pts (WARNING)
   - Normal → 100 pts
6. **Tread wear evaluation** (weight 0.25):
   - NSD ≤ 3.0 mm → 0 pts (CRITICAL) — safety limit
   - Wear ≥ 85% → 20 pts (CRITICAL)
   - Wear ≥ 70% → 55 pts (WARNING)
   - Wear ≥ 50% → 80 pts
   - `<50%` wear → 100 pts
   - NSD not measured → 90 pts default
7. **RRC/severity proxy** (weight 0.10): `min(p_score, t_score)` when either < 70, else 100
8. **Safety-critical capping:** If any key factor is CRITICAL, final score capped at `min(45.0, min(p,t,w) + 15)`. If any WARNING, capped at 78.0.
9. **Status assignment:** HEALTHY [80–100], WARNING [50–79], CRITICAL [0–49]

**Baseline pressures by vehicle type:** HEAVY_TRUCK=110 psi, LIGHT_TRUCK=65 psi, BUS=105 psi, PASSENGER_CAR=32 psi

---

### 6.2 TripScoreEngine (`backend/app/services/trip_score_engine.py`)

**Version:** `v1.0.0-trip-provisional`

**Purpose:** Explainable Trip Score in [0, 100] from telemetry stream.

**Inputs:** `telemetry_samples` list, `baseline_pressure`, `baseline_mileage`

**Algorithm:**
1. **Empty samples** → default score 85.0, status GOOD (provisional)
2. **Pressure compliance** (weight 0.35): counts samples > 15% under-inflation; compliance_ratio = 1 - (severe_under / total); score = `max(20, compliance_ratio * 100)`
3. **Thermal stability** (weight 0.25): if max temp > 85°C → 30 pts; high_temp_count (>70°C) scales from 50–100; else 100
4. **Speed compliance** (weight 0.25): excessive speed (>100 km/h) reduces score from 60 by 5×count; over-speed (>85 km/h) scales from 50–100
5. **Fuel efficiency** (weight 0.15): fixed 90.0 (placeholder, no odometer-based calculation yet)
6. **Status:** EXCELLENT ≥85, GOOD ≥70, AVERAGE ≥50, POOR <50

---

### 6.3 AlertEngine (`backend/app/services/alert_engine.py`)

**Purpose:** Generates deduplicated operational alerts from telemetry and inspection events.

**Alert codes implemented:**

| Code | Category | Severity | Trigger |
|---|---|---|---|
| PR01 | PRESSURE | WARNING | Under-inflation >10% but ≤20% |
| PR02 | PRESSURE | CRITICAL | Severe under-inflation >20% |
| PR03 | PRESSURE | WARNING | Over-inflation >10% but ≤20% |
| PR04 | PRESSURE | CRITICAL | Severe over-inflation >20% |
| PR06 | PRESSURE | CRITICAL | Rapid pressure drop (not currently auto-triggered, only in catalogue) |
| PR09 | PRESSURE | RISK | Implausible pressure (< 0 or > 2.5x baseline) |
| TP03 | TEMPERATURE | WARNING | Temperature > 65°C |
| TP04 | TEMPERATURE | CRITICAL | Temperature > 85°C |
| TP07 | TEMPERATURE | RISK | Implausible temperature (< -40 or > 150°C) |
| TD03 | WEAR | WARNING | Tread wear ≥ 70% (NSD < 30% of blueprint) |
| TD05 | WEAR | RISK | Uneven wear (inspection visual condition) — in catalogue, not auto-triggered |
| TD07 | WEAR | CRITICAL | NSD ≤ 3.0 mm (legal limit) |
| BT01 | BATTERY | WARNING | TPMS sensor battery < 20% |

**Deduplication:** 30-minute cooldown window — no duplicate alert for same fleet/vehicle/code within 30 minutes.

**State machine:** ACTIVE → ACKNOWLEDGED → RESOLVED (one-way, each step requires explicit action)

---

### 6.4 WearEngine (`backend/app/services/wear_engine.py`)

**Purpose:** Linear Remaining Useful Life (RUL) estimation.

**Algorithm:**
- Requires ≥ 1,000 km and ≥ 0.1 mm wear to produce an estimate
- `wear_rate_per_km = worn_mm / total_km_run`
- `usable_tread = current_nsd - 3.0 mm` (critical limit)
- `projected_remaining_km = usable_tread / wear_rate_per_km`
- Confidence: HIGH if ≥ 3 inspection records and > 10,000 km; else MODERATE
- Returns `INSUFFICIENT_HISTORY` status if data inadequate

---

### 6.5 TyreWearMLService (`backend/app/services/ml_service.py`)

**Version:** `v1.0.0-baseline-tabular`

**Purpose:** Tabular ML demonstration — NOT used for THI scoring.

**Models trained:**
1. **Linear Regression** — baseline
2. **Random Forest Regressor** — 50 trees, max_depth=6

**Features:** `achieved_km`, `is_steer` (boolean)

**Target:** `wear_mm` (NSD worn since virgin)

**Training data:** 400 synthetic samples (seed=42) with physical wear rates 0.18–0.28 mm/10,000 km; steer axles wear 0.03 mm/10,000 km faster.

**Train/test split:** 75%/25%, random_state=42

**Disclaimer:** "Synthetic demonstration model. Not evidence of real-world OEM performance."

---

### 6.6 MockTreelAdapter (`backend/app/services/treel_provider.py`)

**Purpose:** Decoupled TPMS integration adapter (pluggable interface design).

**Unit normalization:**
- Pressure: bar → psi (`× 14.5038`), kPa → psi (`× 0.145038`)
- Temperature: °F → °C (`(F - 32) × 5/9`)

**Validation / quarantine rules:**
- Both pressure and temperature null → quarantine
- Pressure < 0 or > 300 (raw units) → quarantine
- Temperature < -40 or > 150°C → quarantine

**Normalizes:** sensor_id, wheel_position, pressure_psi, temperature_c, battery_soc, timestamp (ISO 8601 string → datetime)

**Abstract base class:** `BaseTPMSProvider` with abstract `ingest_payload()` method — ready for real TREEL production adapter.

---

## 7. Frontend Structure

### 7.1 Entry Point & Bootstrap

```
frontend/src/main.tsx  →  <BrowserRouter> + <QueryClientProvider> + <App>
frontend/src/App.tsx   →  route tree + ProtectedRoute guard
```

### 7.2 State Management

- **Zustand (`authStore.ts`)**: `token`, `user` (id, role, fleet_id), `isAuthenticated`, `activeFleetId`, `activeFleetName`
  - Persisted to `localStorage` keys: `jk_token`, `jk_user`, `jk_active_fleet_id`, `jk_active_fleet_name`
  - Actions: `login()`, `logout()`, `setActiveFleet()`
- **TanStack React Query**: server state — all API data, automatic caching and refetch
- **Local component state (`useState`)**: form values, filter selections, modal open/close

### 7.3 API Client (`services/api.ts`)

- Axios instance with `baseURL: '/api/v1'`
- **Request interceptor:** injects `Authorization: Bearer <token>` and `X-Fleet-ID: <activeFleetId>` from localStorage on every request
- **Response interceptor:** on 401, clears `jk_token` + `jk_user` and redirects to `/login` (NOTE: does NOT clear fleet localStorage keys — identified gap)

### 7.4 Offline Queue (`services/offlineQueue.ts`)

- localStorage-based queue for DRIVER role offline operations
- Supports `TRIP_START`, `TRIP_END`, `INSPECTION` queue types
- `enqueue()`, `flush()` (attempts sync), `clear()`
- Auto-flush on `window.online` event
- Keeps SYNCED items for 1 hour before cleanup

### 7.5 Routing Structure (`App.tsx`)

**Public routes (no auth):**
- `/` → `LandingPage`
- `/login` → `LoginPage`
- `/register` → `RegisterPage`

**Authenticated routes (all behind `ProtectedRoute` + `AppLayout`):**
- `/dashboard` → `DashboardPage`
- `/my-fleets` → `MyFleetsPage`
- `/vehicles` → `VehiclesPage`
- `/vehicles/:id` → `VehicleDetailPage`
- `/vehicles/:id/inspections` → `VehicleInspectionPage`
- `/tyres` → `TyresPage`
- `/tyres/:id` → `TyreDetailPage`
- `/trips` → `TripsPage`
- `/inspections` → `InspectionsPage`
- `/fitment` → `FitmentPage`
- `/alerts` → `AlertsPage`
- `/trends` → `TrendsPage`
- `/comparison` → `ComparisonPage`
- `/reports` → `ReportsPage`
- `/admin` → `AdminDashboardPage`
- `/admin/map` → `AdminMapPage`
- `/admin/*` → `AdminDashboardPage` (wildcard)
- `/driver` → `DriverPortalPage`

**Post-login redirect:**
- SUPER_ADMIN → `/admin`
- DRIVER → `/driver`
- FLEET_MANAGER → `/my-fleets`
- Fallback → `/dashboard`

### 7.6 Layout

`AppLayout.tsx`: dark slate (`bg-slate-950`) full-screen flex layout
- `Navbar.tsx` (fixed top, 64px height): JK brand logo, role badge, active fleet name, Dev Mode indicator, logout button
- `Sidebar.tsx` (fixed left, 256px): role-switched nav links (fleetLinks/adminLinks/driverLinks), Rule Engine version note at bottom
- `<main>` (scrollable, max-w-7xl, p-6/p-8): React Router `<Outlet>` renders active page

### 7.7 Component Hierarchy

```
App
├── LandingPage / LoginPage / RegisterPage (public)
└── AppLayout (authenticated)
    ├── Navbar
    ├── Sidebar
    └── [Pages via Outlet]
        ├── DashboardPage
        │   └── recharts PieChart (THI distribution)
        │   └── Alert list (recent 5)
        │   └── Trip table (recent 5)
        ├── MyFleetsPage (fleet card grid)
        ├── VehiclesPage
        │   └── VehicleViewer3D (modal, Three.js/R3F)
        │       ├── ProceduralCommercialVehicle (3D truck mesh)
        │       └── TyreDetailsPanel (right flyout)
        ├── VehicleDetailPage
        ├── VehicleInspectionPage (per-wheel inspection with lifecycle modal)
        ├── TyresPage
        │   └── TyreCard (×N)
        │       ├── TyreHealthy / TyreWarning / TyreCritical (inline SVG)
        │       └── Link → /tyres/:id
        ├── TyreDetailPage
        ├── FitmentPage (fit/remove tyre modals)
        ├── TripsPage
        ├── InspectionsPage (with lifecycle decision form)
        ├── AlertsPage (acknowledge/resolve workflow)
        ├── TrendsPage (Recharts: ComposedChart + LineChart + ML playground)
        ├── ComparisonPage (2–10 vehicle checkbox + Recharts BarChart)
        ├── ReportsPage (Excel + CSV download buttons)
        ├── AdminDashboardPage (tab: Fleets / Users / Audit)
        ├── AdminMapPage (SVG India map)
        └── DriverPortalPage (trip start/end + offline queue)
```

### 7.8 Key Page Details

#### DashboardPage
- 4 KPI cards (vehicles, tyres, active trips, active alerts)
- Recharts `PieChart` (donut) — THI distribution
- Active alerts list (recent 5, real-time)
- Recent trips table (recent 5 with Trip Score)
- Queries: `['fleet-stats']`, `['active-alerts']`, `['recent-trips']`
- **Known gap:** query keys do not include `activeFleetId` — stale cache possible after fleet switch

#### VehiclesPage
- Full table with 4 action buttons per row: Details, 3D View, Inspection, Trips
- 3D View opens inline modal with `VehicleViewer3D`
- `VehicleViewer3D` loads `GET /vehicles/:id/3d-twin` and renders procedural Three.js truck

#### TyresPage
- Visual card grid (1/2/3 cols responsive)
- 3 summary count cards (Healthy/Warning/Critical)
- Search (client-side: serial, model, brand) + health filter pills + status dropdown
- Each tyre renders appropriate SVG component

#### TyreCard
- Inline SVG tyre image: `TyreHealthy` (deep grooves, emerald glow), `TyreWarning` (shallow grooves, amber glow), `TyreCritical` (smooth surface, red glow)
- Serial number + brand/model/size + health badge + lifecycle badge + View link

#### FitmentPage
- Vehicle selector → loads `/inspections/vehicle/:id` for positions
- Grid shows all wheel positions: fitted (with tyre details) or vacant (with Fit button)
- Fit modal: available tyres from `/tyres/available`, odometer, NSD, remarks
- Remove modal: reason select → POST `/tyres/:id/remove`

#### InspectionsPage
- Table + create modal (multipart with photo upload)
- Lifecycle Decision section: dropdown for NEW/REUSE/RETREAD/SCRAP
- SCRAP: scrap reason + warning if tyre is fitted
- RETREAD: retread date, provider, post-retread NSD
- Guard: submit disabled if SCRAP + FITTED

#### AlertsPage
- Table with severity/status filters
- Acknowledge button (one-click, records user+timestamp)
- Resolve button → modal requiring `resolution_note` text

#### TrendsPage
- `ComposedChart` (Area + dashed Line) — observed THI vs 95.0 ideal baseline
- Two `LineChart` components — pressure compliance and thermal health sub-scores
- ML playground: input distance + steer checkbox → predicts wear_mm from both models
- Time window buttons: 7/14/30 days

#### ComparisonPage
- Checkbox grid to select 2–10 vehicles (with counter badge)
- Warning message if < 2 or at 10-vehicle limit
- Recharts `BarChart` — avg THI (emerald bars) vs ideal 95.0 (yellow bars)
- Summary table with Inspect + Details links

#### DriverPortalPage
- Max-width 2xl, mobile-optimized
- Online/offline status badge (wifi indicator)
- Offline queue indicator with sync button
- Assigned vehicle card
- Active trip OR start trip form (exclusive)
- End trip form when trip active (odometer validation)
- Active alerts list (max 3)

#### AdminDashboardPage
- 4 KPI cards (platform-wide totals)
- Tab navigation: Transport Fleets / Platform Users / Security Audit Trail
- Each tab shows a table populated by respective admin API

#### AdminMapPage (SVG India map)
- Fetches `/admin/map-locations`
- Displays fleet hub markers and vehicle position markers
- Freshness indicators: CURRENT (green), STALE (amber), SIMULATED (blue), UNAVAILABLE (gray)
- Synthetic disclosure banner

---

## 8. Configuration & Environment

### 8.1 Backend Config (`backend/app/config.py`)

| Key | Default | Source | Description |
|---|---|---|---|
| `SECRET_KEY` | `dev-secret-key-jk-tyre-thi-2026` | `.env` | Flask secret key |
| `JWT_SECRET_KEY` | `dev-jwt-secret-jk-tyre-thi-2026` | `.env` | JWT signing key |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | `1440` (24h) | `.env` | Token lifetime |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///instance/jktyre.db` | `.env` `DATABASE_URL` | DB connection string |
| `SQLALCHEMY_TRACK_MODIFICATIONS` | `False` | hardcoded | SQLAlchemy event system |
| `UPLOAD_FOLDER` | `backend/uploads/` | `.env` | Photo upload directory |
| `MAX_CONTENT_LENGTH` | `16 MB` | `.env` | Max upload file size |
| `ALLOWED_EXTENSIONS` | `{png, jpg, jpeg, webp}` | hardcoded | Photo file types |
| `DEMO_MODE` | `true` | `.env` `DEMO_MODE` | Demo/synthetic mode flag |
| `RULE_ENGINE_VERSION` | `v1.0.0-demo-provisional` | hardcoded | Engine version label |

**`.env.example` keys:** `FLASK_APP`, `FLASK_ENV`, `FLASK_DEBUG`, `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`, `DATABASE_URL`, `UPLOAD_FOLDER`, `MAX_CONTENT_LENGTH`, `RATE_LIMIT_ENABLED`, `DEMO_MODE`, `SYNTHETIC_DATA_ENABLED`

### 8.2 Frontend Config

| Key | Description |
|---|---|
| `VITE_ENABLE_DEV_LOGIN` | When `"true"`, shows quick-login buttons on login page and Dev Mode badge in navbar |

**`vite.config.ts`:** Port 5173, proxy `/api/*` → `http://127.0.0.1:5000`

**`tailwind.config.js`** custom colors:
- `jk.red`: `#D9232D` — brand primary
- `jk.yellow`: `#F5C400` — fleet yellow
- `jk.dark`: `#292D32` — graphite
- CSS variable classes: `bg-fleet` (`#F5C400`), `bg-graphite` (`#292D32`), `text-secondary` (`#6B7280`), `bg-softgrey` (`#F3F4F6`), `border-bordergray` (`#E5E7EB`)

### 8.3 Flask App Factory (`backend/app/__init__.py`)

- Initializes SQLAlchemy and CORS (`r"/api/*"` → origins `"*"`)
- Registers all 12 blueprints at respective URL prefixes
- Calls `db.create_all()` on startup
- Auto-runs `migrate_v3.py` if `lifecycle_type` column is absent from `tyres` table (wrapped in try/except)
- Global routes: `GET /api/v1/health`
- Error handlers: 400, 404, 500

### 8.4 Demo Credentials

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | admin@jktyre.com | Admin@12345 |
| FLEET_MANAGER | fleet.manager@translogistics.com | Fleet@12345 |
| DRIVER | driver1@translogistics.com | Driver@12345 |

---

## 9. Work Done So Far

All 11 development stages have been completed and verified. Here is what each delivered:

### Stage A — Workspace/Source Audit & Documentation
- Inspected all 4 Excel datasets in `data_source/`
- Created `ARCHITECTURE.md`, `DATA_DICTIONARY.md`, `TESTING.md`, `PROJECT_STATUS.md`, `README.md`
- Established critical exclusion policy: "NSD Inspection Data" from `Rawwww Data.xlsx` is permanently excluded

### Stage B — Project Foundation, Schema & Synthetic Generator
- Flask factory pattern with SQLAlchemy models
- SQLite schema with PostgreSQL-compatible DDL
- `backend/synthetic/generator.py` — 30 vehicles, 4 weeks of correlated telemetry (seed=42)
- `backend/migrations/migrate_v2.py` — initial schema migrations

### Stage C — Authentication, Roles, Fleet Isolation & Audit
- JWT tokens with `jwt_required` decorator
- Bcrypt password hashing
- `SUPER_ADMIN`, `FLEET_MANAGER`, `DRIVER` roles with RBAC
- `enforce_fleet_access()` for multi-tenant isolation
- Immutable `AuditLog` table with `record_audit()` utility
- Test: `test_auth_isolation.py`

### Stage D — Vehicle, Tyre, Driver & Trip Management
- Configuration-driven wheel layouts (4W, 6W, 10W, 12W)
- Permanent tyre identities with `TyreFitment` tracking
- Monotonic trip odometers with validation
- Test: `test_vehicle_tyre_fitment.py`

### Stage E — 3D Interactive Vehicle Inspection
- Three.js + React Three Fiber procedural commercial vehicle twin
- `ProceduralCommercialVehicle.tsx` — dynamic wheel mesh count from layout JSON
- `TyreDetailsPanel.tsx` — right-side flyout with tyre health data
- `VehicleViewer3D.tsx` — canvas wrapper, auto-spin with pause/play, camera reset
- Health color coding: emerald (HEALTHY), amber (WARNING), red (CRITICAL), gray (UNKNOWN)

### Stage F — Telemetry, THI, Trip Score & Alert Engines
- `THIEngine` with 4-factor weighted scoring + safety-critical capping
- `TripScoreEngine` with pressure compliance + thermal + speed components
- `AlertEngine` with deduplication (30-min cooldown) and ack/resolve workflow
- `WearEngine` linear RUL estimation
- `TyreWearMLService` with Linear Regression + Random Forest (sklearn)
- Tests: `test_thi_engine.py`, `test_trip_score.py`, `test_alert_engine.py`

### Stage G — Fleet Dashboards & Analytics
- `DashboardPage` with KPI cards, THI pie chart, alerts, trips
- `TrendsPage` with THI vs 95.0 baseline + ML playground
- `ComparisonPage` with 2–10 vehicle multi-select and bar chart
- CSV export utility

### Stage H — Driver Portal & Reliable Submissions
- `DriverPortalPage` — mobile-optimized trip start/end
- Offline queue with localStorage persistence and auto-retry on reconnect
- Photo upload for inspections (multipart form, non-public storage)
- Test: `test_driver_workflow.py`

### Stage I — Mock TREEL Provider Adapter
- `MockTreelAdapter` with payload validation, unit normalization, quarantine
- `BaseTPMSProvider` abstract class for future real adapters
- Test: `test_treel_adapter.py`

### Stage J — End-to-End Verification & Windows Delivery
- All 24 (then 31) pytest tests passing
- Vite build passing (zero TypeScript errors)
- Demo accounts configured in synthetic data
- Windows startup scripts: `start_backend.ps1`, `start_frontend.ps1`, `run_tests.ps1`

### Stage K — Targeted Corrections & Enhancements (10 items)
1. Gated dev controls behind `VITE_ENABLE_DEV_LOGIN` flag
2. `MyFleetsPage` with multi-fleet card grid and fleet switcher
3. `AdminMapPage` with SVG India geographic hub map
4. 4 vehicle action buttons (Details, 3D View, Inspection, Trips) in Vehicles table
5. Corrected Trends page: observed THI vs 95.0 ideal baseline on unified scale
6. Multi-select comparison: 2–10 vehicles with backend 400 validation
7. Standardized driver names (`Driver N` format)
8. 13-sheet Excel workbook export
9. Visual palette: fleet yellow, graphite, soft grey, white
10. Synthetic telemetry for all 30 vehicles (removed 10-vehicle slice limit)

### Additional Agent Task: Tyre Grid Redesign
- Created `TyreHealthy.tsx`, `TyreWarning.tsx`, `TyreCritical.tsx` inline SVG components
- Redesigned `TyresPage.tsx` to visual card grid replacing table
- `TyreCard.tsx` component with status-appropriate SVG + lifecycle badge

### Additional Agent Task: Fleet Navigation Fix
- `LoginPage.tsx` updated: FLEET_MANAGER now redirects to `/my-fleets` instead of `/dashboard`

### Additional Agent Task: Tyre Fitment/Inspection Separation + Lifecycle Management
- `LifecycleType` class (NEW/REUSE/RETREAD/SCRAP) added to tyre model
- `InspectionResult` class added to inspection model
- 7 new columns added to `inspections` table
- `TyreLifecycleHistory` model and table created
- `migrate_v3.py` SQLite migration script
- Auto-migration hook in `__init__.py`
- `POST /inspections` enhanced with lifecycle business rules (atomic transactions)
- 3 new tyre endpoints: `/available`, `/<id>/remove`, `/<id>/lifecycle-history`
- `FitmentPage.tsx` created with fit/remove modals
- `InspectionsPage.tsx` and `VehicleInspectionPage.tsx` enhanced with lifecycle fields
- `TyreDetailPage.tsx` updated with lifecycle badge + history section
- `/fitment` route added to App.tsx; Sidebar updated

---

## 10. Known Issues & Gaps

Issues are sourced from agent review files and code analysis:

### Critical / Data-Correctness

**[C1] Post-retread NSD silently dropped in VehicleInspectionPage** (Source: `fitment-lifecycle-review.md`)
- `VehicleInspectionPage.tsx` sends `measured_nsd_retread` in the JSON payload for retread inspections
- Backend parser only reads `measured_nsd` — `measured_nsd_retread` is never consumed
- When retread inspection submitted from this page, `tyre.current_nsd` is set to the old worn NSD, not the post-retread depth
- `InspectionsPage.tsx` is correct — it calls `formData.set('measured_nsd', retreadNsd)` to override
- **Impact:** Tyre appears more worn post-retread than it actually is, affecting THI scores and wear-life estimates

### High Severity

**[H1] RETREADING status tyres can be fitted without clearance** (Source: `fitment-lifecycle-review.md`)
- `fit_tyre` endpoint only blocks `SCRAPPED`/`SCRAP` lifecycle
- Tyres with `status=RETREADING` pass the guard and appear in `/tyres/available`
- A tyre "at the retreader" can be fitted to a vehicle with no error
- Should also block `RETREADING` status in the fitment guard

**[H2] Dashboard query keys lack `activeFleetId`** (Source: `fleet-context-investigation.md`, `nav-investigation.md`)
- `DashboardPage` query keys: `['fleet-stats']`, `['active-alerts']`, `['recent-trips']`
- Switching fleets on MyFleetsPage and returning to Dashboard may show stale data for previous fleet
- Fix: include `activeFleetId` in all three query keys

**[H3] No role guard on routes** (Source: `fleet-nav-plan.md`, `nav-investigation.md`)
- `ProtectedRoute` checks `isAuthenticated` only, not role
- A DRIVER can navigate to `/admin` by URL; page shell renders, API calls fail with 403
- A FLEET_MANAGER can navigate to `/driver`
- Fix: add `RoleRoute` wrapper for `/admin/*` (SUPER_ADMIN only) and `/driver` (DRIVER only)

### Medium Severity

**[M1] `remove_tyre` has no exception/rollback handling** (Source: `fitment-lifecycle-review.md`)
- `POST /tyres/<id>/remove` calls `db.session.commit()` without try/except
- A commit failure leaves SQLAlchemy session in a broken state
- Fix: wrap in try/except with `db.session.rollback()`

**[M2] `PositionData` interface duplicated across two components** (Source: `fitment-lifecycle-review.md`)
- `FitmentPage.tsx` and `VehicleInspectionPage.tsx` each define their own local `PositionData` interface
- Divergent definitions: `FitmentPage` marks `lifecycle_type` required; `VehicleInspectionPage` marks optional
- Fix: export a shared `VehiclePositionData` from `types/index.ts`

**[M3] Sidebar has ghost admin links pointing to unregistered routes** (Source: `nav-investigation.md`)
- `adminLinks` in `Sidebar.tsx` includes `/admin/fleets`, `/admin/users`, `/admin/audit-logs`
- `App.tsx` only registers `/admin`, `/admin/map`, and `/admin/*` (wildcard renders AdminDashboardPage)
- These links render AdminDashboardPage via the wildcard, not dedicated pages
- Fix: either register dedicated routes with separate page components, or remove these links and rely on tabs in AdminDashboardPage

**[M4] Trip Score engine doesn't use telemetry data in driver workflow** (Source: code analysis)
- `end_trip` in `driver.py` calls `TripScoreEngine.calculate_trip_score(telemetry_samples=[], ...)`
- Empty samples → default score 85.0 for every completed trip
- The engine supports sample-based scoring but no telemetry is passed from the trip end flow
- Fix: fetch associated telemetry records for the trip's vehicle/time window and pass them

**[M5] API 401 handler does not clear fleet localStorage keys** (Source: `fleet-context-investigation.md`)
- When session expires, `api.ts` clears `jk_token` and `jk_user` but NOT `jk_active_fleet_id` / `jk_active_fleet_name`
- A subsequent login from a different user could pick up stale fleet context briefly
- Fix: add fleet key removal to the 401 handler

### Low Severity

**[L1] `api.ts` reads `localStorage` directly instead of Zustand `getState()`** (Source: `fleet-context-investigation.md`)
- The axios interceptor calls `localStorage.getItem('jk_active_fleet_id')` directly
- Any code path that updates Zustand's `activeFleetId` without writing localStorage would cause a mismatch
- Fix: use `useAuthStore.getState().activeFleetId` (safe outside React)

**[L2] No redirect for already-authenticated users on `/login`** (Source: `fleet-context-investigation.md`, `nav-investigation.md`)
- If a user with valid session navigates to `/login`, the form renders rather than redirecting
- Fix: check `isAuthenticated` at top of LoginPage and redirect by role

**[L3] Chunk size warning in frontend build** (Source: implementation reports)
- `dist/assets/index-*.js` is ~1.75 MB / 470 KB gzipped
- Caused by Three.js (~1.5 MB) bundled without code splitting
- Not an error, but impacts initial page load performance
- Fix: dynamic import for 3D components (`React.lazy` + `Suspense`)

**[L4] `test_raw_data_nsd_inspection_sheet_exclusion` path issue** (Source: `PROJECT_STATUS.md`, implementation reports)
- The test hardcodes path `d:\05_JKT\data_source\Rawwww Data.xlsx`
- On this machine the path is `c:\Users\vaisi\OneDrive\Desktop\tyre-health-index\05_JKT (2)\05_JKT\data_source\Rawwww Data.xlsx`
- Test was reported as failing in one environment (though 31/31 pass in the verified state)
- Fix: use path relative to test file or parameterize

**[L5] Fuel efficiency in Trip Score is a hardcoded placeholder**
- `efficiency_score = 90.0` regardless of actual fuel consumption data
- No odometer/fuel integration exists
- Fix: implement baseline_mileage comparison once fuel telemetry is available

**[L6] No rate limiting implemented**
- `.env.example` has `RATE_LIMIT_ENABLED=true` but no rate limiting middleware is actually installed
- `flask-limiter` is not in `requirements.txt`
- Login endpoint is theoretically brute-forceable

---

## 11. What Needs to Be Built Next

Based on the current state, open issues, and planned capabilities described in the documentation:

### Priority 1 — Bug Fixes (from review findings)

1. **Fix `VehicleInspectionPage` post-retread NSD field name** [C1]
   - Change `measured_nsd_retread` key to `measured_nsd` in the JSON payload OR read `measured_nsd_retread` in the backend
   
2. **Add RETREADING status guard to `/tyres/<id>/fit`** [H1]
   - Add `TyreStatus.RETREADING` to the guard condition so retreading tyres cannot be fitted

3. **Add try/except + rollback to `remove_tyre`** [M1]
   - Follow the same pattern as `create_inspection`

### Priority 2 — Frontend Improvements

4. **Add `activeFleetId` to dashboard query keys** [H2]
   - Import `useAuthStore` in `DashboardPage.tsx`, add to all three queryKey arrays

5. **Add role guard (`RoleRoute`)** [H3]
   - Wrap `/admin/*` routes (SUPER_ADMIN only), `/driver` route (DRIVER only)

6. **Export `VehiclePositionData` from `types/index.ts`** [M2]
   - Consolidate the duplicated `PositionData` interface

7. **Clear fleet localStorage keys on 401** [M5]
   - Two-line fix in `api.ts`

8. **Add already-authenticated redirect on `/login`** [L2]

### Priority 3 — Feature Completions

9. **Real trip score from telemetry**
   - In `driver.py` `end_trip`, query `TelemetryRecord` for the trip duration/vehicle and pass samples to `TripScoreEngine`

10. **Live Alert Engine from telemetry**
    - Currently alerts are only generated via the TREEL ingest endpoint or inspection submission
    - A periodic background job or endpoint to re-evaluate all active vehicle telemetry would improve real-time alerting

11. **Real vehicle 3D model for buses/LCVs**
    - `ProceduralCommercialVehicle` renders a generic truck shape; bus and LCV configurations are identified but use the same mesh
    - More distinctive meshes per vehicle_type would improve the digital-twin experience

12. **Dedicated admin sub-pages**
    - The Sidebar has `/admin/fleets`, `/admin/users`, `/admin/audit-logs` links
    - These currently all render `AdminDashboardPage` via wildcard catch-all
    - Creating dedicated `AdminFleetsPage`, `AdminUsersPage`, `AdminAuditPage` would allow deep-linking and better UX

13. **Lazy loading / code splitting for Three.js**
    - Dynamic import of `VehicleViewer3D` to reduce initial bundle size [L3]

14. **Rate limiting**
    - Add `flask-limiter` to `requirements.txt` and configure it on `/auth/login` [L6]

15. **Real TREEL adapter**
    - `MockTreelAdapter` is the placeholder; a real TREEL production adapter with OEM credentials and schema is the ultimate integration goal
    - `BaseTPMSProvider` abstract class is ready to extend

16. **PostgreSQL migration for production**
    - Schema is PostgreSQL-compatible but only SQLite is tested
    - Update `DATABASE_URL` to a PostgreSQL connection string and validate all queries

17. **Inspection photo storage security hardening**
    - Photos are stored locally in `backend/uploads/`
    - Production should use S3/Azure Blob/GCS with pre-signed URLs and non-public bucket

18. **Tyre rotation scheduling**
    - A proactive rotation schedule feature (based on NSD imbalance across axle positions) is a natural extension of the existing lifecycle management system

---

## 12. Code Quality Assessment

### Strengths

**Architecture & Design:**
- Excellent separation of concerns: THI engine, Trip Score, Alert Engine, and ML service are fully independent and independently testable
- The `BaseTPMSProvider` abstract class is a textbook adapter pattern — the real adapter can replace the mock transparently
- `enforce_fleet_access()` centralized in one utility function — no scattered fleet_id checks in individual handlers
- `record_audit()` utility makes audit logging a one-liner that cannot be forgotten
- Configuration-driven wheel layout JSON avoids hardcoded wheel position logic

**Backend:**
- 31 automated tests covering all critical paths including edge cases (stale data, faulty sensor, boundary conditions)
- Explicit data provenance tagging on every telemetry record
- Safety-critical score capping in THIEngine — a CRITICAL factor cannot produce a HEALTHY overall score
- Atomic transactions with rollback in inspection lifecycle operations
- Monotonic odometer enforcement at both API and data layers

**Frontend:**
- TanStack React Query provides excellent server state management with automatic refetch
- Offline queue for driver portal is a robust implementation — handles network loss gracefully
- TypeScript interfaces fully aligned with backend API response shapes
- Consistent dark navy palette with proper semantic color coding (emerald=healthy, amber=warning, red=critical)
- The inline SVG tyre components are a creative solution to zero-asset-file constraint

**Security:**
- Password hashing with bcrypt (never stored or exported in plaintext)
- JWT tokens with configurable expiry (default 24h)
- Photo uploads use `secure_filename` + non-public storage path
- Excel export explicitly omits password hashes
- "NSD Inspection Data" exclusion policy is verified by an automated test

### Weaknesses & Inconsistencies

**Testing:**
- No frontend unit or integration tests — only build/type-check verification
- No end-to-end browser tests (Playwright/Cypress)
- `test_schema.py` appears in `TESTING.md` but is not in the actual `backend/tests/` directory listing
- `test_synthetic_data.py` is mentioned in `TESTING.md` but also not in the actual test file list

**API Design:**
- No pagination on list endpoints — trips and alerts cap at 100/150 with no cursor/offset/page params; this will cause performance issues with large fleets
- No API versioning beyond the `/api/v1/` prefix — breaking changes would require careful coordination
- `driver.py` has a reference to `AlertStatus` without importing it (the `get_driver_alerts` function uses `AlertStatus.ACTIVE` but there is no `from app.models.alert import AlertStatus` import in driver.py — this would cause a `NameError` at runtime)

**Data Model:**
- `User.assigned_vehicle_id` is a VARCHAR with no FK constraint — could reference non-existent vehicles
- No soft-delete pattern — deletes cascade hard through the tree; accidental fleet deletion would be unrecoverable
- `trip.score_breakdown_json` and `vehicle.layout_json` use plain TEXT columns rather than JSON type — works on SQLite but loses type guarantees in PostgreSQL

**Frontend:**
- `DashboardPage` query keys not fleet-scoped (identified in §10 as [H2])
- No role guard on routes (identified as [H3])
- No loading/error boundary at the page level — an API failure in a useQuery will silently show empty data with no user feedback in some pages
- `any` type used in `AdminDashboardPage` for fleet/user/audit rows — should be typed
- The 3D bundle is ~1.75 MB uncompressed — no lazy loading

**Configuration:**
- Default `SECRET_KEY` and `JWT_SECRET_KEY` in `config.py` are hardcoded dev strings — a production deployment that doesn't set these env vars would be using publicly-known secrets
- CORS is currently `origins: "*"` — should be restricted to the production domain

**Synthetic Generator:**
- Not documented in this analysis but `backend/synthetic/generator.py` exists — it generates the seed data for development; its exact algorithms were not fully read due to scope, but the outputs are verified by automated tests

---

## Appendix A: Complete File Inventory

### Backend Source Files
- `backend/app/__init__.py` — Flask app factory, blueprint registration, migration hook
- `backend/app/config.py` — Configuration class with all env var keys
- `backend/app/extensions.py` — `db` (SQLAlchemy) and `cors` (CORS) singletons
- `backend/app/models/__init__.py` — All model exports
- `backend/app/models/fleet.py` — Fleet model
- `backend/app/models/user.py` — User model + UserRole constants + user_fleets association table
- `backend/app/models/vehicle.py` — Vehicle model + VehicleType + WheelConfig + get_default_layout()
- `backend/app/models/tyre.py` — Tyre model + TyreStatus + HealthStatus + LifecycleType
- `backend/app/models/fitment.py` — TyreFitment model
- `backend/app/models/trip.py` — Trip model + TripStatus
- `backend/app/models/telemetry.py` — TelemetryRecord + TelemetryProvenance
- `backend/app/models/thi.py` — THIRecord model
- `backend/app/models/alert.py` — Alert model + AlertSeverity + AlertStatus
- `backend/app/models/inspection.py` — Inspection model + InspectionCondition + InspectionResult
- `backend/app/models/audit.py` — AuditLog model
- `backend/app/models/lifecycle_history.py` — TyreLifecycleHistory model
- `backend/app/api/auth.py` — /register, /login, /me
- `backend/app/api/admin.py` — Platform stats, all fleets, all users, audit logs, map locations
- `backend/app/api/fleet.py` — Fleet profile, stats, my-fleets, fleet by ID
- `backend/app/api/vehicles.py` — List, detail, 3D twin, fitment history
- `backend/app/api/tyres.py` — List, available, detail, fit, remove, lifecycle-history
- `backend/app/api/trips.py` — List, detail
- `backend/app/api/inspections.py` — List, vehicle summary, create, photo serve
- `backend/app/api/alerts.py` — List, acknowledge, resolve
- `backend/app/api/analytics.py` — Summary, trends, comparison, ML model
- `backend/app/api/driver.py` — Assigned vehicle, active trip, start trip, end trip, alerts
- `backend/app/api/treel.py` — Ingest, provider info
- `backend/app/api/export.py` — Excel 13-sheet, CSV by table
- `backend/app/services/thi_engine.py` — THIEngine class
- `backend/app/services/trip_score_engine.py` — TripScoreEngine class
- `backend/app/services/alert_engine.py` — AlertEngine class + ALERT_CATALOGUE
- `backend/app/services/wear_engine.py` — WearEngine class
- `backend/app/services/ml_service.py` — TyreWearMLService class
- `backend/app/services/treel_provider.py` — BaseTPMSProvider + MockTreelAdapter
- `backend/app/utils/security.py` — generate_token, decode_token, jwt_required, roles_required, enforce_fleet_access
- `backend/app/utils/audit.py` — record_audit()
- `backend/run.py` — App entry point, starts Flask server on :5000
- `backend/.env` — Local environment (not committed)
- `backend/.env.example` — Environment template
- `backend/requirements.txt` — Python dependencies (pinned)
- `backend/migrations/migrate_v2.py` — Schema migration v2
- `backend/migrations/migrate_v3.py` — Schema migration v3 (lifecycle columns + tyre_lifecycle_history table)
- `backend/synthetic/generator.py` — Synthetic fleet data generator (30 vehicles, 4 weeks)
- `backend/tests/test_alert_engine.py` — Alert generation and deduplication
- `backend/tests/test_auth_isolation.py` — JWT auth, fleet isolation, cross-fleet 403
- `backend/tests/test_corrections_suite.py` — 7 correction tests (driver names, my-fleets, admin map, vehicle trips, comparison limits, Excel export, trend baseline)
- `backend/tests/test_driver_workflow.py` — Trip start/end, odometer validation
- `backend/tests/test_raw_data_exclusion.py` — NSD Inspection Data exclusion verification
- `backend/tests/test_thi_engine.py` — 8 THI engine scenarios
- `backend/tests/test_treel_adapter.py` — TREEL normalization and quarantine
- `backend/tests/test_trip_score.py` — Trip score edge cases
- `backend/tests/test_vehicle_tyre_fitment.py` — Wheel config layout, permanent tyre identity
- `backend/instance/jktyre.db` — SQLite production database
- `backend/instance/test.db` — SQLite test database

### Frontend Source Files
- `frontend/src/main.tsx` — React entry point, BrowserRouter, QueryClientProvider
- `frontend/src/App.tsx` — Route tree, ProtectedRoute
- `frontend/src/index.css` — Global styles (Tailwind base)
- `frontend/src/types/index.ts` — All TypeScript interfaces
- `frontend/src/store/authStore.ts` — Zustand auth/fleet state
- `frontend/src/services/api.ts` — Axios instance with interceptors
- `frontend/src/services/offlineQueue.ts` — localStorage-based offline queue
- `frontend/src/components/layout/AppLayout.tsx` — Navbar + Sidebar + Outlet shell
- `frontend/src/components/layout/Navbar.tsx` — Top bar
- `frontend/src/components/layout/Sidebar.tsx` — Role-switched navigation
- `frontend/src/components/3d/VehicleViewer3D.tsx` — Three.js canvas wrapper
- `frontend/src/components/3d/ProceduralCommercialVehicle.tsx` — 3D truck mesh generator
- `frontend/src/components/3d/TyreDetailsPanel.tsx` — 3D viewer tyre data flyout
- `frontend/src/components/tyre/TyreCard.tsx` — Individual tyre card component
- `frontend/src/components/tyre/TyreHealthy.tsx` — Healthy tyre inline SVG
- `frontend/src/components/tyre/TyreWarning.tsx` — Warning tyre inline SVG
- `frontend/src/components/tyre/TyreCritical.tsx` — Critical tyre inline SVG
- `frontend/src/pages/public/LandingPage.tsx` — Public landing page
- `frontend/src/pages/public/LoginPage.tsx` — Login form with dev quick-login
- `frontend/src/pages/public/RegisterPage.tsx` — Fleet registration form
- `frontend/src/pages/fleet/DashboardPage.tsx` — Fleet overview with KPIs + charts
- `frontend/src/pages/fleet/MyFleetsPage.tsx` — Fleet portfolio card grid + switcher
- `frontend/src/pages/fleet/VehiclesPage.tsx` — Vehicle table with 3D modal
- `frontend/src/pages/fleet/VehicleDetailPage.tsx` — Vehicle detail view
- `frontend/src/pages/fleet/VehicleInspectionPage.tsx` — Per-wheel physical inspection
- `frontend/src/pages/fleet/TyresPage.tsx` — Tyre visual card grid
- `frontend/src/pages/fleet/TyreDetailPage.tsx` — Tyre detail with lifecycle history
- `frontend/src/pages/fleet/FitmentPage.tsx` — Tyre fitment management (fit/remove)
- `frontend/src/pages/fleet/TripsPage.tsx` — Trip history with filters
- `frontend/src/pages/fleet/InspectionsPage.tsx` — Inspection list + create modal
- `frontend/src/pages/fleet/AlertsPage.tsx` — Alert center with ack/resolve workflow
- `frontend/src/pages/fleet/TrendsPage.tsx` — THI trends + ML playground
- `frontend/src/pages/fleet/ComparisonPage.tsx` — Multi-vehicle comparison
- `frontend/src/pages/fleet/ReportsPage.tsx` — Excel + CSV download buttons
- `frontend/src/pages/admin/AdminDashboardPage.tsx` — Admin tabbed overview
- `frontend/src/pages/admin/AdminMapPage.tsx` — SVG India geographic map
- `frontend/src/pages/driver/DriverPortalPage.tsx` — Driver mobile console
- `frontend/index.html` — HTML entry point
- `frontend/package.json` — Node dependencies (pinned)
- `frontend/vite.config.ts` — Vite configuration + proxy
- `frontend/tailwind.config.js` — Tailwind + custom brand colors
- `frontend/tsconfig.json` — TypeScript configuration
- `frontend/postcss.config.js` — PostCSS with autoprefixer
- `frontend/dist/` — Production build output

### Agent Task Files (`.agents/tasks/`)
- `fitment-inspection-lifecycle-plan.md` — 18-step implementation plan for fitment/lifecycle feature
- `fitment-inspection-lifecycle-report.md` — Implementation report (commit 8e7199a)
- `fitment-lifecycle-review.md` — Code review: NEEDS_CHANGES (4 issues found)
- `fleet-context-investigation.md` — Deep analysis of fleet context/state management
- `fleet-nav-implementation-report.md` — LoginPage redirect fix (1-line change)
- `fleet-nav-plan.md` — 4-change plan for fleet owner navigation flow
- `nav-investigation.md` — Navigation architecture investigation
- `tyre-grid-implementation-report.md` — Visual tyre grid implementation report
- `tyre-grid-investigation.md` — Pre-implementation codebase investigation
- `tyre-grid-plan.md` — 5-step plan for visual tyre grid redesign

### Data Source Files
- `data_source/events.xlsx` — Alert codes (PR01–PR09, TP01–TP07, SP01–SP08, FE01–FE07, TD01–TD08, BT01–BT07) + threshold matrix
- `data_source/JK_Tyres_JUH_RRC_Dataset.xlsx` — Rolling Resistance Coefficient 2D matrix (Temp vs Pressure)
- `data_source/NSD_data.xlsx` — Historical NSD measurements for Jetway JUH5 + other models
- `data_source/Rawwww Data.xlsx` — Raw sensor data + Fleet Summary + README + Correction Notes (**NSD Inspection Data sheet excluded by policy**)

### Project Documentation
- `README.md` — Setup, demo credentials, features, architecture summary
- `ARCHITECTURE.md` — Full system architecture with ASCII diagrams
- `DATA_DICTIONARY.md` — Complete schema reference + 13-sheet export spec
- `PROJECT_STATUS.md` — Stage tracker + 31 test results
- `TESTING.md` — Test strategy + running instructions
- `start_backend.ps1` — Windows backend startup script
- `start_frontend.ps1` — Windows frontend startup script
- `run_tests.ps1` — Windows test runner (pytest + npm build)

### Outer Folder (`05_JKT (2)/`)
- `.pytest_cache/` — pytest run cache directory
  - `.pytest_cache/v/` — cache version directory
  - `.pytest_cache/README.md` — pytest cache readme
  - `.pytest_cache/CACHEDIR.TAG` — cache tag file
  - `.pytest_cache/.gitignore` — gitignore for cache

---

*End of full project analysis report.*

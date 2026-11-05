# JK Tyre THI Fleet Intelligence Platform - Data Dictionary

## 1. Domain Entities & Database Schema

### 1.1 `fleets`
Represents an enrolled transport company / fleet operator.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID identifier for fleet |
| `name` | VARCHAR(120) | NO | Fleet legal or operating name |
| `registration_no` | VARCHAR(64) | YES | Commercial transport registration |
| `contact_name` | VARCHAR(120) | NO | Primary contact person |
| `contact_email` | VARCHAR(120) | NO | Contact email (unique) |
| `contact_phone` | VARCHAR(32) | YES | Contact phone number |
| `address` | TEXT | YES | Fleet operating headquarters |
| `city` | VARCHAR(64) | YES | Operating hub city (e.g. `Delhi`, `Mumbai`, `Kolkata`) |
| `latitude` | FLOAT | YES | Hub latitude coordinate |
| `longitude` | FLOAT | YES | Hub longitude coordinate |
| `status` | VARCHAR(24) | NO | `ACTIVE`, `PENDING`, `SUSPENDED` |
| `created_at` | DATETIME | NO | UTC registration timestamp |
| `updated_at` | DATETIME | NO | UTC update timestamp |

---

### 1.2 `users`
System users across JK Tyre Admin, Fleet Owners, and Drivers.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID identifier |
| `fleet_id` | VARCHAR(36) | YES (FK) | Reference to `fleets.id` (NULL for JK Tyre Super Admins) |
| `username` | VARCHAR(64) | NO | Unique login handle |
| `email` | VARCHAR(120) | NO | Unique login email |
| `password_hash` | VARCHAR(256) | NO | Bcrypt/Argon2 secure password hash |
| `full_name` | VARCHAR(120) | NO | Full name |
| `role` | VARCHAR(32) | NO | `SUPER_ADMIN`, `FLEET_MANAGER`, `DRIVER` |
| `phone_number` | VARCHAR(32) | YES | Contact phone |
| `driver_license_no`| VARCHAR(64) | YES | Driver license number (required for DRIVER role) |
| `is_active` | BOOLEAN | NO | Account active flag |
| `created_at` | DATETIME | NO | Creation timestamp |
| `updated_at` | DATETIME | NO | Last update timestamp |

---

### 1.3 `vehicles`
Commercial trucks, buses, and commercial transport units.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID identifier |
| `fleet_id` | VARCHAR(36) | NO (FK) | Enclosing fleet (`fleets.id`) |
| `vehicle_number` | VARCHAR(32) | NO | Registration plate (e.g. `DL01AB1234`) |
| `vehicle_type` | VARCHAR(32) | NO | `HEAVY_TRUCK`, `LIGHT_TRUCK`, `BUS`, `PASSENGER_CAR` |
| `wheel_config` | VARCHAR(32) | NO | `6-Wheeler`, `10-Wheeler`, `12-Wheeler`, `4-Wheeler` |
| `axle_count` | INTEGER | NO | Total number of axles (2, 3, 4, etc.) |
| `layout_json` | TEXT/JSON | NO | Detailed layout schema (axle types, wheel positions) |
| `make` | VARCHAR(64) | YES | Vehicle manufacturer (e.g., Tata, Ashok Leyland) |
| `model` | VARCHAR(64) | YES | Vehicle model name |
| `year` | INTEGER | YES | Manufacturing year |
| `baseline_pressure`| FLOAT | NO | Nominal recommended pressure (psi, e.g. 110 for Heavy Truck) |
| `baseline_mileage` | FLOAT | NO | Nominal baseline mileage (km/L, e.g. 4.5 for Heavy Truck) |
| `current_odometer` | FLOAT | NO | Latest verified odometer reading (km, strictly monotonic) |
| `current_latitude` | FLOAT | YES | Latest latitude position coordinate |
| `current_longitude`| FLOAT | YES | Latest longitude position coordinate |
| `current_location_name`| VARCHAR(120) | YES | Human-readable location / highway checkpoint |
| `location_updated_at` | DATETIME | YES | UTC timestamp of last location update |
| `location_source`  | VARCHAR(24) | YES | `SIMULATED`, `LIVE_TPMS_GPS`, `CHECKPOINT`, `UNAVAILABLE` |
| `status` | VARCHAR(24) | NO | `ACTIVE`, `IN_MAINTENANCE`, `DECOMMISSIONED` |
| `created_at` | DATETIME | NO | Creation timestamp |

---

### 1.4 `tyres`
Permanent tyre entity; tracks tyre life across multiple vehicle fitments.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID identifier |
| `fleet_id` | VARCHAR(36) | NO (FK) | Owning fleet (`fleets.id`) |
| `serial_number` | VARCHAR(64) | NO | Permanent tyre serial / barcode / RFID tag |
| `brand` | VARCHAR(64) | NO | Tyre brand (e.g., `JK Tyre`) |
| `model` | VARCHAR(64) | NO | Tyre model (e.g., `Jetway JUH5`, `Jetsteel JDH3`) |
| `size` | VARCHAR(32) | NO | Tyre size designation (e.g., `295/80R22.5`) |
| `blueprint_nsd` | FLOAT | NO | Original virgin Non-Skid Depth (mm, e.g. 16.5) |
| `current_nsd` | FLOAT | NO | Latest measured Non-Skid Depth (mm) |
| `retread_count` | INTEGER | NO | Number of retreads completed (default 0) |
| `total_km_run` | FLOAT | NO | Cumulative km covered across all fitments |
| `current_thi` | FLOAT | YES | Latest calculated Tyre Health Index (0 - 100) |
| `thi_status` | VARCHAR(16) | NO | `HEALTHY`, `WARNING`, `CRITICAL`, `UNKNOWN` |
| `status` | VARCHAR(24) | NO | `FITTED`, `IN_INVENTORY`, `RETREADING`, `SCRAPPED` |
| `created_at` | DATETIME | NO | Registration timestamp |

---

### 1.5 `tyre_fitments`
Mounting and dismounting history linking tyres to vehicle wheel positions.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `tyre_id` | VARCHAR(36) | NO (FK) | Reference to `tyres.id` |
| `vehicle_id` | VARCHAR(36) | NO (FK) | Reference to `vehicles.id` |
| `axle_number` | INTEGER | NO | 1-indexed axle position |
| `wheel_position` | VARCHAR(16) | NO | Wheel position code (e.g. `FL`, `FR`, `R1_LIO`, etc.) |
| `is_dual` | BOOLEAN | NO | True if part of a dual-wheel set |
| `is_inner` | BOOLEAN | NO | True if inner wheel of dual set |
| `fitted_at` | DATETIME | NO | Mounting timestamp |
| `fitted_odometer`| FLOAT | NO | Vehicle odometer at fitment (km) |
| `fitted_nsd` | FLOAT | NO | Tyre NSD at fitment (mm) |
| `removed_at` | DATETIME | YES | Dismount timestamp (NULL if currently mounted) |
| `removed_odometer`| FLOAT | YES | Vehicle odometer at removal (km) |
| `removal_reason`| VARCHAR(64) | YES | `PUNCTURE`, `SCHEDULED_ROTATION`, `RETREAD`, `WORN_OUT` |

---

### 1.6 `trips`
Driver-operated journeys between source and destination.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `fleet_id` | VARCHAR(36) | NO (FK) | Owning fleet (`fleets.id`) |
| `vehicle_id` | VARCHAR(36) | NO (FK) | Reference to `vehicles.id` |
| `driver_id` | VARCHAR(36) | NO (FK) | Reference to `users.id` |
| `trip_code` | VARCHAR(32) | NO | Human-readable trip code (e.g. `TRP-2026-001`) |
| `origin` | VARCHAR(120) | NO | Origin hub/location |
| `destination` | VARCHAR(120) | NO | Destination hub/location |
| `start_time` | DATETIME | NO | Trip departure timestamp |
| `start_odometer`| FLOAT | NO | Odometer at trip departure (km) |
| `end_time` | DATETIME | YES | Trip arrival timestamp |
| `end_odometer` | FLOAT | YES | Odometer at trip arrival (km) |
| `distance_km` | FLOAT | YES | Calculated distance (end - start km) |
| `trip_score` | FLOAT | YES | Explainable Trip Score (0 - 100) |
| `trip_score_status`| VARCHAR(16) | YES | `EXCELLENT`, `GOOD`, `AVERAGE`, `POOR` |
| `score_breakdown` | TEXT/JSON | YES | JSON object with individual component scores & reasons |
| `status` | VARCHAR(24) | NO | `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |

---

### 1.7 `telemetry_records`
High-frequency or periodic TPMS/telematics sensor frames.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `fleet_id` | VARCHAR(36) | NO (FK) | Enclosing fleet |
| `vehicle_id` | VARCHAR(36) | NO (FK) | Enclosing vehicle |
| `tyre_id` | VARCHAR(36) | YES (FK) | Fitted tyre (if resolved) |
| `wheel_position` | VARCHAR(16) | NO | Target wheel position |
| `timestamp` | DATETIME | NO | Sensor measurement timestamp |
| `pressure_psi` | FLOAT | YES | Measured pressure (psi) |
| `temperature_c` | FLOAT | YES | Measured temperature (°C) |
| `speed_kmh` | FLOAT | YES | Instantaneous speed (km/h) |
| `battery_soc` | FLOAT | YES | TPMS sensor battery state-of-charge (%) |
| `odometer_km` | FLOAT | YES | Vehicle odometer at reading (km) |
| `is_stale` | BOOLEAN | NO | True if reading > 30 minutes old |
| `is_faulty` | BOOLEAN | NO | True if physical anomaly / sensor fault flagged |
| `provenance` | VARCHAR(32) | NO | `SYNTHETIC`, `TREEL_MOCK`, `TREEL_LIVE`, `MANUAL` |

---

### 1.8 `thi_records`
Explainable Tyre Health Index evaluations.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `tyre_id` | VARCHAR(36) | NO (FK) | Evaluated tyre |
| `vehicle_id` | VARCHAR(36) | YES (FK) | Current fitted vehicle |
| `calculated_at` | DATETIME | NO | Timestamp of score evaluation |
| `score` | FLOAT | NO | Overall THI score (0.0 to 100.0) |
| `status` | VARCHAR(16) | NO | `HEALTHY`, `WARNING`, `CRITICAL`, `UNKNOWN` |
| `pressure_score` | FLOAT | YES | Pressure sub-score (0-100) |
| `temp_score` | FLOAT | YES | Temperature sub-score (0-100) |
| `wear_score` | FLOAT | YES | Tread/wear sub-score (0-100) |
| `rrc_score` | FLOAT | YES | Rolling resistance / severity sub-score (0-100) |
| `inputs_json` | TEXT/JSON | NO | Exact input values (P, T, NSD, speed) with units |
| `explanation` | TEXT | NO | Human-readable explanation of risk and factors |
| `rule_version` | VARCHAR(16) | NO | Engine ruleset version (e.g. `v1.0.0-demo`) |

---

### 1.9 `alerts`
Configurable operational alerts and maintenance warnings.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `fleet_id` | VARCHAR(36) | NO (FK) | Scoped fleet |
| `vehicle_id` | VARCHAR(36) | YES (FK) | Related vehicle |
| `tyre_id` | VARCHAR(36) | YES (FK) | Related tyre |
| `code` | VARCHAR(16) | NO | Alert code (`PR01`, `TP04`, `TD07`, etc.) |
| `category` | VARCHAR(32) | NO | `PRESSURE`, `TEMPERATURE`, `SPEED`, `WEAR`, `BATTERY` |
| `severity` | VARCHAR(16) | NO | `NORMAL`, `WARNING`, `RISK`, `CRITICAL` |
| `observed_value`| FLOAT | YES | Measured value triggering alert |
| `unit` | VARCHAR(16) | YES | Measurement unit (`psi`, `deg C`, `mm`, `km/h`) |
| `explanation` | TEXT | NO | Physical explanation of defect |
| `recommended_action`| TEXT | NO | Concrete maintenance / driver recommendation |
| `status` | VARCHAR(24) | NO | `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED` |
| `acknowledged_by`| VARCHAR(36) | YES (FK) | User who acknowledged (`users.id`) |
| `acknowledged_at`| DATETIME | YES | Acknowledgment timestamp |
| `resolved_by` | VARCHAR(36) | YES (FK) | User who marked resolved (`users.id`) |
| `resolved_at` | DATETIME | YES | Resolution timestamp |
| `resolution_note`| TEXT | YES | Reason or work order completed |
| `created_at` | DATETIME | NO | Creation timestamp |

---

### 1.10 `inspections`
Physical tyre measurements and visual inspections submitted by fleet technicians or drivers.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `fleet_id` | VARCHAR(36) | NO (FK) | Scoped fleet |
| `vehicle_id` | VARCHAR(36) | NO (FK) | Inspected vehicle |
| `tyre_id` | VARCHAR(36) | NO (FK) | Inspected tyre |
| `inspector_id` | VARCHAR(36) | NO (FK) | Reference to `users.id` |
| `measured_nsd` | FLOAT | NO | Non-skid depth measured in mm |
| `measured_pressure`| FLOAT | YES | Cold/hot pressure measured in psi |
| `odometer_at_inspection`| FLOAT | NO | Vehicle odometer reading in km |
| `visual_condition`| VARCHAR(32) | NO | `NORMAL`, `UNEVEN_WEAR`, `SIDEWALL_CUT`, `BULGE`, `PUNCTURE` |
| `photo_url` | VARCHAR(256) | YES | Secure non-public storage path for uploaded photo |
| `notes` | TEXT | YES | Inspector notes |
| `inspected_at` | DATETIME | NO | Timestamp of inspection |

---

### 1.11 `audit_logs`
Immutable record of all privileged actions and administrative events.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | NO (PK) | UUID |
| `user_id` | VARCHAR(36) | YES (FK) | User who initiated action |
| `fleet_id` | VARCHAR(36) | YES (FK) | Affected fleet (if applicable) |
| `action` | VARCHAR(64) | NO | `USER_LOGIN`, `FLEET_CREATED`, `TYRE_SCRAPPED`, `CONFIG_CHANGED` |
| `resource_type` | VARCHAR(32) | NO | Entity altered (`USER`, `FLEET`, `TYRE`, `VEHICLE`) |
| `resource_id` | VARCHAR(64) | YES | Target entity identifier |
| `details_json` | TEXT/JSON | YES | Before/after state or event context |
| `ip_address` | VARCHAR(48) | YES | Client IP |
| `timestamp` | DATETIME | NO | Event timestamp |

---

### 1.12 `user_fleets`
Association table for many-to-many relationship supporting multi-fleet managers.
| Column | Type | Nullable | Description |
|---|---|---|---|
| `user_id` | VARCHAR(36) | NO (PK, FK) | References `users.id` |
| `fleet_id` | VARCHAR(36) | NO (PK, FK) | References `fleets.id` |

---

## 2. External Data Sources & Provenance Audit

1. **`events.xlsx`**:
   - `threshold_conditions`: Contains baseline vehicle types, pressure thresholds (%Dev), temperature thresholds, speed thresholds, fuel efficiency, tread wear thresholds, and demo THI score weights.
   - `event_reference`: 45 detailed operational codes (`PR01`-`PR09`, `TP01`-`TP07`, `SP01`-`SP08`, `FE01`-`FE07`, `TD01`-`TD08`, `BT01`-`BT07`).
   - `conditinal_farmatting`: Matrix linking telemetry measurements to risk bands and demo THI scores.

2. **`JK_Tyres_JUH_RRC_Dataset.xlsx`**:
   - Rolling Resistance Coefficient (RRC) 2D matrix (Temp 0-80°C vs Press 85-180 psi) and color status matrices.
   - Used to calibrate tyre rolling resistance and thermal stress curves.

3. **`NSD_data.xlsx`**:
   - Historical non-skid depth measurements across vehicles, tyre models (`Jetway JUH5`, etc.), initial vs final NSD, wear rate, and achieved vs projected km.

4. **`Rawwww Data.xlsx`**:
   - Sheets: `Raw Sensor Data`, `Fleet Summary`, `README`, `Correction Notes`.
   - **CRITICAL RESTRICTION**: Any sheet named `"NSD Inspection Data"` inside `Rawwww Data.xlsx` is strictly excluded from import, synthetic generation inputs, ML models, and validation tests. Automated tests verify this exclusion.

---

## 3. 13-Sheet Excel Export Specification (`/api/v1/export/excel`)

The backend export endpoint generates a comprehensive 13-sheet `.xlsx` workbook containing complete platform state while strictly redacting sensitive authentication hashes and excluding legacy unverified sheets:

| Sheet # | Sheet Name | Description / Security Policy |
|---|---|---|
| 1 | `README_PROVENANCE` | Export metadata, timestamp, data provenance disclosures, and explicit notice of the exclusion of legacy `"NSD Inspection Data"`. |
| 2 | `FLEETS` | Fleet registry including hub coordinates (`latitude`, `longitude`, `city`). |
| 3 | `USERS` | Registered users with role and contact information. **Password hashes are strictly redacted/omitted**. |
| 4 | `VEHICLES` | Full fleet vehicle specs, configurations, baseline pressures, odometers, and transit coordinates. |
| 5 | `TYRES` | Permanent tyre inventory, virgin vs current NSD, retread counts, cumulative km, and latest THI. |
| 6 | `TYRE_FITMENTS` | Mounting/dismounting history, wheel positions (`FL`, `FR`, `R1_LIO`, etc.), and removal reasons. |
| 7 | `TRIPS` | Historical trips, assigned drivers, departure/arrival odometers, distance, Trip Scores, and status. |
| 8 | `TELEMETRY_RECORDS` | Monitored TPMS records (pressure, temperature, speed, fuel rate, voltage, anomaly flags). |
| 9 | `THI_RECORDS` | Calculated Tyre Health Index records with factor breakdown (pressure, temperature, tread, RRC). |
| 10 | `ALERTS` | Event-driven alert records (`severity`, `category`, `code`, `is_acknowledged`, `is_resolved`). |
| 11 | `INSPECTIONS` | Physical depot inspections, manual NSD and cold pressure readings, condition classifications. |
| 12 | `AUDIT_LOGS` | Immutable administrative audit trails for privileged actions. |
| 13 | `DATA_DICTIONARY` | In-workbook column definitions, units of measure, and enumerated status domains. |


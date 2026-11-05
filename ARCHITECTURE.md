# JK Tyre THI Fleet Intelligence Platform - System Architecture

## 1. Overview
The **JK Tyre Fleet Intelligence Platform** is an enterprise-grade commercial vehicle tyre management, telematics, and health monitoring platform. It is engineered to monitor commercial vehicle fleets (trucks, buses, tippers, light commercial vehicles), track tyre health over full life cycles (from virgin fitment through retread cycles), compute explainable Tyre Health Index (THI) and Trip Scores, raise operational alerts, and deliver an interactive 3D digital-twin inspection experience.

---

## 2. Architecture Principles
1. **Zero Frontend-Direct Database Access**: All mutations and queries pass through the Flask REST backend.
2. **Strict Multi-Tenant Fleet Isolation**: Every query involving fleet resources enforces `fleet_id` scoping at both query and authorization layers.
3. **Permanent Tyre Identity**: A tyre is tracked by its unique serial/RFID/barcode across vehicle fitment, remount, retread, and salvage events.
4. **Configuration-Driven Wheel Layouts**: Vehicles specify axle count, single/dual arrangements, and position codes (e.g., Steer FL/FR, Drive LIO/LII/RIO/RII, Trailer). The 3D viewer dynamically renders according to the vehicle's actual layout.
5. **Separation of Concerns**:
   - **THI Engine**: Real-time snapshot of tyre condition (0–100 score).
   - **Trip Score Engine**: Operational driving and severity score (0–100 score).
   - **Alert Engine**: Event-driven deduplicated alerts with resolution workflows.
   - **TREEL Telemetry Provider Adapter**: Decoupled interface supporting mock simulator and future real sensor feeds.
6. **Data Provenance**: Explicit tracking of data sources (`SYNTHETIC`, `REAL_TELEMETRY`, `MANUAL_INSPECTION`, `RULE_DERIVED`, `ML_PREDICTION`).

---

## 3. High-Level Component Architecture

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                 |
|                                                                                       |
|   +-----------------------+  +-----------------------+  +-------------------------+   |
|   |   JK Tyre Admin       |  |   Fleet Owner Portal  |  |    Driver Mobile Web    |   |
|   |   - Cross-fleet view  |  |   - Dashboard/Alerts  |  |    - Trip start/end     |   |
|   |   - Policy & Users    |  |   - 3D Vehicle Twin   |  |    - Odometer entry     |   |
|   |   - Audit Logs        |  |   - Tyres & Analytics |  |    - Offline Queue      |   |
|   +-----------+-----------+  +-----------+-----------+  +------------+------------+   |
|               |                          |                           |                |
|               +--------------------------+---------------------------+                |
|                                          | HTTPS / REST                               |
+------------------------------------------v--------------------------------------------+
|                                    BACKEND API LAYER                                  |
|                                                                                       |
|   +-------------------+  +-------------------+  +------------------+  +-----------+   |
|   | Auth & RBAC Guard |  |  Fleet Isolation  |  | Rate Limiter     |  | Audit Log |   |
|   +-------------------+  +-------------------+  +------------------+  +-----------+   |
|                                                                                       |
|   Endpoints:                                                                          |
|   - /api/v1/auth          - /api/v1/vehicles      - /api/v1/trips     - /api/v1/driver|
|   - /api/v1/fleets        - /api/v1/tyres         - /api/v1/alerts    - /api/v1/treel |
|   - /api/v1/inspections   - /api/v1/analytics     - /api/v1/admin                     |
+------------------------------------------+--------------------------------------------+
|                                          |                                            |
|                                          v                                            |
|                                  CORE DOMAIN ENGINES                                  |
|                                                                                       |
|   +---------------------------------------+  +------------------------------------+   |
|   |           THI Rule Engine             |  |         Trip Score Engine          |   |
|   | - Pressure %Dev scoring               |  | - Baseline compliance              |   |
|   | - Temperature risk scoring            |  | - Thermal stress accumulation      |   |
|   | - NSD & Wear % degradation            |  | - Speed & harsh event penalties    |   |
|   | - Explainable component breakdown     |  | - Fuel efficiency impact           |   |
|   +---------------------------------------+  +------------------------------------+   |
|                                                                                       |
|   +---------------------------------------+  +------------------------------------+   |
|   |             Alert Engine              |  |         Wear & ML Baselines        |   |
|   | - Dynamic threshold evaluation        |  | - Linear wear regression           |   |
|   | - Alert deduplication & cooldown      |  | - Projected remaining km           |   |
|   | - Ack & resolution tracking           |  | - Tabular gradient boosting        |   |
|   +---------------------------------------+  +------------------------------------+   |
+------------------------------------------+--------------------------------------------+
|                                          |                                            |
|                                          v                                            |
|                              DATA & INTEGRATION ADAPTERS                              |
|                                                                                       |
|   +----------------------------------------+  +-----------------------------------+   |
|   |        Mock TREEL TPMS Adapter         |  |   Synthetic Generator (20-50 veh) |   |
|   | - Payload validator & normalizer       |  | - Monotonic odometers             |   |
|   | - Timestamp & unit converter           |  | - Physics-correlated P/T/Speed    |   |
|   | - Fault detection & stale marking      |  | - Seed-reproducible runs          |   |
|   +----------------------------------------+  +-----------------------------------+   |
+------------------------------------------+--------------------------------------------+
|                                          |                                            |
|                                          v                                            |
|                                     PERSISTENCE                                       |
|                                                                                       |
|                 SQLite (Local Dev) / PostgreSQL Compatible Schema                     |
|     [Fleets] [Users] [Vehicles] [Tyres] [Fitments] [Trips] [Telemetry] [Alerts]       |
+---------------------------------------------------------------------------------------+
```

---

## 4. Security & Multi-Tenancy Architecture
- **Roles**:
  - `SUPER_ADMIN`: JK Tyre administrator (cross-fleet aggregate views, system configuration, audit logs, authorized tenant views).
  - `FLEET_MANAGER`: Full management of their own fleet (vehicles, tyres, trips, inspections, alerts, drivers).
  - `DRIVER`: Scoped to designated assigned vehicle, active trips, and inspection entry.
- **Fleet Isolation Mechanism**:
  - All multi-tenant tables (`vehicles`, `tyres`, `trips`, `inspections`, `alerts`) contain `fleet_id`.
  - Backend dependency/helper `enforce_fleet_access(user, target_fleet_id)` guarantees unauthorized fleet requests return `403 Forbidden`.
  - All repository queries filter by `fleet_id == current_user.fleet_id` unless the requester is authorized `SUPER_ADMIN`.
- **Authentication**: JWT tokens signed with secure secret, Bcrypt/Argon2 password hashing, rate-limiting on sensitive endpoints.

---

## 5. Configuration-Driven Wheel & 3D Architecture
Commercial vehicle configurations supported:
1. **6-Wheeler Rigid Truck / Bus (4x2)**: 2 Steer (FL, FR) + 4 Drive (RLO, RLI, RRI, RRO).
2. **10-Wheeler Heavy Hauler (6x2 / 6x4)**: 2 Steer + 8 Tandem Drive (Axle 2: LIO, LII, RII, RIO; Axle 3: LIO, LII, RII, RIO).
3. **12-Wheeler / 14-Wheeler Multi-Axle**: Lift axles, twin steer, tandem dual drive.
4. **4-Wheeler LCV / Passenger**: 2 Front + 2 Rear.

Each vehicle stores its layout configuration as JSON metadata:
```json
{
  "axle_count": 3,
  "layout_type": "10-Wheeler",
  "axles": [
    {"index": 1, "type": "STEER", "positions": ["FL", "FR"], "dual": false},
    {"index": 2, "type": "DRIVE_FORWARD", "positions": ["R1_LIO", "R1_LII", "R1_RII", "R1_RIO"], "dual": true},
    {"index": 3, "type": "DRIVE_REAR", "positions": ["R2_LIO", "R2_LII", "R2_RII", "R2_RIO"], "dual": true}
  ]
}
```
The 3D viewer reads this exact layout to position wheel meshes dynamically.

---

## 6. Calculation Engines
- **THI Engine**: Evaluates Pressure %Dev, Temperature limits, Tread Wear %, and RRC stress. Calculates a deterministic score in $[0, 100]$ alongside full factor explanations and health status (`HEALTHY` [80-100], `WARNING` [50-79], `CRITICAL` [0-49], `UNKNOWN`).
- **Trip Score Engine**: Evaluates trip telemetry deviations, thermal peaks, excessive speed events, and pressure stability.
- **Alert Engine**: Evaluates real-time criteria (`PR01`-`PR09`, `TP01`-`TP07`, `TD01`-`TD08`, etc.), with deduplication window (e.g. 15 min for identical alert) and explicit state machine (`ACTIVE` -> `ACKNOWLEDGED` -> `RESOLVED`).

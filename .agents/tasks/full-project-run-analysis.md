# JK Tyre THI Fleet Intelligence Platform — Full Project Analysis

## Summary Answer (TL;DR)

This is the **JK Tyre Fleet Intelligence Platform**: a full-stack, multi-tenant commercial-vehicle tyre management, telematics, and health-monitoring system. A **Python Flask + SQLAlchemy** backend serves a **React + TypeScript + Vite** frontend. The backend computes an explainable **Tyre Health Index (THI)** and **Trip Score**, raises deduplicated operational **alerts**, tracks tyres across fitment/retread/scrap **lifecycles**, renders a **3D digital-twin** vehicle inspection view, and silently mirrors all fleet data into an **OEM (JK Tyre) data vault** for corporate oversight. Data is seeded by a reproducible **synthetic generator** (30 vehicles, 4 weeks of correlated telemetry).

**Architecture is solid and internally consistent**, with strict `fleet_id` isolation enforced on nearly every query, JWT auth, RBAC (Super Admin / Fleet Manager / Driver), and bcrypt hashing. The backend has 31 passing pytest tests and the frontend type-checks and builds cleanly (per `PROJECT_STATUS.md`).

**However, the project will NOT run cleanly on this machine as-is.** Three blockers were found:

1. **Python version mismatch (blocking).** This machine has **Python 3.14.5**; the project is tested on **3.12.10**. `requirements.txt` pins `numpy==1.26.4`, `scikit-learn==1.5.0`, `pandas==2.2.2` — none of these publish wheels for Python 3.14, so `pip install -r requirements.txt` will fail trying to build from source. **Use Python 3.11 or 3.12.**
2. **`.env.example` has hardcoded dev-machine paths.** It points `DATABASE_URL` to `d:/05_JKT/backend/instance/jktyre.db` (the original developer's path), which does not exist here. Copying it verbatim to `.env` would create/use a database on a nonexistent `d:` drive. **Leave `DATABASE_URL` unset (the code defaults to `backend/instance/jktyre.db`) or fix it.**
3. **One test has a hardcoded absolute path.** `backend/tests/test_raw_data_exclusion.py` references `d:\05_JKT\data_source`, so it will fail on this machine even though the `data_source/` files are present here.

Two further security/quality concerns are worth flagging: a **hardcoded password-authentication backdoor** in `User.check_password` (any of several magic strings, including `"admin"` and `"password"`, authenticate the seeded admin/manager/driver accounts regardless of the stored bcrypt hash), and the **"Quick Demo" login buttons** on the login page are always visible (not gated behind `VITE_ENABLE_DEV_LOGIN` as `PROJECT_STATUS.md` claims).

---

## 1. Overall Project Architecture & Purpose

**Purpose:** Enterprise tyre/fleet management for commercial vehicles (trucks, buses, tippers, LCVs). It tracks tyre health over full life cycles (virgin fitment → retread → scrap), computes explainable THI and Trip Scores, raises operational alerts, and provides an interactive 3D digital-twin inspection experience plus an OEM (JK Tyre) corporate data vault.

**Architecture (per `ARCHITECTURE.md` and confirmed in code):**
- Presentation layer: three conceptual portals — JK Tyre Admin, Fleet Owner, Driver (all served by one React SPA with role-based routing).
- Backend API layer: Flask blueprints under `/api/v1/*`, guarded by JWT + RBAC + fleet isolation.
- Core domain engines: THI Engine, Trip Score Engine, Alert Engine, Wear/ML baselines.
- Data/integration adapters: Mock TREEL TPMS adapter, Synthetic Generator.
- Persistence: SQLite (local dev) / PostgreSQL-compatible schema via SQLAlchemy.

**Architecture principles** (from `ARCHITECTURE.md` §2): no frontend-direct DB access; strict multi-tenant `fleet_id` isolation; permanent tyre identity across fitment/remount/retread; configuration-driven wheel layouts; separation of THI / Trip Score / Alert / TREEL concerns; explicit data provenance (`SYNTHETIC`, `TREEL_MOCK`, `TREEL_LIVE`, `MANUAL`, etc.).

**Evidence:** `ARCHITECTURE.md`; blueprint registration in `backend/app/__init__.py:21-44`; RBAC + isolation in `backend/app/utils/security.py`.

---

## 2. Backend Tech Stack

| Aspect | Detail | Evidence |
|---|---|---|
| Framework | Flask 3.0.3 | `backend/requirements.txt`, `backend/app/__init__.py` |
| ORM/DB | SQLAlchemy 2.0.36 via Flask-SQLAlchemy 3.1.1; SQLite default, PostgreSQL-compatible | `backend/app/config.py:18-20`, `backend/app/extensions.py` |
| Auth | PyJWT 2.8.0 (HS256), bcrypt 4.1.3 | `backend/app/utils/security.py:1-24`, `backend/app/models/user.py` |
| Data/ML | pandas 2.2.2, openpyxl 3.1.5, numpy 1.26.4, scikit-learn 1.5.0 | `backend/requirements.txt` |
| Tests | pytest 8.2.2 | `backend/requirements.txt` |
| CORS | Flask-Cors 4.0.1, wide-open on `/api/*` (`origins: "*"`) | `backend/app/__init__.py:13` |
| Config loader | python-dotenv 1.0.1 | `backend/app/config.py` |

**Entry point:** `backend/run.py` — calls `create_app()`, runs `db.create_all()`, then `app.run(host="0.0.0.0", port=5000, debug=True)`.

**App factory:** `backend/app/__init__.py::create_app()` initializes `db` + `cors`, registers all 12 blueprints, auto-runs `db.create_all()` and conditionally runs `migrate_v3` if the `lifecycle_type` column is missing on `tyres` (`__init__.py:48-60`), and silently seeds an OEM Vault baseline snapshot via `OEMDataSyncService.ensure_baseline_sync()` (`__init__.py:62-64`). It also defines `/api/v1/health` and 400/404/500 error handlers.

**Config:** `backend/app/config.py` — loads `.env` from the backend dir; default DB at `backend/instance/jktyre.db`; `UPLOAD_FOLDER` = `backend/uploads` (auto-created); 16 MB max upload; allowed image extensions `{png,jpg,jpeg,webp}`; `DEMO_MODE` defaults true; `RULE_ENGINE_VERSION = "v1.0.0-demo-provisional"`.

**Extensions:** `backend/app/extensions.py` — exposes the shared `db = SQLAlchemy()` and `cors = CORS()` singletons.

---

## 3. Backend API Surface

All blueprints registered in `backend/app/__init__.py:21-44`. Prefixes below are the `url_prefix`.

| Blueprint | File | Prefix | Handles |
|---|---|---|---|
| auth | `backend/app/api/auth.py` | `/api/v1/auth` | Public fleet listing (`/public-fleets`), register (`/register` — driver & fleet-manager, generates branded `JK-FLT-XXXXX`/`JK-DRV-XXXXX` login IDs), login (`/login` — unified, email only for Super Admin), `/me` |
| admin | `backend/app/api/admin.py` | `/api/v1/admin` | Super-Admin-only: `/platform-stats`, `/fleets`, `/users`, `/audit-logs`, `/map-locations` (India map with freshness), OEM Vault `/oem-vault/{summary,fleet/<id>,sync-now,export/<id>}` |
| fleet | `backend/app/api/fleet.py` | `/api/v1/fleets` | `/profile`, `/stats`, `/my-fleets` (authorized-fleet list w/ search), `/<fleet_id>`, POST `/` (create fleet) |
| vehicles | `backend/app/api/vehicles.py` | `/api/v1/vehicles` | List/create vehicles, `/<id>` detail, `/<id>/3d-twin` (3D layout+tyre data), `/<id>/fitment-history` |
| tyres | `backend/app/api/tyres.py` | `/api/v1/tyres` | List/create, `/available`, `/<id>` (detail + RUL estimate + THI history), `/<id>/fit`, `/<id>/remove`, `/<id>/lifecycle-history` |
| trips | `backend/app/api/trips.py` | `/api/v1/trips` | List (vehicle/status/date filters), `/<trip_id>` |
| inspections | `backend/app/api/inspections.py` | `/api/v1/inspections` | List, `/vehicle/<id>` summary, POST create (multipart photo upload + lifecycle transitions + alert eval), `/photo/<filename>` (auth-gated), `/vehicle/<id>/close` (saves `VehicleInspectionReport`), `/vehicle/<id>/reports`, `/reports/<id>` |
| alerts | `backend/app/api/alerts.py` | `/api/v1/alerts` | List (status/category/severity filters), `/<id>/acknowledge`, `/<id>/resolve` (note required) |
| analytics | `backend/app/api/analytics.py` | `/api/v1/analytics` | `/summary`, `/trends` (daily THI vs 95.0 baseline), `/comparison` (2–10 vehicles enforced), `/ml-model` (GET metrics / POST inference) |
| driver | `backend/app/api/driver.py` | `/api/v1/driver` | `/assigned-vehicle`, `/active-trip`, `/start-trip`, `/end-trip` (odometer-monotonic + trip score), `/alerts` |
| treel | `backend/app/api/treel.py` | `/api/v1/treel` | `/ingest` (mock TPMS payload → normalize → quarantine → store → THI + alerts), `/provider-info` |
| export | `backend/app/api/export.py` | `/api/v1/export` | `/excel` (13-sheet workbook, secrets redacted), `/csv?table=` (vehicles/tyres/trips/alerts) |

Health check: `GET /api/v1/health` (defined inline in `__init__.py`).

---

## 4. Data Models

All in `backend/app/models/*.py`, aggregated in `backend/app/models/__init__.py`. UUID PKs (`String(36)`), timezone-aware `datetime.now(timezone.utc)` defaults, `to_dict()` serializers on every model.

**Core entities & relationships:**

- **Fleet** (`fleet.py`): owning transport company with hub city + lat/long. Has users, vehicles, tyres, trips, alerts, inspections (cascade delete).
- **User** (`user.py`): `role` ∈ `SUPER_ADMIN/FLEET_MANAGER/DRIVER`; bcrypt-hashed password; `fleet_id` (nullable for Super Admin); many-to-many **`user_fleets`** association table enabling multi-fleet managers (`managed_fleets` relationship + `authorized_fleets` property).
- **Vehicle** (`vehicle.py`): `wheel_config` (10/12/14/16-Wheeler selectable; 4/6-Wheeler legacy), `layout_json` (axle/position schema), live GPS + `location_source` + freshness; **`calculate_thi()`** computes a priority-weighted vehicle THI (critical tyres weighted 4×, warning 2×).
- **Tyre** (`tyre.py`): permanent identity by `serial_number`; `blueprint_nsd`/`current_nsd`, `retread_count`, `total_km_run`, live `current_thi`/`thi_status`, `status` (FITTED/IN_INVENTORY/RETREADING/SCRAPPED), `lifecycle_type` (NEW/REUSE/RETREAD/SCRAP). `wear_percentage` property.
- **TyreFitment** (`fitment.py`): mount/dismount history linking tyre↔vehicle↔wheel position (axle_number, wheel_position, is_dual, is_inner, fitted/removed odometer+nsd, removal_reason).
- **Trip** (`trip.py`): `start/end_odometer`, `distance_km`, `trip_score` + `score_breakdown_json` (explainable components).
- **TelemetryRecord** (`telemetry.py`): per-position sensor frames (pressure_psi, temperature_c, speed_kmh, battery_soc, odometer), `is_stale`/`is_faulty`, `provenance`.
- **THIRecord** (`thi.py`): explainable evaluation (score, status, pressure/temp/wear/rrc sub-scores, inputs_json, explanation, rule_version).
- **Alert** (`alert.py`): `code` (PR/TP/TD/BT…), category, severity, observed_value, `status` ACTIVE→ACKNOWLEDGED→RESOLVED with ack/resolve user + timestamps.
- **Inspection** (`inspection.py`): physical measurements + lifecycle-transition fields (retread date/provider/count, temperature_at_inspection). Also **`VehicleInspectionReport`** — a persisted, closed-cycle audit report with pass/warn/fail counts and per-wheel `details` JSON.
- **AuditLog** (`audit.py`): immutable privileged-action log (user, fleet, action, resource_type/id, details_json, ip, timestamp).
- **TyreLifecycleHistory** (`lifecycle_history.py`): append-only transitions (previous→new lifecycle_type/status, related inspection/fitment, nsd/km at change, scrap_reason).
- **OEMFleetVault** (`oem_vault.py`): JK Tyre corporate ingest vault — full fleet snapshot (payload JSON) with metrics (avg_thi, totals), `data_hash` (SHA-256), sync_channel.

**Relationships** are wired with `back_populates` and cascade rules (`CASCADE` for owned children, `SET NULL` for audit/user refs, `RESTRICT` for trips↔driver and inspections↔inspector). `DATA_DICTIONARY.md` documents the full schema; the code matches it.

---

## 5. Services Layer

`backend/app/services/*.py` — pure domain logic, mostly classmethods (no Flask request coupling except `alert_engine`/`oem_vault_service` touch the DB session).

- **THIEngine** (`thi_engine.py`): deterministic 0–100 score with weights pressure 0.40 / temp 0.25 / wear 0.25 / RRC 0.10. Handles faulty→CRITICAL(0), stale→UNKNOWN(50), missing→UNKNOWN(50); safety-critical capping aligns final score with status bands (HEALTHY≥80, WARNING 60–80, CRITICAL<60). Returns full component breakdown + plain-text explanation + `rule_version`.
- **TripScoreEngine** (`trip_score_engine.py`): independent 0–100 driver/operating score (pressure compliance, thermal stability, speed compliance, fuel efficiency). Empty samples → provisional 85/GOOD.
- **AlertEngine** (`alert_engine.py`): `ALERT_CATALOGUE` maps codes (PR01–PR09, TP03/04/07, TD03/05/07, BT01) to category/severity/explanation/action. `evaluate_telemetry` + `evaluate_inspection` create **deduplicated** alerts (30-min cooldown window against ACTIVE/ACKNOWLEDGED).
- **WearEngine** (`wear_engine.py`): linear wear-rate RUL estimate; returns `INSUFFICIENT_HISTORY` when <1000 km or no measurable wear; confidence HIGH (≥3 inspections + >10k km) else MODERATE.
- **TyreWearMLService** (`ml_service.py`): scikit-learn tabular baseline (LinearRegression + RandomForestRegressor) predicting NSD wear from achieved_km + is_steer. Auto-generates a calibrated synthetic training batch (400 samples, seed 42) if <50 historical records; reports holdout MAE/RMSE/R² with explicit "synthetic demonstration model" disclaimer.
- **MockTreelAdapter** (`treel_provider.py`): `BaseTPMSProvider` ABC + mock impl. Normalizes units (bar/kPa→psi, F→C), parses ISO timestamps, quarantines out-of-range/null readings.
- **OEMDataSyncService** (`oem_vault_service.py`): "incognito" JK Tyre corporate data layer. `capture_fleet_snapshot` aggregates fleet vehicles/tyres/telemetry/alerts/trips/inspections into an `OEMFleetVault` payload with SHA-256 hash; `sync_all_fleets`, `ensure_baseline_sync` (runs at startup if vault empty), `get_vault_summary`, `get_fleet_detail`, `export_fleet_payload`. Triggered silently on TREEL ingest and inspection submission.

---

## 6. Frontend Tech Stack

| Aspect | Detail | Evidence |
|---|---|---|
| Framework | React 18.3.1 + TypeScript 5.4.5, Vite 5.3.1 | `frontend/package.json` |
| Routing | react-router-dom 6.23.1 | `frontend/src/App.tsx` |
| Data fetching | @tanstack/react-query 5.45.1 | `frontend/src/main.tsx`, `src/queryClient.ts` |
| State | zustand 4.5.2 (auth store) + localStorage persistence | `frontend/src/store/authStore.ts` |
| HTTP | axios 1.7.2 with interceptors (Bearer token + `X-Fleet-ID` header; 401→logout redirect) | `frontend/src/services/api.ts` |
| 3D | three 0.165.0 + @react-three/fiber 8.16.8 + @react-three/drei 9.106.0; loads `public/models/truck_clean_no_tyres.glb` | `frontend/src/components/3d/`, `frontend/public/models/` |
| Charts | recharts 2.12.7 (THI trends, comparison) | `frontend/package.json` |
| Styling | Tailwind CSS 3.4.4 + PostCSS/Autoprefixer; brand palette (yellow `#FFC800`, graphite `#14161A`, soft `#F4F3EF`) | `frontend/tailwind.config.js` |
| Icons/animation | lucide-react, framer-motion 14 | `frontend/package.json` |
| Offline | localStorage-based driver offline queue (`offlineQueue.ts`) with retry for trip start/end + inspections | `frontend/src/services/offlineQueue.ts` |

**Entry point:** `frontend/src/main.tsx` mounts `<App/>` inside `BrowserRouter` + `QueryClientProvider`. `frontend/vite.config.ts` runs dev on port 5173 and proxies `/api` → `http://127.0.0.1:5000`.

**Build/serve:** `npm run dev` (Vite dev server), `npm run build` (`tsc && vite build`), `npm run preview`. `strict: false` in `tsconfig.json` (lenient type-check).

**Main routes** (from `frontend/src/App.tsx`): Public `/`, `/login`, `/register`. Authenticated (guarded by `ProtectedRoute` checking `isAuthenticated`): `/dashboard`, `/my-fleets`, `/vehicles`, `/vehicles/:id`, `/vehicles/:id/3d`, `/vehicles/:id/inspections`, `/tyres`, `/tyres/:id`, `/trips`, `/inspections`, `/fitment`, `/alerts`, `/trends`, `/comparison`, `/reports`, `/admin`, `/admin/map`, `/admin/oem-vault`, `/driver`. Catch-all → `/`.

---

## 7. Migrations

`backend/migrations/migrate_v2.py` and `migrate_v3.py` are **manual SQLite `ALTER TABLE` scripts** for upgrading pre-existing databases (note: not auto-applied except v3). They use raw `sqlite3`, guard column existence via `PRAGMA table_info`, and are idempotent-ish.

- **migrate_v2.py:** adds `city/latitude/longitude` to `fleets`; adds `current_latitude/current_longitude/current_location_name/location_updated_at/location_source` to `vehicles`; creates `user_fleets` association table; strips " Singh" suffix from driver names; sets default fleet coordinates; links `apex_manager` to all fleets; backfills vehicle coordinates from Indian hub list. **Not invoked automatically anywhere** — must be run manually if upgrading an old DB.
- **migrate_v3.py:** adds `lifecycle_type` to `tyres`; adds inspection result/lifecycle/retread/temperature fields to `inspections`; creates `tyre_lifecycle_history` table; backfills `lifecycle_type='NEW'`. **Auto-run from `create_app()`** (`__init__.py:53-57`) only if `lifecycle_type` is absent from `tyres`.

For a **fresh database**, neither is strictly needed — `db.create_all()` (in `run.py` and `create_app()`) creates the full schema from the SQLAlchemy models directly. Migrations exist for the upgrade path from older schema versions.

---

## 8. Synthetic Data Generator

`backend/synthetic/generator.py` — a reproducible, physics-correlated dataset generator run as `python -m synthetic.generator --seed 42 --vehicles 30 [--weeks 4] [--clear]`.

**Purpose:** bootstraps the empty DB with demo fleets, users, vehicles, permanent tyres, fitments, multi-week trips, correlated telemetry (pressure/temp/speed/battery), THI evaluations, alerts, and inspections. Creates **3 fleets** (Apex Trans Logistics, Bharat Freightways for isolation testing, Apex Northern Express for multi-fleet demo), 1 Super Admin, 1 Fleet Manager (linked to 2 fleets), 7 drivers ("Driver 1"…"Driver 7"), and N vehicles distributed across fleets (last vehicle → fleet2; vehicles 27–28 → fleet3; rest → fleet1).

**Key features:** deterministic seed; monotonic odometers; gas-law pressure/temp correlation; injected edge cases (FL puncture on vehicle 2, R1_LO overheating on vehicle 3); `provenance=SYNTHETIC`; full THI + alert evaluation per telemetry frame; Trip Score per completed trip. `--clear` (or `--vehicles 0`) wipes all vehicle/tyre/telemetry/THI/alert/inspection/lifecycle/vault records while keeping fleets/users. `backend/clear_dummy_data.py` is a standalone equivalent purge script.

---

## 9. Tests

`backend/tests/` — **9 test files, 31 tests** (per `PROJECT_STATUS.md`). Pure-engine tests (THI, Trip Score) need no DB; integration tests (auth, corrections, driver workflow, vehicle/tyre fitment, TREEL adapter) use `create_app()` + `app.test_client()` against the **real `instance/jktyre.db`** (no isolated test DB, no `conftest.py` fixtures that seed data).

| File | Covers |
|---|---|
| `test_thi_engine.py` | THI bounds, optimal/moderate/severe under-inflation, overheating, critical wear, missing/stale/faulty → correct statuses |
| `test_trip_score.py` | Empty samples, smooth journey, thermal spike penalty, overspeed penalty |
| `test_alert_engine.py` | Generation + deduplication; ack ≠ resolve |
| `test_auth_isolation.py` | Login success/failure; cross-fleet access → 403; Super Admin cross-fleet OK |
| `test_vehicle_tyre_fitment.py` | Wheel configurations/layout; permanent tyre identity preservation |
| `test_driver_workflow.py` | Trip start/end lifecycle, odometer validation |
| `test_treel_adapter.py` | Normalization (bar/kPa→psi, F→C); bad-value quarantine |
| `test_corrections_suite.py` | Driver names no "Singh"; my-fleets isolation; admin map freshness; vehicle-specific trips/inspections 403; comparison 2–10 limits; 13-sheet export + secrets exclusion; trends baseline 95.0 |
| `test_raw_data_exclusion.py` | "NSD Inspection Data" sheet excluded from `Rawwww Data.xlsx` |

**How to run:**
```powershell
# All-in-one (from repo root) — runs backend pytest then frontend build:
.\run_tests.ps1

# Backend only (from backend, venv active):
python -m pytest tests -v
# or per suite:
python -m pytest tests/test_thi_engine.py -v
```

**Critical caveat:** the integration tests **assume the DB is already seeded** (they log in as `fleet.manager@translogistics.com` and query `Bharat Freightways`, and `test_comparison_limits` needs ≥11 vehicles in fleet1). Therefore the synthetic generator **must be run first** against the same `instance/jktyre.db` before `pytest` will pass. The tests are not self-contained.

---

## 10. Configuration Needed to Run

**Env vars** (from `backend/.env.example`; all optional with code defaults):
- `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` (default 1440 min / 24 h)
- `DATABASE_URL` — **see gotcha below**; defaults to `sqlite:///<backend>/instance/jktyre.db`
- `UPLOAD_FOLDER`, `MAX_CONTENT_LENGTH` (16 MB default)
- `FLASK_APP`, `FLASK_ENV`, `FLASK_DEBUG`, `RATE_LIMIT_ENABLED`, `DEMO_MODE` (default true), `SYNTHETIC_DATA_ENABLED`
- Frontend: `VITE_ENABLE_DEV_LOGIN` (optional; only toggles the "Dev Mode" navbar badge)

**Database setup:** none required beyond running the app — `config.py` auto-creates `backend/instance/` and `backend/uploads/` directories at import; `db.create_all()` creates tables; `migrate_v3` auto-applies if needed.

**Seed/migration step required before first meaningful run:** generate starter data:
```powershell
python -m synthetic.generator --seed 42 --vehicles 30
```
This creates the demo fleets, users (incl. `jkadmin`/`apex_manager`/`driver1`), vehicles, tyres, telemetry, THI, and alerts. Without it, the app runs but has no data and no demo accounts.

**Demo credentials** (from `README.md` + generator; seeded passwords):
| Role | Login | Password |
|---|---|---|
| Super Admin | `admin@jktyre.com` (or `jkadmin`) | `Admin@12345` |
| Fleet Manager | `apex_manager` | `Fleet@12345` |
| Driver | `driver1` | `Driver@12345` |

---

## 11. Exact Run Commands (Windows / PowerShell)

> **Prerequisite:** install **Python 3.11 or 3.12** (NOT 3.14 — see gotcha #1) and **Node.js v20+**.

### Backend
```powershell
# From the backend directory (absolute path used for clarity):
cd c:\Users\vaisi\OneDrive\Desktop\jk-new\backend

# 1. Create virtual environment
python -m venv venv

# 2. Activate it
.\venv\Scripts\Activate.ps1

# 3. Install dependencies (requires Python 3.11/3.12)
pip install -r requirements.txt

# 4. Create local env config — IMPORTANT: edit DATABASE_URL (see gotcha #2)
Copy-Item .env.example .env
#    Then open .env and either DELETE the DATABASE_URL line or set it to:
#    DATABASE_URL=sqlite:///$(Resolve-Path .).instance/jktyre.db  (or just leave it absent)

# 5. Initialize DB + seed starter data (30 vehicles, 4 weeks telemetry)
python -m synthetic.generator --seed 42 --vehicles 30

# 6. Start the Flask backend (serves on http://127.0.0.1:5000)
python run.py
```
Convenience: `.\start_backend.ps1` from repo root (expects `backend/venv` to exist).

### Frontend (separate terminal)
```powershell
cd c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend

# 1. Install Node dependencies
npm install

# 2. Start Vite dev server (http://localhost:5173; proxies /api -> :5000)
npm run dev
```
Convenience: `.\start_frontend.ps1` from repo root.

### Run tests (after backend is seeded)
```powershell
# From repo root (runs backend pytest then frontend build):
.\run_tests.ps1

# Or backend only (venv active, from backend\):
python -m pytest tests -v
```

---

## 12. Known Issues, TODOs & Gotchas

### Blockers for running on this machine

1. **Python 3.14 incompatibility (BLOCKING).** Installed Python is 3.14.5; project tested on 3.12.10. Pinned `numpy==1.26.4`, `scikit-learn==1.5.0`, `pandas==2.2.2` have **no Python 3.14 wheels** — `pip install` will attempt (and likely fail) to compile from source, needing a C toolchain. **Fix: install/use Python 3.11 or 3.12 for the venv.** (`backend/requirements.txt`; system `python --version` → `Python 3.14.5`.)
   - Verified on this machine: `python --version` → 3.14.5; `node --version` → v24.15.0; `npm --version` → 12.2.0. Node 24 is newer than tested (22.14.0) but Vite 5/React 18 should work fine.

2. **`.env.example` has stale dev-machine paths.** `DATABASE_URL=sqlite:///d:/05_JKT/backend/instance/jktyre.db` and `UPLOAD_FOLDER=d:/05_JKT/backend/uploads` reference the original author's `D:\05_JKT` repo, not this workspace. Copying `.env.example` to `.env` verbatim makes the app try to create the DB on a nonexistent `d:` drive. **Fix:** delete/blank the `DATABASE_URL` line (the code defaults correctly to `backend/instance/jktyre.db`) or set it to the local path. (`backend/.env.example`, `backend/app/config.py:18-20`.)

3. **Hardcoded test path.** `backend/tests/test_raw_data_exclusion.py` hardcodes `DATA_SOURCE_DIR = r"d:\05_JKT\data_source"`. The files actually exist at `c:\Users\vaisi\OneDrive\Desktop\jk-new\data_source\`, so this test fails here. **Fix:** make the path relative to the repo root, e.g. `Path(__file__).resolve().parents[2] / "data_source"`. (`backend/tests/test_raw_data_exclusion.py:10`.)

### Security & correctness concerns (recommend fixing)

4. **Hardcoded password-authentication backdoor (HIGH).** `User.check_password` (`backend/app/models/user.py:62-69`) accepts a fixed list of magic passwords (`"Password123!", "Admin@12345", "Fleet@12345", "Driver@12345", "admin", "password"`) for usernames `jkadmin`, `apex_manager`, or any `driver*` — **bypassing the bcrypt hash entirely**. This means `admin@jktyre.com` can be logged into with the literal password `"admin"` or `"password"`. This is a serious production hazard even if "demo-only". **Fix:** remove the fallback entirely (seed accounts already use real bcrypt hashes via `set_password` in the generator); if demo convenience is needed, gate it behind `DEMO_MODE` and never accept `"admin"`/`"password"`.

5. **"Quick Demo" login buttons not gated (MEDIUM).** `frontend/src/pages/public/LoginPage.tsx` always renders Fleet/Driver/Admin quick-fill buttons (setting `apex_manager`/`driver1`/`jkadmin` + password `Password123!`). `PROJECT_STATUS.md` (item K.1) claims these were gated behind `VITE_ENABLE_DEV_LOGIN === 'true'`, but the only `VITE_ENABLE_DEV_LOGIN` reference in the codebase is in `Navbar.tsx` (gating the dev-mode badge, not the login buttons). **Fix:** wrap the quick-demo `<div>` in `{isDevLoginEnabled && (...)}` to match the documented behavior. (`frontend/src/pages/public/LoginPage.tsx`; grep `VITE_ENABLE_DEV_LOGIN`.)

### Operational gotchas

6. **Tests are not isolated — they require pre-seeded data.** The `client` fixture in `test_auth_isolation.py`/`test_corrections_suite.py` uses the real `instance/jktyre.db` with no seeding. Login as `fleet.manager@translogistics.com`, the `Bharat Freightways` fleet, and the ≥11-vehicle comparison test all depend on `python -m synthetic.generator` having been run first. Running `pytest` on a fresh/empty DB will fail many integration tests. **Fix (optional):** add a `conftest.py` that seeds a temp in-memory/throwaway DB, or document the seeding prerequisite in `TESTING.md`.

7. **migrate_v2 is never auto-applied.** Only `migrate_v3` is auto-run from `create_app()`. For a fresh DB this is fine (`db.create_all()` creates everything), but anyone upgrading a genuinely old DB must run `migrate_v2.py` manually. (`backend/app/__init__.py:48-60`.)

8. **CORS wide open.** `cors.init_app(app, resources={r"/api/*": {"origins": "*"}})` allows any origin. Fine for local dev/demo; tighten for any real deployment. (`backend/app/__init__.py:13`.)

9. **Debug mode on by default.** `run.py` runs `app.run(..., debug=True)`, which enables the Werkzeug debugger (potential RCE if exposed). Acceptable for local dev only. (`backend/run.py:14`.)

10. **OEM Vault silently writes to the DB on startup, TREEL ingest, and every inspection.** `create_app()` calls `OEMDataSyncService.ensure_baseline_sync()`, and `/treel/ingest` + inspection creation each call `capture_fleet_snapshot(...)`. This is by design ("incognito channel") but means extra writes/commits happen on hot paths and at startup — worth knowing for performance and for any privacy review. (`backend/app/__init__.py:62-64`; `backend/app/api/treel.py:80-84`; `backend/app/api/inspections.py`.)

11. **Email login normally blocked for non-admins (except in TESTING).** `auth.py::login` rejects email login for non-Super-Admins with `USE_LOGIN_ID_REQUIRED` unless `app.config["TESTING"]` is set — which is why the test suite can log in via email. In normal runs, fleet managers/drivers must use their `JK-FLT-XXXXX`/`JK-DRV-XXXXX` Login ID. (`backend/app/api/auth.py:131-141`.)

12. **`tsconfig.json` has `strict: false`.** The frontend type-check is lenient; `npm run build` will pass with type weaknesses that strict mode would catch. (`frontend/tsconfig.json:13`.)

13. **Synthetic "Password123!" vs seeded hashes.** The login quick-demo buttons inject `Password123!`, which only works because of the backdoor in gotcha #4 — the generator actually seeds these accounts with `Admin@12345`/`Fleet@12345`/`Driver@12345`. The two password values diverge; the backdoor papers over the mismatch. Remove the backdoor (gotcha #4) and the quick-demo buttons would need to use the real seeded passwords.

---

## Conclusions & Recommendations

The platform is a well-structured, feature-complete demo/reference implementation. The domain modeling (tyre lifecycle, fitment, THI/Trip Score separation, alert deduplication, multi-tenant isolation) is coherent and the test suite covers the critical security and business-logic paths.

**To get it running here, in priority order:**
1. Switch to Python 3.11/3.12 and recreate the venv (resolves gotcha #1 — the only true blocker).
2. Create `.env` from `.env.example` but **remove or fix the `DATABASE_URL`/`UPLOAD_FOLDER` paths** (gotcha #2), then run `python -m synthetic.generator --seed 42 --vehicles 30`, then `python run.py`.
3. `npm install` + `npm run dev` in `frontend/`; log in via the Quick Demo buttons or the seeded credentials.

**Recommended fixes (implement nothing here):**
- Remove the `User.check_password` magic-password backdoor (gotcha #4) — the single highest-impact security fix.
- Gate the login page's Quick Demo buttons behind `VITE_ENABLE_DEV_LOGIN` to match the documented design (gotcha #5).
- Make `test_raw_data_exclusion.py` use a repo-relative path (gotcha #3).
- Add a `conftest.py` that seeds an isolated test database so pytest is self-contained (gotcha #6).
- Tighten CORS and turn off `debug=True` before any non-local exposure (gotchas #8, #9).

No code was modified during this analysis (read-only investigation).

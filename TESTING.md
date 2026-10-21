# JK Tyre THI Fleet Intelligence Platform - Testing Strategy & Verification

## 1. Overview
Quality and test verification are mandatory across every tier of the platform. No component is marked complete without automated tests verifying its correctness, security, and edge-case resilience.

---

## 2. Test Suites Overview

| Suite | File | Focus |
|---|---|---|
| **Corrections & Enhancements Suite** | `backend/tests/test_corrections_suite.py` | Validates driver names (`Driver N`), multi-fleet isolation, admin map coordinates, vehicle-specific trips/inspections authorization, comparison limits (2-10 enforcement), 13-sheet Excel export, and trend baseline. |
| **Exclusion Verification** | `backend/tests/test_raw_data_exclusion.py` | Asserts that "NSD Inspection Data" in `Rawwww Data.xlsx` is never imported, processed, or fed to ML. |
| **Database & Schema** | `backend/tests/test_schema.py` | Validates SQLite & PostgreSQL-compatible schema, foreign keys, cascade safety, and unique constraints. |
| **Auth & Fleet Isolation** | `backend/tests/test_auth_isolation.py` | Verifies JWT auth, RBAC permissions, and tests that altering `fleet_id` or target resource ID in requests produces a strict `403 Forbidden`. |
| **Vehicle & Tyre Fitment** | `backend/tests/test_vehicle_tyre_fitment.py` | Verifies permanent tyre identities, fitment/unfitment history preservation, and configuration-driven wheel setups. |
| **Synthetic Generator** | `backend/tests/test_synthetic_data.py` | Verifies deterministic seeds, monotonic vehicle odometers, foreign key consistency, sensor fault scenarios, and provenance flags. |
| **THI Engine** | `backend/tests/test_thi_engine.py` | Verifies 0–100 score bounds, component breakdowns, explanation generation, and handling of stale/missing/implausible sensor data without fabricating scores. |
| **Trip Score Engine** | `backend/tests/test_trip_score.py` | Verifies Trip Score bounds, baseline comparison, speed/thermal penalties, and non-confusion with THI. |
| **Alert Engine** | `backend/tests/test_alert_engine.py` | Verifies alert generation, deduplication window, acknowledgment, and resolution workflows. |
| **Driver Workflow & Uploads** | `backend/tests/test_driver_workflow.py` | Verifies trip start/end, odometer validation, inspection submission, non-public photo uploads, and duplicate prevention. |
| **TREEL Adapter** | `backend/tests/test_treel_adapter.py` | Verifies mock provider interface, payload normalization, fault detection, and ID mapping. |
| **Frontend Verification** | `npm run build` / `npx tsc` | Verifies TypeScript type-checking, bundle compilation, and zero type errors. |

---

## 3. Running Automated Tests on Windows

### 3.1 All-in-One Automated Test Runner
From the project root:
```powershell
.\run_tests.ps1
```
This runs both the 31 pytest suites and the full TypeScript compile + Vite production build.

### 3.2 Backend Tests (pytest)
```powershell
# Activate virtual environment if configured
.\backend\venv\Scripts\Activate.ps1

# Run full test suite with verbose output
python -m pytest backend/tests -v
```

### 3.3 Running Targeted Corrections Test Suite
```powershell
python -m pytest backend/tests/test_corrections_suite.py -v
```

### 3.4 Frontend Type-Checking and Build
```powershell
cd frontend
npm run build
cd ..
```

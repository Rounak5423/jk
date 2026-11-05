# Implementation Plan: Tyre Fitment/Inspection Separation + Lifecycle Management

## Codebase Summary (from exploration)

- **Backend**: Flask + SQLAlchemy, SQLite at `backend/instance/jktyre.db`. Blueprints registered in `backend/app/__init__.py`. Migration pattern: raw `sqlite3` PRAGMA-guarded ALTERs, seen in `migrations/migrate_v2.py`.
- **Frontend**: React 18 + TypeScript, Vite build (`tsc && vite build`), TanStack Query, React Router v6, Tailwind CSS v3 dark-navy theme, Lucide icons. No test framework — verification is the build.
- **Auth pattern**: `@jwt_required` + `enforce_fleet_access(fleet_id)` on all API handlers. `g.current_user` carries the user. Do NOT touch `authStore.ts` or `api.ts`.
- **Models confirmed missing**: `lifecycle_type` on `Tyre`, new columns on `Inspection`, `TyreLifecycleHistory` table entirely absent.
- **API confirmed missing**: `POST /tyres/:id/remove`, `GET /tyres/available`, `GET /tyres/:id/lifecycle-history`.
- **Frontend confirmed missing**: `FitmentPage.tsx`, `/fitment` route, lifecycle fields in both inspection modals, lifecycle badge in `TyreCard` and `TyreDetailPage`.
- **Test runner**: `python -m pytest tests/ -v` from `backend/`.
- **Build command**: `npm run build` from `frontend/`.

---

## Implementation Plan

- [ ] 1. **Add `LifecycleType` class and `lifecycle_type` column to the `Tyre` model.**
      Add a `LifecycleType` class (NEW / REUSE / RETREAD / SCRAP) alongside the existing `TyreStatus` and `HealthStatus` classes. Add `lifecycle_type = db.Column(db.String(16), nullable=False, default='NEW')` to `Tyre`. Add `"lifecycle_type": self.lifecycle_type` to `to_dict()`. Export `LifecycleType` from `__init__.py` alongside `TyreStatus`.
      Files: `backend/app/models/tyre.py`, `backend/app/models/__init__.py`
      Verify: `python -c "from app.models import Tyre, LifecycleType; print('OK')"` run from `backend/` with venv active — no ImportError.

- [ ] 2. **Add `InspectionResult` class and new columns to the `Inspection` model.**
      Add `InspectionResult` class (PASS / WARNING / FAIL / FURTHER_ASSESSMENT). Add these nullable columns: `inspection_result VARCHAR(24) default 'PASS'`, `lifecycle_type_change VARCHAR(16)`, `lifecycle_reason VARCHAR(256)`, `retread_date DATETIME`, `retread_provider VARCHAR(128)`, `retread_count_after INTEGER`, `temperature_at_inspection FLOAT`. Update `to_dict()` to include all new fields (use `None` for nulls). Export `InspectionResult` from `__init__.py`.
      Files: `backend/app/models/inspection.py`, `backend/app/models/__init__.py`
      Verify: `python -c "from app.models import Inspection, InspectionResult; print('OK')"` — no ImportError.

- [ ] 3. **Create the `TyreLifecycleHistory` model.**
      Create `backend/app/models/lifecycle_history.py` with `TyreLifecycleHistory(db.Model)`, `__tablename__ = "tyre_lifecycle_history"`. Columns: `id` (UUID PK), `tyre_id` (FK tyres.id CASCADE), `fleet_id` (FK fleets.id CASCADE), `previous_lifecycle_type VARCHAR(16)`, `new_lifecycle_type VARCHAR(16)`, `previous_status VARCHAR(24)`, `new_status VARCHAR(24)`, `related_inspection_id VARCHAR(36) nullable FK inspections.id`, `related_fitment_id VARCHAR(36) nullable FK tyre_fitments.id`, `changed_by_user_id VARCHAR(36) FK users.id`, `reason VARCHAR(256)`, `remarks TEXT nullable`, `nsd_at_change FLOAT nullable`, `km_at_change FLOAT nullable`, `retread_count INTEGER nullable`, `scrap_reason TEXT nullable`, `created_at DATETIME`. Add `lifecycle_history = db.relationship("TyreLifecycleHistory", ...)` back-ref on `Tyre` (lazy="select", order_by created_at desc). Export `TyreLifecycleHistory` from `__init__.py`. Also import this model in `__init__.py` so SQLAlchemy registers the table.
      Files: `backend/app/models/lifecycle_history.py`, `backend/app/models/tyre.py` (add relationship), `backend/app/models/__init__.py`
      Verify: `python -c "from app.models import TyreLifecycleHistory; print('OK')"` — no ImportError.

- [ ] 4. **Write `backend/migrations/migrate_v3.py`.**
      Follow the exact pattern of `migrate_v2.py`: `DB_PATH = Path(__file__).resolve().parent.parent / "instance" / "jktyre.db"`, open raw `sqlite3`, use `PRAGMA table_info(...)` to guard every ALTER. Steps:
      - `ALTER TABLE tyres ADD COLUMN lifecycle_type VARCHAR(16) DEFAULT 'NEW'` (skip if exists)
      - `ALTER TABLE inspections ADD COLUMN inspection_result VARCHAR(24) DEFAULT 'PASS'` (skip if exists)
      - Same guard for: `lifecycle_type_change VARCHAR(16)`, `lifecycle_reason VARCHAR(256)`, `retread_date DATETIME`, `retread_provider VARCHAR(128)`, `retread_count_after INTEGER`, `temperature_at_inspection FLOAT`
      - `CREATE TABLE IF NOT EXISTS tyre_lifecycle_history (...)` with all columns matching the model
      - `UPDATE tyres SET lifecycle_type='NEW' WHERE lifecycle_type IS NULL`
      - `conn.commit(); conn.close()`
      - `if __name__ == "__main__": run_migration()`
      Files: `backend/migrations/migrate_v3.py`
      Verify: `python migrations/migrate_v3.py` from `backend/` — prints "[MIGRATION] Migration migrate_v3 completed successfully." without error. Run twice to confirm idempotency (no crash on second run).

- [ ] 5. **Auto-run migration in `backend/app/__init__.py`.**
      After `db.create_all()` inside `create_app()`, add a try/except block: use `sqlalchemy.inspect(db.engine).get_columns('tyres')` to check for `lifecycle_type`; if not found, import `migrations.migrate_v3` and call `run_migration()`. Wrap entirely in `try/except Exception` so startup is never broken. Note: `db.create_all()` does not currently exist in `__init__.py` — add it before the blueprint registrations if absent, or confirm via read that it's elsewhere (the current `__init__.py` read shows no `db.create_all()` call — add it).
      Files: `backend/app/__init__.py`
      Verify: `python -c "from app import create_app; app = create_app(); print('OK')"` from `backend/` — no error.

- [ ] 6. **Enhance `POST /inspections` in `backend/app/api/inspections.py`.**
      Read the existing handler carefully — it accepts multipart or JSON, applies odometer monotonic check, calls `AlertEngine`, then commits. Extend it to:
      - Parse new optional fields from `data`: `inspection_result` (default 'PASS'), `lifecycle_type_change`, `lifecycle_reason`, `retread_date` (parse ISO string to datetime), `retread_provider`, `retread_count_after` (int), `temperature_at_inspection` (float).
      - Store all new fields on the new `Inspection` object.
      - Business rule block (run after creating `insp` object, before `AlertEngine`, inside try/except with rollback):
        - If `lifecycle_type_change == 'SCRAP'`: check `tyre.active_fitment`; if not None, return 400 `{"error": "Tyre must be removed from vehicle before scrapping"}`. Else set `tyre.status = 'SCRAPPED'`, `tyre.lifecycle_type = 'SCRAP'`.
        - If `lifecycle_type_change == 'RETREAD'`: set `tyre.lifecycle_type = 'RETREAD'`, `tyre.status = 'IN_INVENTORY'`, `tyre.retread_count += 1`, `tyre.current_nsd = measured_nsd`.
        - If `lifecycle_type_change == 'REUSE'`: set `tyre.lifecycle_type = 'REUSE'` (preserve status, mileage unchanged).
        - If `lifecycle_type_change == 'NEW'`: only if `tyre.total_km_run == 0 or tyre.status == 'IN_INVENTORY'`; set `tyre.lifecycle_type = 'NEW'`.
        - If `lifecycle_type_change` is provided AND differs from `tyre.lifecycle_type` (checked before updating): create `TyreLifecycleHistory` record in same transaction.
      - Wrap tyre-update + inspection + history in `try/except Exception` with `db.session.rollback()` on failure.
      - Import `TyreLifecycleHistory` at top of file.
      - Return `{"message": ..., "inspection": insp.to_dict(), "tyre": tyre.to_dict()}`.
      Files: `backend/app/api/inspections.py`
      Verify: `python -m pytest tests/test_vehicle_tyre_fitment.py -v` passes. If the test `test_permanent_tyre_identity_preservation` fails only because of missing new required fields, it uses JSON not multipart so it's fine — verify it still passes unchanged.

- [ ] 7. **Add three new endpoints to `backend/app/api/tyres.py`.**
      CRITICAL: Register `/available` and `/<tyre_id>/lifecycle-history` BEFORE the generic `/<tyre_id>` route to avoid Flask capturing "available" as a tyre_id. Concretely, insert the new route functions above the existing `get_tyre_detail` function.
      
      **`GET /tyres/available`**: Query `Tyre.query.filter_by(fleet_id=fleet_id).filter(Tyre.status.notin_(['SCRAPPED', 'FITTED'])).filter(Tyre.lifecycle_type != 'SCRAP')`. Return list of dicts: `id, serial_number, brand, model, size, current_nsd, current_thi, thi_status, lifecycle_type, total_km_run, status`.
      
      **`POST /tyres/<tyre_id>/remove`**: Accept JSON body with `removed_odometer` (optional float), `removal_reason` (string, default 'INSPECTION'). Find `tyre.active_fitment`; if None return 400. Set `fitment.removed_at = now`, `fitment.removed_odometer = body.get('removed_odometer') or vehicle.current_odometer`, `fitment.removal_reason = removal_reason`. Set `tyre.status = 'IN_INVENTORY'`. Commit. Return `{"message": ..., "fitment": fitment.to_dict()}`.
      
      **`GET /tyres/<tyre_id>/lifecycle-history`**: Query `TyreLifecycleHistory.query.filter_by(tyre_id=tyre_id).order_by(TyreLifecycleHistory.created_at.desc()).all()`. Return list via `to_dict()` on the model (implement `to_dict()` in the model).
      
      Import `TyreLifecycleHistory` at the top of the file. Add `Vehicle` import if not already present (it is — confirmed from read).
      Files: `backend/app/api/tyres.py`, `backend/app/models/lifecycle_history.py` (add `to_dict()`)
      Verify: `python -m pytest tests/ -v` — all existing tests pass. Manually confirm routes registered: `python -c "from app import create_app; app = create_app(); print([str(r) for r in app.url_map.iter_rules() if 'tyre' in str(r).lower()])"`.

- [ ] 8. **Update TypeScript interfaces in `frontend/src/types/index.ts`.**
      - Add to `Tyre` interface: `lifecycle_type?: 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP'`
      - Add to `Inspection` interface: `inspection_result?: 'PASS' | 'WARNING' | 'FAIL' | 'FURTHER_ASSESSMENT' | null`, `lifecycle_type_change?: 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP' | null`, `lifecycle_reason?: string | null`, `retread_date?: string | null`, `retread_provider?: string | null`, `temperature_at_inspection?: number | null`
      - Add new `TyreLifecycleHistory` interface: `{ id: string; tyre_id: string; fleet_id: string; previous_lifecycle_type: string; new_lifecycle_type: string; previous_status: string; new_status: string; related_inspection_id?: string | null; changed_by_user_id: string; reason?: string | null; remarks?: string | null; nsd_at_change?: number | null; km_at_change?: number | null; retread_count?: number | null; scrap_reason?: string | null; created_at: string; }`
      - Add `AvailableTyre` interface for the fitment page dropdown: `{ id: string; serial_number: string; brand: string; model: string; size: string; current_nsd: number; current_thi: number | null; thi_status: string; lifecycle_type: string; total_km_run: number; status: string; }`
      Files: `frontend/src/types/index.ts`
      Verify: `npm run build` from `frontend/` — no TypeScript errors on types file itself (full verify at end).

- [ ] 9. **Create `frontend/src/pages/fleet/FitmentPage.tsx`.**
      This is a new file — no existing file to read first.
      Structure (dark-navy Tailwind theme matching `InspectionsPage.tsx` style):
      
      1. **Vehicle selector**: `useQuery(['fleet-vehicles'], GET /vehicles)`. Dropdown with vehicle number + wheel_config. On select, load positions.
      2. **Positions query**: `useQuery(['vehicle-inspection-summary', vehicleId], GET /inspections/vehicle/:id)` when vehicleId is set. Reuse the existing endpoint — it already returns `positions` array with fitment + tyre data per wheel.
      3. **Summary bar**: `Total: X | Fitted: Y | Vacant: Z` — compute from positions array (fitted = positions with `tyre !== null`, vacant = total_wheels from `vehicle.layout.total_wheels` minus fitted count).
      4. **Positions grid** (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`): For each active fitment show position code, tyre serial/model, NSD, THI badge, lifecycle badge (colored). Add a `Remove` button. For vacant positions (derived from `vehicle.layout` axles vs active fitments): show dashed "Vacant" card with `Fit Tyre` button.
         - Derive vacant slots by comparing `vehicle.layout.axles[].positions[]` against the set of occupied `wheel_position` values from `positions`.
      5. **Fit Tyre Modal**: vehicle_id pre-filled (hidden), wheel_position pre-filled (shown read-only), available tyres from `GET /tyres/available` (`useQuery(['available-tyres'], ...)`), odometer input (default: vehicle.current_odometer), fitment date (default: now, display only), remarks textarea. Submit: `POST /tyres/:selectedTyreId/fit` with `{ vehicle_id, wheel_position, axle_number, fitted_odometer, remarks }`.
      6. **Remove Modal**: Show tyre serial + position. Removal reason select (WORN_OUT / DAMAGED / ROTATION / INSPECTION / OTHER). Odometer input (default: vehicle.current_odometer). Submit: `POST /tyres/:tyreId/remove` with `{ removal_reason, removed_odometer }`.
      7. On mutation success: `queryClient.invalidateQueries(['vehicle-inspection-summary', vehicleId])` and `queryClient.invalidateQueries(['available-tyres'])`.
      8. Lifecycle badge helper: `getLifecycleBadge(lifecycle_type)` — NEW=green, REUSE=blue, RETREAD=purple, SCRAP=red.
      9. THI status badge using existing pattern from `TyreCard.tsx`.
      10. Import only from existing packages: `react`, `@tanstack/react-query`, `react-router-dom` (not needed), `../../services/api`, `../../types`, `lucide-react` (Wrench, Plus, Disc, Truck, X, AlertCircle, CheckCircle, Trash2).
      Files: `frontend/src/pages/fleet/FitmentPage.tsx`
      Verify: `npm run build` — no TypeScript errors.

- [ ] 10. **Enhance `frontend/src/pages/fleet/InspectionsPage.tsx` create-inspection modal.**
       Read the file first (already read — 252 lines). The modal uses `FormData` multipart. Extend it:
       - Add state: `inspectionResult` (default 'PASS'), `temperature` (string, ''), `lifecycleChange` (default ''), `lifecycleReason` (''), `scrapReason` (''), `retreadDate` (''), `retreadProvider` (''), `postRetreadNsd` ('')
       - In the form, after the pressure field, add:
         - **Inspection Result** (required select): PASS / WARNING / FAIL / FURTHER_ASSESSMENT
         - **Temperature (°C)** (optional number input)
         - **Lifecycle Decision** (collapsible `<details>` or always-visible section): "No Change" default radio or select. When SCRAP: show scrap reason textarea + warning banner. When RETREAD: show retread date, provider, post-retread NSD. When REUSE: show reuse reason (required). When NEW: show info note.
         - Warning: if lifecycleChange === 'SCRAP' and the selected tyre has `status === 'FITTED'`, show `<div>⚠ This tyre is currently fitted. Remove it before scrapping.</div>`
       - Append all new fields to `FormData` in `handleSubmit`.
       - Add `inspection_result` and `lifecycle_type_change` columns to the inspections table (after Visual Condition column). Use colored badges: PASS=green, WARNING=amber, FAIL=red, FURTHER_ASSESSMENT=purple. Show lifecycle badge in the same row.
       - Preserve all existing fields and photo upload exactly.
       - Reset all new state fields in `resetForm()`.
       Files: `frontend/src/pages/fleet/InspectionsPage.tsx`
       Verify: `npm run build` — no TypeScript errors.

- [ ] 11. **Enhance `frontend/src/pages/fleet/VehicleInspectionPage.tsx` inspect modal.**
       Read the file first (already read — 352 lines). This page uses JSON (not FormData). Add the same lifecycle fields as step 10:
       - Add the same state variables for inspection result + lifecycle decision.
       - Show each position card's tyre with a lifecycle badge if `tyre.lifecycle_type` is set (add it to `PositionData.tyre` interface inline — add `lifecycle_type?: string`).
       - Add lifecycle fields to the inspection modal form (same structure as step 10 but adapted to the white/light theme already used by this page — it uses `bg-white`, `border-bordergray`, `text-graphite` CSS vars).
       - Include all new fields in the `createInspectionMutation.mutate(...)` payload object.
       - Reset new fields in `resetForm()`.
       - The `/inspections/vehicle/:id` response already includes `latest_inspection` per position — add `lifecycle_type_change` display in the latest inspection note block if present.
       Files: `frontend/src/pages/fleet/VehicleInspectionPage.tsx`
       Verify: `npm run build` — no TypeScript errors.

- [ ] 12. **Enhance `frontend/src/pages/fleet/TyreDetailPage.tsx` with lifecycle badge and history section.**
       Read the file first (already read — 184 lines). Two additions:
       1. **Lifecycle badge** near the tyre identity header: after the `thi_status` badge span, add a lifecycle badge using `getLifecycleBadge(tyre.lifecycle_type)` (inline helper: NEW=green, REUSE=blue, RETREAD=purple, SCRAP=red; null/undefined = gray dash).
       2. **Lifecycle History section**: new `useQuery(['tyre-lifecycle-history', id], GET /tyres/:id/lifecycle-history)`. Below the Fitment History card, render a new `bg-slate-900/60` card: `<h3>Lifecycle Change History</h3>`. Map over history array; each record is a timeline row: date (left), arrow `previousLifecycleType → newLifecycleType`, reason, related inspection link. If array is empty: "No lifecycle changes recorded." Display the `History` icon (use `GitBranch` or `Clock` from lucide-react — both are in the package).
       Files: `frontend/src/pages/fleet/TyreDetailPage.tsx`
       Verify: `npm run build` — no TypeScript errors.

- [ ] 13. **Add lifecycle badge to `TyreCard` in `frontend/src/components/tyre/TyreCard.tsx`.**
       Read the file first (already read — 106 lines). Between the tyre SVG image block and the health status row, add a small lifecycle badge row. Use the same `getLifecycleBadge` logic (inline or imported). Show only if `tyre.lifecycle_type` is truthy. Since `lifecycle_type` is now optional on the `Tyre` type, guard with `tyre.lifecycle_type &&`.
       Files: `frontend/src/components/tyre/TyreCard.tsx`
       Verify: `npm run build` — no TypeScript errors.

- [ ] 14. **Update routing and navigation.**
       Two files:
       1. `frontend/src/App.tsx`: Add `import { FitmentPage } from './pages/fleet/FitmentPage';` near the other fleet page imports. Add `<Route path="/fitment" element={<FitmentPage />} />` inside the authenticated `<Route element={...}>` block, after the `/inspections` route.
       2. `frontend/src/components/layout/Sidebar.tsx`: Add `import { Wrench } from 'lucide-react';` to the lucide import block (already has many imports — add `Wrench`). In `fleetLinks` array, add `{ to: '/fitment', label: 'Fitment', icon: Wrench }` after the Vehicles entry (`{ to: '/vehicles', ... }`). The Fitment link appears for FLEET_MANAGER role because `fleetLinks` is used for all non-admin, non-driver roles.
       Files: `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`
       Verify: `npm run build` — no TypeScript or import errors.

- [ ] 15. **Run the database migration.**
       From `backend/` directory with venv active, run:
       `python migrations/migrate_v3.py`
       Report exact output. The script must print completion message without error.
       Files: (no code changes — execution step)
       Verify: Script exits 0. Run `python migrations/migrate_v3.py` a second time to confirm idempotency. Then confirm columns exist: `python -c "import sqlite3; conn=sqlite3.connect('instance/jktyre.db'); print([c[1] for c in conn.execute('PRAGMA table_info(tyres)')]); conn.close()"` — output includes 'lifecycle_type'.

- [ ] 16. **Run frontend build and fix all TypeScript errors.**
       From `frontend/` directory:
       `npm run build`
       Capture exact output including module count. If TypeScript errors appear, fix them before reporting. Common issues to watch for: unused imports, missing type annotations on event handlers, `lifecycle_type` accessed on `Tyre` where it could be `undefined` (use `??` or optional chaining). Do NOT mark step complete until build succeeds with 0 TypeScript errors.
       Files: (fix any file that errors)
       Verify: `npm run build` exits 0 with "✓ built in" line and module count.

- [ ] 17. **Run backend tests.**
       From `backend/` directory with venv active:
       `python -m pytest tests/ -v`
       Report full results. If `test_permanent_tyre_identity_preservation` fails because `Inspection` now requires `inspection_result`, check: the test does not create inspections directly, so it should pass unchanged. If `test_vehicle_tyre_fitment.py` fails due to a new nullable column, fix the test by supplying the optional field with its default. Report any deeper failures as limitations.
       Files: `backend/tests/test_vehicle_tyre_fitment.py` (fix only if trivially broken by new nullable fields)
       Verify: `python -m pytest tests/ -v` — all pre-existing tests pass; new failures are reported and explained.

- [ ] 18. **Write implementation report to `.agents/tasks/fitment-inspection-lifecycle-report.md`.**
       Write a comprehensive markdown report covering all 10 required sections:
       1. Backend files created/modified with reason
       2. Frontend files created/modified
       3. DB migration: columns/tables added
       4. API changes: new and modified endpoints with request/response shapes
       5. Business rules: lifecycle transitions, scrap-while-fitted guard, retread counter increment
       6. FitmentPage features, inspection enhancements, lifecycle history timeline
       7. Build result (exact module count, TypeScript errors if any)
       8. Migration result (exact output)
       9. Test results (pass/fail counts)
       10. What requires manual browser verification
       Files: `c:\Users\vaisi\OneDrive\Desktop\tyre-health-index\05_JKT (2)\05_JKT\.agents\tasks\fitment-inspection-lifecycle-report.md`
       Verify: File exists and is non-empty markdown.

---

## Dependency Order and Notes

Steps 1–3 must complete before step 4 (migration needs to know all columns).
Steps 1–5 must complete before step 6 (API needs model columns to exist at runtime).
Step 7 depends on step 3 (`TyreLifecycleHistory` must be imported).
Step 8 is independent of backend steps — can be done any time.
Steps 9–13 depend on step 8 (types must be defined before components use them).
Step 14 depends on step 9 (FitmentPage must exist before it's imported in App.tsx).
Steps 15–17 are verification steps that come last.
Step 18 depends on steps 15–17 (needs actual results to report).

## Constraints Summary (do not violate)

- Do NOT modify: `authStore.ts`, `api.ts`, existing THI/alert/telemetry logic, `.env`, JWT config, Admin dashboards, Driver portal, login flows.
- Do NOT delete historical data (fitment history, inspection records).
- Do NOT add new npm packages.
- `/tyres/available` route MUST be defined before `/<tyre_id>` in the Blueprint.
- Scrapping a fitted tyre → 400 (enforced backend only).
- All lifecycle transitions → `TyreLifecycleHistory` record in same transaction as inspection.
- Partial failures → `db.session.rollback()`.
- Read every target file before editing it.

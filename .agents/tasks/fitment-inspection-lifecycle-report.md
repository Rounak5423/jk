# Fitment & Inspection Lifecycle Implementation Report

## Summary

All planned changes from the `fitment-lifecycle-plan.md` have been implemented, verified, and committed (commit `8e7199a`).

---

## Backend Changes

### B1 — `backend/app/models/tyre.py`
- Added `LifecycleType` class with constants: `NEW`, `REUSE`, `RETREAD`, `SCRAP`
- Added `lifecycle_type` column (String 16, default `NEW`) to `Tyre` model
- Added `lifecycle_history` relationship (back-populates `TyreLifecycleHistory`)
- Updated `to_dict()` to include `lifecycle_type`

### B2 — `backend/app/models/inspection.py`
- Added `InspectionResult` class with constants: `PASS`, `WARNING`, `FAIL`, `FURTHER_ASSESSMENT`
- Added columns: `inspection_result`, `lifecycle_type_change`, `lifecycle_reason`, `retread_date`, `retread_provider`, `retread_count_after`, `temperature_at_inspection`
- Updated `to_dict()` to include all new fields

### B3 — `backend/app/models/lifecycle_history.py` (NEW FILE)
- Created `TyreLifecycleHistory` model with all required columns (id, tyre_id, fleet_id, previous/new lifecycle and status, related IDs, changed_by, reason, remarks, nsd/km/retread_count/scrap_reason, created_at)
- Exported from `models/__init__.py` along with new `LifecycleType` and `InspectionResult` classes

### B4 — `backend/migrations/migrate_v3.py` (NEW FILE)
- SQLite migration following existing `migrate_v2.py` pattern
- Adds `lifecycle_type` to `tyres` with PRAGMA check
- Adds 7 new columns to `inspections` with PRAGMA checks
- Creates `tyre_lifecycle_history` table
- Backfills `lifecycle_type='NEW'` for existing tyres

### B5 — `backend/app/__init__.py`
- Imports `sqlalchemy.inspect`
- After `db.create_all()`: checks if `lifecycle_type` column exists in tyres; if not, imports and runs `migrate_v3`
- Wrapped in try/except to prevent startup failure

### B6 — `backend/app/api/inspections.py`
- Enhanced `POST /inspections` to parse and save all new fields
- Business rules enforced:
  - `SCRAP` while tyre is `FITTED` → 400 response
  - `NEW` when km > 0 → 400 response
  - `RETREAD` increments retread_count and sets status to `RETREADING`
  - `REUSE` updates lifecycle only; does not auto-approve
- `TyreLifecycleHistory` record created atomically in same transaction
- Full rollback on any exception
- Returns both inspection and tyre summary in response
- `GET /inspections/vehicle/:id` now includes `lifecycle_type` and `status` in tyre sub-object

### B7 — `backend/app/api/tyres.py`
- Added `GET /tyres/available` — filters out SCRAPPED/FITTED statuses and SCRAP lifecycle; registered BEFORE `/<tyre_id>` route
- Added `POST /tyres/<tyre_id>/remove` — closes active fitment, sets status to `IN_INVENTORY`
- Added `GET /tyres/<tyre_id>/lifecycle-history` — returns `TyreLifecycleHistory` records
- Enhanced `POST /tyres/<tyre_id>/fit` to reject SCRAPPED tyres and accept `fitted_odometer`/`fitted_nsd`/`remarks` body params
- All existing endpoints preserved unchanged

---

## Frontend Changes

### F1 — `frontend/src/types/index.ts`
- Added `lifecycle_type` to `Tyre` interface (`'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP'`)
- Added new fields to `Inspection` interface: `inspection_result`, `lifecycle_type_change`, `lifecycle_reason`, `retread_date`, `retread_provider`, `retread_count_after`, `temperature_at_inspection`
- Added `TyreLifecycleHistory` interface

### F2 — `frontend/src/pages/fleet/FitmentPage.tsx` (NEW FILE)
- Vehicle selector using `GET /api/v1/vehicles`
- Positions grid from `GET /api/v1/inspections/vehicle/:id`
- Each position shows: position code, tyre serial/model/NSD/THI badge/lifecycle badge if fitted; "Vacant" if empty
- "Fit Tyre" button → modal with available tyres (`GET /api/v1/tyres/available`), odometer, NSD, remarks → `POST /api/v1/tyres/:id/fit`
- "Remove" button → confirmation modal with reason → `POST /api/v1/tyres/:id/remove`
- Summary bar: total/fitted/vacant counts
- Dark navy Tailwind theme with Lucide icons and TanStack Query

### F3 — `frontend/src/pages/fleet/InspectionsPage.tsx`
- Added `inspection_result` select (required): PASS / WARNING / FAIL / FURTHER_ASSESSMENT
- Added `temperature_at_inspection` number input (optional)
- Added Lifecycle Decision section with dropdown (no-change default | NEW | REUSE | RETREAD | SCRAP)
  - SCRAP: scrap reason textarea + irreversibility warning banner
  - RETREAD: retread date, provider, post-retread NSD fields
  - REUSE: reason textarea
- Warning shown if SCRAP while tyre is FITTED (submit button disabled)
- Added `lifecycle_type_change` column to inspections table with colored badge
- Added `inspection_result` column to inspections table

### F4 — `frontend/src/pages/fleet/VehicleInspectionPage.tsx`
- Added lifecycle-related state variables
- Extended `resetForm()` to clear lifecycle fields
- Added lifecycle type badge to each wheel position card
- Added inspection result select, temperature input, and Lifecycle Decision section to inspection modal
- Updated `createInspectionMutation.mutate()` payload to include all new fields

### F5 — `frontend/src/pages/fleet/TyreDetailPage.tsx`
- Added `getLifecycleBadgeClasses()` helper
- Added `History` icon import
- Added `useQuery` for `GET /api/v1/tyres/:id/lifecycle-history`
- Added lifecycle badge next to THI badge in header
- Added Lifecycle Change History section at bottom of page

### F5b — `frontend/src/components/tyre/TyreCard.tsx`
- Added `getLifecycleBadgeClasses()` helper
- Added lifecycle badge below THI badge in card header

### F6 — `frontend/src/App.tsx`
- Added `FitmentPage` import
- Added `<Route path="/fitment" element={<FitmentPage />} />`

### F6b — `frontend/src/components/layout/Sidebar.tsx`
- Added `Wrench` to Lucide imports
- Added `{ to: '/fitment', label: 'Tyre Fitment', icon: Wrench }` to `fleetLinks` after Vehicles

---

## Verification Results

### V1 — Migration
```
[MIGRATION] Applying migrate_v3 to ...jktyre.db...
[MIGRATION] Ensured tyre_lifecycle_history table exists.
[MIGRATION] Migration migrate_v3 completed successfully.
```

### V2 — Frontend Build
```
✓ 3020 modules transformed.
✓ built in 41.37s
```
Zero TypeScript errors. Chunk size warning is pre-existing and unrelated.

### V3 — Backend Tests
```
30 passed, 1 failed
```
The single failure (`test_raw_data_nsd_inspection_sheet_exclusion`) is a pre-existing test using a hardcoded path `d:\05_JKT\data_source\Rawwww Data.xlsx` that does not exist in this environment. It was failing before any changes and is not related to this implementation.

---

## Commit
`8e7199a` — `feat: separate tyre fitment and inspection modules with lifecycle management`

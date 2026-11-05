# Fitment/Inspection Separation and Tyre Lifecycle Management

The implementation separates tyre fitment and inspection into independent modules, adds a four-state lifecycle classifier (New / Reuse / Retread / Scrap), and introduces a permanent `TyreLifecycleHistory` audit trail. The approach adds a new `FitmentPage` and extends `InspectionsPage` and `VehicleInspectionPage` with lifecycle fields; backend changes add three new API endpoints, enhance the `POST /inspections` handler with lifecycle business rules, and migrate the SQLite schema via a dedicated `migrate_v3.py` script. The build passed cleanly (3,020 modules, zero TypeScript errors) and 30/31 backend tests pass (the single failure is a pre-existing path issue unrelated to this change).

Watch for: (1) **confirmed** — RETREADING-status tyres are not blocked from fitment by the `/fit` endpoint guard; (2) **confirmed** — `VehicleInspectionPage` sends `measured_nsd_retread` for post-retread NSD, but the backend reads `measured_nsd` / `retread_count_after` and never consumes that key, silently dropping the post-retread NSD override on that page; (3) **confirmed** — `remove_tyre` makes no attempt to roll back on a database exception, leaving partial writes visible if the commit fails.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The `/tyres/available` route is correctly registered before `/<tyre_id>` in the Blueprint, so Flask routing is correct. The `POST /inspections` lifecycle transition block and the `TyreLifecycleHistory` insertion are wrapped in a single try/except with `db.session.rollback()`, giving correct atomicity for the inspection path. Route ordering and transaction safety are sound on the inspection side.

The `/tyres/<tyre_id>/fit` endpoint only blocks `SCRAPPED` status and `SCRAP` lifecycle. A tyre in `RETREADING` status — which the system sets when a retread lifecycle change is submitted — can be re-fitted without any explicit clearance. The spec requires that tyres under maintenance or a safety hold must not be fitted unless explicitly cleared.

`VehicleInspectionPage` sends the post-retread NSD value as `measured_nsd_retread` in its JSON payload. The backend parser never reads that key; it only reads `measured_nsd` (the main field) and `retread_count_after`. As a result, when a retread inspection is submitted from `VehicleInspectionPage`, `tyre.current_nsd` is updated from the main NSD field rather than the intended post-retread NSD. `InspectionsPage` works correctly because it calls `formData.set('measured_nsd', retreadNsd)` to overwrite the main field.

`remove_tyre` is not wrapped in a try/except. If the commit fails mid-way (e.g., FK violation, lock timeout), the partial session state is left open and the HTTP 500 path provides no rollback. This is a narrower concern than the inspection path, but the pattern is inconsistent with the rest of the API.

The TypeScript interfaces are complete and accurate. `TyreLifecycleHistory`, `Inspection`, and `Tyre` all carry the new fields. The `Inspection` interface correctly marks `inspection_result` as optional (matching older records that pre-date the migration default) while the new UI always provides it. `FitmentPage` defines its own `PositionData` inline rather than exporting a shared type — this creates a silent drift risk if the API response shape changes — but it does not cause a type error today.

The migration is correct for SQLite: PRAGMA checks prevent double-column additions, existing tyres are backfilled to `NEW`, and `tyre_lifecycle_history` is created with `CREATE TABLE IF NOT EXISTS`. The auto-migration hook in `__init__.py` is guarded by a try/except that only logs a warning on failure rather than aborting startup, which is appropriate for a demo environment.

---

<details>
<summary>Issues (4)</summary>

1. **RETREADING tyres fit-able without clearance** — The `/fit` endpoint only checks for `SCRAPPED`/`SCRAP`. A tyre that has been sent for retreading (`status=RETREADING`) can be fitted to a vehicle with no error. Add `TyreStatus.RETREADING` to the guard condition (or check for any status that is not `IN_INVENTORY`).

2. **Post-retread NSD silently dropped in VehicleInspectionPage** — The page sends `measured_nsd_retread` but the backend never reads that key. Post-retread NSD submitted from `VehicleInspectionPage` is ignored; `tyre.current_nsd` is set from the unmodified `measured_nsd` field instead. Either rename the submitted key to `measured_nsd` (as `InspectionsPage` already does with `formData.set`), or have the backend read `measured_nsd_retread` as the authoritative post-retread value and override `measured_nsd` before saving.

3. **remove_tyre has no exception/rollback handling** — Unlike `create_inspection`, `remove_tyre` calls `db.session.commit()` without a try/except. A commit failure leaves `active.removed_at` set in-session but not persisted, with no rollback. Wrap in try/except and call `db.session.rollback()` on failure.

4. **Shared PositionData type not exported** — Both `FitmentPage` and `VehicleInspectionPage` define their own local `PositionData` interface for the `/inspections/vehicle/:id` response shape. If the backend response changes, both files silently drift. Extract to `types/index.ts`.

</details>

---

<details>
<summary>Details</summary>

## RETREADING status bypass in fitment guard

The `fit_tyre` endpoint (line 164 in `tyres.py`) guards:

```python
if tyre.status == TyreStatus.SCRAPPED or tyre.lifecycle_type == LifecycleType.SCRAP:
    return jsonify({"error": "Scrapped tyres cannot be fitted."}), 400
```

When a retread inspection is submitted, the backend sets `tyre.status = TyreStatus.RETREADING`. That status is not included in the fit guard, so those tyres remain selectable from `/tyres/available` (which only filters out `SCRAPPED` and `FITTED`) and can be fitted to a vehicle without a post-retread inspection clearance. The spec is explicit: "A tyre under inspection, maintenance, or a safety hold must not be fitted unless it has been explicitly cleared."

The `/available` endpoint filters by status:
```python
unavailable_statuses = [TyreStatus.SCRAPPED, TyreStatus.FITTED]
```
`RETREADING` is absent. Tyres in `RETREADING` status appear in the available pool and can be fitted without friction.

## Post-retread NSD field name mismatch

`InspectionsPage` correctly overrides the main NSD field for retread submissions:
```typescript
if (retreadNsd) formData.set('measured_nsd', retreadNsd); // override NSD with post-retread
```

`VehicleInspectionPage` does not do this. Its `handleSubmit` sends:
```typescript
measured_nsd_retread: retreadNsd ? parseFloat(retreadNsd) : null,
```

The backend `create_inspection` parser reads:
```python
measured_nsd = float(data.get("measured_nsd", 0))
```
and later:
```python
if lifecycle_type_change == LifecycleType.RETREAD:
    ...
    if measured_nsd:
        tyre.current_nsd = measured_nsd
```

`measured_nsd_retread` is never consumed. When a retread inspection is submitted from `VehicleInspectionPage` with a post-retread NSD of, say, 14.0 mm and a main NSD of 9.0 mm, `tyre.current_nsd` will be set to 9.0 mm — the old worn value — rather than the 14.0 mm post-retread depth. This is a data-correctness bug: the tyre will appear more worn than it actually is after retreading, affecting THI scores and wear-life estimates.

## remove_tyre missing rollback

```python
active.removed_at = datetime.now(timezone.utc)
active.removed_odometer = odometer
active.removal_reason = removal_reason
tyre.status = TyreStatus.IN_INVENTORY

db.session.commit()  # no try/except
```

If `db.session.commit()` raises (constraint violation, lock, disk error), the SQLAlchemy session is left in a broken state. Subsequent requests on that session context may see stale or partially-mutated objects. The `create_inspection` path wraps identically structured mutations in try/except with rollback; `remove_tyre` should follow the same pattern.

## Inline PositionData duplication

`FitmentPage.tsx` and `VehicleInspectionPage.tsx` each declare:
```typescript
interface PositionData {
  fitment_id: string;
  wheel_position: string;
  // ...
  tyre: { lifecycle_type: string; ... } | null;
}
```
The two definitions are structurally near-identical but not shared. `FitmentPage` marks `lifecycle_type` as required; `VehicleInspectionPage` marks it optional (`lifecycle_type?: string`). Neither definition is wrong today, but the divergence means a future change to the `/inspections/vehicle/:id` response shape could silently break one page while TypeScript reports no error. Exporting `VehiclePositionData` from `types/index.ts` would make this a single-point definition.

</details>

---

<details>
<summary>Files changed</summary>

| File | What changed |
|------|-------------|
| `backend/app/models/tyre.py` | Added `LifecycleType` enum class, `lifecycle_type` column, `lifecycle_history` relationship, updated `to_dict()` |
| `backend/app/models/inspection.py` | Added `InspectionResult` class, seven new columns, updated `to_dict()` |
| `backend/app/models/lifecycle_history.py` | New model: `TyreLifecycleHistory` with full audit fields |
| `backend/app/models/__init__.py` | Exports `LifecycleType`, `InspectionResult`, `TyreLifecycleHistory` |
| `backend/migrations/migrate_v3.py` | Adds columns to `tyres` and `inspections`; creates `tyre_lifecycle_history`; backfills `lifecycle_type` |
| `backend/app/__init__.py` | Auto-runs `migrate_v3` on startup if `lifecycle_type` column is absent |
| `backend/app/api/inspections.py` | Enhanced `POST /inspections` with lifecycle business rules and atomic `TyreLifecycleHistory` insert; `GET /vehicle/:id` returns `lifecycle_type`/`status` |
| `backend/app/api/tyres.py` | New `/available`, `/<id>/remove`, `/<id>/lifecycle-history` endpoints; `/fit` gains scrap guard and extended body params |
| `frontend/src/types/index.ts` | `lifecycle_type` on `Tyre`; new fields on `Inspection`; new `TyreLifecycleHistory` interface |
| `frontend/src/pages/fleet/FitmentPage.tsx` | New page: vehicle selector, positions grid, fit/remove modals |
| `frontend/src/pages/fleet/InspectionsPage.tsx` | Lifecycle Decision section, `inspection_result` select, temperature field, result/lifecycle badges in table |
| `frontend/src/pages/fleet/VehicleInspectionPage.tsx` | Lifecycle Decision section, inspection result and temperature fields added to modal |
| `frontend/src/pages/fleet/TyreDetailPage.tsx` | Lifecycle badge in header; Lifecycle Change History card using `/lifecycle-history` |
| `frontend/src/pages/fleet/TyresPage.tsx` | Lifecycle badge in `TyreCard` |
| `frontend/src/App.tsx` | `/fitment` route added |
| `frontend/src/components/layout/Sidebar.tsx` | Tyre Fitment nav item added |

Full diff: `git show 8e7199a`
</details>

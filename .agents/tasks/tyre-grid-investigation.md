# Tyre Grid Redesign — Investigation Report

---

## Tyre Lifecycle Page: Exact File Path(s) Found

- **Primary page (list/grid):** `frontend/src/pages/fleet/TyresPage.tsx`
- **Detail page:** `frontend/src/pages/fleet/TyreDetailPage.tsx`

Both files already exist and are imported/routed in `App.tsx`. There is **no separate** TyreLifecycle component — `TyresPage.tsx` IS the Tyre Lifecycle Management page.

---

## Tyre Type Definition: Exact File Path + All Fields

**File:** `frontend/src/types/index.ts` (lines ~127–178)

```typescript
export interface Tyre {
  id: string;
  fleet_id: string;
  serial_number: string;
  brand: string;
  model: string;
  size: string;
  blueprint_nsd: number;         // Virgin/new tread depth in mm
  current_nsd: number;           // Currently measured tread depth in mm
  wear_percentage: number;       // Computed tread consumption %
  retread_count: number;
  total_km_run: number;
  current_thi: number;           // Tyre Health Index score 0–100
  thi_status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  status: 'FITTED' | 'IN_INVENTORY' | 'RETREADING' | 'SCRAPPED';
  active_fitment?: {
    id: string;
    vehicle_id: string;
    axle_number: number;
    wheel_position: string;
    fitted_odometer: number;
  } | null;
  remaining_life_estimate?: {
    remaining_life_km: number | null;
    projected_total_km: number | null;
    wear_rate_per_10k_km: number | null;
    status: string;
    message: string;
    confidence: string;
    assumptions?: string;
  };
  active_alerts?: Alert[];
  thi_history?: Array<{
    id: string;
    score: number;
    status: string;
    calculated_at: string;
    components: {
      pressure_score: number | null;
      temp_score: number | null;
      wear_score: number | null;
      rrc_score: number | null;
    };
    explanation: string;
    inputs: Record<string, any>;
  }>;
  created_at: string;
}
```

Key fields for card display: `serial_number`, `model`, `brand`, `size`, `thi_status`, `current_thi`, `wear_percentage`, `current_nsd`, `blueprint_nsd`, `status`, `active_fitment`, `id`.

---

## Data Fetching: Exact Function/Hook Names, API Endpoint URLs

### TyresPage.tsx (list)

- Uses `@tanstack/react-query` `useQuery` directly (no custom hook abstraction)
- **Query key:** `['fleet-tyres', statusFilter, healthFilter]`
- **Endpoint:** `GET /api/v1/tyres?status={statusFilter}&health={healthFilter}`
- `api` instance from `../../services/api` (axios with interceptors)

### TyreDetailPage.tsx (single tyre)

- Uses `useQuery` directly
- **Query key:** `['tyre-detail', id]`
- **Endpoint:** `GET /api/v1/tyres/{id}`
- Returns full tyre including `remaining_life_estimate`, `active_alerts`, `thi_history`, `fitment_history`

### Backend query parameters confirmed from `backend/app/api/tyres.py`:

- `?status=` → filters on `Tyre.status` (`FITTED | IN_INVENTORY | RETREADING | SCRAPPED`)
- `?health=` → filters on `Tyre.thi_status` (`HEALTHY | WARNING | CRITICAL | UNKNOWN`)
- Fleet access is enforced server-side via `X-Fleet-ID` header (injected by api.ts interceptor)

---

## Route Path: Exact String from App.tsx

```
/tyres        → TyresPage      (the Lifecycle Management list — THIS IS THE PAGE TO REDESIGN)
/tyres/:id    → TyreDetailPage (individual tyre detail — keep as-is)
```

---

## Styling: Which Approach

**Tailwind CSS v3** — sole styling approach. No CSS modules, no styled-components, no shadcn/ui, no MUI, no Chakra.

### Tailwind config notes (`frontend/tailwind.config.js`):

Custom color tokens defined under `theme.extend.colors`:
- `jk.red`: `#D9232D` — brand primary (used for active nav, focus rings)
- `jk.yellow`: `#F5C400` — brand accent
- `jk.dark`: `#292D32`
- `fleet.yellow`: `#F5C400`

### Application design language (dark theme):
- Background: `bg-slate-950` (app shell), `bg-slate-900/60` (cards)
- Borders: `border-slate-800`
- Text: `text-white` (headings), `text-slate-300`/`text-slate-400` (body/labels)
- Health colors already in use in existing code:
  - HEALTHY → `emerald-400` / `emerald-500/10`
  - WARNING → `amber-400` / `amber-500/10`
  - CRITICAL → `red-400` / `red-500/10`
- Card radius: `rounded-2xl` (larger), `rounded-xl` (smaller items)
- Active nav: `bg-red-600 text-white`

---

## Build Command: Exact String

```
tsc && vite build
```

(from `package.json` `scripts.build`)

Dev server: `vite` (via `npm run dev`)

---

## Test Command: Exact String or 'none found'

**none found** — `package.json` has no `test` script. No test framework configured for frontend.

---

## Health Status Values: Exact Strings Used in Codebase

From `frontend/src/types/index.ts` and `TyresPage.tsx` / `TyreDetailPage.tsx`:

```
'HEALTHY'    → emerald (green) styling
'WARNING'    → amber (yellow) styling
'CRITICAL'   → red styling
'UNKNOWN'    → slate (gray) styling — also valid, must not be ignored
```

**Note:** These are uppercase string literals used directly as `thi_status` on the `Tyre` interface. Backend query param for health filter uses the same values lowercase-safe: `?health=HEALTHY`, `?health=WARNING`, `?health=CRITICAL`, `?health=UNKNOWN`.

---

## Existing Tyre Assets: List Any Found

**None found.**

- `frontend/src/assets/` — directory is empty (no files)
- `frontend/public/` — no image files found (directory structure returned no image results)
- No `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif` files exist anywhere under `frontend/src`

**Implication:** Tyre images must be created inline using SVG markup directly in React (no external image URLs), or bundled as inline SVG components. Given the requirement for realistic commercial truck tyre imagery with tread-wear differentiation, **inline SVG React components** (one per health status: TyreHealthy, TyreWarning, TyreCritical) are the correct approach. These will be created as new files under `frontend/src/components/tyre/` and can be bundled with the build.

---

## Files That Must NOT Be Modified

| File | Absolute Path |
|------|--------------|
| `authStore.ts` | `frontend/src/store/authStore.ts` |
| `api.ts` | `frontend/src/services/api.ts` |
| `App.tsx` | `frontend/src/App.tsx` |
| `Sidebar.tsx` | `frontend/src/components/layout/Sidebar.tsx` |
| `AppLayout.tsx` | `frontend/src/components/layout/AppLayout.tsx` |
| `TyreDetailPage.tsx` | `frontend/src/pages/fleet/TyreDetailPage.tsx` |
| `types/index.ts` | `frontend/src/types/index.ts` |

The `X-Fleet-ID` header and `activeFleetId` from `authStore` are injected automatically by `api.ts` interceptor on every request — **no changes needed to data fetching patterns**.

---

## Any Other Relevant Findings

### 1. Current TyresPage.tsx state management
The existing page uses two `useState` variables (`statusFilter`, `healthFilter`) and passes them as query params to the API. The redesign must preserve this pattern but add:
- A client-side `searchTerm` state for filtering by `serial_number` or `model` (client-side, no new API call needed)
- The existing `healthFilter` state maps cleanly to the new HEALTHY/WARNING/CRITICAL filter buttons
- The existing `statusFilter` (FITTED/IN_INVENTORY/RETREADING/SCRAPPED) may be retained as a secondary filter or removed from the prominent UI — the task does not mention it, so it should be kept but de-emphasized (e.g., a secondary dropdown)

### 2. Summary card counts
Summary counts (Healthy / Warning / Critical) must be computed from the `tyres` array returned by the API call — `tyres.filter(t => t.thi_status === 'HEALTHY').length` etc. No separate API call needed.

### 3. View button behavior
The existing "View" link navigates to `/tyres/${t.id}` (React Router `<Link>`). This pattern must be preserved — the card's View button should be the same `<Link to={/tyres/${t.id}}>`.

### 4. Dependencies available for tyre imagery
The project has `three` + `@react-three/fiber` + `@react-three/drei` installed (3D rendering). However, inline SVG components are simpler, more reliable, and more suitable for card-grid thumbnails. Three.js/R3F would add significant complexity and is overkill for static health-status tyre visuals. **Decision: use inline SVG React components.**

### 5. No existing TyreDetails/TyreDrawer/TyrePanel component
The full tyre details are shown at `/tyres/:id` (TyreDetailPage.tsx). The task mentions opening details in a slide-over panel or drawer when the View button is clicked. Two options:
- Option A: Keep navigating to `/tyres/:id` (existing behavior — simpler, zero risk)
- Option B: Add a slide-over drawer panel in TyresPage.tsx using a portal/modal

The task says "opens a details panel" — this implies Option B (a slide-over). Since no drawer component exists, one must be built. However, the task is a **redesign of TyresPage.tsx**, so a slide-over drawer is the correct new behavior.

### 6. Backend `/api/v1/tyres` does NOT return `fitment_history`
The list endpoint (`include_history=False`) returns all fields except `fitment_history`. The detail endpoint (`include_history=True`) returns it. The card grid only needs list data — this is fine.

### 7. Three.js packages present but no existing 3D usage on TyresPage
The 3D twin visualization (`Vehicle3DTwin`) is used on vehicle detail pages. TyresPage currently has no 3D elements. The redesign should not introduce Three.js/R3F into TyresPage.

### 8. Grid layout context
`AppLayout.tsx` wraps `<main>` with `max-w-7xl mx-auto w-full p-6 md:p-8`. The redesigned grid will work within this constraint. A 3-column grid at desktop widths is achievable with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

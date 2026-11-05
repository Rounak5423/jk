# Implementation Plan — Tyre Grid Redesign

> Grounded in actual codebase exploration. Every file path, type, and pattern is verified
> against the live source files. Do not re-derive what is stated here.

---

## Design Decisions

**D1 — Inline SVG React components for tyre imagery.**
Vite config uses only `@vitejs/plugin-react`; `vite-plugin-svgr` is not installed, so
`import Foo from './foo.svg?react'` is unavailable. No external image URLs are permitted.
The only approach that bundles realistic tyre artwork without new dependencies is hand-authored
inline SVG as React components. One component per health status.

**D2 — View button navigates to `/tyres/:id` (existing route).**
The existing `TyreDetailPage` at `/tyres/:id` already renders a comprehensive detail view.
Building a duplicate slide-over drawer that fetches and renders the same data would be redundant
and would require a separate API call. The View button will remain a `<Link to={/tyres/${tyre.id}}>`.
This preserves the existing UX contract and keeps the redesign focused on the grid.

**D3 — New component files under `frontend/src/components/tyre/`.**
The `components/3d/TyreDetailsPanel.tsx` is for the 3D vehicle twin (takes a `WheelPositionConfig`
prop from the 3D viewer) and must not be touched. New tyre-grid components live in their own
`components/tyre/` subdirectory to avoid any collision.

**D4 — `searchTerm` is a client-side `useState`; no new API call.**
The existing `useQuery` already fetches all matching tyres filtered by `healthFilter`.
The search field filters the returned array in memory (`serial_number` + `model` substring match).

**D5 — Status filter dropdown (FITTED/IN_INVENTORY/…) is retained but de-emphasized.**
The task does not mention the operational status filter, but the existing backend supports it
and removing it would silently drop a capability. It stays as a small secondary dropdown next
to the search field.

**D6 — Summary counts are derived from the fetched `tyres` array, not a separate endpoint.**
`tyres.filter(t => t.thi_status === 'HEALTHY').length` etc., computed after the API response.
They automatically reflect the active `healthFilter` and `statusFilter`.

---

## Files To Create

### 1. `frontend/src/components/tyre/TyreHealthy.tsx`
Inline SVG React component depicting a commercial truck tyre in excellent condition:
deep tread grooves, intact rubber, subtle emerald glow on outer rim only.

### 2. `frontend/src/components/tyre/TyreWarning.tsx`
Inline SVG React component depicting a moderately worn tyre: shallower grooves, used
appearance, subtle amber glow on outer rim only.

### 3. `frontend/src/components/tyre/TyreCritical.tsx`
Inline SVG React component depicting a severely worn tyre: nearly-smooth tread, visually
unsafe, subtle red glow on outer rim only.

### 4. `frontend/src/components/tyre/TyreCard.tsx`
Individual tyre card component. Accepts a single `Tyre` prop, renders the card with stencil
number, model name, appropriate tyre SVG, health status badge, and View button.

---

## Files To Modify

### 5. `frontend/src/pages/fleet/TyresPage.tsx`
Replace the table layout with the new grid. All existing state, data-fetching, and routing
logic is preserved or extended.

---

## Files That Must NOT Be Modified (verified against investigation)

- `frontend/src/store/authStore.ts`
- `frontend/src/services/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/pages/fleet/TyreDetailPage.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/components/3d/TyreDetailsPanel.tsx`
- Any backend file

---

## Ordered Implementation Steps

---

- [ ] 1. Create `frontend/src/components/tyre/TyreHealthy.tsx` — inline SVG tyre, excellent condition.

  **What:** A React functional component that renders a large (200 × 260 px viewBox) inline SVG
  of a commercial truck tyre in excellent/new condition.

  **SVG structure (exact elements to use):**
  - Outer ellipse background: very dark gray (`#1a1a1a`) representing rubber body
  - Rim circle: dark steel (`#2a2a2a`) in the centre
  - Spoke elements: 5 spokes from rim outward, dark gray
  - Tread grooves: 6–8 distinct, deep concentric arc segments with clear gaps between them,
    rendered in near-black (`#111`) against slightly lighter rubber (`#222`) — the depth contrast
    makes grooves visually prominent
  - Subtle emerald outer-edge glow: a `<filter>` with `feGaussianBlur` and a thin outer ring
    stroke in `#34d399` (Tailwind `emerald-400`) at low opacity (≤ 0.55), applied only to the
    outermost ring — not the full tyre body
  - NO green fill anywhere on the tyre body

  **Prop:** `className?: string` (allows size overrides from parent)

  **File:** `frontend/src/components/tyre/TyreHealthy.tsx`

  **Verify:** `cd frontend && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 2. Create `frontend/src/components/tyre/TyreWarning.tsx` — inline SVG tyre, moderately worn.

  **What:** Same structure as TyreHealthy but worn appearance:
  - Tread grooves: fewer (4–5), shallower arcs, narrower gap between them — visually less
    defined than the healthy tyre
  - Rubber body: slightly lighter gray (`#252525`) to suggest surface wear
  - Outer-edge glow: thin ring in `#fbbf24` (Tailwind `amber-400`) at low opacity (≤ 0.55)
  - NO yellow/amber fill on the tyre body

  **File:** `frontend/src/components/tyre/TyreWarning.tsx`

  **Verify:** `cd frontend && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 3. Create `frontend/src/components/tyre/TyreCritical.tsx` — inline SVG tyre, severely worn.

  **What:** Same structure but severely degraded appearance:
  - Tread grooves: 1–2 faint shallow arcs or effectively smooth surface — the difference from
    TyreHealthy must be unmistakable at card thumbnail size
  - Rubber body: medium gray (`#2e2e2e`) simulating surface smoothing
  - Outer-edge glow: thin ring in `#f87171` (Tailwind `red-400`) at low opacity (≤ 0.55)
  - NO red fill on the tyre body

  **File:** `frontend/src/components/tyre/TyreCritical.tsx`

  **Verify:** `cd frontend && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 4. Create `frontend/src/components/tyre/TyreCard.tsx` — individual tyre card component.

  **What:** A self-contained card component that renders one `Tyre` record.

  **Exact prop type** (import `Tyre` from `../../types`):
  ```typescript
  interface TyreCardProps {
    tyre: Tyre;
  }
  ```

  **Card structure (top to bottom):**
  ```
  ┌──────────────────────────────────┐
  │ [serial_number]   [thi_status]   │  ← stencil (font-mono font-bold text-white text-sm)
  │ [brand] [model] · [size]         │  ← subtitle (text-xs text-slate-400)
  │                                  │
  │         [TyreImage SVG]          │  ← TyreHealthy / TyreWarning / TyreCritical
  │         (centred, h-36)          │
  │                                  │
  │  [HEALTHY/WARNING/CRITICAL badge]│  ← status pill (same pattern as TyreDetailPage)
  │                                  │
  │         [View →]                 │  ← Link to /tyres/${tyre.id}
  └──────────────────────────────────┘
  ```

  **Tyre image selection logic:**
  ```typescript
  import { TyreHealthy } from './TyreHealthy';
  import { TyreWarning } from './TyreWarning';
  import { TyreCritical } from './TyreCritical';

  const TyreImage = tyre.thi_status === 'HEALTHY'
    ? TyreHealthy
    : tyre.thi_status === 'WARNING'
    ? TyreWarning
    : TyreCritical;   // CRITICAL and UNKNOWN both get TyreCritical
  ```

  **Status badge colors** (match existing TyresPage and TyreDetailPage pattern exactly):
  - HEALTHY → `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
  - WARNING → `bg-amber-500/10 text-amber-400 border border-amber-500/20`
  - CRITICAL → `bg-red-500/10 text-red-400 border border-red-500/20`
  - UNKNOWN → `bg-slate-500/10 text-slate-400 border border-slate-500/20`

  **Card outer wrapper Tailwind classes:**
  ```
  bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3
  hover:border-slate-700 transition-colors duration-200
  ```

  **Card border accent** — add a top border line that reflects status:
  - HEALTHY: `border-t-2 border-t-emerald-500/40`
  - WARNING: `border-t-2 border-t-amber-500/40`
  - CRITICAL: `border-t-2 border-t-red-500/40`
  - UNKNOWN: `border-t-2 border-t-slate-500/40`

  **View button:**
  ```tsx
  import { Link } from 'react-router-dom';
  import { ArrowUpRight } from 'lucide-react';

  <Link
    to={`/tyres/${tyre.id}`}
    className="mt-auto self-center px-4 py-1.5 bg-slate-800 hover:bg-slate-700
               text-slate-300 hover:text-white rounded-lg text-xs font-semibold
               transition inline-flex items-center gap-1"
  >
    View <ArrowUpRight className="w-3.5 h-3.5" />
  </Link>
  ```

  **Imports required:**
  - `React` from `react`
  - `Link` from `react-router-dom`
  - `ArrowUpRight` from `lucide-react`
  - `Tyre` from `../../types`
  - `TyreHealthy`, `TyreWarning`, `TyreCritical` from `./TyreHealthy`, `./TyreWarning`, `./TyreCritical`

  **File:** `frontend/src/components/tyre/TyreCard.tsx`

  **Verify:** `cd frontend && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 5. Rewrite `frontend/src/pages/fleet/TyresPage.tsx` — replace table with visual grid.

  **Dependency:** Steps 1–4 must be complete before this step (TyreCard imports TyreHealthy/Warning/Critical; this page imports TyreCard).

  **What:** Replace the current file in-place. The route, query key, API call, and all existing
  state must be preserved. The table is removed and replaced with the grid layout described below.

  **State to preserve (from current file):**
  ```typescript
  const [statusFilter, setStatusFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  ```

  **New state to add:**
  ```typescript
  const [searchTerm, setSearchTerm] = useState('');
  ```

  **useQuery block — keep exactly as-is (same query key, same queryFn, same endpoint):**
  ```typescript
  const { data: tyres, isLoading } = useQuery<Tyre[]>({
    queryKey: ['fleet-tyres', statusFilter, healthFilter],
    queryFn: async () => {
      let url = '/tyres?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (healthFilter) url += `health=${healthFilter}&`;
      const res = await api.get(url);
      return res.data;
    },
  });
  ```

  **Client-side filtered list (computed value, not state):**
  ```typescript
  const filteredTyres = (tyres ?? []).filter((t) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.serial_number.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q)
    );
  });
  ```

  **Summary counts — derived from `filteredTyres`:**
  ```typescript
  const healthyCount  = filteredTyres.filter(t => t.thi_status === 'HEALTHY').length;
  const warningCount  = filteredTyres.filter(t => t.thi_status === 'WARNING').length;
  const criticalCount = filteredTyres.filter(t => t.thi_status === 'CRITICAL').length;
  ```

  **Health filter buttons logic:**
  The three HEALTHY/WARNING/CRITICAL filter buttons call `setHealthFilter('HEALTHY')` etc.
  "All" calls `setHealthFilter('')`. These set server-side filter state (existing pattern).
  The active button is highlighted when `healthFilter === 'HEALTHY'` etc.

  **Full page JSX structure:**

  ```
  <div className="space-y-6">

    {/* 1. Page header */}
    <div>
      <h1 className="text-2xl font-black text-white tracking-tight">
        Tyre Lifecycle Management
      </h1>
      <p className="text-xs text-slate-400 mt-0.5">Visual condition overview</p>
    </div>

    {/* 2. Summary cards — 3 cards, horizontal, real counts */}
    <div className="grid grid-cols-3 gap-4">
      {/* Healthy card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
        <div>
          <div className="text-2xl font-black text-white">{healthyCount}</div>
          <div className="text-xs text-emerald-400 font-semibold">Healthy</div>
        </div>
      </div>
      {/* Warning card */}
      ... (same with AlertTriangle amber-400, warningCount)
      {/* Critical card */}
      ... (same with AlertCircle red-400, criticalCount)
    </div>

    {/* 3. Search + filter controls */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Search input */}
      <input
        type="search"
        placeholder="Search by serial number or model…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2
                   text-xs text-slate-300 placeholder-slate-500
                   focus:outline-none focus:border-red-500"
      />

      {/* Health filter pill buttons */}
      <div className="flex items-center gap-2">
        {['', 'HEALTHY', 'WARNING', 'CRITICAL'].map((v) => (
          <button
            key={v || 'ALL'}
            onClick={() => setHealthFilter(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              healthFilter === v
                ? v === ''        ? 'bg-slate-700 text-white'
                : v === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : v === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                :                   'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {v === '' ? 'All' : v.charAt(0) + v.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Status dropdown — retained, de-emphasized */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2
                   text-xs text-slate-300 focus:outline-none focus:border-red-500"
      >
        <option value="">All Statuses</option>
        <option value="FITTED">Fitted</option>
        <option value="IN_INVENTORY">In Depot</option>
        <option value="RETREADING">Retreading</option>
        <option value="SCRAPPED">Scrapped</option>
      </select>
    </div>

    {/* 4. Loading state */}
    {isLoading && (
      <div className="py-20 text-center text-xs text-slate-500 flex items-center
                      justify-center gap-2">
        <Activity className="w-4 h-4 animate-spin text-red-500" />
        Loading tyre registry…
      </div>
    )}

    {/* 5. Empty state */}
    {!isLoading && filteredTyres.length === 0 && (
      <div className="py-20 text-center text-xs text-slate-500">
        No tyres match the current filters.
      </div>
    )}

    {/* 6. Tyre card grid */}
    {!isLoading && filteredTyres.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTyres.map((t) => (
          <TyreCard key={t.id} tyre={t} />
        ))}
      </div>
    )}

  </div>
  ```

  **Imports for updated TyresPage.tsx:**
  ```typescript
  import React, { useState } from 'react';
  import { useQuery } from '@tanstack/react-query';
  import api from '../../services/api';
  import { Tyre } from '../../types';
  import { ShieldCheck, AlertTriangle, AlertCircle, Activity } from 'lucide-react';
  import { TyreCard } from '../../components/tyre/TyreCard';
  ```
  Note: `Link`, `ArrowUpRight`, `Disc`, `Filter`, `HelpCircle` are no longer needed in
  TyresPage since the Link and navigation are now inside TyreCard. Remove them from this file's imports.

  **File:** `frontend/src/pages/fleet/TyresPage.tsx`

  **Verify:** `cd frontend && npx tsc --noEmit` — zero TypeScript errors.
             Then `npm run build` — build succeeds with no errors.

---

## Import Path Reference (summary)

| From | Import |
|------|--------|
| `TyresPage.tsx` imports `TyreCard` | `../../components/tyre/TyreCard` |
| `TyreCard.tsx` imports `TyreHealthy` | `./TyreHealthy` |
| `TyreCard.tsx` imports `TyreWarning` | `./TyreWarning` |
| `TyreCard.tsx` imports `TyreCritical` | `./TyreCritical` |
| `TyreCard.tsx` imports `Tyre` type | `../../types` |
| `TyreCard.tsx` imports `Link` | `react-router-dom` |
| `TyreCard.tsx` imports `ArrowUpRight` | `lucide-react` |

No new npm packages are required. All dependencies (`react`, `react-router-dom`, `lucide-react`,
`@tanstack/react-query`, `tailwindcss`) are already installed.

---

## Build & Verification Commands

```bash
# Type-check only (fast, run after each file):
cd frontend && npx tsc --noEmit

# Full build (run after all 5 steps are complete):
cd frontend && npm run build
# Expected: "✓ built in X.Xs" with zero errors
```

No test framework is configured for the frontend. The only verification available is the
TypeScript compiler and Vite build.

---

## Health Status → Visual Mapping (authoritative reference)

| `thi_status` | SVG Component | Outer glow color | Badge classes |
|---|---|---|---|
| `'HEALTHY'` | `<TyreHealthy />` | `#34d399` emerald-400 | `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` |
| `'WARNING'` | `<TyreWarning />` | `#fbbf24` amber-400 | `bg-amber-500/10 text-amber-400 border border-amber-500/20` |
| `'CRITICAL'` | `<TyreCritical />` | `#f87171` red-400 | `bg-red-500/10 text-red-400 border border-red-500/20` |
| `'UNKNOWN'` | `<TyreCritical />` | `#f87171` red-400 | `bg-slate-500/10 text-slate-400 border border-slate-500/20` |

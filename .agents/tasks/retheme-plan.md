# Retheme Plan: JK Tyre THI Dashboard — White/Blue/Yellow Light Theme

## Goal

Convert the entire dashboard from a dark slate theme (`bg-slate-950`, `bg-slate-900`, dark tables, red primary CTA) to a **white, blue, and yellow** light theme. Graph/status colours (red, green, amber) remain for semantic meaning. No logic, routing, state, or API changes — className and style values only.

---

## Palette Reference

| Token | Old value (dark) | New value (light) |
|---|---|---|
| Page background | `bg-slate-950` | `bg-slate-50` |
| Card / panel | `bg-slate-900/60`, `bg-slate-900` | `bg-white` |
| Dark inner panel | `bg-slate-950/50`, `bg-slate-950/60` | `bg-blue-50` |
| Primary border | `border-slate-800` | `border-blue-200` |
| Secondary border | `border-slate-700` | `border-slate-200` |
| Sidebar background | `bg-slate-900/60` | `bg-white` |
| Navbar background | `bg-graphite` | `bg-white` |
| Page-level headings | `text-white` | `text-slate-900` |
| Body/label text | `text-slate-300`, `text-slate-400` | `text-slate-600` |
| Muted text | `text-slate-500` | `text-slate-400` |
| Active nav link | `bg-red-600 text-white` | `bg-blue-600 text-white` |
| Inactive nav link | `text-slate-400 hover:bg-slate-800/80` | `text-slate-600 hover:bg-blue-50` |
| Primary CTA button | `bg-red-600 hover:bg-red-700 text-white` | `bg-blue-600 hover:bg-blue-700 text-white` |
| Table header row | `bg-slate-950/40` | `bg-blue-50` |
| Table header text | `text-slate-400` | `text-slate-600` |
| Table body rows | `text-slate-300` | `text-slate-700` |
| Table divider | `divide-slate-800/60` | `divide-slate-200` |
| Table hover | `hover:bg-slate-800/30` | `hover:bg-blue-50/50` |
| Modal backdrop | `bg-slate-900 border-slate-700` | `bg-white border-blue-200` |
| Modal overlay | `bg-black/80 backdrop-blur-md` | `bg-slate-900/50 backdrop-blur-sm` |
| Form input | `bg-slate-950 border-slate-800 text-white` | `bg-white border-slate-200 text-slate-900` |
| Tooltip chart bg | `backgroundColor: '#0f172a', borderColor: '#334155'` | `backgroundColor: '#1e3a5f', borderColor: '#3b82f6'` |
| Link colour | `text-red-400 hover:text-red-300` | `text-blue-600 hover:text-blue-700` |
| Info/bottom card | `bg-slate-950/50 border-slate-800 text-slate-400` | `bg-blue-50 border-blue-200 text-blue-700` |
| 3D badge | `bg-red-600 text-white` | `bg-yellow-400 text-slate-900` |

**Keep unchanged** (semantic status colours):
- `bg-emerald-*`, `text-emerald-*` — Healthy / Pass / online
- `bg-amber-*`, `text-amber-*` — Warning
- `bg-red-*`, `text-red-*` — Critical / scrap / failure badges (status only)
- Chart `stroke` and `fill` colours on data lines (emerald, amber, red, purple, cyan)
- `bg-fleet` / `bg-yellow-400` — already yellow, keep as primary accent

---

## Two Tailwind Config Changes Needed First

`bordergray` and `secondary` are used in MyFleetsPage, VehicleInspectionPage, and AdminMapPage but are **not registered** in `tailwind.config.js` (so they currently produce no output). Add them so the existing light-mode pages continue rendering correctly, and new theme tokens resolve properly.

**File:** `frontend/tailwind.config.js`

Add inside `theme.extend.colors`:
```js
bordergray: '#E5E7EB',   // same as jk.border — already matches light panels
secondary: '#6B7280',    // same as jk.gray — matches text-secondary usage
```

---

## File-by-File Classification

### Group A — Heavy dark theme (most work)
These pages are fully dark-slated with no light-mode fallback. Every card, table, modal, input, and text class needs replacement.

1. `AppLayout.tsx`
2. `Navbar.tsx`
3. `Sidebar.tsx`
4. `DashboardPage.tsx`
5. `VehiclesPage.tsx`
6. `VehicleDetailPage.tsx`
7. `TyresPage.tsx`
8. `TyreDetailPage.tsx`
9. `TripsPage.tsx`
10. `AlertsPage.tsx`
11. `TrendsPage.tsx`
12. `ComparisonPage.tsx`
13. `ReportsPage.tsx`
14. `FitmentPage.tsx`
15. `InspectionsPage.tsx`
16. `AdminDashboardPage.tsx`
17. `DriverPortalPage.tsx`

### Group B — Mixed (light elements present, dark elements remain)
These files already use white cards and light borders for their main content but still have dark headers, dark modals, or dark inputs that need updating.

18. `MyFleetsPage.tsx` — mostly light already; fix dark modal/inputs if any; `bordergray`/`secondary` tokens now work once Tailwind config is patched
19. `VehicleInspectionPage.tsx` — mixed: light card grid but dark modal form inputs and dark vehicle banner
20. `AdminMapPage.tsx` — mostly light; has one dark SVG map div (`bg-slate-950`) and a dark details card (`bg-slate-900`) that need lightening

---

## Processing Order

Process in this exact order so that the shell (layout) is correct before the content pages:

1. `tailwind.config.js` — add `bordergray` and `secondary` tokens
2. `index.css` — change `color-scheme: dark` to `light`, update body `background-color` to `#f8fafc`, `color` to `#0f172a`; update scrollbar track to `#f1f5f9`, thumb to `#cbd5e1`
3. `AppLayout.tsx`
4. `Navbar.tsx`
5. `Sidebar.tsx`
6. `DashboardPage.tsx`
7. `VehiclesPage.tsx`
8. `VehicleDetailPage.tsx`
9. `TyresPage.tsx`
10. `TyreDetailPage.tsx`
11. `TripsPage.tsx`
12. `AlertsPage.tsx`
13. `TrendsPage.tsx`
14. `ComparisonPage.tsx`
15. `ReportsPage.tsx`
16. `FitmentPage.tsx`
17. `InspectionsPage.tsx`
18. `MyFleetsPage.tsx` (light-touch)
19. `VehicleInspectionPage.tsx` (mixed)
20. `AdminDashboardPage.tsx`
21. `AdminMapPage.tsx` (light-touch)
22. `DriverPortalPage.tsx`

---

## Implementation Plan

---

- [ ] 1. Patch Tailwind config and global CSS.
      Add `bordergray` and `secondary` colour tokens to `tailwind.config.js` so that the already-light pages (AdminMapPage, MyFleetsPage, VehicleInspectionPage) render their borders and muted text correctly. Update `index.css` to set `color-scheme: light`, update body background to `#f8fafc`, body text to `#0f172a`, and scrollbar colours to match the light palette.
      Files: `frontend/tailwind.config.js`, `frontend/src/index.css`
      Verify: `cd frontend && npm run build` — zero TypeScript/build errors. No visual regressions needed yet; this is config-only.

---

- [ ] 2. Retheme the three layout components (AppLayout, Navbar, Sidebar).
      These wrap every page so correctness here propagates everywhere.
      
      **AppLayout.tsx**
      - `bg-slate-950` → `bg-slate-50`
      - `text-slate-100` → `text-slate-900`
      
      **Navbar.tsx**
      - `bg-graphite` → `bg-white`
      - Add `shadow-sm` to the header if not present
      - `border-slate-800` → `border-blue-100`
      - `text-white` (brand name) → `text-slate-900`
      - `text-slate-400` (subtitle) → `text-slate-500`
      - User name `text-white` → `text-slate-900`
      - Logout button `text-slate-400 hover:text-white hover:bg-slate-800` → `text-slate-500 hover:text-slate-900 hover:bg-slate-100`
      - User separator `border-slate-800` → `border-slate-200`
      - Dev badge `bg-amber-500/10 text-amber-400 border-amber-500/20` → keep (amber is fine on white)
      
      **Sidebar.tsx**
      - `bg-slate-900/60` → `bg-white`
      - `border-slate-800` (right border and bottom border) → `border-blue-100`
      - Section label `text-slate-400` → `text-slate-500`
      - Active nav link: `bg-red-600 text-white shadow-red-600/20` → `bg-blue-600 text-white shadow-blue-600/20`
      - Inactive nav link: `text-slate-400 hover:text-white hover:bg-slate-800/80` → `text-slate-600 hover:text-slate-900 hover:bg-blue-50`
      - Info card bottom: `bg-slate-950/50 border-slate-800 text-slate-400` → `bg-blue-50 border-blue-200 text-blue-700`
      - Info card sub-text `text-slate-300` → `text-blue-800`
      
      Files: `frontend/src/components/layout/AppLayout.tsx`, `Navbar.tsx`, `Sidebar.tsx`
      Verify: `npm run build` — no errors. Open the app; sidebar and navbar should be white with blue accents.

---

- [ ] 3. Retheme DashboardPage.tsx.
      This is the most-referenced page; getting it right establishes the card pattern for all other pages.
      
      Pattern replacements (apply to all card `div`s, the table, and the two modals):
      - Page heading `text-white` → `text-slate-900`
      - Body text `text-slate-400` → `text-slate-500`
      - KPI cards: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - KPI value `text-white` → `text-slate-900`; KPI sub `text-slate-500` → `text-slate-400`
      - Primary CTA link `bg-red-600 hover:bg-red-700 shadow-red-600/20` → `bg-blue-600 hover:bg-blue-700 shadow-blue-600/20`
      - Section cards: same `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - Section title `text-white` → `text-slate-900`
      - Legend items inner card: `bg-slate-950/40 border-slate-800/60` → `bg-blue-50 border-blue-200`
      - Legend label `text-slate-400` → `text-slate-600`; legend value `text-white` → `text-slate-900`
      - Alert item: `bg-slate-950/50 border-slate-800` → `bg-blue-50 border-blue-200`
      - Alert text `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
      - "View All" links: `text-red-400 hover:text-red-300` → `text-blue-600 hover:text-blue-700`
      - Table header: `text-slate-400` → `text-slate-600`; `border-b border-slate-800` → `border-b border-blue-200`
      - Table body: `text-slate-300` → `text-slate-700`; `divide-slate-800/60` → `divide-slate-200`
      - Table row hover: `hover:bg-slate-800/30` → `hover:bg-blue-50/50`
      - Table cell value `text-white` → `text-slate-900`
      - Trip status badge COMPLETED: `bg-slate-800 text-slate-300` → `bg-slate-100 text-slate-600`
      - Recharts Tooltip: `backgroundColor: '#0f172a', borderColor: '#334155'` → `backgroundColor: '#1e3a5f', borderColor: '#3b82f6'`
      
      Files: `frontend/src/pages/fleet/DashboardPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 4. Retheme VehiclesPage.tsx and VehicleDetailPage.tsx.
      Both share the same table + dark modal (3D twin modal) pattern.
      
      **Shared replacements:**
      - Page heading `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`
      - Table container: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - Table header row: `bg-slate-950/40 text-slate-400` → `bg-blue-50 text-slate-600`
      - Table header border: `border-slate-800` → `border-blue-200`
      - Table body: `text-slate-300` / `text-slate-200` → `text-slate-700`; `divide-slate-800/60` → `divide-slate-200`
      - Table row hover: `hover:bg-slate-800/30` → `hover:bg-blue-50/50`
      - Table cell white values: `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; `text-slate-500` → `text-slate-400`
      - Action buttons in table: `bg-slate-800 hover:bg-slate-700 text-slate-200` → `bg-slate-100 hover:bg-slate-200 text-slate-700`; secondary action border: `border-slate-700` → `border-slate-200`
      - 3D View button in table: keep amber (`bg-amber-500/20 text-amber-300 border-amber-500/30`) — amber on white is fine
      - KPI spec cards (VehicleDetailPage): `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; `text-slate-400` → `text-slate-500`; `text-white` → `text-slate-900`; `text-slate-500` → `text-slate-400`
      - Fitted tyres card: same card conversion; `text-white` headers → `text-slate-900`
      - Inspect in 3D link: `text-red-400 hover:text-red-300` → `text-blue-600 hover:text-blue-700`
      - Loading state: `text-slate-500` → `text-slate-400`; loading spinner `text-red-500` → `text-blue-500`
      - Not found link: `text-red-400` → `text-blue-600`; `text-slate-400` → `text-slate-500`
      - Back link: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900`
      - Wheel config badge: `bg-blue-500/10 text-blue-400 border-blue-500/20` → `bg-blue-100 text-blue-700 border-blue-300` (same semantics, better on white)
      
      **3D Twin Modal** (present in both files):
      - Outer container: `bg-slate-900 border-slate-700` → `bg-white border-blue-200`
      - Modal header: `bg-slate-950/60 border-slate-800` → `bg-blue-50 border-blue-100`
      - 3D badge: `bg-red-600 text-white` → `bg-yellow-400 text-slate-900`
      - Title `text-white` → `text-slate-900`; subtitle `text-slate-400` → `text-slate-500`
      - Close button: `text-slate-400 hover:text-white hover:bg-slate-800` → `text-slate-500 hover:text-slate-900 hover:bg-slate-100`
      - Inner viewer area: `bg-slate-950` → `bg-slate-100`
      - Loading text: `text-slate-400` → `text-slate-500`; loading icon `text-red-500` → `text-blue-500`
      
      Files: `frontend/src/pages/fleet/VehiclesPage.tsx`, `frontend/src/pages/fleet/VehicleDetailPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 5. Retheme TyresPage.tsx and TyreDetailPage.tsx.
      TyresPage uses dark filter buttons and dark summary cards. TyreDetailPage uses dark KPI and history cards.
      
      **TyresPage.tsx:**
      - Page heading `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`
      - Summary cards: `bg-slate-900/60 border-slate-800 border-t-2 border-t-emerald-500/40` → `bg-white border-blue-200 border-t-2 border-t-emerald-400 shadow-sm`
      - Summary card values `text-white` → `text-slate-900`
      - Search input: `bg-slate-900 border-slate-800 text-slate-300 placeholder-slate-500 focus:border-red-500` → `bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500`
      - Health filter button inactive: `bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800` → `bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-blue-50`
      - Health filter button active "All": `bg-slate-700 text-white border-slate-600` → `bg-blue-600 text-white border-blue-700`
      - Status dropdown: `bg-slate-900 border-slate-800 text-slate-300 focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
      - Loading text: `text-slate-500` → `text-slate-400`; spinner `text-red-500` → `text-blue-500`
      - Empty state `text-slate-500` → `text-slate-400`
      
      **TyreDetailPage.tsx:**
      - Apply standard: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - All `text-white` heading/value → `text-slate-900`; `text-slate-400` labels → `text-slate-500`; `text-slate-500` muted → `text-slate-400`
      - Back link: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900`
      - Not found link: `text-red-400` → `text-blue-600`
      - Loading: `text-slate-500` → `text-slate-400`; `text-red-500` → `text-blue-500`
      - RUL analysis card description: `text-slate-400` → `text-slate-500`; `text-slate-500` labels → `text-slate-400`
      - Fitment history items: `bg-slate-950/60 border-slate-800/80` → `bg-blue-50 border-blue-200`
      - Dismounted badge: `bg-slate-800 text-slate-400` → `bg-slate-100 text-slate-600`
      - Lifecycle history items: same dark→light card treatment
      
      Files: `frontend/src/pages/fleet/TyresPage.tsx`, `frontend/src/pages/fleet/TyreDetailPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 6. Retheme TripsPage.tsx.
      Contains filter bar, trips table, trip detail modal.
      
      - Page heading/sub: `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
      - Refresh button: `bg-slate-900 border-slate-800 text-slate-300 hover:text-white` → `bg-white border-slate-200 text-slate-600 hover:text-slate-900`
      - Vehicle filter banner: `bg-amber-500/10 border-amber-500/30 text-amber-300` → keep (amber on white fine); inner banner text `text-white` → `text-slate-900`; `text-amber-200/80` → `text-amber-800`; dismiss button `bg-slate-900 border-amber-500/40 text-amber-300 hover:text-white` → `bg-white border-amber-400 text-amber-700 hover:text-slate-900`
      - Filter bar: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - Filter labels `text-slate-400` → `text-slate-600`
      - Filter selects/inputs: `bg-slate-950 border-slate-800 text-white focus:border-fleet` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
      - Reset Filters link: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900`
      - Trips table: apply standard table → `bg-white border-blue-200`, header `bg-blue-50 text-slate-600 border-blue-200`, body `text-slate-700 divide-slate-200 hover:bg-blue-50/50`
      - Table cell `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; `text-slate-500` → `text-slate-400`
      - Vehicle link in table: `hover:text-fleet` → keep (yellow on white is visible)
      - Trip status COMPLETED: `bg-slate-800 text-slate-300` → `bg-slate-100 text-slate-600`
      - Trip detail modal: `bg-slate-900 border-slate-800` → `bg-white border-blue-200`
      - Modal header/title: `text-white` → `text-slate-900`; Route icon: `text-fleet` keep
      - Trip summary inner: `bg-slate-950/80 border-slate-800` → `bg-blue-50 border-blue-200`
      - Score breakdown items: `bg-slate-950 border-slate-800/80` → `bg-blue-50 border-blue-200`; `text-white` → `text-slate-900`
      - Score summary text: `bg-slate-800/40 text-slate-300` → `bg-slate-100 text-slate-600`; `text-slate-200` → `text-slate-700`
      
      Files: `frontend/src/pages/fleet/TripsPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 7. Retheme AlertsPage.tsx.
      Contains filter dropdowns, alerts table, resolve modal.
      
      - Page heading/sub: standard conversion
      - Filter dropdowns: `bg-slate-900 border-slate-800 text-slate-300 focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
      - Alerts table: standard dark→light table conversion
      - Alert code badge CRITICAL: `bg-red-500/20 text-red-400 border-red-500/30` → keep (status colour)
      - Alert code badge WARNING: `bg-amber-500/20 text-amber-400 border-amber-500/30` → keep
      - Alert code badge RISK: `bg-blue-500/20 text-blue-400 border-blue-500/30` → `bg-blue-100 text-blue-700 border-blue-300`
      - Vehicle `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
      - Recommended action `text-blue-400` → `text-blue-600`
      - Resolved note: `text-emerald-400 bg-emerald-950/20 border-emerald-900/30` → `text-emerald-700 bg-emerald-50 border-emerald-200`
      - Alert status active: `bg-red-500/20 text-red-300 border-red-500/30` → keep
      - Alert status acknowledged: `bg-amber-500/20 text-amber-300 border-amber-500/30` → keep
      - Alert status resolved: `bg-slate-800 text-slate-400` → `bg-slate-100 text-slate-500`
      - Acknowledge button: `bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40` → `bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300`
      - Resolve modal: `bg-slate-900 border-slate-800` → `bg-white border-blue-200`
      - Modal title `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
      - Textarea: `bg-slate-950 border-slate-800 text-white focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
      - Cancel button: `bg-slate-800 text-slate-300 hover:bg-slate-700` → `bg-slate-100 text-slate-700 hover:bg-slate-200`
      
      Files: `frontend/src/pages/fleet/AlertsPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 8. Retheme TrendsPage.tsx.
      Contains two filter controls, three chart panels, and an ML card with a form.
      
      - Page heading/sub: standard
      - Vehicle selector control: `bg-slate-900 border-slate-800 text-white` → `bg-white border-slate-200 text-slate-900`; inner select `bg-transparent text-white` → `text-slate-900 bg-white`; vehicle option `bg-slate-900` → `bg-white`
      - Days toggle container: `bg-slate-900 border-slate-800` → `bg-white border-slate-200`; inactive `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900`; active: `bg-fleet text-graphite` → keep
      - Baseline banner: `bg-slate-900/80 border-slate-800 text-slate-300` → `bg-blue-50 border-blue-200 text-slate-700`; `text-white` bold → `text-slate-900`; `text-slate-400` body → `text-slate-600`
      - Main chart card: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`
      - Chart heading `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`
      - `CartesianGrid stroke="#1e293b"` → `stroke="#e2e8f0"` (light grid lines)
      - `XAxis/YAxis stroke="#64748b"` → keep (slate-500 is visible on white)
      - Recharts Tooltip: `backgroundColor: '#0f172a', borderColor: '#334155'` → `backgroundColor: '#1e3a5f', borderColor: '#3b82f6'`
      - Loading/empty text: `text-slate-500` → `text-slate-400`
      - Sub-chart cards: same card conversion
      - ML metrics cards: `bg-slate-950/60 border-slate-800` → `bg-blue-50 border-blue-200`
      - ML metrics text `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
      - ML interactive form: `bg-slate-950/40 border-slate-800` → `bg-blue-50 border-blue-200`
      - Form input: `bg-slate-900 border-slate-800 text-white font-mono` → `bg-white border-slate-200 text-slate-900`
      - Steer label: `text-slate-300` → `text-slate-700`
      - Predict button: `bg-purple-600 hover:bg-purple-700` → keep (purple is fine as accent)
      - Prediction result: `text-slate-400` → `text-slate-500`; `text-purple-400` → `text-purple-700`
      - ML badge: `bg-purple-500/10 text-purple-300 border-purple-500/20` → `bg-purple-100 text-purple-700 border-purple-300`
      - ML description: `text-slate-400` → `text-slate-500`
      
      Files: `frontend/src/pages/fleet/TrendsPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 9. Retheme ComparisonPage.tsx.
      Contains vehicle selection drawer, bar chart, comparison table.
      
      - Page heading/sub: standard
      - Selection drawer: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; `border-b border-slate-800` → `border-b border-blue-100`; `text-white` → `text-slate-900`
      - Selection badge (min valid): `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` → `bg-emerald-100 text-emerald-700 border-emerald-300`; invalid: `bg-amber-500/10 text-amber-400 border-amber-500/20` → `bg-amber-100 text-amber-700 border-amber-300`
      - Search input: standard dark→light input
      - Warning message: `bg-amber-500/10 border-amber-500/30 text-amber-300` → `bg-amber-50 border-amber-300 text-amber-700`
      - Vehicle chip: unselected `bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700` → `bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-blue-400`; disabled `bg-slate-950/40 border-slate-900 text-slate-600` → `bg-slate-50 border-slate-200 text-slate-400`; selected: `bg-fleet/10 border-fleet text-white` → `bg-yellow-50 border-yellow-400 text-slate-900`
      - Vehicle chip icon unselected: `text-slate-600` → `text-slate-400`
      - Validation empty state: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200`; `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; fleet icon `text-fleet` → keep
      - Bar chart card: standard conversion; `CartesianGrid stroke="#1e293b"` → `stroke="#e2e8f0"`; Tooltip: update to blue
      - Comparison table: standard dark→light table conversion
      - Action buttons: `bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white` → `bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900`
      
      Files: `frontend/src/pages/fleet/ComparisonPage.tsx`
      Verify: `npm run build` — no errors.

---

- [ ] 10. Retheme ReportsPage.tsx.
       Contains provenance banner, featured dataset card (dark `bg-graphite`), CSV card grid, and three summary cards.
       
       - Page heading/sub: standard
       - Provenance banner: `bg-slate-900 border-slate-800 text-slate-300` → `bg-blue-50 border-blue-200 text-slate-700`; `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
       - 13-sheet featured card: `bg-graphite border-slate-800` → `bg-blue-900 border-blue-800` (keep dark for visual contrast, just shift from graphite dark to blue dark); OR if full-light preferred → `bg-blue-700 border-blue-600`; icon div `bg-fleet` → keep; `text-white` on this dark card → keep; `text-slate-400` sub → `text-slate-300`; sheet pill: `bg-slate-900 text-slate-300 border-slate-800` → `bg-blue-800 text-blue-100 border-blue-700`; sheet number `text-slate-500` → `text-blue-300`
       - CSV cards: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; label `text-white` → `text-slate-900`; desc `text-slate-400` → `text-slate-500`; download button `bg-slate-800 hover:bg-slate-700 text-white border-slate-700` → `bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200`
       - Summary cards: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; `text-white` count → `text-slate-900`; `text-slate-400` body → `text-slate-500`
       
       Files: `frontend/src/pages/fleet/ReportsPage.tsx`
       Verify: `npm run build` — no errors.

---

- [ ] 11. Retheme FitmentPage.tsx and InspectionsPage.tsx.
       Both share a similar dark modal pattern with dark form inputs.
       
       **FitmentPage.tsx:**
       - Page heading/sub: standard
       - Vehicle selector card: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; label `text-slate-300` → `text-slate-700`; select `bg-slate-950 border-slate-700 text-white focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
       - Summary bar KPI cards: standard conversion; fitted count stays emerald, vacant amber
       - Positions grid container: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; title `text-white` → `text-slate-900`
       - Position card fitted: `bg-slate-950/60 border-slate-700` → `bg-blue-50 border-blue-200`
       - Position card vacant: `bg-slate-950/30 border-dashed border-amber-700/40` → `bg-amber-50 border-dashed border-amber-300`
       - Position label: `text-white px-2 py-0.5 rounded bg-slate-800` → `text-slate-900 bg-slate-100`
       - Tyre info `text-slate-400` → `text-slate-500`; serial `text-white` → `text-slate-900`
       - Remove button: `text-red-400 hover:bg-red-500/10 border-red-500/20` → keep (red for destructive)
       - Empty position icon `text-slate-700` → `text-slate-300`; text `text-slate-500` → `text-slate-400`
       - Fit button: `bg-red-600 hover:bg-red-700` → `bg-blue-600 hover:bg-blue-700`
       - Fit modal: `bg-slate-900 border-slate-800` → `bg-white border-blue-200`; title `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`; select/inputs: dark→light; labels `text-slate-300` → `text-slate-700`; available tyres empty `text-amber-400` → keep; submit `bg-red-600` → `bg-blue-600`
       - Remove modal: same conversion; confirm button stays `bg-red-600` (destructive)
       
       **InspectionsPage.tsx:**
       - Page heading/sub: standard
       - Log CTA button: `bg-red-600 hover:bg-red-700` → `bg-blue-600 hover:bg-blue-700`
       - Inspections table: standard dark→light table conversion
       - Visual condition badge NORMAL: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` → keep
       - Inspection modal (dark): `bg-slate-900 border-slate-800` → `bg-white border-blue-200`; title `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`; labels `text-slate-300` → `text-slate-700`; selects/inputs/textareas: dark→light; lifecycle section border `border-slate-700` → `border-slate-200`; lifecycle label `text-slate-200` → `text-slate-800`; sub-label `text-slate-500` → `text-slate-400`; lifecycle select option `text-slate-400` → `text-slate-600`; scrap warning: `bg-red-500/10 border-red-500/20 text-red-400` → keep; retread border `border-slate-800` → `border-slate-200`; retread sub `text-slate-500` → `text-slate-400`; photo input `text-slate-400 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700` → `text-slate-500 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200`; notes label `text-slate-300` → `text-slate-700`; cancel `bg-slate-800 text-slate-300 hover:bg-slate-700` → `bg-slate-100 text-slate-700 hover:bg-slate-200`; submit `bg-red-600` → `bg-blue-600`; error `bg-red-500/10 border-red-500/20 text-red-400` → keep
       
       Files: `frontend/src/pages/fleet/FitmentPage.tsx`, `frontend/src/pages/fleet/InspectionsPage.tsx`
       Verify: `npm run build` — no errors.

---

- [ ] 12. Light-touch fixes: MyFleetsPage.tsx and VehicleInspectionPage.tsx.
       These pages are already mostly light but have a few dark remnants.
       
       **MyFleetsPage.tsx:**
       - All `text-white` in headings and button text on dark variants: `bg-graphite text-white hover:bg-black` (Manage button) → `bg-slate-900 text-white hover:bg-black` — keep dark graphite for this "active" CTA as contrast, OR → `bg-blue-700 text-white hover:bg-blue-800` for full blue consistency
       - Fleet status badge `bg-slate-50 text-slate-600 border-slate-200` → keep (already light)
       - Error banner: `bg-red-50 border-red-200 text-red-700` → keep
       - Skeleton: `bg-white border-bordergray` → keep
       - Empty state: `bg-white border-bordergray` → keep
       - Fleet cards already use `bg-white border-bordergray` — no changes needed
       - Metrics grid: `bg-softgrey/30` → already softgrey (now resolves)
       - Active fleet card ring: `border-fleet ring-fleet/30` → keep (yellow ring)
       
       **VehicleInspectionPage.tsx:**
       - Dark vehicle banner: `bg-graphite rounded-2xl p-6 text-white` → `bg-blue-700 rounded-2xl p-6 text-white` (keeps contrast, shifts to blue)
       - Inside banner: `text-slate-400` labels → `text-blue-200`; `text-fleet font-mono` pressure value → keep (yellow on blue)
       - Inspection modal: already using light `bg-white` per existing code — check any remaining dark elements
       - Form inputs already use light classes (`bg-slate-50 border-bordergray`) — only update `focus:border-fleet` to `focus:border-blue-500` for consistency
       - Submit button: `bg-fleet hover:bg-yellow-400 text-graphite` → keep (yellow is part of the palette)
       
       Files: `frontend/src/pages/fleet/MyFleetsPage.tsx`, `frontend/src/pages/fleet/VehicleInspectionPage.tsx`
       Verify: `npm run build` — no errors.

---

- [ ] 13. Retheme AdminDashboardPage.tsx.
       Contains KPI cards, tab nav with `bg-red-600` active, three dark tables.
       
       - Page sub-header `text-red-500` → `text-red-600` (keep red for admin identity)
       - Page heading `text-white` → `text-slate-900`; sub `text-slate-400` → `text-slate-500`
       - KPI cards: `bg-slate-900/60 border-slate-800` → `bg-white border-blue-200 shadow-sm`; values `text-white` → `text-slate-900`; amber alert count: keep `text-amber-400`; sub `text-slate-500` → `text-slate-400`
       - Tab buttons active: `bg-red-600 text-white` → `bg-blue-600 text-white`
       - Tab buttons inactive: `text-slate-400 hover:text-white hover:bg-slate-800` → `text-slate-600 hover:text-slate-900 hover:bg-blue-50`
       - Tab border: `border-slate-800` → `border-blue-200`
       - All three tables (Fleets, Users, Audit): standard dark→light table conversion
       - User role badge `text-red-400` → `text-blue-700` (or keep red — admin role is semantically "elevated", implementer's call: keep `text-red-500` for authority)
       
       Files: `frontend/src/pages/admin/AdminDashboardPage.tsx`
       Verify: `npm run build` — no errors.

---

- [ ] 14. Light-touch fixes: AdminMapPage.tsx.
       Already mostly light-themed. Two dark spots remain:
       
       - SVG map container: `bg-slate-950 border-slate-800` → `bg-slate-800 border-slate-700` (keep dark for the map canvas — a dark map on a light page is standard and intentional; just ensure the outer wrapper stays light)
       - Map legend: `bg-slate-900/90 border-slate-800 text-slate-300 backdrop-blur` → `bg-slate-800/95 border-slate-700 text-slate-200 backdrop-blur` (dark map overlay — keep dark)
       - Selected detail card inner dark block: `bg-slate-900 text-white space-y-2` → `bg-blue-700 text-white` (shift graphite to blue)
       - Outer page padding/header: `text-graphite` → keep (already light)
       
       Files: `frontend/src/pages/admin/AdminMapPage.tsx`
       Verify: `npm run build` — no errors.

---

- [ ] 15. Retheme DriverPortalPage.tsx.
       All cards are dark slate. No tables, but has an offline queue indicator, vehicle card, trip form, and alerts list.
       
       - Wrapper: `max-w-2xl mx-auto space-y-6` — no bg change needed (inherits page bg from AppLayout)
       - Header: `text-white` → `text-slate-900`; Smartphone icon label `text-emerald-400` → keep
       - Online badge: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` → `bg-emerald-100 text-emerald-700 border-emerald-300`
       - Offline badge: `bg-amber-500/10 text-amber-400 border-amber-500/20` → `bg-amber-100 text-amber-700 border-amber-300`
       - Success/error message banners: convert `/10` transparencies to solid light equivalents (`bg-emerald-50`, `bg-red-50`)
       - Offline queue card: `bg-slate-900 border-amber-500/30` → `bg-amber-50 border-amber-300`; text `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; Sync button `bg-amber-500/20 text-amber-300 border-amber-500/40` → `bg-amber-100 text-amber-700 border-amber-300`
       - Assigned vehicle card: `bg-slate-900/70 border-slate-800` → `bg-white border-blue-200 shadow-sm`; section label `text-slate-400` → `text-slate-500`; vehicle number `text-white` → `text-slate-900`; vehicle sub `text-slate-400` → `text-slate-500`; inner grid: `border-slate-800` → `border-blue-100`; inner cells `bg-slate-950/60 border-slate-800/80` → `bg-blue-50 border-blue-200`; cell labels `text-slate-400` → `text-slate-500`; values `text-white` → `text-slate-900`
       - Active trip card: `bg-slate-900/70 border-purple-500/40` → `bg-white border-purple-400 shadow-sm`; status label `text-purple-400` → keep; ACTIVE badge `bg-purple-500/20 text-purple-300 border-purple-500/30` → `bg-purple-100 text-purple-700 border-purple-300`; route `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; trip form border `border-slate-800` → `border-slate-200`; odo input: dark→light; end trip button: `bg-red-600` → `bg-blue-600`
       - Start trip card: `bg-slate-900/70 border-slate-800` → `bg-white border-blue-200 shadow-sm`; form inputs: dark→light; labels `text-slate-300` → `text-slate-700`; Start journey button: `bg-emerald-600 hover:bg-emerald-700` → keep (green for go)
       - Alerts card: `bg-slate-900/70 border-slate-800` → `bg-white border-blue-200 shadow-sm`; title `text-white` → `text-slate-900`; empty `text-slate-500` → `text-slate-400`; alert item `bg-slate-950/60 border-slate-800` → `bg-amber-50 border-amber-200`; `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`; severity badge `bg-amber-500/20 text-amber-400` → `bg-amber-100 text-amber-700`
       
       Files: `frontend/src/pages/driver/DriverPortalPage.tsx`
       Verify: `npm run build` — no errors.

---

## TypeScript Implications

None. All changes are string replacements inside `className` props and inline style object literals (for Recharts tooltips). No interface, type, or prop shape is affected.

---

## Notes and Assumptions

1. **`bg-graphite` in Navbar** resolves to `#292D32` (defined in Tailwind config). The plan replaces it with `bg-white`. If any other component uses `bg-graphite`, apply the same replacement.
2. **`bordergray` and `secondary`** are not currently in tailwind.config.js, so they produce no output. Step 1 adds them. MyFleetsPage and AdminMapPage which use these tokens will then render correctly without any file edits to those pages beyond what step 12/14 already covers.
3. **`bg-slate-950` inside SVG map** (AdminMapPage) is intentionally left dark — map canvases are conventionally dark regardless of the surrounding UI theme.
4. **13-sheet featured card** in ReportsPage uses `bg-graphite`. The plan shifts it to `bg-blue-700` to maintain the "featured/hero" visual weight in a blue palette context.
5. **Red semantic status badges** (`CRITICAL`, `SCRAP`, `FAIL`, active alerts) are preserved. Only primary CTAs and nav elements change from red to blue.
6. **Recharts chart data lines** (green for THI, yellow for baseline, cyan for pressure, amber for thermal) are unchanged. Only the tooltip background shifts to dark blue so it remains readable over white chart backgrounds.

# Implementation Plan — JK Tyre THI Fleet Intelligence UI Redesign

## Critical constraints (restate)
1. ONLY modify files inside `c:/Users/vaisi/OneDrive/Desktop/jk-new/frontend/`.
2. Do NOT touch the backend.
3. Do NOT change TypeScript interfaces, API call URLs, response handling, authentication logic, routing, or business logic.
4. Do NOT add new npm packages.
5. Do NOT replace dynamic data with hardcoded values.
6. Do NOT remove any JSX elements or props — only change `className` attributes and occasionally wrap with a styled div.
7. Tailwind utility classes are the PRIMARY mechanism — avoid raw CSS except for the body gradient and CSS custom properties in `src/index.css`.
8. Shared components (sidebar, topbar, TyreCard) are updated ONCE so all pages benefit.
9. Every page listed must be updated. Do not skip pages.
10. Verification: `cd c:/Users/vaisi/OneDrive/Desktop/jk-new/frontend && npm run build` (= `tsc && vite build`). Fix ONLY errors the changes introduced.

## Build / test commands (from package.json)
- Build (TypeScript compile + Vite bundle): `npm run build`
- Dev: `npm run dev`
- No frontend test runner exists; verification is the build. There is no vitest/jest in this project.

## Colour tokens — add to `tailwind.config.js` (verbatim from brief)
Extend the existing `colors` object. PRESERVE all existing keys (`canvas`, `sidebar`, `brand.yellow/orange/dark`, `fleet`, `graphite`, `secondary`, `bordergray`, `softgrey`, `jk.*`). Add:
```js
brand: { gold: '#F7C928', yellow: '#FFD52A', 'warm-gold': '#D99B16', 'dark-gold': '#B8860B', orange: '#E8770E', dark: '#14161A' },
dark: { primary: '#101114', sidebar: '#101010', surface: '#1C1D20', panel: '#17191D', card: '#292318' },
cream: { DEFAULT: '#FFFDF5', 50: '#FFFDF5', 100: '#FFF5D9', 200: '#FFF3D5', 300: '#FFEDB8' },
gold: { border: '#E9D9A5', light: '#E9E0CE', subtle: '#FFF0B8' },
```
(`brand.orange`/`brand.dark` already exist — keep them; add the four new brand keys.)

## Universal className mapping (applies to every page — reference, don't re-derive)
These patterns repeat across all fleet pages. Apply consistently:

- **Page title** `text-... font-black text-slate-900` → `text-white` (titles sit on the dark gradient).
- **Page subtitle** `text-[#5B6068]` → `text-slate-300`.
- **Metric/stat card** `bg-white border border-slate-200 shadow-sm ... rounded-2xl` → `bg-cream border border-gold-border shadow-sm ... rounded-2xl`.
- **General content panel** `bg-white border border-slate-200 ... rounded-2xl` → `bg-cream border border-gold-border ... rounded-2xl` (cream cards float on dark bg).
- **Data table container** `bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm` → `bg-white border border-gold-light rounded-2xl overflow-hidden shadow-sm`.
- **Table header row** `border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50` → `border-b border-gold-light text-[#344054] font-semibold bg-cream-200`.
- **Table body** `text-slate-700` → `text-[#344054]`; `divide-slate-200` → `divide-gold-light`; row hover `hover:bg-slate-50` / `hover:bg-blue-50` → `hover:bg-[#FFF9E8]`.
- **Primary button** `bg-[#FFC800] hover:bg-[#e6b400] text-black` → `bg-brand-gold hover:bg-brand-warm-gold text-black`.
- **Secondary button (charcoal)** `bg-slate-900 hover:bg-slate-800 text-white` → `bg-dark-surface hover:bg-dark-card text-white` (keep yellow icons).
- **Secondary button (light)** `bg-slate-100 hover:bg-slate-200 text-slate-700` → `bg-cream border border-gold-light hover:bg-cream-100 text-[#344054]`.
- **Input / select** `bg-white border border-slate-200 ... focus:border-blue-500` → `bg-cream border border-gold-border ... focus:border-brand-gold`.
- **"View All →" / golden links** `text-blue-600 hover:text-blue-700` → `text-brand-gold hover:text-brand-warm-gold`.
- **Active filter tab** `bg-white text-slate-900 shadow-sm font-bold` → `bg-brand-gold text-black border border-gold-border font-bold`.
- **Inactive filter tab** `text-[#5B6068] ...` → `bg-cream text-slate-500 border border-transparent hover:text-slate-700`.
- **Status badges (solid, white text per brief)**:
  - HEALTHY / PASS / COMPLETED → `bg-emerald-500 text-white`
  - WARNING / MARGINAL → `bg-amber-500 text-white`
  - CRITICAL / FAIL / SCRAP → `bg-red-500 text-white`
  - ACTIVE (trip in-progress) → `bg-blue-500 text-white`
  - Lifecycle NEW → `bg-emerald-500 text-white`; REUSE → `bg-blue-500 text-white`; RETREAD → `bg-amber-500 text-white`; SCRAP → `bg-red-500 text-white`
  - (Badges were light-tinted `bg-emerald-100 text-emerald-700` etc. — make them solid with white text, keep `rounded` + small text size.)
- **Modal backdrop** `bg-slate-900/60` → keep `bg-black/70` (dark glass). Modal card `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`.
- **Icon accents**: keep icon components; coloured icon circles use `bg-cream-100 border border-gold-border` with status-coloured icon text.

## Ordered work

---

### Phase 1 — Global tokens & base styles

- [ ] 1. Add colour tokens to `tailwind.config.js`.
      Merge the four new colour groups (`brand.gold/yellow/warm-gold/dark-gold`, `dark.*`, `cream.*`, `gold.*`) into the existing `theme.extend.colors`. Preserve every existing key. No content/plugins change.
      Files: `frontend/tailwind.config.js`
      Verify: `cd frontend && npm run build` — build passes (Tailwind JIT resolves new tokens; unknown classes are silently skipped, so build will not fail on token names).

- [ ] 2. Update base styles in `src/index.css`.
      - Set `body` (and `html`) background to the dark warm gradient: `background: linear-gradient(125deg, #101114 0%, #292318 45%, #72510D 100%);` and `color: #E5E5E5;`.
      - Add CSS custom properties on `:root` for all brand colours: `--brand-gold`, `--brand-yellow`, `--brand-warm-gold`, `--dark-primary`, `--dark-sidebar`, `--dark-surface`, `--cream`, `--gold-border`, etc.
      - Add a subtle decorative overlay: a faint radial golden glow (`radial-gradient` at low opacity) and/or a very faint tyre-tread SVG `background-image` layered with low opacity, fixed to the body so the gradient is visible between cards.
      - Keep all existing `@tailwind` directives, scrollbar styles, and all `@keyframes` animations untouched.
      Files: `frontend/src/index.css`
      Verify: `npm run build` passes; `:root` and `body` rules are present.

### Phase 2 — Shared layout & navigation (update ONCE)

- [ ] 3. Update `AppLayout.tsx` wrapper so the dark gradient shows through.
      Change root div `bg-[#F4F3EF] text-[#14161A]` → `bg-transparent text-slate-200` (let body gradient show; default text light). Keep `min-h-screen flex flex-col`, `<Navbar/>`, flex row, and `<main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">` (main is transparent so gradient shows between cards). Do NOT change the FLEET_WORKSPACE_PATHS guard logic or Navigate.
      Files: `frontend/src/components/layout/AppLayout.tsx`
      Verify: `npm run build` passes.

- [ ] 4. Restyle `Sidebar.tsx` to pure-black sidebar with gold active pill.
      - `<aside>` `bg-[#14161A] border-r border-[#262A30]` → `bg-[#101010] border-r border-white/5`.
      - Inactive NavLink: `text-[#9AA0A6] ... hover:bg-[#20242B] hover:text-white` → `text-[#E5E5E5] hover:bg-white/5 hover:text-white`; icon `text-[#D4D4D4]`.
      - Active NavLink: `bg-[#FFC800] text-black font-bold shadow-sm` → `bg-brand-gold text-[#111111] font-bold shadow-sm` (gold pill, black text+icon, rounded-lg).
      - Back-to-My-Fleets button `text-[#9AA0A6] hover:bg-[#20242B]` → `text-slate-400 hover:bg-white/5 hover:text-white`.
      - Active fleet card: `bg-[#1E2228] border border-[#2D333B]` → `bg-[#17191D] border border-gold-border`; label `text-[#FFC800]` → `text-brand-gold`; fleet name `text-white` stays.
      - Section label `text-[#5B6068]` → `text-slate-500`.
      - Bottom info card: `bg-[#1A1D23] border border-[#262A30]` → `bg-[#17191D] border border-gold-border`; `text-[#80868B]` → `text-slate-400`; keep text.
      - Logo/markup structure unchanged. All `links`, `navigate`, role logic untouched.
      Files: `frontend/src/components/layout/Sidebar.tsx`
      Verify: `npm run build` passes.

- [ ] 5. Restyle `Navbar.tsx` to dark charcoal top bar with gold role badge.
      - `<header>` `bg-white border-b border-[#E2E0D8] shadow-sm` → `bg-[#1C1D20] border-b border-gold-border/40`.
      - Subtitle `text-[#5B6068]` → `text-slate-400`.
      - User name `text-slate-900` → `text-white`.
      - FLEET_MANAGER role badge `bg-[#14161A] text-white border border-slate-700` → `bg-brand-gold text-black rounded-full` (golden yellow bg, black text). SUPER_ADMIN badge keep blue; DRIVER keep emerald.
      - Fleet switcher link `text-blue-600 hover:text-blue-800` → `text-slate-300 hover:text-white`; `Building2` icon `text-slate-400` stays.
      - Left divider `border-l border-slate-200` → `border-l border-white/10`.
      - Logout button `text-slate-500 hover:text-slate-900 hover:bg-slate-100` → `text-slate-400 hover:text-white hover:bg-white/10`.
      - Dev-mode badge keep amber. Logo `<img>` unchanged.
      Files: `frontend/src/components/layout/Navbar.tsx`
      Verify: `npm run build` passes.

### Phase 3 — Shared reusable component

- [ ] 6. Restyle `TyreCard.tsx` (used by TyresPage).
      - Card root: replace the `border-2 ... border-emerald-400 / border-orange-400 / border-red-400` status-coloured border logic with a uniform gold border: `bg-cream border border-gold-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200` (keep the conditional border-t accent `border-t-2 border-t-emerald-400 / orange / red` for a thin top accent strip instead of full border).
      - Serial text `text-slate-900` → `text-[#344054]`; brand/model `text-slate-400` → `text-slate-500`.
      - Status badge (the `px-2 py-0.5 rounded ... bg-emerald-100 text-emerald-700` block) → solid `bg-emerald-500 text-white` / `bg-amber-500 text-white` / `bg-red-500 text-white`.
      - Lifecycle badge: NEW `bg-emerald-500 text-white`, REUSE `bg-blue-500 text-white`, RETREAD `bg-amber-500 text-white`, SCRAP `bg-red-500 text-white` (solid, white text).
      - Tyre image container `bg-slate-50` → `bg-cream-100`.
      - "View" Link `bg-blue-600 hover:bg-blue-700 text-white` → `bg-brand-gold hover:bg-brand-warm-gold text-black`.
      - Status dot/label colors stay (emerald/orange/red). Keep all props, `getTyreImage`, links.
      Files: `frontend/src/components/tyre/TyreCard.tsx`
      Verify: `npm run build` passes.

### Phase 4 — Redesign every page (className-only changes)

Apply the universal mapping above. For each file: preserve ALL JSX structure, API calls, state, hooks, event handlers, conditionals, routes. Only change `className` strings.

- [ ] 7. `DashboardPage.tsx` (PAGE 1 — Fleet Intelligence Overview).
      - Title `text-slate-900` → `text-white`; subtitle `text-[#5B6068]` → `text-slate-300`.
      - "View Fleet Vehicles" button → primary gold button mapping.
      - 4 KPI cards: each `bg-white border border-slate-200 shadow-sm p-5 rounded-2xl` → `bg-cream border border-gold-border shadow-sm p-5 rounded-2xl`; label `text-[#5B6068]`→`text-slate-500`, value `text-slate-900`→`text-[#344054]`, caption `text-[#5B6068]`→`text-slate-500`. Give each metric a distinct coloured icon circle: vehicles→`bg-blue-500/10 text-blue-500`, tyres→`bg-emerald-500/10 text-emerald-500`, trips→`bg-purple-500/10 text-purple-500`, alerts→status-coloured (red/orange/grey).
      - "1st Vehicle Fitment..." panel: `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`. "Depot Baseline Audit" badge `bg-slate-100 text-slate-700 border border-slate-200` → `bg-brand-gold text-black border border-gold-border`. Date badge → `bg-cream-100 text-[#344054] border border-gold-light`.
      - Header icon box `bg-slate-100 border border-slate-200 text-slate-800` → `bg-cream-100 border border-gold-light text-[#344054]`.
      - "3D Digital Twin" button → secondary light; "Full Inspection View" `bg-slate-900 hover:bg-slate-800 text-white` → charcoal `bg-dark-surface hover:bg-dark-card text-white` with `ClipboardCheck` icon `text-brand-gold`.
      - Vehicle spec strip: `bg-[#14161A] ... border border-slate-800` → `bg-[#17191D] border border-gold-border/30`; highlight values keep `text-white`, "65 Shore A" `text-emerald-400` stays, "1R Alignment" `text-[#E8770E]` stays; labels `text-slate-400` stay.
      - Fitted tyre registry table: container `bg-white` table → table mapping (vanilla header, hover `#FFF9E8`). "PASS" badge → solid `bg-emerald-500 text-white`. Wheel-position chip `bg-slate-100 border border-slate-200` → `bg-cream-100 border border-gold-light`. "Alignment done" badge → `bg-amber-500/10 text-amber-600 border border-amber-500/20`.
      - THI donut card + Operational Alerts card + Recent Trips table → cream cards with gold borders; "View All Alerts →" link → golden link mapping; table → table mapping; COMPLETED badge → `bg-emerald-500 text-white`, in-progress → `bg-amber-500 text-white`. Legend dot count boxes `bg-white border border-slate-200` → `bg-cream-50 border border-gold-light`.
      Files: `frontend/src/pages/fleet/DashboardPage.tsx`
      Verify: `npm run build` passes.

- [ ] 8. `MyFleetsPage.tsx` (PAGE 3 — My Authorized Fleets).
      - Title `text-slate-900`→`text-white`; subtitle `text-[#5B6068]`→`text-slate-300`; "Fleet Portfolio" badge `bg-slate-100 text-slate-700 border border-slate-200` → `bg-cream-100 text-[#344054] border border-gold-light`.
      - Search input → input mapping (cream bg, gold focus). Status select → input mapping. Refresh button → secondary light. "Add Fleet" button → primary gold.
      - Fleet cards: `bg-white rounded-2xl border ... border-bordergray ring-2 ring-fleet/30` → `bg-cream rounded-2xl border border-gold-border ... ring-2 ring-brand-gold/30` (active); inactive `border-bordergray` → `border-gold-light`. Icon box `bg-slate-100 border border-slate-200` → `bg-cream-100 border border-gold-light`. "Active Selection" badge `bg-[#14161A] text-white` → `bg-brand-gold text-black`. ACTIVE status → `bg-emerald-500 text-white`.
      - Metrics mini-cells `bg-white border border-bordergray/80` → `bg-cream-50 border border-gold-light`; values `text-slate-900`→`text-[#344054]`.
      - "Manage/Open Fleet" button `bg-[#14161A] hover:bg-black text-white` → `bg-dark-surface hover:bg-dark-card text-white` with `ArrowRight` `text-brand-gold` on hover (keep).
      - Empty state card → cream card; "Add First Fleet" `bg-yellow-400` → `bg-brand-gold`.
      - Add Fleet modal: backdrop → `bg-black/70`; card `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`; header `bg-slate-50`→`bg-cream-100`; form inputs `bg-slate-50 border border-slate-200`→`bg-cream-50 border border-gold-border focus:border-brand-gold`; "Register Fleet" button → primary gold; checkbox accent yellow. Keep all form state/handlers.
      Files: `frontend/src/pages/fleet/MyFleetsPage.tsx`
      Verify: `npm run build` passes.

- [ ] 9. `VehiclesPage.tsx` (PAGE 4 — Fleet Vehicles).
      - Title/subtitle → white/light. "Manage / Add Fleet" `bg-slate-100`→secondary light; "+ Add Vehicle" → primary gold.
      - THI section panel `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`. Filter tabs (All/Critical/Warning/Healthy): active `bg-white ... shadow-sm font-bold` → `bg-brand-gold text-black`; inactive → cream/slate. "Critical Priority Weighted" badge → `bg-cream-100 text-slate-600 border border-gold-light`.
      - 4 THI metric cards `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-border`; status pills → solid badges; progress bar colors stay.
      - Empty-state card → cream card; "Add First Vehicle" → primary gold.
      - Vehicles table → table mapping (vanilla header `bg-cream-200 text-[#344054]`, hover `#FFF9E8`). THI status badge → solid. Status badge → `bg-emerald-500 text-white`. Action buttons: "Fit Tyres" → primary gold; "Details"/"3D View"/"2D Inspection"/"Trips" → secondary light (`bg-cream border border-gold-light`), keep coloured icons.
      - Add Vehicle modal → cream card + cream inputs + gold focus + primary gold submit. Keep all mutation logic.
      Files: `frontend/src/pages/fleet/VehiclesPage.tsx`
      Verify: `npm run build` passes.

- [ ] 10. `TyresPage.tsx` (PAGE 5 — Tyre Lifecycle Management).
       - Title `text-slate-900`→`text-white`; subtitle→`text-slate-300`.
       - 3 summary cards: `bg-white border border-slate-200 border-t-2 border-t-emerald-400` → `bg-cream border border-gold-border border-t-2 border-t-emerald-400` (keep coloured top accent). Warning card top accent `border-t-[#E8770E]` stays; Critical `border-t-red-400` stays. Values `text-slate-900`→`text-[#344054]`.
       - Search input → input mapping. Health filter pills: active per-status (`bg-emerald-100...` etc.) → solid `bg-emerald-500 text-white` / `bg-amber-500 text-white` / `bg-red-500 text-white`; "All" active `bg-blue-600 text-white` → `bg-brand-gold text-black border border-gold-border`; inactive `bg-white border border-slate-200 text-slate-600` → `bg-cream text-slate-500 border border-gold-light`.
       - Status dropdown → input mapping. Loading/empty states `text-slate-400`→`text-slate-400` (fine on dark).
       Files: `frontend/src/pages/fleet/TyresPage.tsx`
       Verify: `npm run build` passes.

- [ ] 11. `TripsPage.tsx` (PAGE 6 — Fleet Trips & Driving Score).
       - Title/subtitle → white/light. "Refresh" button `bg-white border border-slate-200 text-[#5B6068]` → charcoal secondary `bg-dark-surface border border-white/10 text-white` with `RefreshCw` `text-brand-gold`.
       - Vehicle-filter banner `bg-slate-100 border border-slate-200` → `bg-cream border border-gold-border`; "View All Vehicles" button → secondary light.
       - Filter bar card `bg-white border border-slate-200 rounded-2xl` → `bg-cream border border-gold-border rounded-2xl`; selects/inputs → input mapping; labels `text-slate-600`→`text-slate-500`; "Reset Filters" → golden link.
       - Trips table → table mapping. Trip score dot/badge: high score values golden → use `text-brand-gold` for the score number when ≥85. COMPLETED badge → `bg-emerald-500 text-white`; in-progress → `bg-amber-500 text-white`. "Breakdown" button → secondary light.
       - Trip breakdown modal: backdrop → `bg-black/70`; card → cream card; score box `bg-blue-50 border border-blue-200` → `bg-cream-100 border border-gold-light`; component rows `bg-blue-50 border border-blue-200` → `bg-cream-100 border border-gold-light`; explanation box `bg-slate-100` → `bg-cream-50`.
       Files: `frontend/src/pages/fleet/TripsPage.tsx`
       Verify: `npm run build` passes.

- [ ] 12. `InspectionsPage.tsx` (PAGE 7 — Depot Tyre Inspections).
       - Title/subtitle → white/light. "Log Physical Inspection" button → primary gold.
       - Inspections table → table mapping (vanilla header, hover `#FFF9E8`). NSD value `font-bold text-slate-900`→`text-[#344054]`. Result badges via `getResultBadge`: PASS→`bg-emerald-500 text-white`, WARNING→`bg-amber-500 text-white`, FAIL→`bg-red-500 text-white`, FURTHER_ASSESSMENT→`bg-purple-500 text-white`. Lifecycle badges via `getLifecycleBadge`: NEW→green, REUSE→blue, RETREAD→amber, SCRAP→red (solid). Visual condition badge NORMAL→`bg-emerald-500 text-white`, else→`bg-amber-500 text-white`. Photo "Attached" link → golden link.
       - Modal: backdrop → `bg-black/70`; card `bg-white border border-blue-200` → `bg-cream border border-gold-border`; inputs → input mapping; lifecycle decision box `border border-slate-200 rounded-xl` → `border border-gold-light rounded-xl`; SCRAP warning `bg-red-50 border border-red-200` → `bg-red-500/10 border border-red-500/30`; "Record Inspection" button `bg-blue-600` → primary gold `bg-brand-gold hover:bg-brand-warm-gold text-black`. Keep all mutation/form logic.
       Files: `frontend/src/pages/fleet/InspectionsPage.tsx`
       Verify: `npm run build` passes.

- [ ] 13. `AlertsPage.tsx` (PAGE 8 — Operational Alerts Center).
       - Title/subtitle → white/light. Status/severity selects → input mapping.
       - Alerts table → table mapping. Alert code badge: CRITICAL→`bg-red-500 text-white`, WARNING→`bg-amber-500 text-white`, else→`bg-blue-500 text-white`. Status badge: ACTIVE→`bg-red-500 text-white`, ACKNOWLEDGED→`bg-amber-500 text-white`, RESOLVED→`bg-slate-500 text-white`. "Action:" text `text-blue-600` → golden link `text-brand-gold`. Resolved note `bg-emerald-50 border border-emerald-200` → `bg-emerald-500/10 border border-emerald-500/30`.
       - "Acknowledge" button `bg-amber-100 ... text-amber-700 border border-amber-300` → charcoal `bg-dark-surface text-white border border-white/10 hover:bg-dark-card`. "Resolve" button `bg-emerald-600` → primary gold `bg-brand-gold text-black hover:bg-brand-warm-gold`. "Closed" check `text-emerald-700` → `text-emerald-400`.
       - Resolve modal: backdrop → `bg-black/70`; card → cream card; textarea → input mapping; "Cancel" → secondary light; "Mark Alert Resolved" `bg-emerald-600` → primary gold. Keep mutation logic.
       Files: `frontend/src/pages/fleet/AlertsPage.tsx`
       Verify: `npm run build` passes.

- [ ] 14. `TrendsPage.tsx` (PAGE 9 — Fleet Health Trend Analysis).
       - Title/subtitle → white/light. Vehicle selector box + time-window pill group: `bg-white border border-slate-200` → `bg-cream border border-gold-border`; active day button `bg-[#14161A] text-white` → `bg-brand-gold text-black`; inactive `text-[#5B6068]` → `text-slate-500`.
       - "Benchmark Reference" banner `bg-slate-50 border border-slate-200` → dark panel `bg-[#17191D] border border-gold-border text-slate-300` with title `text-white`; body `text-slate-400`.
       - All chart cards `bg-white border border-slate-200 p-6 rounded-2xl` → `bg-cream border border-gold-border p-6 rounded-2xl`. Chart titles `text-slate-900`→`text-[#344054]`. Keep Recharts config but restyle: THI line keep `#10b981`; ideal baseline dashed keep grey; (brief mentions gold reference line — leave the observed THI as emerald and add a gold note is optional). Tooltip `contentStyle` backgrounds → `#FFFDF5` with `borderColor:#E9D9A5`.
       - ML evaluation card `bg-white border border-slate-200 p-6 rounded-2xl` → `bg-cream border border-gold-border`. "Held-Out Tabular Evaluation" badge `bg-purple-100 text-purple-700 border border-purple-300` → `bg-purple-500/10 text-purple-400 border border-purple-500/30`. Metric sub-boxes `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-light`; metric values `text-slate-900`→`text-brand-gold` (gold metric values). Interactive form `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-light`; "Predict Wear" button → primary gold; prediction text `text-purple-700` → `text-brand-gold`.
       Files: `frontend/src/pages/fleet/TrendsPage.tsx`
       Verify: `npm run build` passes.

- [ ] 15. `ComparisonPage.tsx` (PAGE 10 — Cross-Vehicle Fleet Comparison).
       - Title/subtitle → white/light.
       - Selection drawer card `bg-white border border-slate-200 p-5 rounded-2xl` → `bg-cream border border-gold-border p-5 rounded-2xl`. Selected-count badge: valid→`bg-emerald-500 text-white`, warn→`bg-amber-500 text-white`. Search input → input mapping.
       - Warning box `bg-[#FFF4EB] border border-[#FCD5B5]` → `bg-amber-500/10 border border-amber-500/30 text-amber-400`.
       - Vehicle chips: selected `bg-slate-900 border-slate-900 text-white` → `bg-brand-gold border-brand-gold text-black` with `CheckCircle2` `text-black`; unselected `bg-white border-slate-200 text-slate-600` → `bg-cream border border-gold-light text-slate-500`; at-limit disabled → `bg-cream-50 border border-gold-light text-slate-400`.
       - Bar chart card → cream card; bar fills keep (`#10b981` observed, grey target — brief wants yellow/gold bars + red dashed target; change observed bar `fill` to `#F7C928` and ideal to a red dashed reference is optional — minimum: keep but restyle card). Keep Recharts logic.
       - Comparison table → table mapping. THI pill badges → solid (green/amber/red). Alert count badge → `bg-red-500 text-white`. "Inspect"/"Details" buttons → secondary light.
       Files: `frontend/src/pages/fleet/ComparisonPage.tsx`
       Verify: `npm run build` passes.

- [ ] 16. `ReportsPage.tsx` (PAGE 11 — Reports & Exports).
       - Title/subtitle → white/light. "Download 13-Sheet Excel" button → primary gold.
       - Disclaimer card `bg-white border border-slate-200` → `bg-cream border border-gold-border`.
       - Featured dataset card `bg-[#14161A] border border-[#262A30]` → `bg-[#17191D] border border-gold-border`; "13 Sheets Included" badge `bg-[#1E2228] text-slate-200 border border-slate-700` → `bg-cream-100 text-[#344054] border border-gold-light`; sheet pills `bg-[#1E2228] text-slate-300 border border-slate-800` → `bg-cream-50 text-slate-400 border border-gold-light`.
       - Section heading `text-slate-900`→`text-white`. CSV export cards `bg-white border border-slate-200 rounded-2xl` → `bg-cream border border-gold-border rounded-2xl`; label `text-slate-900`→`text-[#344054]`; desc `text-slate-500`→`text-slate-500`; download buttons `bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200` → primary gold `bg-brand-gold hover:bg-brand-warm-gold text-black`.
       - 3 overview cards (Healthy/Warning/Critical) → cream cards with gold borders; metric values `text-slate-900`→`text-[#344054]`; keep emerald/amber/red icon+label accents.
       Files: `frontend/src/pages/fleet/ReportsPage.tsx`
       Verify: `npm run build` passes.

- [ ] 17. `FitmentPage.tsx` (Tyre Fitment page).
       - Title/subtitle → white/light. Apply universal mapping to all cards (`bg-white border border-slate-200` → cream/gold), tables (vanilla header), badges (`getLifecycleBadge`/`getTHIBadge` → solid white-text badges), buttons (primary gold / charcoal / secondary light), and modals (cream card + cream inputs + gold focus + primary gold submit). Keep all fitment state, mutations, query logic, and the `PositionData` interface untouched.
       Files: `frontend/src/pages/fleet/FitmentPage.tsx`
       Verify: `npm run build` passes.

- [ ] 18. `VehicleDetailPage.tsx`, `Vehicle3DPage.tsx`, `VehicleInspectionPage.tsx`.
       - Apply universal mapping to all cards, tables, badges, buttons, modals, and page titles on these vehicle detail pages. Vehicle spec strips → dark `#17191D` panel. NSD progress bars → keep status colours. "3D View"/"Inspection"/"Trip" action buttons → secondary light / primary gold per context. Keep all useParams queries, 3D viewer components, and inspection logic untouched.
       Files: `frontend/src/pages/fleet/VehicleDetailPage.tsx`, `frontend/src/pages/fleet/Vehicle3DPage.tsx`, `frontend/src/pages/fleet/VehicleInspectionPage.tsx`
       Verify: `npm run build` passes.

- [ ] 19. `TyreDetailPage.tsx`.
       - Apply universal mapping. Back link `text-blue-600`→golden link. Lifecycle history badges via `getLifecycleBadgeClasses` → solid white-text badges. Cards → cream/gold. Tyre image container `bg-slate-50`→`bg-cream-100`. Keep all useParams queries and lifecycle-history fetch logic.
       Files: `frontend/src/pages/fleet/TyreDetailPage.tsx`
       Verify: `npm run build` passes.

- [ ] 20. `LoginPage.tsx` (PAGE 14).
       - LEFT panel: keep hero image, overlay gradient, golden particles, scanning line, word-drop animations, logo — only ensure yellow accents use `text-brand-gold` and `bg-brand-gold` instead of `text-yellow-400`/`bg-yellow-500` (cosmetic consistency; preserve all framer-motion). 
       - RIGHT panel: canvas `bg-[#F4F3EF]` → keep dark gradient (it inherits body) OR set `bg-transparent`; back link `text-[#5B6068]`→`text-slate-300`. Card `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`. "Quick Demo" pills `bg-white ... border border-slate-200/60` → cream pills `bg-cream-50 border border-gold-light`. Inputs `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-border focus:border-brand-gold`. "Sign in" button `bg-[#FFC800]` → `bg-brand-gold hover:bg-brand-warm-gold`. Error banner keep red. Register link `text-slate-900`→`text-brand-gold`. Keep all auth/handlers.
       Files: `frontend/src/pages/public/LoginPage.tsx`
       Verify: `npm run build` passes.

- [ ] 21. `RegisterPage.tsx` (PAGE 15).
       - LEFT panel: keep tyre video + gradient overlay + logo; yellow accents → `text-brand-gold`. 
       - RIGHT panel canvas `bg-[#F4F3EF]` → transparent (body gradient). Card `bg-white border border-slate-200 rounded-3xl` → `bg-cream border border-gold-border rounded-3xl`. Role switcher tabs: active `bg-white text-slate-900 shadow-sm border border-slate-200` → `bg-brand-gold text-black border border-gold-border`; inactive → `bg-cream text-slate-500`. Inputs (`inp()` helper) `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-border focus:border-brand-gold`. Submit button → primary gold. Success modal: backdrop → `bg-black/70`; card → cream; login-ID box `bg-slate-50 border-2 border-slate-200` → `bg-cream-100 border-2 border-gold-border`; "Copy Login ID" button → primary gold; "Proceed" button → primary gold. Keep all registration logic.
       Files: `frontend/src/pages/public/RegisterPage.tsx`
       Verify: `npm run build` passes.

- [ ] 22. `DriverPortalPage.tsx` (PAGE 13 — Driver portal).
       - Title `text-slate-900`→`text-white`; "Driver Mobile Portal" label `text-[#5B6068]`→`text-slate-400`. Online badge → `bg-emerald-500 text-white`; Offline badge → `bg-amber-500 text-white`.
       - All cards `bg-white border border-slate-200 p-6 rounded-2xl` → `bg-cream border border-gold-border p-6 rounded-2xl`. Info sub-cells `bg-slate-50 border border-slate-200` → `bg-cream-50 border border-gold-light`. "ACTIVE" badge `bg-slate-100 text-slate-800` → `bg-blue-500 text-white`.
       - Trip start/end buttons `bg-[#FFC800]` → primary gold. Offline queue box `bg-[#FFF4EB] border border-[#FCD5B5]` → `bg-amber-500/10 border border-amber-500/30 text-amber-400`; "Sync Now" → secondary light. Alert severity badges → solid. Keep all online/offline + queue + trip logic.
       Files: `frontend/src/pages/driver/DriverPortalPage.tsx`
       Verify: `npm run build` passes.

- [ ] 23. `LandingPage.tsx`.
       - Apply dark gradient + gold accents consistently (it already uses dark hero styling). Ensure primary CTAs use `bg-brand-gold` and links use `text-brand-gold` instead of `#FFC800`/`yellow-400` literals. Keep all markup/animations.
       Files: `frontend/src/pages/public/LandingPage.tsx`
       Verify: `npm run build` passes.

- [ ] 24. Admin pages: `AdminDashboardPage.tsx`, `AdminMapPage.tsx`, `OEMFleetVaultPage.tsx` (PAGE 12).
       - AdminDashboardPage: title/subtitle → white/light. KPI cards → cream/gold. Tab buttons active `bg-[#14161A] text-white` → `bg-brand-gold text-black`; inactive → cream/slate. "Add Fleet" button → primary gold. All 3 tables (Fleets/Users/Audit) → table mapping. Status badges → solid. Add Fleet modal → cream card + cream inputs + primary gold submit. Keep all admin queries/mutations.
       - AdminMapPage & OEMFleetVaultPage: apply universal mapping to cards, tables, badges, buttons. Keep all map/SVG/vault logic.
       Files: `frontend/src/pages/admin/AdminDashboardPage.tsx`, `frontend/src/pages/admin/AdminMapPage.tsx`, `frontend/src/pages/admin/OEMFleetVaultPage.tsx`
       Verify: `npm run build` passes.

### Phase 5 — Verify

- [ ] 25. Final build verification.
      Run `cd c:/Users/vaisi/OneDrive/Desktop/jk-new/frontend && npm run build`. Fix ONLY TypeScript/build errors introduced by the changes (e.g. a className string accidentally breaking JSX, a typo in a template literal). Do NOT fix pre-existing unrelated errors unless they block the build. Confirm the production bundle is produced.
      Verify: `npm run build` exits 0 and emits `dist/` output.

## Notes
- The `TyreHealthy.tsx`/`TyreWarning.tsx`/`TyreCritical.tsx` are SVG image components — do NOT restyle them; they are the preserved tyre images.
- The `3d/` and `inspection/` viewer components render canvases/SVGs — leave their internals; only restyle surrounding chrome if those files contain layout wrappers with Tailwind classes.
- `store/authStore.ts`, `services/api.ts`, `services/offlineQueue.ts`, `queryClient.ts` contain NO className styling — do not modify.
- No tests exist to run; the `npm run build` (tsc + vite build) is the verification gate.

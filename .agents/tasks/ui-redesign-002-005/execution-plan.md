# Execution Plan — UI Redesign FEATs 002-005 (className-only)

## Context
- Branch: `rounak`. FEAT-001 (foundation: Tailwind tokens, dark warm gradient body, AppLayout/Sidebar/Navbar, TyreCard) is already committed.
- Scope of this manifest: theming ALL remaining pages grouped into FEATs 002-005, via className-only changes.
- This manifest is the single source of truth for which files exist. Per-file className mappings are NOT duplicated here — they are sourced from `c:\Users\vaisi\OneDrive\Desktop\jk-new\.agents\tasks\plan.md` (item numbers referenced in the "scope" column). Do not re-derive the universal mapping; read plan.md.
- Constraint reminder: className attributes only; do not change TS interfaces, API URLs, auth, routing, state, or remove JSX elements. Do not add npm packages. Do not touch the backend.
- Verification gate (project has no test runner): `cd c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend && npm run build` (= `tsc && vite build`). Fix only build errors the changes introduce.

Status legend: EXISTS = file present on disk and in scope. MISSING = file listed but not found on disk.

---

## FEAT-002 — Fleet Intelligence Overview (1 file)

| File (absolute path) | Status | Theming scope (per plan.md) |
|---|---|---|
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\DashboardPage.tsx` | EXISTS | plan.md #7: titles→white/light; 4 KPI cards→cream/gold with coloured icon circles; 1st-Vehicle-Fitment panel→cream/gold + gold audit badge; vehicle spec strip→dark `#17191D`; fitted-tyre registry table→table mapping + solid PASS badge + wheel-position chips cream; THI donut + Operational Alerts + Recent Trips→cream cards; COMPLETED/in-progress→solid badges; "View All Alerts"→golden link. |

---

## FEAT-003 — Fleet Vehicles / Tyres / Trips / Fitment (4 files)

| File (absolute path) | Status | Theming scope (per plan.md) |
|---|---|---|
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\VehiclesPage.tsx` | EXISTS | plan.md #9: titles→white/light; THI section panel→cream/gold; filter tabs (active gold / inactive cream); 4 THI metric cards→cream-50/gold-border + solid status pills; vehicles table→table mapping + solid badges; "+ Add Vehicle"→primary gold, Details/3D/2D/Trips→secondary light; Add Vehicle modal→cream card + cream inputs + gold submit. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\TyresPage.tsx` | EXISTS | plan.md #10: titles→white/light; 3 summary cards→cream/gold (keep coloured top accents); search→input mapping; health filter pills→solid status badges, "All" active→gold, inactive→cream; status dropdown→input mapping. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\TripsPage.tsx` | EXISTS | plan.md #11: titles→white/light; Refresh→charcoal secondary w/ gold icon; vehicle-filter banner→cream/gold; filter bar card→cream/gold + inputs→mapping; trips table→table mapping + score≥85 gold text + solid COMPLETED/in-progress badges; trip breakdown modal→cream card + cream sub-boxes; backdrop→black/70. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\FitmentPage.tsx` | EXISTS | plan.md #17: universal mapping to all cards/tables/badges (`getLifecycleBadge`/`getTHIBadge`→solid white-text)/buttons (primary gold / charcoal / secondary light)/modals (cream card + cream inputs + gold focus + gold submit); keep all fitment state, mutations, query logic, and `PositionData` interface untouched. |

---

## FEAT-004 — Inspections / Alerts / Trends / Comparison (4 files)

| File (absolute path) | Status | Theming scope (per plan.md) |
|---|---|---|
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\InspectionsPage.tsx` | EXISTS | plan.md #12: titles→white/light; "Log Physical Inspection"→primary gold; inspections table→table mapping; result badges PASS/WARNING/FAIL/FURTHER_ASSESSMENT→solid emerald/amber/red/purple; lifecycle + visual-condition badges→solid; photo "Attached"→golden link; modal→cream card + cream inputs + gold submit, SCRAP warning→red-tinted. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\AlertsPage.tsx` | EXISTS | plan.md #13: titles→white/light; status/severity selects→input mapping; alerts table→table mapping; alert code badges→solid (red/amber/blue); status badges→solid (ACTIVE red / ACK amber / RESOLVED slate); "Action:"→golden link; Acknowledge→charcoal, Resolve→primary gold; resolve modal→cream card + textarea mapping + gold submit. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\TrendsPage.tsx` | EXISTS | plan.md #14: titles→white/light; vehicle selector + time-window pills→cream/gold (active gold / inactive slate); "Benchmark Reference" banner→dark `#17191D` panel; chart cards→cream/gold (titles→`#344054`, tooltip bg `#FFFDF5` w/ gold border); ML evaluation card→cream/gold, metric values→gold, predict form→cream-50, "Predict Wear"→primary gold, prediction text→gold. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\ComparisonPage.tsx` | EXISTS | plan.md #15: titles→white/light; selection drawer card→cream/gold; selected-count badge→solid; search→input mapping; warning box→amber-tinted; vehicle chips (selected gold/black, unselected cream, at-limit disabled); bar chart card→cream/gold; comparison table→table mapping + solid THI pills + alert badge red; Inspect/Details→secondary light. |

---

## FEAT-005 — Reports / Vehicle detail / Tyre detail / MyFleets / Auth / Driver / Admin (12 files)

| File (absolute path) | Status | Theming scope (per plan.md) |
|---|---|---|
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\ReportsPage.tsx` | EXISTS | plan.md #16: titles→white/light; "Download 13-Sheet Excel"→primary gold; disclaimer card→cream/gold; featured dataset card→dark `#17191D`/gold + sheet pills cream; section headings→white; CSV export cards→cream/gold + download buttons→primary gold; 3 overview cards→cream/gold (keep emerald/amber/red accents). |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\VehicleDetailPage.tsx` | EXISTS | plan.md #18: universal mapping to cards/tables/badges/buttons/modals; vehicle spec strips→dark `#17191D`; NSD progress bars keep status colours; action buttons→secondary light / primary gold per context; keep useParams/queries. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\Vehicle3DPage.tsx` | EXISTS | plan.md #18: universal mapping to surrounding chrome/cards/buttons; keep 3D viewer internals untouched. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\VehicleInspectionPage.tsx` | EXISTS | plan.md #18: universal mapping to cards/tables/badges/buttons/modals; keep inspection logic untouched. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\TyreDetailPage.tsx` | EXISTS | plan.md #19: universal mapping; back link→golden; lifecycle-history badges (`getLifecycleBadgeClasses`)→solid white-text; cards→cream/gold; tyre image container→cream-100; keep useParams + lifecycle-history fetch. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\fleet\MyFleetsPage.tsx` | EXISTS | plan.md #8: titles→white/light; "Fleet Portfolio" badge→cream-100; search/select/refresh→input/secondary mappings; "Add Fleet"→primary gold; fleet cards→cream/gold + `ring-brand-gold/30` active + "Active Selection"→gold/black; mini-metrics→cream-50; "Manage/Open Fleet"→charcoal w/ gold arrow; empty state→cream + "Add First Fleet"→gold; Add Fleet modal→cream card + cream inputs + gold submit, backdrop→black/70. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\public\LoginPage.tsx` | EXISTS | plan.md #20: LEFT hero keep (yellow accents→brand-gold); RIGHT canvas→transparent (body gradient); back link→slate-300; card→cream/gold; "Quick Demo" pills→cream-50; inputs→cream-50/gold focus; "Sign in"→primary gold; register link→gold; keep all auth/handlers. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\public\RegisterPage.tsx` | EXISTS | plan.md #21: LEFT keep tyre video (yellow accents→gold); RIGHT canvas→transparent; card→cream/gold; role switcher tabs (active gold/black, inactive cream); inputs (`inp()`)→cream-50/gold focus; submit→primary gold; success modal→cream + login-ID box→cream-100 + Copy/Proceed→primary gold; keep registration logic. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\driver\DriverPortalPage.tsx` | EXISTS (see Discrepancies — brief expected `fleet\`, actual `driver\`) | plan.md #22: title→white; "Driver Mobile Portal" label→slate-400; online/offline badges→solid emerald/amber; cards→cream/gold; info sub-cells→cream-50; "ACTIVE" badge→`bg-blue-500 text-white`; trip start/end→primary gold; offline queue box→amber-tinted; "Sync Now"→secondary light; alert severity→solid; keep online/offline + queue + trip logic. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\admin\AdminDashboardPage.tsx` | EXISTS (brief named it "AdminPage.tsx") | plan.md #24: title/subtitle→white/light; KPI cards→cream/gold; tab buttons (active gold / inactive cream); "Add Fleet"→primary gold; 3 tables (Fleets/Users/Audit)→table mapping; status badges→solid; Add Fleet modal→cream card + cream inputs + gold submit; keep admin queries/mutations. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\admin\AdminMapPage.tsx` | EXISTS | plan.md #24: universal mapping to cards/tables/badges/buttons; keep all map/SVG logic. |
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\admin\OEMFleetVaultPage.tsx` | EXISTS (brief named it "OEMVaultPage.tsx") | plan.md #24: universal mapping to cards/tables/badges/buttons; keep all vault logic. |

---

## Discovered extra pages

Pages found on disk under `frontend\src\pages` that are NOT part of the briefed FEAT-002-005 grouping:

| File (absolute path) | Status | Note |
|---|---|---|
| `c:\Users\vaisi\OneDrive\Desktop\jk-new\frontend\src\pages\public\LandingPage.tsx` | EXISTS | Covered by plan.md #23 (dark gradient + gold accents; CTAs→`bg-brand-gold`, links→`text-brand-gold`, replacing `#FFC800`/`yellow-400` literals; keep markup/animations). NOT in the brief's FEAT-002-005 list, so it is outside the briefed scope. Decision needed: theme it for consistency (plan.md already has instructions) or leave it. It is excluded from the FEAT-002-005 file count below. |

No other unlisted pages exist. The three admin pages (`AdminDashboardPage.tsx`, `AdminMapPage.tsx`, `OEMFleetVaultPage.tsx`) are anticipated by the brief's FEAT-005 clause "any admin pages ... anywhere under src\pages", so they are counted in FEAT-005 above, not here.

---

## Discrepancies vs plan.md

Coverage reconciliation (the core of this section):
- Files plan.md covers that are MISSING on disk: none. Every file plan.md references in items 7-24 EXISTS on disk.
- Pages on disk that plan.md does NOT cover: none. All 22 files under `frontend\src\pages` (including `LandingPage.tsx` via plan.md #23) are covered by plan.md.

Brief-vs-disk path/name clarifications (affect which FEAT row a file lands in; plan.md itself matches disk exactly, so these are brief-expectation notes, not plan.md defects):
- `DriverPortalPage.tsx`: brief FEAT-005 expected `src\pages\fleet\DriverPortalPage.tsx` (and noted "may not exist"). The file EXISTS, but at `src\pages\driver\DriverPortalPage.tsx` — the directory differs. plan.md #22 uses the correct `driver\` path.
- Admin filenames: brief named examples `AdminPage.tsx` and `OEMVaultPage.tsx`; the actual files (and plan.md #24) are `AdminDashboardPage.tsx` and `OEMFleetVaultPage.tsx`. `AdminMapPage.tsx` matches exactly. Same pages, different names (brief flagged them via "etc.").
- FEAT bucketing differs from plan.md's Phase 4 sequence: plan.md orders pages sequentially (e.g., `MyFleetsPage` is plan.md #8 but the brief places it in FEAT-005). The brief's FEAT grouping is the authoritative bucketing for this manifest; the per-file className instructions remain sourced from plan.md by item number. Only the bucketing differs, not the changes.

---

Total files to update: 21

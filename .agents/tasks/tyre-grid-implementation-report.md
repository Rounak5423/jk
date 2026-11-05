# Tyre Grid Redesign — Implementation Report

## 1. Files Created or Modified

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/components/tyre/TyreHealthy.tsx` | Created | Inline SVG React component — new/excellent condition tyre |
| `frontend/src/components/tyre/TyreWarning.tsx` | Created | Inline SVG React component — moderately worn tyre |
| `frontend/src/components/tyre/TyreCritical.tsx` | Created | Inline SVG React component — severely worn tyre |
| `frontend/src/components/tyre/TyreCard.tsx` | Created | Individual tyre card component for the grid |
| `frontend/src/pages/fleet/TyresPage.tsx` | Modified | Replaced table layout with responsive visual card grid |

---

## 2. SVG Asset Descriptions

### TyreHealthy.tsx
A commercial truck tyre in excellent/new condition viewed front-on (220×220 viewBox):
- **Body:** Dark radial gradient (`#2e2e2e` → `#111111`) simulating new black rubber.
- **Tread:** 4 deep circumferential groove rings (5px stroke, near-black `#0a0a0a`) with lighter rubber bands between them, creating strong visual contrast. 12 lateral sipes (radial cuts) evenly spaced at 30° intervals add further depth.
- **Glow:** A thin `#34d399` (emerald-400) stroke ring at the outer tyre edge, processed through `feGaussianBlur` + `feColorMatrix` filter for a soft green halo. Opacity 0.45. Only on the outermost circle — not the tyre body.
- **Rim:** 5-spoke steel wheel with radial gradient and hub cap.

### TyreWarning.tsx
A moderately worn tyre — visibly used, less defined tread:
- **Body:** Slightly lighter radial gradient (`#333333` → `#161616`) to suggest surface wear.
- **Tread:** 3 circumferential grooves (3.5px stroke, narrower and shallower than healthy). Only 8 lateral sipes at 45° intervals (fewer than healthy's 12). Less visual contrast between groove and rubber.
- **Glow:** Thin `#fbbf24` (amber-400) ring with the same glow filter approach. Opacity 0.45.

### TyreCritical.tsx
A severely worn tyre — nearly smooth, visually alarming:
- **Body:** Lighter gray gradient (`#3a3a3a` → `#1a1a1a`) simulating worn rubber.
- **Tread:** Only 2 very faint, low-opacity groove traces (opacity 0.6 and 0.45). A smooth-surface fill circle (`#2d2d2d`) covers the inner tread area — visually simulating a flat/smooth worn surface. Only 4 very faint lateral sipes at irregular angles, with low opacity (0.4).
- **Difference vs. Healthy:** Unmistakable — healthy has 4 deep grooves + 12 sipes; critical has 2 faint traces + 4 barely-visible marks + a smooth fill.
- **Glow:** Thin `#f87171` (red-400) ring. Opacity 0.50.

---

## 3. How Grid, Cards, Filters, Search, and Details Panel Work

### Grid
- Responsive CSS grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Each tyre gets its own `TyreCard` component.
- No fixed card count — renders all tyres returned by the filtered API response.

### TyreCard
Layout (top to bottom):
1. **Stencil/serial number** (monospace, bold, white) + **health badge** (top-right) on the same row
2. **Brand + Model + Size** (small, slate-400)
3. **Status-appropriate SVG tyre image** (centred, h-36 w-36)
4. **Status dot + label** (left) + **View → button** (right)
- Card has a coloured top border (`border-t-2`) matching health status.
- View button is a React Router `<Link to="/tyres/:id">` — navigates to the existing detail page.

### Summary Cards
- Healthy / Warning / Critical counts computed from `filteredTyres` (the client-side filtered array).
- Auto-update when health filter or search changes.

### Search
- Client-side substring match on `serial_number`, `model`, and `brand` (case-insensitive).
- No new API call.

### Status Filters (HEALTHY / WARNING / CRITICAL)
- Set `healthFilter` state → passed to `useQuery` → server-side API parameter `?health=`.
- Active filter button highlighted with status-appropriate colour.
- "All" button clears `healthFilter` → fetches all health states.

### Search + Filter Interaction
- Both work together: API filters by health status, then the returned array is further filtered client-side by `searchTerm`.
- Selecting "All" restores all tyres matching the current search string.

### Status Dropdown (FITTED / IN_INVENTORY / RETREADING / SCRAPPED)
- Retained as a secondary select dropdown (de-emphasized position).
- Sets `statusFilter` → server-side `?status=` parameter.

### Details Panel
- Per the implementation plan (Decision D2), clicking View navigates to the existing `/tyres/:id` route (`TyreDetailPage.tsx`), which already renders a comprehensive detail view with all fields. No duplicate slide-over drawer was built — this avoids redundant API calls and preserves the existing UX contract.

---

## 4. Health Status → Visual Mapping

| `thi_status` | SVG Component | Glow Colour | Badge Classes |
|---|---|---|---|
| `'HEALTHY'` | `TyreHealthy` | `#34d399` emerald-400 | `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` |
| `'WARNING'` | `TyreWarning` | `#fbbf24` amber-400 | `bg-amber-500/10 text-amber-400 border border-amber-500/20` |
| `'CRITICAL'` | `TyreCritical` | `#f87171` red-400 | `bg-red-500/10 text-red-400 border border-red-500/20` |
| `'UNKNOWN'` | `TyreCritical` (fallback) | `#f87171` red-400 | `bg-slate-500/10 text-slate-400 border border-slate-500/20` |

---

## 5. Protected Files — NOT Changed

The following files were NOT read (except types/index.ts which was read-only for type reference) and NOT modified:

- `frontend/src/store/authStore.ts` — **NOT modified**
- `frontend/src/services/api.ts` — **NOT modified**
- `frontend/src/App.tsx` — **NOT modified**
- `frontend/src/components/layout/Sidebar.tsx` — **NOT modified**
- `frontend/src/components/layout/AppLayout.tsx` — **NOT modified**
- `frontend/src/pages/fleet/TyreDetailPage.tsx` — **NOT modified**
- `frontend/src/types/index.ts` — **NOT modified** (read-only for type reference)
- `frontend/src/components/3d/TyreDetailsPanel.tsx` — **NOT modified**
- All `backend/` files — **NOT modified**
- `backend/.env` — **NOT read or modified**

---

## 6. Build Result

```
> tsc && vite build

vite v5.4.21 building for production...
✓ 3019 modules transformed.

dist/index.html                     0.86 kB │ gzip:   0.49 kB
dist/assets/index-Czdnv3ez.css     40.57 kB │ gzip:   7.37 kB
dist/assets/index-R2NFjLQ2.js   1,750.22 kB │ gzip: 469.81 kB

(!) Some chunks are larger than 500 kB after minification. Consider dynamic imports…

✓ built in 24.17s
```

**Zero TypeScript errors. Zero import errors. Zero missing file errors.**

The chunk size warning (`> 500 kB`) is pre-existing — caused by `three.js` (~1.5 MB) bundled elsewhere in the application. It is NOT caused by the new tyre components.

---

## 7. Test Results

**No test command found.** `package.json` has no `test` script and no test framework is configured for the frontend. Build verification via `tsc && vite build` is the only available automated check. ✓ Passed.

---

## 8. Data Fields — Availability

All fields used by `TyreCard` and `TyresPage` are present in the `Tyre` type from `frontend/src/types/index.ts`:

| Field Used | Available | Notes |
|---|---|---|
| `id` | ✓ | Used as `key` and in View link |
| `serial_number` | ✓ | Shown in card header |
| `brand` | ✓ | Shown in card subtitle |
| `model` | ✓ | Shown in card subtitle |
| `size` | ✓ | Shown in card subtitle |
| `thi_status` | ✓ | Controls SVG, badge, glow, top border |

Fields NOT used on the grid card (belong in detail page):
- `current_nsd`, `wear_percentage`, `total_km_run`, `current_thi`, `blueprint_nsd` — all available but intentionally omitted from card to keep it clean.
- `active_fitment`, `remaining_life_estimate`, `active_alerts`, `thi_history` — shown in `TyreDetailPage`.

---

## 9. Manual Browser Verification Required

1. **Tyre SVG rendering** — confirm the three tyre images (healthy/warning/critical) look visually distinct at card size (≈144×144 px) in a real browser.
2. **Green/amber/red glow rings** — SVG `feGaussianBlur` + `feColorMatrix` filter rendering varies slightly across browsers. Verify the glow appears on the outer ring and does NOT tint the tyre body.
3. **Responsive grid** — verify 3 cols on desktop, 2 on tablet, 1 on mobile by resizing the browser window.
4. **Search + filter combination** — enter a search term, then click a health filter; confirm both constraints apply simultaneously.
5. **Summary card counts** — confirm counts update when health filter or search changes.
6. **View button navigation** — confirm clicking View navigates to `/tyres/:id` and loads the detail page correctly.
7. **Empty states** — verify "No tyres found for this fleet." appears when fleet has zero tyres, and "No tyres match your search." appears when search yields no results.
8. **Dark theme consistency** — verify card, badge, and button colours match the application's dark slate theme.

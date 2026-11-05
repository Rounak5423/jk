# Fleet Owner Navigation — Investigation & Plan

**Workspace root:** `c:\Users\vaisi\OneDrive\Desktop\tyre-health-index\05_JKT (2)\05_JKT`  
**Scope:** Read-only. No files were modified.  
**Purpose:** Answer all six investigation sections and produce a minimal change plan for:
> FLEET_MANAGER login → `/my-fleets` → select fleet → `/dashboard`

---

## EXECUTIVE SUMMARY

**The required behaviour is 80% already built.** `MyFleetsPage`, the `/my-fleets` route, `setActiveFleet`, and the `X-Fleet-ID` header mechanism all exist and work correctly. The **one gap** is the post-login redirect: `LoginPage.tsx` currently sends every non-admin, non-driver user straight to `/dashboard`. It needs to send `FLEET_MANAGER` to `/my-fleets` instead.

Three secondary improvements are worth making at the same time so the experience is complete:
1. React Query cache keys on `DashboardPage` do not include `activeFleetId`, so switching fleets can serve stale data.
2. `ProtectedRoute` does not check role, letting any authenticated user reach `/admin` or `/driver` by URL.
3. The 401 response handler does not clear the fleet localStorage keys when a session expires.

None of these block the primary flow, but items 1 and 2 directly affect the fleet owner experience and should be fixed in the same pass.

---

## SECTION 1 — LOGIN REDIRECT

### Where does the app redirect after login?

**File:** `frontend/src/pages/public/LoginPage.tsx`  
**Function:** `handleSubmit` (async form submit handler)

```tsx
// LoginPage.tsx  lines 25–31
if (res.data.user.role === 'SUPER_ADMIN') {
  navigate('/admin');
} else if (res.data.user.role === 'DRIVER') {
  navigate('/driver');
} else {
  navigate('/dashboard');   // ← FLEET_MANAGER lands here today
}
```

### What is the exact route the fleet owner lands on today?

**`/dashboard`** → renders `DashboardPage` inside `AppLayout`.

### Is the redirect role-aware?

Yes, but only partially. It handles `SUPER_ADMIN` and `DRIVER` explicitly. `FLEET_MANAGER` falls through to the `else` branch and goes to `/dashboard`. There is no explicit `FLEET_MANAGER` case — any future role added to the system would also land on `/dashboard` by default.

### What needs to change?

The `else` branch must become a `FLEET_MANAGER`-explicit branch that navigates to `/my-fleets`:

```tsx
// Proposed change
if (res.data.user.role === 'SUPER_ADMIN') {
  navigate('/admin');
} else if (res.data.user.role === 'DRIVER') {
  navigate('/driver');
} else if (res.data.user.role === 'FLEET_MANAGER') {
  navigate('/my-fleets');   // ← NEW
} else {
  navigate('/dashboard');   // safety fallback for any other role
}
```

**Files that need changing:** `frontend/src/pages/public/LoginPage.tsx` only.  
**No other file needs to change** to implement the post-login redirect.

---

## SECTION 2 — MY FLEETS PAGE

### Does a 'My Fleets' page exist?

**Yes.** The page exists and is fully implemented.

**File path:** `frontend/src/pages/fleet/MyFleetsPage.tsx`  
**Route path:** `/my-fleets`  
**Route definition:** `App.tsx` line 52: `<Route path="/my-fleets" element={<MyFleetsPage />} />`

### What component renders the fleet list?

`MyFleetsPage` itself renders a responsive card grid. There is no sub-component — the entire page is self-contained.

### What data does it fetch and from which endpoint?

```tsx
// MyFleetsPage.tsx  lines 40–51
const res = await api.get('/fleets/my-fleets', { params });
setFleets(res.data.fleets || []);
```

**Backend endpoint:** `GET /api/v1/fleets/my-fleets`  
**Backend handler:** `backend/app/api/fleet.py` → `get_my_fleets()`

The endpoint returns all fleets authorized for the current user:
- `SUPER_ADMIN` → all fleets in the system
- `FLEET_MANAGER` → `user.authorized_fleets` (primary `fleet_id` + any `user_fleets` join table entries)
- Supports `search` and `status` query params

The `Fleet.to_dict()` response includes `vehicle_count`, `fitted_tyres_count`, `active_alerts_count`, and `health_summary` (healthy/warning/critical tyre counts) — all the information displayed in the fleet cards.

---

## SECTION 3 — FLEET SELECTION HANDLER

### Which function is called when a fleet is clicked?

```tsx
// MyFleetsPage.tsx  lines 53–56
const handleSelectFleet = (fleet: Fleet) => {
  setActiveFleet(fleet.id, fleet.name);
  navigate('/dashboard');
};
```

`handleSelectFleet` is bound to the "Open Fleet" / "Manage Current Fleet" `<button>` at the bottom of each fleet card (line ~217 in the rendered JSX).

### What does it do exactly?

1. **`setActiveFleet(fleet.id, fleet.name)`** — calls the Zustand action:

```ts
// authStore.ts  lines 55–66
setActiveFleet: (fleetId: string, fleetName?: string) => {
  localStorage.setItem('jk_active_fleet_id', fleetId);           // persists to localStorage
  if (fleetName) {
    localStorage.setItem('jk_active_fleet_name', fleetName);
  }
  set((state) => ({
    activeFleetId: fleetId,                                       // updates Zustand in-memory state
    activeFleetName: fleetName || state.activeFleetName,
    user: state.user
      ? { ...state.user, fleet_id: fleetId, fleet_name: fleetName || state.user.fleet_name }
      : null,
  }));
},
```

2. **`navigate('/dashboard')`** — React Router programmatic navigation to the fleet dashboard.

### Exact lines that set activeFleetId and activeFleetName:

| Action | File | Line | Mechanism |
|---|---|---|---|
| Write `jk_active_fleet_id` to localStorage | `authStore.ts` | 56 | `localStorage.setItem('jk_active_fleet_id', fleetId)` |
| Write `jk_active_fleet_name` to localStorage | `authStore.ts` | 58 | `localStorage.setItem('jk_active_fleet_name', fleetName)` |
| Update Zustand `activeFleetId` | `authStore.ts` | 60 | `set((state) => ({ activeFleetId: fleetId, ... }))` |
| Update Zustand `activeFleetName` | `authStore.ts` | 61 | `activeFleetName: fleetName || state.activeFleetName` |

### After selection, where does the app navigate to?

**`/dashboard`** → `DashboardPage` renders, all its API calls carry the new `X-Fleet-ID` header automatically via the Axios interceptor.

---

## SECTION 4 — ROUTER PATHS

### Every route in App.tsx, with component and guard

**File:** `frontend/src/App.tsx`

All authenticated routes share one outer guard: `<ProtectedRoute>` wrapping `<AppLayout />`. The guard checks `isAuthenticated` only — there is no per-route role check.

#### Public routes (no guard)

| Path | Component |
|---|---|
| `/` | `LandingPage` |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |

#### Authenticated routes (all behind `ProtectedRoute` → `AppLayout`)

| Path | Component | Role visible to |
|---|---|---|
| `/dashboard` | `DashboardPage` | All (intended: FLEET_MANAGER) |
| `/my-fleets` | `MyFleetsPage` | All (intended: FLEET_MANAGER) |
| `/vehicles` | `VehiclesPage` | All (intended: FLEET_MANAGER) |
| `/vehicles/:id` | `VehicleDetailPage` | All |
| `/vehicles/:id/inspections` | `VehicleInspectionPage` | All |
| `/tyres` | `TyresPage` | All |
| `/tyres/:id` | `TyreDetailPage` | All |
| `/trips` | `TripsPage` | All |
| `/inspections` | `InspectionsPage` | All |
| `/alerts` | `AlertsPage` | All |
| `/trends` | `TrendsPage` | All |
| `/comparison` | `ComparisonPage` | All |
| `/reports` | `ReportsPage` | All |
| `/admin` | `AdminDashboardPage` | All (no role guard) |
| `/admin/map` | `AdminMapPage` | All (no role guard) |
| `/admin/*` | `AdminDashboardPage` | All (wildcard catch-all) |
| `/driver` | `DriverPortalPage` | All (no role guard) |

**Catch-all:** `<Route path="*" element={<Navigate to="/" replace />} />` — unknown paths redirect to landing.

### Is there a dedicated fleet-owner subtree?

No. All roles share the same route tree. Role differentiation happens in:
1. The `navigate()` call in `LoginPage` (post-login destination)
2. The link set shown in `Sidebar.tsx` (UI-only, no enforcement)
3. Backend API authorization (`X-Fleet-ID` header, JWT role checks)

---

## SECTION 5 — CURRENT POST-LOGIN FLOW (step-by-step trace)

### Step 1 — User submits login form

**File:** `frontend/src/pages/public/LoginPage.tsx` → `handleSubmit(e: React.FormEvent)`  
Fires `POST /api/v1/auth/login` via `api.post('/auth/login', { email, password })`.

### Step 2 — On success: navigation call

Backend returns `{ token, user: { role, fleet_id, fleet_name, ... } }`.

```tsx
// LoginPage.tsx  lines 22–31
login(res.data.token, res.data.user);   // writes to Zustand + localStorage
// role check:
if (role === 'SUPER_ADMIN') navigate('/admin');
else if (role === 'DRIVER') navigate('/driver');
else navigate('/dashboard');            // FLEET_MANAGER lands here
```

`login()` synchronously writes `jk_token`, `jk_user`, and `jk_active_fleet_id` (the user's primary `fleet_id`) to localStorage before `navigate` fires.

### Step 3 — `/dashboard` renders which component?

React Router matches the path against the nested route tree in `App.tsx`. The outer `<ProtectedRoute>` element renders `<AppLayout />`. The inner `<Route path="/dashboard">` renders `<DashboardPage />` into `AppLayout`'s `<Outlet />`.

### Step 4 — Does that component check role or fleet context?

**`DashboardPage`**: No. It does not read `user.role` or `activeFleetId` from the store. It fires three React Query calls with no fleet scoping in the URL — fleet context is injected automatically by the Axios interceptor as `X-Fleet-ID`.

```tsx
// DashboardPage.tsx  lines 16–45
useQuery({ queryKey: ['fleet-stats'],   queryFn: () => api.get('/fleets/stats') });
useQuery({ queryKey: ['active-alerts'], queryFn: () => api.get('/alerts?status=ACTIVE') });
useQuery({ queryKey: ['recent-trips'],  queryFn: () => api.get('/trips') });
```

None of the query keys include `activeFleetId`. This means switching fleets (via `MyFleetsPage`) and returning to `/dashboard` may serve stale cached data for the previous fleet if the component has not been unmounted.

**`AppLayout`** + **`Sidebar`**: Sidebar reads `user.role` from the store and renders `fleetLinks` for `FLEET_MANAGER`. This is purely cosmetic — no navigation guard.

### Step 5 — What does the fleet owner see first after login today?

The fleet owner lands directly on **`/dashboard`** (`DashboardPage`). They see:
- A "Fleet Intelligence Overview" page with KPI cards (vehicle count, tyre count, active trips, alerts)
- A Tyre Health Index distribution pie chart
- An Active Operational Alerts list (last 5)
- A Recent Trips table (last 5)

All data is already scoped to their fleet via `X-Fleet-ID` (the user's `fleet_id` was written to `localStorage` by `login()` and the interceptor picks it up).

There is **no prompt to select a fleet first**. A user with access to multiple fleets arrives on the dashboard for their primary `fleet_id` without knowing they could switch to another fleet.

---

## SECTION 6 — GAP ANALYSIS

### Does the current flow send FLEET_MANAGER to My Fleets?

**No.** `LoginPage.tsx` sends `FLEET_MANAGER` directly to `/dashboard`. My Fleets is reachable only from the sidebar link.

### What route does it land on and what component renders?

`/dashboard` → `DashboardPage`.

### What is missing to implement the required flow?

The required flow is: **login → `/my-fleets` → select fleet → `/dashboard`**

| Gap | File | Lines | Severity |
|---|---|---|---|
| **GAP 1 (Primary):** `LoginPage` sends `FLEET_MANAGER` to `/dashboard`, not `/my-fleets` | `LoginPage.tsx` | 28–31 | **Blocking** |
| **GAP 2 (Secondary):** `DashboardPage` query keys don't include `activeFleetId` — stale data risk when switching fleets | `DashboardPage.tsx` | 16, 22, 29, 36 | High |
| **GAP 3 (Secondary):** `ProtectedRoute` has no role guard — any authenticated user can reach `/admin` or `/driver` by URL | `App.tsx` | 34–40 | High |
| **GAP 4 (Minor):** 401 handler doesn't clear `jk_active_fleet_id` / `jk_active_fleet_name` on session expiry | `api.ts` | 23–32 | Low |

### What files need changing?

A minimal implementation touching only what is necessary:

1. **`frontend/src/pages/public/LoginPage.tsx`** — add an explicit `FLEET_MANAGER` branch that navigates to `/my-fleets` instead of `/dashboard`. *(1 line change)*
2. **`frontend/src/pages/fleet/DashboardPage.tsx`** — add `activeFleetId` to all three React Query `queryKey` arrays so cache is fleet-scoped. *(3 line changes + 1 import)*
3. **`frontend/src/App.tsx`** — (optional but recommended) add role guard for `/admin` and `/driver` routes to prevent cross-role URL access.
4. **`frontend/src/services/api.ts`** — (optional, low priority) add fleet localStorage key cleanup to 401 handler.

No backend files need changing. No database changes. No new routes or components needed — `MyFleetsPage` and `/my-fleets` already exist and work.

---

## PROPOSED MINIMAL CHANGE PLAN

This plan achieves `FLEET_MANAGER login → /my-fleets → select fleet → /dashboard` using the existing `activeFleetId` / `X-Fleet-ID` mechanism. It does not touch admin or driver roles, UI design, database, or JWT settings.

---

### Change 1 — LoginPage.tsx: redirect FLEET_MANAGER to `/my-fleets`

**File:** `frontend/src/pages/public/LoginPage.tsx`  
**Lines:** 25–31  

**Current code:**
```tsx
if (res.data.user.role === 'SUPER_ADMIN') {
  navigate('/admin');
} else if (res.data.user.role === 'DRIVER') {
  navigate('/driver');
} else {
  navigate('/dashboard');
}
```

**Proposed code:**
```tsx
if (res.data.user.role === 'SUPER_ADMIN') {
  navigate('/admin');
} else if (res.data.user.role === 'DRIVER') {
  navigate('/driver');
} else if (res.data.user.role === 'FLEET_MANAGER') {
  navigate('/my-fleets');
} else {
  navigate('/dashboard');   // safety fallback for any future role
}
```

**Effect:** Fleet owners land on My Fleets immediately after login. Admin and Driver flows are completely unchanged.

---

### Change 2 — DashboardPage.tsx: add `activeFleetId` to query keys

**File:** `frontend/src/pages/fleet/DashboardPage.tsx`  
**Lines:** ~16, 22–30, 31–38, 39–46  

Add one import and update three `queryKey` arrays:

```tsx
// Add import at top of file
import { useAuthStore } from '../../store/authStore';

// Inside DashboardPage component, before the useQuery calls:
const { activeFleetId } = useAuthStore();

// Update each queryKey:
queryKey: ['fleet-stats', activeFleetId],
queryKey: ['active-alerts', activeFleetId],
queryKey: ['recent-trips', activeFleetId],
```

**Effect:** React Query treats each fleet as a separate cache entry. Switching fleets in `MyFleetsPage` then navigating to `/dashboard` always fetches fresh data for the newly selected fleet.

---

### Change 3 — App.tsx: add role guard for `/admin` and `/driver` routes

**File:** `frontend/src/App.tsx`  
**Lines:** 34–40 (ProtectedRoute definition) + route tree  

Add a `RoleRoute` component and wrap the admin and driver sub-trees:

```tsx
// Add after ProtectedRoute definition
const RoleRoute: React.FC<{ allowed: Role[]; children: React.ReactElement }> = ({ allowed, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowed.includes(user.role as Role)) {
    const fallback = user?.role === 'SUPER_ADMIN' ? '/admin'
      : user?.role === 'DRIVER' ? '/driver'
      : '/my-fleets';
    return <Navigate to={fallback} replace />;
  }
  return children;
};

// Also import Role type at top:
import { Role } from './types';
```

Then wrap the admin and driver routes:
```tsx
{/* Admin portals — SUPER_ADMIN only */}
<Route element={<RoleRoute allowed={['SUPER_ADMIN']}><AppLayout /></RoleRoute>}>
  <Route path="/admin" element={<AdminDashboardPage />} />
  <Route path="/admin/map" element={<AdminMapPage />} />
  <Route path="/admin/*" element={<AdminDashboardPage />} />
</Route>

{/* Driver portal — DRIVER only */}
<Route element={<RoleRoute allowed={['DRIVER']}><AppLayout /></RoleRoute>}>
  <Route path="/driver" element={<DriverPortalPage />} />
</Route>
```

**Effect:** A `FLEET_MANAGER` who types `/admin` in the address bar is redirected to `/my-fleets` instead of seeing the admin shell. A `DRIVER` who types `/dashboard` is redirected to `/driver`. Admin and driver portals are not affected for their own roles.

> **Important:** This change redirects role-cross URL access to `/my-fleets` (not `/dashboard`) so the fleet owner always goes through fleet selection first — consistent with the required behavior.

---

### Change 4 (Optional) — api.ts: clear fleet keys on 401

**File:** `frontend/src/services/api.ts`  
**Lines:** 23–32  

```ts
if (error.response?.status === 401) {
  localStorage.removeItem('jk_token');
  localStorage.removeItem('jk_user');
  localStorage.removeItem('jk_active_fleet_id');   // add
  localStorage.removeItem('jk_active_fleet_name'); // add
  if (!window.location.pathname.includes('/login') && ...) {
    window.location.href = '/login';
  }
}
```

**Effect:** Session expiry clears all auth state cleanly. The next user to log in starts with no stale fleet context.

---

## TEST PLAN

The following manual tests verify the required behavior without modifying tests that cover admin or driver flows:

### Test 1 — FLEET_MANAGER login lands on My Fleets

1. Open the app in a fresh browser tab (clear localStorage if needed).
2. Navigate to `/login`.
3. Sign in as `fleet.manager@translogistics.com` / `Fleet@12345`.
4. **Expected:** Browser URL becomes `/my-fleets`. Fleet cards are visible. Dashboard is NOT shown.

### Test 2 — Fleet selection navigates to Dashboard with correct context

1. On `/my-fleets`, click "Open Fleet" on any fleet card.
2. **Expected:** Browser URL becomes `/dashboard`. The Navbar subtitle shows the selected fleet's name. Dashboard KPIs reflect that fleet's data (vehicle count, alerts, etc.).

### Test 3 — Context persists when navigating between pages

1. After selecting a fleet and landing on `/dashboard`, click "Vehicles" in the sidebar.
2. Click "Dashboard" in the sidebar again.
3. **Expected:** Dashboard still shows the originally selected fleet. `X-Fleet-ID` header in DevTools Network tab still matches the selected fleet's ID.

### Test 4 — Fleet switch triggers a data refresh

1. On `/my-fleets`, select Fleet A. Navigate to `/dashboard`. Note the vehicle count.
2. Click "My Fleets" in the sidebar. Select Fleet B (a different fleet).
3. **Expected:** Dashboard re-fetches and shows Fleet B's data. The previous fleet's cached data is not shown.
   *(This test verifies Change 2 — `activeFleetId` in query keys.)*

### Test 5 — Admin and driver roles are unchanged

1. Sign in as `admin@jktyre.com` / `Admin@12345`.
2. **Expected:** URL becomes `/admin`. Admin dashboard loads normally.
3. Sign in as `driver1@translogistics.com` / `Driver@12345`.
4. **Expected:** URL becomes `/driver`. Driver portal loads normally.

### Test 6 — Role guard prevents cross-role URL access (Change 3)

1. Sign in as fleet owner. In the address bar, type `/admin`.
2. **Expected:** Redirected to `/my-fleets` (not shown the admin shell).
3. Sign in as admin. In the address bar, type `/driver`.
4. **Expected:** Redirected to `/admin`.

---

## COMPLETE FILE REFERENCE MAP

| File | Absolute Path | Role in Flow | Change Required |
|---|---|---|---|
| `LoginPage.tsx` | `frontend/src/pages/public/LoginPage.tsx` | Post-login role-based redirect. Currently sends FLEET_MANAGER to `/dashboard`. | **YES — Change 1** |
| `DashboardPage.tsx` | `frontend/src/pages/fleet/DashboardPage.tsx` | Fleet dashboard. Three React Query calls, all with static cache keys. | **YES — Change 2** |
| `App.tsx` | `frontend/src/App.tsx` | Route tree and `ProtectedRoute` guard (auth-only, no role check). | **YES — Change 3** |
| `api.ts` | `frontend/src/services/api.ts` | Axios interceptor: injects `X-Fleet-ID` header from localStorage. 401 handler. | Optional — Change 4 |
| `MyFleetsPage.tsx` | `frontend/src/pages/fleet/MyFleetsPage.tsx` | Fleet picker. Calls `setActiveFleet()` → `navigate('/dashboard')`. Fully functional, no change needed. | No change |
| `authStore.ts` | `frontend/src/store/authStore.ts` | Zustand store: `activeFleetId`, `setActiveFleet`, `login`, `logout`. No change needed. | No change |
| `Sidebar.tsx` | `frontend/src/components/layout/Sidebar.tsx` | Renders `fleetLinks` for FLEET_MANAGER. `/my-fleets` is already present in `fleetLinks`. | No change |
| `AppLayout.tsx` | `frontend/src/components/layout/AppLayout.tsx` | Shared layout shell. No change needed. | No change |
| `Navbar.tsx` | `frontend/src/components/layout/Navbar.tsx` | Displays `activeFleetName`. Works correctly today. | No change |
| `types/index.ts` | `frontend/src/types/index.ts` | `Role` type and `User` interface. Imported for RoleRoute guard. | No change |
| **Backend files** | `backend/app/api/auth.py`, `fleet.py` | Login and fleet-list endpoints. Already correct. | **No change** |

---

## SUMMARY OF WHAT EXISTS vs WHAT IS MISSING

| Capability | Status |
|---|---|
| `/my-fleets` route and `MyFleetsPage` component | ✅ Exists and works |
| Fleet list fetched from `GET /api/v1/fleets/my-fleets` | ✅ Exists and works |
| `setActiveFleet()` updates Zustand + localStorage | ✅ Exists and works |
| `X-Fleet-ID` header on every API call | ✅ Exists and works |
| Fleet selection navigates to `/dashboard` | ✅ Works — no change needed |
| Sidebar shows "My Fleets" link for FLEET_MANAGER | ✅ Already in `fleetLinks` |
| Post-login redirect for FLEET_MANAGER → `/my-fleets` | ❌ **Missing — only change needed** |
| Dashboard query keys are fleet-scoped (cache correctness) | ❌ Missing (secondary) |
| Role guard on `/admin` and `/driver` routes | ❌ Missing (secondary) |
| Fleet localStorage cleanup on 401 | ❌ Missing (minor) |

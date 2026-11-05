# Fleet Context Investigation Report

**Scope:** Read-only analysis of `frontend/src`. No files were modified.  
**Date:** 2025  
**Workspace:** `c:\Users\vaisi\OneDrive\Desktop\tyre-health-index\05_JKT (2)\05_JKT`

---

## Executive Summary

The selected fleet context (`activeFleetId`) is stored exclusively in Zustand (`authStore.ts`) and mirrored to `localStorage` under the key `jk_active_fleet_id`. It is **never placed in a URL parameter**. The Axios interceptor in `api.ts` reads `jk_active_fleet_id` directly from `localStorage` on every request and injects it as an `X-Fleet-ID` header — so the backend receives the fleet scope without any component needing to pass it as a prop or URL param.

Fleet selection happens on exactly one page (`MyFleetsPage`). Every other fleet page (Dashboard, Vehicles, Tyres, Trips, Alerts, etc.) never reads `activeFleetId` from the store or the URL — they delegate scoping entirely to the `X-Fleet-ID` header that the interceptor adds automatically. Context persists across navigation because Zustand is initialized from `localStorage` on module load and the interceptor reads from `localStorage` at request time, both of which survive React Router navigation.

The architecture is simple and coherent. There are three meaningful issues: (1) the `queryKey` arrays on the Dashboard do not include `activeFleetId`, so switching fleets may serve stale cached data until React Query's cache expires; (2) the `ProtectedRoute` does not check role, so any logged-in user can navigate to any route by URL; and (3) the 401 response handler does not clear `jk_active_fleet_id`, leaving a stale fleet ID in localStorage after a session expires.

---

## Question-by-Question Findings

---

### 1. Fleet Selection Flow

**Where the user selects a fleet:**

`frontend/src/pages/fleet/MyFleetsPage.tsx`

This is the only component that exposes a fleet switcher. It renders a card grid of all fleets authorized for the signed-in user and provides a button on each card.

**What happens when they select one:**

```tsx
// MyFleetsPage.tsx  lines 53-55
const handleSelectFleet = (fleet: Fleet) => {
  setActiveFleet(fleet.id, fleet.name);
  navigate('/dashboard');
};
```

`handleSelectFleet` is bound to the "Open Fleet" / "Manage Current Fleet" button on each fleet card. It calls `setActiveFleet` (from `useAuthStore`) and then imperatively navigates to `/dashboard`.

**Where the selection lives:**

The `setActiveFleet` action in `authStore.ts` writes to two places simultaneously:

```ts
// authStore.ts  lines 55-65
setActiveFleet: (fleetId: string, fleetName?: string) => {
  localStorage.setItem('jk_active_fleet_id', fleetId);        // ← localStorage
  if (fleetName) {
    localStorage.setItem('jk_active_fleet_name', fleetName);
  }
  set((state) => ({
    activeFleetId: fleetId,                                    // ← Zustand in-memory
    activeFleetName: fleetName || state.activeFleetName,
    user: state.user ? { ...state.user, fleet_id: fleetId, fleet_name: fleetName || state.user.fleet_name } : null,
  }));
},
```

**It is NOT in a URL param, NOT in a React Context (other than Zustand), and NOT in component props.**  
It lives in: (a) Zustand in-memory state, and (b) `localStorage` keys `jk_active_fleet_id` / `jk_active_fleet_name`.

---

### 2. Passing Fleet Context to the Dashboard

**How the dashboard knows which fleet is active:**

`DashboardPage` does not read `activeFleetId` at all. It does not import `useAuthStore` for fleet context. It fires three React Query calls with no explicit fleet scoping in the URL or query params:

```tsx
// DashboardPage.tsx  lines 22-45
const { data: stats } = useQuery<FleetStats>({
  queryKey: ['fleet-stats'],
  queryFn: async () => {
    const res = await api.get('/fleets/stats');   // no ?fleet_id= param
    return res.data;
  },
});

const { data: activeAlerts } = useQuery<Alert[]>({
  queryKey: ['active-alerts'],
  queryFn: async () => {
    const res = await api.get('/alerts?status=ACTIVE');  // no fleet param
    return res.data;
  },
});

const { data: recentTrips } = useQuery<Trip[]>({
  queryKey: ['recent-trips'],
  queryFn: async () => {
    const res = await api.get('/trips');          // no fleet param
    return res.data;
  },
});
```

**Fleet context reaches the backend entirely via the HTTP interceptor**, which fires for every `api.*` call:

```ts
// api.ts  lines 11-20
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeFleetId = localStorage.getItem('jk_active_fleet_id');
  if (activeFleetId) {
    config.headers['X-Fleet-ID'] = activeFleetId;
  }
  return config;
});
```

The backend reads `X-Fleet-ID` to scope every query to the correct fleet. The dashboard component itself is completely unaware of which fleet is active.

**Exact lines where the dashboard "reads" fleet context:** It doesn't — the interceptor handles it transparently. The dashboard has zero coupling to fleet selection.

---

### 3. Preserving Context During Navigation

**Does `activeFleetId` persist when navigating between sub-pages?**  
Yes, unconditionally. React Router navigation (clicking Sidebar links, or programmatic `navigate()`) replaces the URL and re-renders the matched component, but it does not unmount the Zustand store or clear `localStorage`. Both persistence layers survive client-side navigation.

**How:**

1. **Zustand in-memory state** — the store module is instantiated once and lives for the lifetime of the browser tab. React Router navigation does not re-import it.
2. **`localStorage` mirror** — the interceptor reads `jk_active_fleet_id` from `localStorage` on every outgoing request, not from React state. Even if the Zustand store were somehow reset, `localStorage` would still supply the correct fleet ID.
3. **Store hydration on load** — `authStore.ts` initializes from `localStorage` at module import time (lines 17-26), before any component mounts:
   ```ts
   const savedFleetId = localStorage.getItem('jk_active_fleet_id')
     || (parsedUser ? parsedUser.fleet_id : null);
   ```

**Is there any navigation that loses fleet context?**  
No navigation path resets `activeFleetId` except `logout()`:

```ts
// authStore.ts  lines 47-53
logout: () => {
  localStorage.removeItem('jk_token');
  localStorage.removeItem('jk_user');
  localStorage.removeItem('jk_active_fleet_id');
  localStorage.removeItem('jk_active_fleet_name');
  set({ token: null, user: null, isAuthenticated: false, activeFleetId: null, activeFleetName: null });
},
```

No route transition, back-button press, or React lifecycle event clears `activeFleetId` between authenticated pages.

---

### 4. Fleet Context in API Calls

**Full interceptor text:**

```ts
// frontend/src/services/api.ts  (complete file)
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeFleetId = localStorage.getItem('jk_active_fleet_id');
  if (activeFleetId) {
    config.headers['X-Fleet-ID'] = activeFleetId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jk_token');
      localStorage.removeItem('jk_user');
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Where `activeFleetId` is read from:**  
Directly from `localStorage.getItem('jk_active_fleet_id')` — **not** from the Zustand store, **not** from a closure, and **not** from a React hook. This is safe to call outside React because `localStorage` is a synchronous browser API available in any JS context.

**Is there a race condition where an API call could fire before `activeFleetId` is set?**

Technically yes, in one specific scenario: the first API call after a fresh login, before `setActiveFleet` or `login` has written to `localStorage`.

However, in practice this is not an issue for the current code:

1. `LoginPage.handleSubmit` calls `login(token, user)` **synchronously** before `navigate('/dashboard')`.
2. `login()` writes `jk_active_fleet_id` to `localStorage` synchronously:
   ```ts
   // authStore.ts  lines 31-44
   login: (token: string, user: User) => {
     localStorage.setItem('jk_token', token);
     localStorage.setItem('jk_user', JSON.stringify(user));
     if (user.fleet_id) {
       localStorage.setItem('jk_active_fleet_id', user.fleet_id);
     }
     ...
   },
   ```
3. `navigate('/dashboard')` fires after `login()` returns.
4. `DashboardPage` mounts and React Query fires its `useQuery` calls on the next render cycle.

So `localStorage` is written before the component even mounts. No race condition exists in the current login → dashboard flow.

The only latent risk: if a component fired an `api.*` call during the `useEffect` cleanup or before the login action completed (e.g., in a component that calls an API on mount and uses an `enabled: true` flag without checking `isAuthenticated`), it could send requests without `X-Fleet-ID`. None of the current pages do this.

---

### 5. Edge Cases

#### What happens on page refresh?

Fleet selection **survives** a full page refresh. The sequence:

1. Browser reloads, `main.tsx` re-executes, React re-initializes.
2. `authStore.ts` module is imported and its factory runs immediately:
   ```ts
   // authStore.ts  lines 17-26
   const savedToken = localStorage.getItem('jk_token');
   const savedUser = localStorage.getItem('jk_user');
   const parsedUser: User | null = savedUser ? JSON.parse(savedUser) : null;
   const savedFleetId = localStorage.getItem('jk_active_fleet_id')
     || (parsedUser ? parsedUser.fleet_id : null);
   const savedFleetName = localStorage.getItem('jk_active_fleet_name')
     || (parsedUser ? parsedUser.fleet_name : null);
   ```
3. Zustand store is initialized with `activeFleetId = savedFleetId`.
4. `ProtectedRoute` sees `isAuthenticated = !!savedToken = true` → renders `AppLayout`.
5. All subsequent API calls carry `X-Fleet-ID` from `localStorage`.

The user resumes exactly where they left off, with the same fleet active.

**Fallback priority for `activeFleetId` on reload:**
1. `localStorage.getItem('jk_active_fleet_id')` — set by `setActiveFleet()` or `login()`
2. `parsedUser.fleet_id` — embedded in the stored user object at login

This means even if `jk_active_fleet_id` was somehow absent, the system falls back to the fleet associated with the user's account.

#### What happens if a user has access to multiple fleets — is there a fleet switcher UI?

Yes. `MyFleetsPage` (accessible via the "My Fleets" link in the sidebar) is the fleet switcher. It calls `GET /api/v1/fleets/my-fleets` to fetch all fleets authorized for the user, renders them as cards, and calls `handleSelectFleet(fleet)` when a card's button is clicked.

The currently active fleet is highlighted:
```tsx
// MyFleetsPage.tsx  lines 134
const isActive = activeFleetId === fleet.id;
// ...
{isActive && (
  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-graphite">
    Active Selection
  </span>
)}
```

The Navbar also shows the active fleet name at all times:
```tsx
// Navbar.tsx  line 59
{activeFleetName || user?.fleet_name || 'JK Tyre Headquarters'}
```

**There is no inline fleet switcher dropdown in the Navbar.** To switch fleets, the user must navigate to `/my-fleets`. This is a deliberate UX choice (dedicated page) rather than an oversight.

#### Are there any components that hardcode a fleet ID or bypass the store?

No. A grep for hardcoded UUID-format fleet IDs (`fleet_id.*=.*[a-f0-9]{8}-`) returned no matches. Every component that needs fleet context either:

- Relies on the interceptor to inject `X-Fleet-ID` automatically, or
- Reads `activeFleetId` from `useAuthStore` (`MyFleetsPage` only, for the "currently active" highlight).

No component passes a fleet ID as a prop, URL segment, or hardcoded constant.

---

## Architecture Map

```
Browser localStorage
  jk_token              ──► api.ts interceptor ──► Authorization: Bearer ...
  jk_active_fleet_id    ──► api.ts interceptor ──► X-Fleet-ID: ...
  jk_user               ──► authStore hydration
  jk_active_fleet_name  ──► Navbar display

Zustand (authStore.ts)
  .token           ──► ProtectedRoute (isAuthenticated check)
  .user.role       ──► Sidebar.tsx (which link set to show)
  .activeFleetId   ──► MyFleetsPage.tsx (highlight active fleet card)
  .activeFleetName ──► Navbar.tsx (display fleet name)

React Router (App.tsx)
  /login            →  LoginPage       (public)
  /register         →  RegisterPage    (public)
  /dashboard        →  DashboardPage   ─┐
  /my-fleets        →  MyFleetsPage    ─┤
  /vehicles         →  VehiclesPage    ─┤
  /tyres            →  TyresPage       ─┤ all inside AppLayout
  /trips            →  TripsPage       ─┤ all behind ProtectedRoute
  /alerts           →  AlertsPage      ─┤
  /trends           →  TrendsPage      ─┤
  /comparison       →  ComparisonPage  ─┤
  /reports          →  ReportsPage     ─┘
  /admin            →  AdminDashboardPage
  /driver           →  DriverPortalPage

Fleet selection trigger:
  MyFleetsPage.handleSelectFleet(fleet)
    ├─► authStore.setActiveFleet(fleet.id, fleet.name)
    │     ├─► localStorage.setItem('jk_active_fleet_id', ...)
    │     └─► Zustand.set({ activeFleetId: ... })
    └─► navigate('/dashboard')
```

---

## Issues and Recommendations

### Issue 1 — React Query cache does not include `activeFleetId` in query keys (HIGH)

**File:** `frontend/src/pages/fleet/DashboardPage.tsx` (and all other fleet pages)

The Dashboard's query keys are:
```tsx
queryKey: ['fleet-stats']
queryKey: ['active-alerts']
queryKey: ['recent-trips']
```

None include `activeFleetId`. When a user switches fleets (MyFleetsPage → setActiveFleet → navigate('/dashboard')), React Query sees the same cache key and **may serve the previous fleet's data** until the cache entry's `staleTime` expires (default: 0, so it will refetch on mount — but if the component was already mounted, it won't remount on navigate back, and a cached result would be shown).

Because React Router SPA navigation does not unmount/remount the Dashboard if you're already on it (only if you navigate away and back), the stale cache risk is real when `navigate('/dashboard')` is called from MyFleetsPage while Dashboard was recently visited.

**Recommendation:** Include `activeFleetId` in every fleet-scoped query key:
```tsx
import { useAuthStore } from '../../store/authStore';

const { activeFleetId } = useAuthStore();

useQuery<FleetStats>({
  queryKey: ['fleet-stats', activeFleetId],
  queryFn: async () => { ... },
});
```
This ensures React Query treats requests for different fleets as separate cache entries and always fetches fresh data after a fleet switch.

---

### Issue 2 — `ProtectedRoute` checks authentication only, not role (HIGH)

**File:** `frontend/src/App.tsx`, lines 34-40

```tsx
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};
```

A `DRIVER` can type `/admin` in the address bar and reach `AdminDashboardPage`. The admin API calls will fail with 403, but the page shell renders. Equally, a `FLEET_MANAGER` can reach `/driver`.

**Recommendation:** Add a `RoleRoute` wrapper used for role-exclusive sub-trees:
```tsx
const RoleRoute: React.FC<{ allowed: Role[]; children: React.ReactElement }> = ({ allowed, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'DRIVER' ? '/driver' : '/dashboard'} replace />;
  }
  return children;
};
```

---

### Issue 3 — 401 handler does not clear `jk_active_fleet_id` (LOW)

**File:** `frontend/src/services/api.ts`, lines 23-32

The 401 response handler removes `jk_token` and `jk_user` but not `jk_active_fleet_id` or `jk_active_fleet_name`. If the session expires and the user logs back in as a different user (or a different fleet), the old fleet ID will remain in `localStorage` until `login()` or `setActiveFleet()` overwrites it.

In practice, `login()` writes the new `jk_active_fleet_id`, so this is overwritten on the next login. But if a user's session expires, they're redirected to `/login` with the stale fleet ID still present — any unauthenticated API call that somehow fires before login would carry an `X-Fleet-ID` for the wrong session.

**Recommendation:** Add the fleet keys to the 401 cleanup:
```ts
if (error.response?.status === 401) {
  localStorage.removeItem('jk_token');
  localStorage.removeItem('jk_user');
  localStorage.removeItem('jk_active_fleet_id');   // add this
  localStorage.removeItem('jk_active_fleet_name');  // add this
  ...
}
```

---

### Issue 4 — `api.ts` reads `localStorage` directly instead of Zustand store (LOW)

**File:** `frontend/src/services/api.ts`, line 15

```ts
const activeFleetId = localStorage.getItem('jk_active_fleet_id');
```

This is safe because `setActiveFleet` and `login` always write to `localStorage` before updating Zustand. But if any future code updates the Zustand store without writing to `localStorage` (e.g., a component directly calling `useAuthStore.setState({ activeFleetId: '...' })`), the interceptor would use stale data.

**Recommendation:** Read from Zustand's `getState()` instead, which is safe outside React:
```ts
import { useAuthStore } from '../store/authStore';

// Inside the interceptor:
const activeFleetId = useAuthStore.getState().activeFleetId;
```
This makes `localStorage` the implementation detail of the store rather than a shared contract that two places must stay in sync with.

---

### Issue 5 — No redirect for already-authenticated users on `/login` (LOW)

**File:** `frontend/src/pages/public/LoginPage.tsx`

If a user with a valid session navigates to `/login`, the login form renders rather than redirecting them to their dashboard. This is cosmetically awkward.

**Recommendation:** Add a guard at the top of `LoginPage`:
```tsx
const { isAuthenticated, user } = useAuthStore();
if (isAuthenticated) {
  const dest = user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'DRIVER' ? '/driver' : '/dashboard';
  return <Navigate to={dest} replace />;
}
```

---

## File Reference Map

| File | Path | Role in Fleet Context Flow |
|---|---|---|
| `authStore.ts` | `frontend/src/store/authStore.ts` | Single source of truth: `token`, `user.role`, `activeFleetId`, `activeFleetName`. Persists to `localStorage`. Exposes `login`, `logout`, `setActiveFleet`. |
| `api.ts` | `frontend/src/services/api.ts` | Axios instance. Request interceptor injects `Authorization` and `X-Fleet-ID` from `localStorage`. Response interceptor handles 401. |
| `App.tsx` | `frontend/src/App.tsx` | Route tree. Contains `ProtectedRoute` (auth-only guard). Defines all route paths. |
| `AppLayout.tsx` | `frontend/src/components/layout/AppLayout.tsx` | Layout shell: renders `<Navbar>`, `<Sidebar>`, `<Outlet>`. Shared by all authenticated routes. |
| `Navbar.tsx` | `frontend/src/components/layout/Navbar.tsx` | Top bar. Displays `activeFleetName` from store. Logout button. |
| `Sidebar.tsx` | `frontend/src/components/layout/Sidebar.tsx` | Role-switched navigation. Reads `user.role` from store. Fleet owners get `fleetLinks`. |
| `LoginPage.tsx` | `frontend/src/pages/public/LoginPage.tsx` | Calls `authStore.login()` then role-based `navigate()`. Entry point for fleet context initialization. |
| `DashboardPage.tsx` | `frontend/src/pages/fleet/DashboardPage.tsx` | Fleet owner home. Fires 3 React Query calls. Does **not** read `activeFleetId` — relies entirely on `X-Fleet-ID` header. |
| `MyFleetsPage.tsx` | `frontend/src/pages/fleet/MyFleetsPage.tsx` | Fleet switcher. Only component that reads `activeFleetId` from the store (for highlight). Calls `setActiveFleet()`. |
| `types/index.ts` | `frontend/src/types/index.ts` | `Role` union type. `User` interface (includes `fleet_id`, `fleet_name`). |

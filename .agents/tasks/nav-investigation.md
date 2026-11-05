# Fleet Owner Dashboard Navigation — Investigation Report

**Scope:** Read-only analysis of `frontend/src`. No files were modified.

---

## Summary Answer

The fleet owner dashboard navigation is controlled by **five files** working in a clear chain:

```
main.tsx  →  App.tsx  →  AppLayout.tsx  →  Sidebar.tsx
                              ↑
                      authStore.ts (Zustand)
```

1. `main.tsx` — bootstraps React Router's `<BrowserRouter>` and wraps the app in `<QueryClientProvider>`.
2. `App.tsx` — defines every route and contains the only route guard (`ProtectedRoute`), which checks `isAuthenticated` from the Zustand auth store.
3. `AppLayout.tsx` — the layout shell that wraps every authenticated route: renders `<Navbar>`, `<Sidebar>`, and `<Outlet>`.
4. `Sidebar.tsx` — reads `user.role` from the auth store and renders one of three hardcoded link arrays (`fleetLinks`, `adminLinks`, `driverLinks`). Fleet owners (`FLEET_MANAGER`) always get `fleetLinks`.
5. `authStore.ts` — Zustand store that persists the JWT, the decoded user (including `role`), and `activeFleetId` to `localStorage`. It is the single source of truth for all role/auth decisions in the UI.

The fleet owner's post-login destination is `/dashboard` → `DashboardPage` (inside `AppLayout`). The entry to that route is enforced at login time by `LoginPage.tsx`, which reads `user.role` from the login response and calls `navigate('/dashboard')` for any role that is not `SUPER_ADMIN` or `DRIVER`.

---

## Evidence and File Citations

### 1. Frontend directory structure

```
frontend/src/
├── main.tsx                          # entry point + providers
├── App.tsx                           # route tree + ProtectedRoute guard
├── store/
│   └── authStore.ts                  # Zustand auth/role/fleet state
├── services/
│   └── api.ts                        # Axios instance with auth interceptors
├── types/
│   └── index.ts                      # Role type + User interface
├── components/layout/
│   ├── AppLayout.tsx                 # authenticated shell (Navbar + Sidebar + Outlet)
│   ├── Navbar.tsx                    # top bar: brand + role badge + logout
│   └── Sidebar.tsx                   # role-switched nav links
└── pages/
    ├── public/   LoginPage, RegisterPage, LandingPage
    ├── fleet/    DashboardPage, MyFleetsPage, VehiclesPage, TyresPage, …(10 pages)
    ├── admin/    AdminDashboardPage, AdminMapPage
    └── driver/   DriverPortalPage
```

---

### 2. Router / navigation config — `App.tsx`

`App.tsx` is the sole route config file. It uses React Router v6 (`<Routes>` / `<Route>`).

**Route guard (inline component, lines 34–40):**
```tsx
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
```

`ProtectedRoute` wraps a single layout-level `<Route>` whose `element` is `<AppLayout />`. Every authenticated route is a nested child of that one route, so all authenticated pages share the same shell and guard.

**Authenticated route block (lines 46–71):**
```tsx
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard"            element={<DashboardPage />} />
  <Route path="/my-fleets"            element={<MyFleetsPage />} />
  <Route path="/vehicles"             element={<VehiclesPage />} />
  <Route path="/vehicles/:id"         element={<VehicleDetailPage />} />
  <Route path="/vehicles/:id/inspections" element={<VehicleInspectionPage />} />
  <Route path="/tyres"                element={<TyresPage />} />
  <Route path="/tyres/:id"            element={<TyreDetailPage />} />
  <Route path="/trips"                element={<TripsPage />} />
  <Route path="/inspections"          element={<InspectionsPage />} />
  <Route path="/alerts"               element={<AlertsPage />} />
  <Route path="/trends"               element={<TrendsPage />} />
  <Route path="/comparison"           element={<ComparisonPage />} />
  <Route path="/reports"              element={<ReportsPage />} />
  {/* Admin portals */}
  <Route path="/admin"                element={<AdminDashboardPage />} />
  <Route path="/admin/map"            element={<AdminMapPage />} />
  <Route path="/admin/*"              element={<AdminDashboardPage />} />
  {/* Driver portal */}
  <Route path="/driver"               element={<DriverPortalPage />} />
</Route>
```

**Key observation:** There is **no per-route role guard** inside `App.tsx`. Any authenticated user can navigate to any URL (including `/admin`) by typing it in the address bar. Role enforcement is purely cosmetic at the UI level (Sidebar hides links the role doesn't own) and at the API level (backend rejects unauthorised requests).

---

### 3. Sidebar / nav component — `Sidebar.tsx`

`Sidebar` reads `user.role` from the Zustand store and selects one of three link arrays:

```tsx
const { user } = useAuthStore();
const role = user?.role;

const fleetLinks = [
  { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/my-fleets',   label: 'My Fleets',        icon: Building2 },
  { to: '/vehicles',    label: 'Vehicles',         icon: Truck },
  { to: '/tyres',       label: 'Tyres Lifecycle',  icon: Disc },
  { to: '/trips',       label: 'Trips & Scoring',  icon: Route },
  { to: '/inspections', label: 'Inspections',      icon: ClipboardCheck },
  { to: '/alerts',      label: 'Alerts',           icon: AlertTriangle },
  { to: '/trends',      label: 'Trend Analysis',   icon: TrendingUp },
  { to: '/comparison',  label: 'Comparison',       icon: BarChart3 },
  { to: '/reports',     label: 'Reports',          icon: FileText },
];

const adminLinks = [ /* /admin, /admin/map, /admin/fleets, /admin/users, /admin/audit-logs, /dashboard */ ];
const driverLinks = [ /* /driver, /inspections, /alerts */ ];

const links = role === 'SUPER_ADMIN' ? adminLinks : role === 'DRIVER' ? driverLinks : fleetLinks;
```

`FLEET_MANAGER` falls to the default (`fleetLinks`) because neither `SUPER_ADMIN` nor `DRIVER` matches. The label shown above the nav reads `'Fleet Operations'` for fleet owners, `'JK Tyre Admin Suite'` for admins, and `'Driver Interface'` for drivers.

Active link highlighting is handled natively by React Router's `<NavLink>` using the `isActive` callback — no custom state is needed.

---

### 4. Layout component — `AppLayout.tsx`

```tsx
export const AppLayout: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
    <Navbar />
    <div className="flex-1 flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  </div>
);
```

React Router's `<Outlet />` renders whatever child page matches the current URL. All authenticated pages share this shell — there is no separate layout for the fleet owner vs admin vs driver (they all get `AppLayout`; the sidebar just shows different links).

---

### 5. Role-based / auth-based route guards

**Frontend guard (`ProtectedRoute` in `App.tsx`):**
- Checks only `isAuthenticated` (token present). No role check at all.
- Any logged-in user can access any route, including `/admin`.

**Post-login redirect (`LoginPage.tsx`, lines 24–31):**
```tsx
if (res.data.user.role === 'SUPER_ADMIN') {
  navigate('/admin');
} else if (res.data.user.role === 'DRIVER') {
  navigate('/driver');
} else {
  navigate('/dashboard');  // FLEET_MANAGER lands here
}
```
This is the only place the frontend uses role to control destination. It runs once at login.

**HTTP interceptor (`api.ts`):**
```tsx
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const activeFleetId = localStorage.getItem('jk_active_fleet_id');
  if (activeFleetId) config.headers['X-Fleet-ID'] = activeFleetId;
  return config;
});

api.interceptors.response.use(response => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('jk_token');
    localStorage.removeItem('jk_user');
    if (/* not on public page */) window.location.href = '/login';
  }
  return Promise.reject(error);
});
```

The `X-Fleet-ID` header is appended to every request so the backend can scope data to the correct fleet without the frontend embedding fleet IDs in URLs. The 401 handler clears storage and forces a redirect to `/login`.

**Conclusion:** True role enforcement lives on the backend. The frontend only uses role to (a) redirect on login and (b) show/hide sidebar links.

---

### 6. Full trace: fleet owner view from top-level router to leaf page

```
1. User navigates to /login
   → LoginPage.tsx renders form

2. User submits credentials
   → POST /api/v1/auth/login  (api.ts)
   → Response: { token, user: { role: "FLEET_MANAGER", fleet_id: "...", ... } }

3. LoginPage calls login(token, user) on authStore
   → Zustand persists token → localStorage('jk_token')
   → Zustand persists user  → localStorage('jk_user')
   → Zustand persists fleet → localStorage('jk_active_fleet_id')

4. LoginPage calls navigate('/dashboard')
   (role is FLEET_MANAGER — neither SUPER_ADMIN nor DRIVER)

5. React Router matches /dashboard against App.tsx route tree
   → Outer <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}> matches
   → ProtectedRoute reads isAuthenticated=true from authStore → passes through
   → AppLayout renders: <Navbar /> + <Sidebar /> + <Outlet />

6. Sidebar.tsx reads user.role='FLEET_MANAGER' → renders fleetLinks
   → /dashboard link is highlighted as active via NavLink isActive

7. <Outlet /> renders <DashboardPage />
   → DashboardPage fires React Query requests:
      GET /api/v1/fleets/stats     (Bearer token + X-Fleet-ID header)
      GET /api/v1/alerts?status=ACTIVE
      GET /api/v1/trips

8. Fleet owner clicks e.g. "My Fleets" in sidebar
   → Navigate to /my-fleets → MyFleetsPage renders
   → MyFleetsPage lets owner switch activeFleet via setActiveFleet(fleetId, fleetName)
   → authStore updates activeFleetId → localStorage + Zustand state
   → All subsequent API calls carry the new X-Fleet-ID header
```

---

### 7. Navigation state management

| Mechanism | File | What it controls |
|---|---|---|
| Zustand store (`useAuthStore`) | `store/authStore.ts` | `isAuthenticated`, `user` (role, name), `activeFleetId`, `activeFleetName`. Persisted to `localStorage` keys `jk_token`, `jk_user`, `jk_active_fleet_id`, `jk_active_fleet_name`. |
| React Router `<NavLink>` | `Sidebar.tsx` | Active-link highlight state. Built into React Router — no custom state needed. |
| Axios request interceptor | `services/api.ts` | Reads `jk_token` and `jk_active_fleet_id` from `localStorage` on every request. This means the active fleet context is shared with the backend without going through component props. |
| `setActiveFleet` action | `store/authStore.ts`, called from `MyFleetsPage.tsx` | Allows a fleet owner to switch the active fleet context. Updates Zustand + `localStorage` + the embedded `user.fleet_id` field. |

There is no React Context, Redux, or separate routing context. Everything flows through the single Zustand store.

---

## Conclusions and Recommendations

### What works well
- The navigation architecture is simple and easy to follow: one route file, one guard, one layout, one role-switched sidebar.
- The Zustand store is the single source of truth — there's no duplicated auth state.
- The `X-Fleet-ID` header pattern cleanly scopes backend queries without polluting URL params.

### Issues / Risks

#### 1. No frontend role guard on routes (HIGH)
`ProtectedRoute` only checks `isAuthenticated`. A logged-in `DRIVER` can type `/admin` in the address bar and the `AdminDashboardPage` will render — it will fail at the API level, but the page and its UI chrome will load. Similarly a `FLEET_MANAGER` can reach `/driver`.

**Recommendation:** Extend `ProtectedRoute` (or create a separate `RoleRoute` wrapper) to accept an `allowedRoles` prop, and wrap the admin and driver sub-trees separately:
```tsx
const RoleRoute: React.FC<{ allowed: Role[]; children: React.ReactElement }> = ({ allowed, children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowed.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};
// Usage in App.tsx:
<Route element={<RoleRoute allowed={['SUPER_ADMIN']}><AppLayout /></RoleRoute>}>
  <Route path="/admin" element={<AdminDashboardPage />} />
  <Route path="/admin/map" element={<AdminMapPage />} />
</Route>
```

#### 2. Sidebar has ghost admin links that point to unregistered routes (MEDIUM)
`adminLinks` in `Sidebar.tsx` includes `/admin/fleets`, `/admin/users`, and `/admin/audit-logs`, but `App.tsx` only registers `/admin`, `/admin/map`, and `/admin/*` (the wildcard catches these and renders `AdminDashboardPage` instead of dedicated pages). The actual Fleet/Users/Audit content is handled by tabs inside `AdminDashboardPage`, not separate routes.

**Recommendation:** Either register dedicated routes for those three paths (and create the corresponding page components), or remove the links from `adminLinks` and rely on the tab UI inside `AdminDashboardPage`.

#### 3. `activeFleetId` read directly from `localStorage` in the interceptor (LOW)
`api.ts` calls `localStorage.getItem('jk_active_fleet_id')` directly instead of reading from the Zustand store. If something updates `activeFleetId` in Zustand without writing to `localStorage`, the header will be stale.

**Recommendation:** Centralise the read by importing `useAuthStore.getState().activeFleetId` in the interceptor (Zustand's `getState()` is safe outside React). The `login` and `setActiveFleet` actions already write to `localStorage` consistently, so this is low-risk for now.

#### 4. No redirect for already-authenticated users on `/login` (LOW)
`LoginPage.tsx` renders normally even if the user is already authenticated. Returning users will see the login form rather than being forwarded to their dashboard.

**Recommendation:** Add a guard at the top of `LoginPage`:
```tsx
const { isAuthenticated, user } = useAuthStore();
if (isAuthenticated) {
  return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'DRIVER' ? '/driver' : '/dashboard'} replace />;
}
```

---

## File Reference Map

| File | Purpose in nav flow |
|---|---|
| `frontend/src/main.tsx` | Mounts `<BrowserRouter>` + `<QueryClientProvider>` |
| `frontend/src/App.tsx` | Route tree; `ProtectedRoute` guard; role-based post-login redirect |
| `frontend/src/store/authStore.ts` | Zustand auth state: token, user (role), activeFleetId |
| `frontend/src/services/api.ts` | Axios interceptors: injects Bearer token + X-Fleet-ID; handles 401 |
| `frontend/src/types/index.ts` | `Role` type (`SUPER_ADMIN` | `FLEET_MANAGER` | `DRIVER`) + `User` interface |
| `frontend/src/components/layout/AppLayout.tsx` | Authenticated shell: `<Navbar>` + `<Sidebar>` + `<Outlet>` |
| `frontend/src/components/layout/Navbar.tsx` | Top bar: role badge, fleet name, logout button |
| `frontend/src/components/layout/Sidebar.tsx` | Role-switched nav links; `fleetLinks` for `FLEET_MANAGER` |
| `frontend/src/pages/public/LoginPage.tsx` | Credentials form; role-based `navigate()` after successful login |
| `frontend/src/pages/fleet/DashboardPage.tsx` | Fleet owner's home page (default landing after login) |
| `frontend/src/pages/fleet/MyFleetsPage.tsx` | Fleet switcher; calls `setActiveFleet()` → updates X-Fleet-ID context |

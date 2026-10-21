# Retheme Report: DashboardPage, AlertsPage, TripsPage

**Status:** Complete  
**Commit:** `feat: retheme DashboardPage, AlertsPage, TripsPage to white/blue/yellow light theme`  
**TypeScript check:** `npx tsc --noEmit` — zero errors

---

## Changes Applied

### DashboardPage.tsx
- Page heading: `text-white` → `text-slate-900`; subheading `text-slate-400` → `text-slate-500`
- KPI cards: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm rounded-2xl`
- KPI values: `text-white` → `text-slate-900 font-black text-2xl`; labels: `text-slate-500` kept
- KPI label text around icons: `text-slate-400` → `text-slate-500`
- "View Fleet Vehicles" CTA: `bg-red-600 hover:bg-red-700 text-white` → `bg-yellow-400 hover:bg-yellow-300 text-slate-900`
- THI Distribution card: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`
- Activity icon: `text-red-500` → `text-blue-500` (not a semantic data colour)
- PieChart Tooltip: `backgroundColor: '#0f172a', borderColor: '#334155'` → `backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 12` with `color: '#0f172a'` item text
- Legend items: `bg-slate-950/40 border-slate-800/60` → `bg-white border-slate-200`; labels `text-slate-400` → `text-slate-700`; values `text-white` → `text-slate-900`
- Active Alerts card: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`; title `text-white` → `text-slate-900`
- "View All Alerts" link: `text-red-400 hover:text-red-300` → `text-blue-600 hover:text-blue-700`
- Alert items: `bg-slate-950/50 border-slate-800` → `bg-white border-slate-200`
- Alert CRITICAL badge: `bg-red-500/20 text-red-400 border-red-500/30` → `bg-red-100 text-red-700 border-red-200`
- Alert WARNING badge: `bg-amber-500/20 text-amber-400 border-amber-500/30` → `bg-amber-100 text-amber-700 border-amber-200`
- Alert primary text: `text-white` → `text-slate-900`; secondary: `text-slate-400` → `text-slate-500`
- Recent Trips card: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`
- "View All Trips" link: `text-red-400 hover:text-red-300` → `text-blue-600 hover:text-blue-700`
- Table header: `border-slate-800 text-slate-400` → `border-slate-200 text-slate-500`
- Table body: `divide-slate-800/60 text-slate-300` → `divide-slate-200 text-slate-700`
- Table row hover: `hover:bg-slate-800/30` → `hover:bg-blue-50`
- Trip code cell: `text-white` → `text-slate-900`
- Trip score cell: `text-white` → `text-slate-900`
- COMPLETED badge: `bg-slate-800 text-slate-300` → `bg-blue-100 text-blue-700`
- ACTIVE badge: `bg-purple-500/20 text-purple-300 border-purple-500/30` → `bg-yellow-100 text-yellow-800 border-yellow-200`

### AlertsPage.tsx
- Page heading: `text-white` → `text-slate-900`; sub: `text-slate-400` → `text-slate-500`
- Filter dropdowns: `bg-slate-900 border-slate-800 text-slate-300 focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
- Table container: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`
- Table header row: `bg-slate-950/40 text-slate-400` → `bg-blue-50 text-slate-500`; border: `border-slate-800` → `border-slate-200`
- Table body: `divide-slate-800/60 text-slate-300` → `divide-slate-200 text-slate-700`
- Table row hover: `hover:bg-slate-800/30` → `hover:bg-blue-50`
- CRITICAL badge: `bg-red-500/20 text-red-400 border-red-500/30` → `bg-red-100 text-red-700 border-red-200`
- WARNING badge: `bg-amber-500/20 text-amber-400 border-amber-500/30` → `bg-amber-100 text-amber-700 border-amber-200`
- RISK badge: `bg-blue-500/20 text-blue-400 border-blue-500/30` → `bg-blue-100 text-blue-700 border-blue-300`
- Vehicle name: `text-white` → `text-slate-900`; wheel position: `text-slate-400` → `text-slate-500`
- Category: `text-slate-300` → `text-slate-700`
- Observed metric: `text-white` → `text-slate-900`
- Explanation: `text-slate-200` → `text-slate-900`; recommended action link: `text-blue-400` → `text-blue-600`
- Resolved note: `text-emerald-400 bg-emerald-950/20 border-emerald-900/30` → `text-emerald-700 bg-emerald-50 border-emerald-200`
- Status ACTIVE badge: `bg-red-500/20 text-red-300 border-red-500/30` → `bg-red-100 text-red-700 border-red-200`
- Status ACKNOWLEDGED badge: `bg-amber-500/20 text-amber-300 border-amber-500/30` → `bg-amber-100 text-amber-700 border-amber-200`
- Status RESOLVED badge: `bg-slate-800 text-slate-400` → `bg-slate-100 text-slate-500`
- Acknowledge button: `bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40` → `bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300`
- "Closed" resolved text: `text-emerald-400` → `text-emerald-700`
- Resolve modal: `bg-black/80 backdrop-blur-md` overlay → `bg-slate-900/50 backdrop-blur-sm`
- Modal container: `bg-slate-900 border-slate-800` → `bg-white border-slate-200`
- Modal title: `text-white` → `text-slate-900`; sub: `text-slate-400` → `text-slate-500`
- Close button: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900 hover:bg-slate-100`
- Resolution note label: `text-slate-300` → `text-slate-700`
- Textarea: `bg-slate-950 border-slate-800 text-white focus:border-red-500` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
- Cancel button: `bg-slate-800 text-slate-300 hover:bg-slate-700` → `bg-slate-100 text-slate-700 hover:bg-slate-200`

### TripsPage.tsx
- Page heading: `text-white` → `text-slate-900`; sub: `text-slate-400` → `text-slate-500`
- Refresh button: `bg-slate-900 border-slate-800 text-slate-300 hover:text-white` → `bg-white border-slate-200 text-slate-600 hover:text-slate-900`
- Vehicle filter banner: `text-amber-300` → `text-amber-700`; inner text `text-white` → `text-slate-900`; `text-amber-200/80` → `text-amber-800`; dismiss button `bg-slate-900 border-amber-500/40 text-amber-300 hover:text-white` → `bg-white border-amber-400 text-amber-700 hover:text-slate-900`
- Filter bar: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`
- Filter labels: `text-slate-400` → `text-slate-600`
- Filter selects/inputs: `bg-slate-950 border-slate-800 text-white focus:border-fleet` → `bg-white border-slate-200 text-slate-900 focus:border-blue-500`
- Reset Filters: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900`
- Trips table: `bg-slate-900/60 border-slate-800` → `bg-white border-slate-200 shadow-sm`
- Table header: `bg-slate-950/40 text-slate-400 border-slate-800` → `bg-blue-50 text-slate-500 border-slate-200`
- Table body: `divide-slate-800/60 text-slate-300` → `divide-slate-200 text-slate-700`
- Table row hover: `hover:bg-slate-800/30` → `hover:bg-blue-50`
- Trip code, distance, score cells: `text-white` → `text-slate-900`
- Date/odometer secondary: `text-slate-400` → `text-slate-500`
- Empty state icon: `text-slate-600` → `text-slate-300`; heading `text-white` → `text-slate-900`
- COMPLETED badge: `bg-slate-800 text-slate-300` → `bg-blue-100 text-blue-700`
- ACTIVE badge: `bg-purple-500/20 text-purple-300 border-purple-500/30` → `bg-yellow-100 text-yellow-800 border-yellow-200`
- Breakdown button: `bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white` → `bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900`
- Modal overlay: `bg-black/70 backdrop-blur-sm` → `bg-slate-900/50 backdrop-blur-sm`
- Modal container: `bg-slate-900 border-slate-800` → `bg-white border-slate-200`
- Modal title: `text-white` → `text-slate-900`
- Trip summary inner: `bg-slate-950/80 border-slate-800` → `bg-blue-50 border-blue-200`; `text-white` → `text-slate-900`; `text-slate-400` → `text-slate-500`
- Score breakdown items: `bg-slate-950 border-slate-800/80` → `bg-blue-50 border-blue-200`; `text-white` → `text-slate-900`; component labels `text-slate-700` implicit → `text-slate-700` explicit
- Analysis summary box: `bg-slate-800/40 text-slate-300` → `bg-slate-100 text-slate-600`; `text-slate-200` bold → `text-slate-700`
- Close button: `text-slate-400 hover:text-white` → `text-slate-500 hover:text-slate-900 hover:bg-slate-100`

---

## What Was Preserved
- All semantic health colours: `bg-emerald-*`, `bg-amber-*`, `bg-red-*` on data badges
- PieChart `Cell` fill colours (emerald, amber, red, slate)
- Trip score dot colours (emerald/amber/red based on value)
- `text-fleet` / `hover:text-fleet` vehicle link accent (yellow)
- Recharts Pie chart data strokes unchanged
- All logic, routing, API calls, state, and query code untouched

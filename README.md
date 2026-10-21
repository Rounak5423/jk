# JK Tyre THI Fleet Intelligence Platform

A full-stack, enterprise-grade commercial vehicle tyre management, telematics, and health monitoring platform. Engineered with Python Flask, SQLAlchemy, SQLite/PostgreSQL, React, TypeScript, Tailwind CSS, TanStack Query, and Three.js (React Three Fiber).

---

## 1. Prerequisites (Windows)
Ensure the following tools are installed on your Windows machine:
- **Python 3.11+** (Tested on Python 3.12.10)
- **Node.js v20+** (Tested on Node.js v22.14.0)
- **npm v10+** (Tested on npm 10.9.2)
- **PowerShell 7+ or Windows PowerShell 5.1**

---

## 2. Windows Local Setup Instructions

### 2.1 Backend Setup
From the repository root `D:\05_JKT`:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create local environment configuration
Copy-Item .env.example .env

# 6. Initialize database and generate starter synthetic fleet data (30 vehicles, 4 weeks of telemetry)
python -m synthetic.generator --seed 42 --vehicles 30

# 7. Start the Flask backend server
python run.py
```
The backend API server will be available at `http://localhost:5000`.

Alternatively, use the Windows convenience PowerShell script from root:
```powershell
.\start_backend.ps1
```

---

### 2.2 Frontend Setup
Open a new PowerShell terminal:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start Vite development server
npm run dev
```
The frontend application will be running at `http://localhost:5173`.

Alternatively, use the Windows convenience PowerShell script from root:
```powershell
.\start_frontend.ps1
```

---

## 3. Demo Credentials (Local Development)
Once synthetic data is initialized, the following preconfigured accounts are ready:

| Role | Email | Password | Scope |
|---|---|---|---|
| **JK Tyre Super Admin** | `admin@jktyre.com` | `Admin@12345` | Global oversight, audit logs, all fleets, platform usage map |
| **Fleet Manager** | `fleet.manager@translogistics.com` | `Fleet@12345` | Apex Trans Logistics (Fleet 1 & Fleet 3 via multi-fleet) |
| **Driver** | `driver1@translogistics.com` | `Driver@12345` | Driver workflow, vehicle assignments, trip logging |

> **Development Mode Flag**: Quick-login buttons on the login page are hidden by default in production and only shown when `VITE_ENABLE_DEV_LOGIN="true"` in `frontend/.env`.

---

## 4. Key Portal Pages & Features
- **Fleet Owner**:
  - **My Fleets** (`/my-fleets`): Multi-fleet overview and switcher with strict tenant isolation.
  - **Vehicles** (`/vehicles`): Full table with 4 dynamic actions per vehicle: **Details**, **3D View**, **Inspection**, and **Trips**.
  - **Vehicle Inspection** (`/vehicles/:id/inspections`): Real wheel positions, NSD wear gauge, missing data alerts, and new inspection creation.
  - **Trips** (`/trips`): Vehicle-filtered trips with odometer validation, Trip Score, and date range filters.
  - **3D Vehicle Twin** (`/3d-view` / `/vehicles/:id/3d`): Interactive 3D inspection digital twin.
  - **Health Trends** (`/trends`): Unified 0–100 scale plotting observed THI vs the ideal 95.0 baseline.
  - **Vehicle Comparison** (`/comparison`): Multi-select 2 to 10 vehicles with backend range validation.
  - **Reports & Data Export** (`/reports`): Full 13-sheet Excel workbook export (`/api/v1/export/excel`) and CSV downloads.
- **JK Tyre Admin**:
  - **Platform Usage Map** (`/admin/map`): Interactive SVG India map displaying operating hubs and transit corridor vehicle locations with freshness indicators (`CURRENT`, `STALE`, `SIMULATED`, `UNAVAILABLE`) and synthetic disclosures.
  - **Audit Logs** (`/admin/audit`): Security and administration event tracking.

---

## 5. Running Automated Tests

```powershell
# From project root, run both backend pytest and frontend Vite build:
.\run_tests.ps1

# Or run backend pytest individually:
cd backend
python -m pytest tests -v
cd ..
```

---

## 6. Key Architecture Capabilities
- **Strict Fleet Isolation**: Enforced in all queries and authorization guards. Cross-fleet access returns `403 Forbidden`.
- **Permanent Tyre Identity**: Full life-cycle tracking across dismounts, remounts, and retreads.
- **3D Digital Twin**: Configuration-driven 3D truck/bus visualization powered by Three.js & React Three Fiber.
- **Explainable THI & Trip Score**: Independent rule engines calculating scores (0–100) with detailed component explanations.
- **Mock TREEL Telemetry Adapter**: Pluggable interface for commercial TPMS data.
- **13-Sheet Dataset Export**: Complete enterprise data dump omitting secret hashes and strictly excluding unverified legacy sheets.

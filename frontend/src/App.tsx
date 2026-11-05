import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Fleet pages
import { DashboardPage } from './pages/fleet/DashboardPage';
import { MyFleetsPage } from './pages/fleet/MyFleetsPage';
import { VehiclesPage } from './pages/fleet/VehiclesPage';
import { VehicleDetailPage } from './pages/fleet/VehicleDetailPage';
import { VehicleInspectionPage } from './pages/fleet/VehicleInspectionPage';
import { Vehicle3DPage } from './pages/fleet/Vehicle3DPage';
import { TyresPage } from './pages/fleet/TyresPage';
import { TyreDetailPage } from './pages/fleet/TyreDetailPage';
import { TripsPage } from './pages/fleet/TripsPage';
import { InspectionsPage } from './pages/fleet/InspectionsPage';
import { AlertsPage } from './pages/fleet/AlertsPage';
import { TrendsPage } from './pages/fleet/TrendsPage';
import { ComparisonPage } from './pages/fleet/ComparisonPage';
import { ReportsPage } from './pages/fleet/ReportsPage';
import { FitmentPage } from './pages/fleet/FitmentPage';

// Role-specific portals
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminMapPage } from './pages/admin/AdminMapPage';
import { OEMFleetVaultPage } from './pages/admin/OEMFleetVaultPage';
import { DriverPortalPage } from './pages/driver/DriverPortalPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Workspace */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-fleets" element={<MyFleetsPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="/vehicles/:id/3d" element={<Vehicle3DPage />} />
        <Route path="/vehicles/:id/inspections" element={<VehicleInspectionPage />} />
        <Route path="/tyres" element={<TyresPage />} />
        <Route path="/tyres/:id" element={<TyreDetailPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/inspections" element={<InspectionsPage />} />
        <Route path="/fitment" element={<FitmentPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        {/* Portals */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/map" element={<AdminMapPage />} />
        <Route path="/admin/oem-vault" element={<OEMFleetVaultPage />} />
        <Route path="/admin/*" element={<AdminDashboardPage />} />
        <Route path="/driver" element={<DriverPortalPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

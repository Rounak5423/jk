import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/authStore';

const FLEET_WORKSPACE_PATHS = [
  '/dashboard', '/vehicles', '/fitment', '/tyres',
  '/trips', '/inspections', '/alerts', '/trends', '/comparison', '/reports',
];

export const AppLayout: React.FC = () => {
  const { user, fleetWorkspaceOpen } = useAuthStore();
  const location = useLocation();

  /* Guard: Fleet Manager with no open workspace must go to /my-fleets */
  if (
    user?.role === 'FLEET_MANAGER' &&
    !fleetWorkspaceOpen &&
    FLEET_WORKSPACE_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
  ) {
    return <Navigate to="/my-fleets" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-200">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import bg1 from '../../assets/background image 1.png';
import bg2 from '../../assets/background image 2.png';

const FLEET_WORKSPACE_PATHS = [
  '/dashboard', '/vehicles', '/fitment', '/tyres',
  '/trips', '/inspections', '/alerts', '/trends', '/comparison', '/reports',
];

// Route-to-background mapping (alternating between bg1 and bg2)
const ROUTE_BACKGROUNDS: Record<string, string> = {
  '/my-fleets': bg1,
  '/dashboard': bg2,
  '/vehicles': bg1,
  '/fitment': bg2,
  '/tyres': bg1,
  '/trips': bg2,
  '/inspections': bg1,
  '/alerts': bg2,
  '/trends': bg1,
  '/comparison': bg2,
  '/reports': bg1,
  '/driver': bg2,
  '/admin': bg1,
  '/admin/oem-vault': bg2,
  '/admin/map': bg1,
};

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

  // Determine which background image to use based on current route
  const getBackgroundImage = () => {
    const path = location.pathname;
    
    // Check exact match first
    if (ROUTE_BACKGROUNDS[path]) {
      return ROUTE_BACKGROUNDS[path];
    }
    
    // Check for sub-routes (e.g., /vehicles/:id)
    for (const route in ROUTE_BACKGROUNDS) {
      if (path.startsWith(route + '/')) {
        return ROUTE_BACKGROUNDS[route];
      }
    }
    
    // Default to bg1
    return bg1;
  };

  const backgroundImage = getBackgroundImage();

  return (
    <div 
      className="min-h-screen flex flex-col text-slate-200"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto w-full transition-all duration-300">
          <div className="w-full max-w-[1880px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

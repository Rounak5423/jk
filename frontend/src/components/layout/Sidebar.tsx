import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Truck,
  Disc,
  Route,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  FileText,
  Shield,
  Building2,
  Smartphone,
  MapPin,
  Wrench,
  Database,
  ArrowLeft,
  ClipboardCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, activeFleetName, fleetWorkspaceOpen, closeFleetWorkspace } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;

  const fleetLinks = [
    { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/my-fleets',   label: 'My Fleets',        icon: Building2 },
    { to: '/vehicles',    label: 'Vehicles',          icon: Truck },
    { to: '/fitment',     label: 'Tyre Fitment',      icon: Wrench },
    { to: '/tyres',       label: 'Tyres Lifecycle',   icon: Disc },
    { to: '/trips',       label: 'Trips & Scoring',   icon: Route },
    { to: '/inspections', label: 'Inspections',       icon: ClipboardCheck },
    { to: '/alerts',      label: 'Alerts',            icon: AlertTriangle },
    { to: '/trends',      label: 'Trend Analysis',    icon: TrendingUp },
    { to: '/comparison',  label: 'Comparison',        icon: BarChart3 },
    { to: '/reports',     label: 'Reports',           icon: FileText },
  ];

  const myFleetsOnly = [
    { to: '/my-fleets', label: 'My Fleets', icon: Building2 },
  ];

  const adminLinks = [
    { to: '/admin',           label: 'Admin Overview',      icon: Shield },
    { to: '/admin/oem-vault', label: 'OEM Telemetry Vault', icon: Database },
    { to: '/admin/map',       label: 'Platform Usage Map',  icon: MapPin },
  ];

  const driverLinks = [
    { to: '/driver',      label: 'Driver Dashboard',  icon: Smartphone },
    { to: '/inspections', label: 'Submit Inspection', icon: ClipboardCheck },
    { to: '/alerts',      label: 'Tyre Alerts',       icon: AlertTriangle },
  ];

  /* Determine which links + section label to show */
  let links = adminLinks;
  let sectionLabel = 'JK Tyre Admin Suite';

  if (role === 'DRIVER') {
    links = driverLinks;
    sectionLabel = 'Driver Interface';
  } else if (role === 'FLEET_MANAGER') {
    if (fleetWorkspaceOpen) {
      links = fleetLinks;
      sectionLabel = 'Fleet Operations';
    } else {
      links = myFleetsOnly;
      sectionLabel = 'Fleet Portfolio';
    }
  }

  const handleBackToMyFleets = () => {
    closeFleetWorkspace();
    navigate('/my-fleets');
  };

  return (
    <aside className="w-64 bg-[#14161A] border-r border-[#262A30] flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="p-4">

        {/* Fleet Manager — workspace open: show back button + active fleet badge */}
        {role === 'FLEET_MANAGER' && fleetWorkspaceOpen && (
          <div className="mb-3 space-y-2">
            <button
              onClick={handleBackToMyFleets}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#9AA0A6] hover:bg-[#20242B] hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to My Fleets
            </button>
            {activeFleetName && (
              <div className="px-3 py-2 bg-[#1E2228] border border-[#2D333B] rounded-xl">
                <div className="text-[9px] font-bold text-[#FFC800] uppercase tracking-wider mb-0.5">Active Fleet</div>
                <div className="text-xs font-semibold text-white truncate">{activeFleetName}</div>
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] font-bold text-[#5B6068] uppercase tracking-wider px-3 mb-2">
          {sectionLabel}
        </div>

        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isActive
                      ? 'bg-[#FFC800] text-black font-bold shadow-sm'
                      : 'text-[#9AA0A6] font-medium hover:bg-[#20242B] hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Info card at bottom */}
      <div className="mt-auto p-4 border-t border-[#262A30]">
        <div className="bg-[#1A1D23] p-3 rounded-xl border border-[#262A30] text-[11px] text-[#80868B]">
          <div className="font-semibold text-slate-200 mb-0.5">Rule Engine v1.0</div>
          <div>Provisional demo weights calibrated with JK Tyre datasets.</div>
        </div>
      </div>
    </aside>
  );
};

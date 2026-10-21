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
  Users,
  Building2,
  ScrollText,
  Smartphone,
  MapPin,
  Wrench,
  Database,
  ArrowLeft,
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
<<<<<<< HEAD
    { to: '/vehicles', label: 'Vehicles', icon: Truck },
    { to: '/fitment', label: 'Tyre Fitment', icon: Wrench },
    { to: '/tyres', label: 'Tyres Lifecycle', icon: Disc },
    { to: '/trips', label: 'Trips & Scoring', icon: Route },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
    { to: '/trends', label: 'Trend Analysis', icon: TrendingUp },
    { to: '/comparison', label: 'Comparison', icon: BarChart3 },
    { to: '/reports', label: 'Reports', icon: FileText },
=======
>>>>>>> origin/vaisiri-updates
  ];

  const adminLinks = [
    { to: '/admin',           label: 'Admin Overview',      icon: Shield },
    { to: '/admin/oem-vault', label: 'OEM Telemetry Vault', icon: Database },
    { to: '/admin/map',       label: 'Platform Usage Map',  icon: MapPin },
    { to: '/admin/fleets',    label: 'All Fleets',          icon: Building2 },
    { to: '/admin/users',     label: 'Users & Roles',       icon: Users },
    { to: '/admin/audit-logs',label: 'Audit Trail',         icon: ScrollText },
    { to: '/dashboard',       label: 'Fleet Portal View',   icon: LayoutDashboard },
  ];

  const driverLinks = [
<<<<<<< HEAD
    { to: '/driver', label: 'Driver Dashboard', icon: Smartphone },
    { to: '/alerts', label: 'Tyre Alerts', icon: AlertTriangle },
=======
    { to: '/driver',      label: 'Driver Dashboard',  icon: Smartphone },
    { to: '/inspections', label: 'Submit Inspection', icon: ClipboardCheck },
    { to: '/alerts',      label: 'Tyre Alerts',       icon: AlertTriangle },
>>>>>>> origin/vaisiri-updates
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
    <aside className="w-64 bg-[#1e3a5f] border-r border-blue-900 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="p-4">

        {/* Fleet Manager — workspace open: show back button + active fleet badge */}
        {role === 'FLEET_MANAGER' && fleetWorkspaceOpen && (
          <div className="mb-3 space-y-2">
            <button
              onClick={handleBackToMyFleets}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-blue-200 hover:bg-blue-800/40 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to My Fleets
            </button>
            {activeFleetName && (
              <div className="px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                <div className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider mb-0.5">Active Fleet</div>
                <div className="text-xs font-semibold text-white truncate">{activeFleetName}</div>
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider px-3 mb-2">
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-yellow-400 text-slate-900 font-bold'
                      : 'text-blue-200 hover:bg-blue-800/40 hover:text-white'
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
      <div className="mt-auto p-4 border-t border-blue-900">
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-700">
          <div className="font-semibold text-blue-800 mb-0.5">Rule Engine v1.0</div>
          <div>Provisional demo weights calibrated with JK Tyre datasets.</div>
        </div>
      </div>
    </aside>
  );
};

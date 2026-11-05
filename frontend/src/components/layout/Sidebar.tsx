import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, activeFleetName, fleetWorkspaceOpen, closeFleetWorkspace } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('jk_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('jk_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    <aside
      className={`bg-[#101010] border-r border-white/5 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] transition-all duration-300 ease-in-out relative z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Pill */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-[#1C1D20] border border-gold-border/70 text-brand-gold hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-40"
        title={isCollapsed ? 'Expand Sidebar (Show Full Labels)' : 'Collapse Sidebar (Widescreen Content View)'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={`p-4 flex flex-col ${isCollapsed ? 'items-center px-2' : ''}`}>
        {/* Fleet Manager — workspace open: show back button + active fleet badge */}
        {role === 'FLEET_MANAGER' && fleetWorkspaceOpen && (
          <div className="mb-3 space-y-2 w-full">
            <button
              onClick={handleBackToMyFleets}
              className={`flex items-center gap-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition w-full ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
              }`}
              title="Back to My Fleets"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Back to My Fleets</span>}
            </button>
            {activeFleetName && !isCollapsed && (
              <div className="px-3 py-2 bg-[#17191D] border border-gold-border rounded-xl">
                <div className="text-[9px] font-bold text-brand-gold uppercase tracking-wider mb-0.5">Active Fleet</div>
                <div className="text-xs font-semibold text-white truncate">{activeFleetName}</div>
              </div>
            )}
            {activeFleetName && isCollapsed && (
              <div
                className="w-10 h-10 mx-auto bg-[#17191D] border border-gold-border rounded-xl flex items-center justify-center text-brand-gold font-bold text-xs"
                title={`Active Fleet: ${activeFleetName}`}
              >
                <Building2 className="w-4 h-4" />
              </div>
            )}
          </div>
        )}

        {!isCollapsed && (
          <div className="text-[11px] font-bold text-brand-gold uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>{sectionLabel}</span>
          </div>
        )}

        <nav className="space-y-1 w-full">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl transition ${
                    isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 text-xs'
                  } ${
                    isActive
                      ? 'bg-brand-gold text-black font-bold shadow-sm'
                      : 'text-white font-medium hover:bg-white/10'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Info card at bottom */}
      {!isCollapsed ? (
        <div className="mt-auto p-4 border-t border-[#262A30]">
          <div className="bg-[#17191D] p-3 rounded-xl border border-gold-border text-[11px] text-slate-400">
            <div className="font-semibold text-slate-200 mb-0.5 flex items-center justify-between">
              <span>Rule Engine v2.0</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div>Calibrated with Adaptive Relative ML model on real 6s telematics.</div>
          </div>
        </div>
      ) : (
        <div className="mt-auto p-2 border-t border-[#262A30] flex justify-center">
          <div
            className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"
            title="Rule Engine v2.0 Online"
          ></div>
        </div>
      )}
    </aside>
  );
};

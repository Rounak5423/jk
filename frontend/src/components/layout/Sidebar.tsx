import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Truck,
  Disc,
  Route,
  ClipboardCheck,
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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const fleetLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-fleets', label: 'My Fleets', icon: Building2 },
    { to: '/vehicles', label: 'Vehicles', icon: Truck },
    { to: '/fitment', label: 'Tyre Fitment', icon: Wrench },
    { to: '/tyres', label: 'Tyres Lifecycle', icon: Disc },
    { to: '/trips', label: 'Trips & Scoring', icon: Route },
    { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
    { to: '/trends', label: 'Trend Analysis', icon: TrendingUp },
    { to: '/comparison', label: 'Comparison', icon: BarChart3 },
    { to: '/reports', label: 'Reports', icon: FileText },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Overview', icon: Shield },
    { to: '/admin/oem-vault', label: 'OEM Telemetry Vault', icon: Database },
    { to: '/admin/map', label: 'Platform Usage Map', icon: MapPin },
    { to: '/admin/fleets', label: 'All Fleets', icon: Building2 },
    { to: '/admin/users', label: 'Users & Roles', icon: Users },
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: ScrollText },
    { to: '/dashboard', label: 'Fleet Portal View', icon: LayoutDashboard },
  ];

  const driverLinks = [
    { to: '/driver', label: 'Driver Dashboard', icon: Smartphone },
    { to: '/inspections', label: 'Submit Inspection', icon: ClipboardCheck },
    { to: '/alerts', label: 'Tyre Alerts', icon: AlertTriangle },
  ];

  const links = role === 'SUPER_ADMIN' ? adminLinks : role === 'DRIVER' ? driverLinks : fleetLinks;

  return (
    <aside className="w-64 bg-[#1e3a5f] border-r border-blue-900 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider px-3 mb-2">
          {role === 'SUPER_ADMIN' ? 'JK Tyre Admin Suite' : role === 'DRIVER' ? 'Driver Interface' : 'Fleet Operations'}
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

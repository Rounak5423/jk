import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, Shield, Truck, Navigation, RefreshCw, Building2 } from 'lucide-react';
import jkLogo from '../../assets/jk-logo.png';
import api from '../../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, activeFleetName } = useAuthStore();
  const isDevLoginEnabled = (import.meta as any).env?.VITE_ENABLE_DEV_LOGIN === 'true';

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[11px] font-semibold">JK Admin</span>;
      case 'FLEET_MANAGER':
        return <span className="bg-[#14161A] text-white px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-700">Fleet Owner</span>;
      case 'DRIVER':
        return <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[11px] font-semibold">Driver</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#E2E0D8] shadow-sm px-6 flex items-center justify-between sticky top-0 z-40 overflow-visible">
      {/* Brand */}
      <div className="flex items-center gap-3" style={{ overflow: 'visible' }}>
        <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
        <p className="text-[11px] font-semibold text-[#5B6068] leading-none tracking-wide">THI Tyre Intelligence Platform</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Development Mode Indicator (Only when explicitly enabled) */}
        {isDevLoginEnabled && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Local Dev Mode (Synthetic Telemetry)
          </span>
        )}

        {/* User profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1.5">
              {user?.full_name}
              {getRoleBadge(user?.role)}
            </div>
            <Link
              to="/my-fleets"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center justify-end gap-1"
              title="Click to Switch or Add Fleets"
            >
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{activeFleetName || user?.fleet_name || 'JK Tyre Headquarters'}</span>
              <span className="text-[9px] text-slate-400 font-normal">▾</span>
            </Link>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

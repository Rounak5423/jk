import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Fleet } from '../../types';
import {
  Building2,
  Search,
  Truck,
  Disc,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const MyFleetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFleetId, setActiveFleet } = useAuthStore();
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchFleets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/fleets/my-fleets', { params });
      setFleets(res.data.fleets || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load authorized fleets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleets();
  }, [search, statusFilter]);

  const handleSelectFleet = (fleet: Fleet) => {
    setActiveFleet(fleet.id, fleet.name);
    navigate('/dashboard');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-graphite tracking-tight">My Authorized Fleets</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Fleet Portfolio
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Commercial fleets and subsidiaries assigned to your account ({user?.email}).
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fleet, city, or reg..."
              className="bg-white border border-bordergray rounded-xl pl-9 pr-4 py-2 text-xs text-graphite placeholder-secondary focus:outline-none focus:border-fleet focus:ring-1 focus:ring-fleet shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            onClick={fetchFleets}
            className="p-2 bg-white border border-bordergray rounded-xl text-secondary hover:text-graphite shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fleets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-bordergray p-6 shadow-sm animate-pulse h-64" />
          ))}
        </div>
      ) : fleets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-bordergray p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-secondary/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-graphite">No Fleets Found</h3>
          <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
            {search
              ? `No authorized fleets match "${search}". Try broadening your search query.`
              : 'There are currently no fleets authorized for your user credentials.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleets.map((fleet) => {
            const isActive = activeFleetId === fleet.id;
            const health = fleet.health_summary || { healthy: 0, warning: 0, critical: 0 };
            const totalHealthCount = health.healthy + health.warning + health.critical;

            return (
              <div
                key={fleet.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm flex flex-col ${
                  isActive
                    ? 'border-fleet ring-2 ring-fleet/30 shadow-md'
                    : 'border-bordergray hover:border-slate-300 hover:shadow'
                }`}
              >
                {/* Card Top */}
                <div className="p-6 pb-4 border-b border-bordergray/60">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-graphite">
                          Active Selection
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          fleet.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {fleet.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-graphite tracking-tight line-clamp-1">{fleet.name}</h3>
                  <div className="text-[11px] text-secondary flex items-center gap-1 mt-0.5">
                    <span>Reg: {fleet.registration_no || 'Unassigned'}</span>
                    {fleet.city && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-secondary/70 inline" />
                          {fleet.city}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="p-6 py-4 grid grid-cols-3 gap-2 border-b border-bordergray/60 bg-softgrey/30">
                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-secondary mb-1">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.vehicle_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Vehicles</div>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-secondary mb-1">
                      <Disc className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.fitted_tyres_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Fitted Tyres</div>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-amber-600 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.active_alerts_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Active Alerts</div>
                  </div>
                </div>

                {/* Health Summary */}
                <div className="p-6 py-4 border-b border-bordergray/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-secondary">Tyre Health Overview</span>
                    <span className="text-[10px] font-bold text-graphite">{totalHealthCount} Evaluated</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {health.healthy} Healthy
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {health.warning} Warning
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {health.critical} Critical
                    </span>
                  </div>
                </div>

                {/* Contact info & Action */}
                <div className="p-6 pt-4 mt-auto space-y-3">
                  <div className="space-y-1 text-[11px] text-secondary">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-secondary/60 shrink-0" />
                      <span className="truncate">{fleet.contact_email}</span>
                    </div>
                    {fleet.contact_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-secondary/60 shrink-0" />
                        <span>{fleet.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectFleet(fleet)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isActive
                        ? 'bg-graphite text-white hover:bg-black'
                        : 'bg-fleet hover:bg-yellow-400 text-graphite'
                    }`}
                  >
                    <span>{isActive ? 'Manage Current Fleet' : 'Open Fleet'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

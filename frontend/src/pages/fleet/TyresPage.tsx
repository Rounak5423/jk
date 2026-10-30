import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Tyre } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, Activity } from 'lucide-react';
import { TyreCard } from '../../components/tyre/TyreCard';
import { useAuthStore } from '../../store/authStore';

export const TyresPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: tyres, isLoading } = useQuery<Tyre[]>({
    queryKey: ['fleet-tyres', activeFleetId, statusFilter, healthFilter],
    queryFn: async () => {
      let url = '/tyres?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (healthFilter) url += `health=${healthFilter}&`;
      const res = await api.get(url);
      return res.data;
    },
  });

  // Client-side search filter (serial_number, model, brand)
  const filteredTyres = (tyres ?? []).filter((t) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.serial_number.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q)
    );
  });

  // Summary counts from filtered results
  const healthyCount = filteredTyres.filter((t) => t.thi_status === 'HEALTHY').length;
  const warningCount = filteredTyres.filter((t) => t.thi_status === 'WARNING').length;
  const criticalCount = filteredTyres.filter((t) => t.thi_status === 'CRITICAL').length;

  const healthFilterOptions: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'HEALTHY', label: 'Healthy' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  function getHealthFilterButtonClasses(value: string): string {
    const isActive = healthFilter === value;
    if (!isActive) {
      return 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-blue-50';
    }
    switch (value) {
      case 'HEALTHY':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      case 'WARNING':
        return 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]';
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border border-red-300';
      default:
        return 'bg-blue-600 text-white border border-blue-700';
    }
  }

  return (
    <div className="space-y-6">

      {/* 1. Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tyre Lifecycle Management</h1>
        <p className="text-xs text-[#5B6068] mt-0.5">Visual condition overview</p>
      </div>

      {/* 2. Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Healthy */}
        <div className="bg-white border border-slate-200 border-t-2 border-t-emerald-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <ShieldCheck className="w-8 h-8 text-[#5B6068] shrink-0" />
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{healthyCount}</div>
            <div className="text-xs text-emerald-600 font-semibold">Healthy</div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-white border border-slate-200 border-t-2 border-t-[#E8770E] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <AlertTriangle className={`w-8 h-8 shrink-0 ${warningCount > 0 ? 'text-[#E8770E]' : 'text-[#5B6068]'}`} />
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{warningCount}</div>
            <div className="text-xs text-[#E8770E] font-semibold">Warning</div>
          </div>
        </div>

        {/* Critical */}
        <div className="bg-white border border-slate-200 border-t-2 border-t-red-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <AlertCircle className={`w-8 h-8 shrink-0 ${criticalCount > 0 ? 'text-red-500' : 'text-[#5B6068]'}`} />
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{criticalCount}</div>
            <div className="text-xs text-red-500 font-semibold">Critical</div>
          </div>
        </div>
      </div>

      {/* 3. Search + filter controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search input */}
        <input
          type="search"
          placeholder="Search by serial number or model…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2
                     text-xs text-slate-900 placeholder-slate-400
                     focus:outline-none focus:border-blue-500"
        />

        {/* Health filter pill buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {healthFilterOptions.map(({ value, label }) => (
            <button
              key={value || 'ALL'}
              onClick={() => setHealthFilter(value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${getHealthFilterButtonClasses(value)}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status dropdown — retained, de-emphasized */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2
                     text-xs text-slate-900 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="FITTED">Fitted</option>
          <option value="IN_INVENTORY">In Depot</option>
          <option value="RETREADING">Retreading</option>
          <option value="SCRAPPED">Scrapped</option>
        </select>
      </div>

      {/* 4. Loading state */}
      {isLoading && (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-blue-500" />
          Loading tyre registry…
        </div>
      )}

      {/* 5. Empty state */}
      {!isLoading && filteredTyres.length === 0 && (tyres ?? []).length > 0 && (
        <div className="py-20 text-center text-xs text-slate-400">
          No tyres match your search.
        </div>
      )}
      {!isLoading && (tyres ?? []).length === 0 && (
        <div className="py-20 text-center text-xs text-slate-400">
          No tyres found for this fleet.
        </div>
      )}

      {/* 6. Tyre card grid */}
      {!isLoading && filteredTyres.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTyres.map((t) => (
            <TyreCard key={t.id} tyre={t} />
          ))}
        </div>
      )}

    </div>
  );
};

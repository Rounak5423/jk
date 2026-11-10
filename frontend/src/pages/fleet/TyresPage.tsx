import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Tyre } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, Activity, Trash2, CheckCircle2, X } from 'lucide-react';
import { TyreCard } from '../../components/tyre/TyreCard';
import { useAuthStore } from '../../store/authStore';

export const TyresPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showRemovePickerModal, setShowRemovePickerModal] = useState(false);
  const [selectedRemoveTyreId, setSelectedRemoveTyreId] = useState('');
  const [tyreToRemove, setTyreToRemove] = useState<Tyre | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const { data: inventoryTyres } = useQuery<Tyre[]>({
    queryKey: ['inventory-tyres-count', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/tyres?status=IN_INVENTORY');
      return res.data;
    },
  });

  const inventoryCount = inventoryTyres?.length ?? 0;

  const invalidateTyreQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-tyres-count'] });
    queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
    queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary'] });
  };

  const clearInventoryMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/tyres/inventory');
      return res.data;
    },
    onSuccess: (data) => {
      invalidateTyreQueries();
      setShowClearModal(false);
      setActionError(null);
      setActionSuccess(data.message || 'Cleared all tyres from depot inventory.');
    },
    onError: (err: any) => {
      setShowClearModal(false);
      setActionError(err.response?.data?.error || 'Failed to clear depot inventory.');
    },
  });

  const removeTyreMutation = useMutation({
    mutationFn: async (tyreId: string) => {
      const res = await api.delete(`/tyres/${tyreId}`);
      return res.data;
    },
    onSuccess: (data) => {
      invalidateTyreQueries();
      setTyreToRemove(null);
      setShowRemovePickerModal(false);
      setSelectedRemoveTyreId('');
      setActionError(null);
      setActionSuccess(data.message || 'Tyre permanently removed.');
    },
    onError: (err: any) => {
      setTyreToRemove(null);
      setActionError(err.response?.data?.error || 'Failed to remove tyre.');
    },
  });

  const dismountTyreMutation = useMutation({
    mutationFn: async (tyreId: string) => {
      const res = await api.post(`/tyres/${tyreId}/remove`, {
        removal_reason: 'DISMOUNTED_FROM_REGISTRY',
      });
      return res.data;
    },
    onSuccess: (data) => {
      invalidateTyreQueries();
      setTyreToRemove(null);
      setShowRemovePickerModal(false);
      setSelectedRemoveTyreId('');
      setActionError(null);
      setActionSuccess(data.message || 'Tyre dismounted and moved to depot inventory.');
    },
    onError: (err: any) => {
      setTyreToRemove(null);
      setActionError(err.response?.data?.error || 'Failed to dismount tyre.');
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
      return 'bg-cream text-slate-500 border border-gold-light';
    }
    switch (value) {
      case 'HEALTHY':
        return 'bg-emerald-500 text-white';
      case 'WARNING':
        return 'bg-amber-500 text-white';
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      default:
        return 'bg-brand-gold text-black border border-gold-border';
    }
  }

  return (
    <div className="space-y-6">

      {/* 1. Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tyre Lifecycle Management</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Visual condition overview • Depot Inventory: <span className="font-bold text-brand-gold">{inventoryCount}</span> unmounted tyre(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedRemoveTyreId((tyres ?? [])[0]?.id || '');
              setShowRemovePickerModal(true);
            }}
            disabled={!tyres || tyres.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              tyres && tyres.length > 0
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Remove Tyre
          </button>

          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            disabled={inventoryCount === 0 || clearInventoryMutation.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              inventoryCount > 0
                ? 'bg-red-900/90 hover:bg-red-700 text-white border border-red-500/40 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Clear Inventory ({inventoryCount})
          </button>
        </div>
      </div>

      {/* Feedback banners */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Healthy */}
        <div className="black-glow-card border-t-2 border-t-emerald-400 p-4 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <div className="text-2xl font-black text-white leading-tight">{healthyCount}</div>
            <div className="text-xs text-emerald-400 font-semibold">Healthy</div>
          </div>
        </div>

        {/* Warning */}
        <div className="black-glow-card border-t-2 border-t-[#E8770E] p-4 flex items-center gap-3">
          <AlertTriangle className={`w-8 h-8 shrink-0 ${warningCount > 0 ? 'text-[#E8770E]' : 'text-slate-400'}`} />
          <div>
            <div className="text-2xl font-black text-white leading-tight">{warningCount}</div>
            <div className="text-xs text-[#E8770E] font-semibold">Warning</div>
          </div>
        </div>

        {/* Critical */}
        <div className="black-glow-card border-t-2 border-t-red-400 p-4 flex items-center gap-3">
          <AlertCircle className={`w-8 h-8 shrink-0 ${criticalCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
          <div>
            <div className="text-2xl font-black text-white leading-tight">{criticalCount}</div>
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
          className="flex-1 bg-cream border border-gold-border rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-gold"
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
          className="bg-cream border border-gold-border rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-gold"
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
          No tyres found for this filter.
        </div>
      )}

      {/* 6. Tyre card grid */}
      {!isLoading && filteredTyres.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTyres.map((t) => (
            <TyreCard key={t.id} tyre={t} onRemove={(tyre) => setTyreToRemove(tyre)} />
          ))}
        </div>
      )}

      {/* Confirm Clear All Inventory Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Clear Depot Inventory?</h3>
                <p className="text-xs text-slate-500">This permanently removes all unmounted inventory tyres.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              You are about to remove all <strong className="text-red-600">{inventoryCount} tyre(s)</strong> currently in{' '}
              <span className="font-mono font-semibold">IN_INVENTORY</span> status. Tyres actively mounted on vehicles will not be affected.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => clearInventoryMutation.mutate()}
                disabled={clearInventoryMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {clearInventoryMutation.isPending ? 'Removing…' : `Remove All ${inventoryCount} Tyres`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Header Quick Remove Tyre Picker Modal */}
      {showRemovePickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Remove Tyre</h3>
                <p className="text-xs text-slate-500">Select a tyre to dismount or permanently remove</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Tyre</label>
              <select
                value={selectedRemoveTyreId}
                onChange={(e) => setSelectedRemoveTyreId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              >
                {(tyres ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.serial_number} — {t.model} ({t.status === 'FITTED' ? `Fitted ${t.active_fitment?.wheel_position || ''}` : t.status})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const target = (tyres ?? []).find((t) => t.id === selectedRemoveTyreId);
              if (!target) return null;
              return (
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRemovePickerModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  {target.status === 'FITTED' && (
                    <button
                      type="button"
                      onClick={() => dismountTyreMutation.mutate(target.id)}
                      disabled={dismountTyreMutation.isPending || removeTyreMutation.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 transition"
                    >
                      {dismountTyreMutation.isPending ? 'Dismounting…' : 'Dismount to Inventory'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTyreMutation.mutate(target.id)}
                    disabled={removeTyreMutation.isPending || dismountTyreMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {removeTyreMutation.isPending ? 'Removing…' : 'Delete Permanently'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirm Single Tyre Removal Modal (triggered from TyreCard) */}
      {tyreToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Remove Tyre?</h3>
                <p className="text-xs font-mono text-slate-500">{tyreToRemove.serial_number}</p>
              </div>
            </div>

            {tyreToRemove.status === 'FITTED' ? (
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>{tyreToRemove.brand} {tyreToRemove.model}</strong> is currently fitted at position{' '}
                <strong className="font-mono">{tyreToRemove.active_fitment?.wheel_position || 'mounted'}</strong>.
                You can either dismount it back to depot inventory or permanently delete it from the fleet.
              </p>
            ) : (
              <p className="text-xs text-slate-700">
                Permanently delete <strong>{tyreToRemove.brand} {tyreToRemove.model}</strong> ({tyreToRemove.size}) from the fleet registry?
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTyreToRemove(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              {tyreToRemove.status === 'FITTED' && (
                <button
                  type="button"
                  onClick={() => dismountTyreMutation.mutate(tyreToRemove.id)}
                  disabled={dismountTyreMutation.isPending || removeTyreMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 transition"
                >
                  {dismountTyreMutation.isPending ? 'Dismounting…' : 'Dismount to Inventory'}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeTyreMutation.mutate(tyreToRemove.id)}
                disabled={removeTyreMutation.isPending || dismountTyreMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removeTyreMutation.isPending ? 'Removing…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

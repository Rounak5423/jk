import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle, Tyre } from '../../types';
import {
  Wrench,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Disc,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PositionData {
  fitment_id: string;
  wheel_position: string;
  axle_number: number;
  is_dual: boolean;
  is_inner: boolean;
  fitted_at: string | null;
  fitted_odometer: number;
  fitted_nsd: number;
  tyre: {
    id: string;
    serial_number: string;
    model: string;
    size: string;
    blueprint_nsd: number;
    current_nsd: number;
    current_thi: number;
    thi_status: string;
    total_km_run: number;
    lifecycle_type: string;
    status: string;
  } | null;
  latest_inspection: any | null;
  has_inspection_data: boolean;
}

type LifecycleType = 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP';

function getLifecycleBadge(lt: LifecycleType | string) {
  switch (lt) {
    case 'NEW':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'REUSE':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'RETREAD':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'SCRAP':
      return 'bg-red-100 text-red-700 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

function getTHIBadge(status: string) {
  switch (status) {
    case 'HEALTHY':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'WARNING':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'CRITICAL':
      return 'bg-red-100 text-red-700 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

export const FitmentPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Fit modal state
  const [showFitModal, setShowFitModal] = useState(false);
  const [fitPosition, setFitPosition] = useState('');
  const [fitAxle, setFitAxle] = useState(1);
  const [fitTyreId, setFitTyreId] = useState('');
  const [fitOdometer, setFitOdometer] = useState('');
  const [fitNsd, setFitNsd] = useState('');
  const [fitRemarks, setFitRemarks] = useState('');
  const [fitError, setFitError] = useState<string | null>(null);

  // Remove modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removePosition, setRemovePosition] = useState<PositionData | null>(null);
  const [removalReason, setRemovalReason] = useState('DEPOT_REMOVAL');
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: vehicleData, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle-fitment-summary', selectedVehicleId, activeFleetId],
    queryFn: async () => {
      const res = await api.get(`/inspections/vehicle/${selectedVehicleId}`);
      return res.data;
    },
    enabled: !!selectedVehicleId,
  });

  const { data: availableTyres } = useQuery<Tyre[]>({
    queryKey: ['available-tyres', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/tyres/available');
      return res.data;
    },
    enabled: showFitModal,
  });

  const fitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(`/tyres/${payload.tyre_id}/fit`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary', selectedVehicleId] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      setShowFitModal(false);
      resetFitForm();
    },
    onError: (err: any) => {
      setFitError(err.response?.data?.error || 'Failed to fit tyre.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ tyreId, reason }: { tyreId: string; reason: string }) => {
      const res = await api.post(`/tyres/${tyreId}/remove`, { removal_reason: reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary', selectedVehicleId] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      setShowRemoveModal(false);
      setRemovePosition(null);
      setRemovalReason('DEPOT_REMOVAL');
      setRemoveError(null);
    },
    onError: (err: any) => {
      setRemoveError(err.response?.data?.error || 'Failed to remove tyre.');
    },
  });

  const resetFitForm = () => {
    setFitPosition('');
    setFitAxle(1);
    setFitTyreId('');
    setFitOdometer('');
    setFitNsd('');
    setFitRemarks('');
    setFitError(null);
  };

  const openFitModal = (position: string, axle: number) => {
    resetFitForm();
    setFitPosition(position);
    setFitAxle(axle);
    if (vehicleData?.vehicle?.current_odometer) {
      setFitOdometer(vehicleData.vehicle.current_odometer.toString());
    }
    setShowFitModal(true);
  };

  const openRemoveModal = (pos: PositionData) => {
    setRemovePosition(pos);
    setRemovalReason('DEPOT_REMOVAL');
    setRemoveError(null);
    setShowRemoveModal(true);
  };

  const handleFitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFitError(null);
    if (!fitTyreId || !fitPosition || !selectedVehicleId) {
      setFitError('Select a tyre and ensure a vehicle and position are set.');
      return;
    }
    fitMutation.mutate({
      tyre_id: fitTyreId,
      vehicle_id: selectedVehicleId,
      wheel_position: fitPosition,
      axle_number: fitAxle,
      fitted_odometer: fitOdometer ? parseFloat(fitOdometer) : undefined,
      fitted_nsd: fitNsd ? parseFloat(fitNsd) : undefined,
      remarks: fitRemarks,
    });
  };

  const handleRemoveConfirm = () => {
    if (!removePosition?.tyre?.id) return;
    removeMutation.mutate({ tyreId: removePosition.tyre.id, reason: removalReason });
  };

  const positions: PositionData[] = vehicleData?.positions ?? [];
  const fittedCount = positions.filter((p) => p.tyre !== null).length;
  const vacantCount = positions.filter((p) => p.tyre === null).length;
  const selectedVehicle = vehicles?.find((v) => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tyre Fitment Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Install, remove, rotate, and transfer tyres across wheel positions.
        </p>
      </div>

      {/* Vehicle Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="block text-xs font-semibold text-slate-700 mb-2">Select Vehicle</label>
        <select
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          className="w-full max-w-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="">Choose a vehicle...</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number} — {v.wheel_config} ({v.make} {v.model})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      {selectedVehicleId && vehicleData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <Truck className="w-7 h-7 text-slate-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{positions.length}</div>
              <div className="text-xs text-slate-500">Total Positions</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{fittedCount}</div>
              <div className="text-xs text-emerald-600">Fitted</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{vacantCount}</div>
              <div className="text-xs text-amber-600">Vacant</div>
            </div>
          </div>
        </div>
      )}

      {/* Positions Grid */}
      {selectedVehicleId && vehicleLoading && (
        <div className="py-16 text-center text-xs text-slate-400">Loading vehicle positions...</div>
      )}

      {selectedVehicleId && !vehicleLoading && vehicleData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Wheel Positions — {selectedVehicle?.vehicle_number}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos: PositionData) => {
              const tyre = pos.tyre;
              const isFitted = tyre !== null;

              return (
                <div
                  key={pos.fitment_id}
                  className={`border rounded-xl p-4 flex flex-col gap-3 transition ${
                    isFitted
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-50 border-dashed border-amber-300'
                  }`}
                >
                  {/* Position Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                      {pos.wheel_position}
                    </span>
                    {isFitted ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Fitted
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Vacant
                      </span>
                    )}
                  </div>

                  {/* Tyre Info */}
                  {tyre ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Disc className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-900 truncate">{tyre.serial_number}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">{tyre.model} • {tyre.size}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getTHIBadge(tyre.thi_status)}`}>
                          {tyre.thi_status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadge(tyre.lifecycle_type)}`}>
                          {tyre.lifecycle_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        NSD: <span className="text-slate-900 font-mono">{tyre.current_nsd} mm</span>
                        {' · '}THI: <span className="text-slate-900 font-mono">{tyre.current_thi?.toFixed(1)}/100</span>
                      </div>
                      <button
                        onClick={() => openRemoveModal(pos)}
                        className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Tyre
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Disc className="w-8 h-8 text-slate-300" />
                      <span className="text-[11px] text-slate-400">No tyre fitted</span>
                      <button
                        onClick={() => openFitModal(pos.wheel_position, pos.axle_number)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Fit Tyre
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedVehicleId && (
        <div className="py-16 text-center text-xs text-slate-400">
          Select a vehicle above to manage its tyre fitments.
        </div>
      )}

      {/* Fit Tyre Modal */}
      {showFitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-blue-200 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowFitModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Wrench className="w-5 h-5 text-blue-600" /> Fit Tyre to Position {fitPosition}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Select an available tyre and confirm fitment details.
            </p>

            {fitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fitError}</span>
              </div>
            )}

            <form onSubmit={handleFitSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Available Tyre *</label>
                <select
                  value={fitTyreId}
                  onChange={(e) => {
                    setFitTyreId(e.target.value);
                    const t = availableTyres?.find((x) => x.id === e.target.value);
                    if (t) setFitNsd(t.current_nsd.toString());
                  }}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose tyre...</option>
                  {availableTyres?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.serial_number} — {t.model} [{t.lifecycle_type}] ({t.current_nsd} mm NSD)
                    </option>
                  ))}
                </select>
                {availableTyres?.length === 0 && (
                  <p className="text-amber-600 text-[11px] mt-1">No available tyres in depot inventory.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Odometer at Fitment (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fitOdometer}
                    onChange={(e) => setFitOdometer(e.target.value)}
                    placeholder="e.g. 45200"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NSD at Fitment (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    value={fitNsd}
                    onChange={(e) => setFitNsd(e.target.value)}
                    placeholder="e.g. 16.5"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Fitment Remarks</label>
                <textarea
                  rows={2}
                  value={fitRemarks}
                  onChange={(e) => setFitRemarks(e.target.value)}
                  placeholder="Optional notes about this fitment..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={fitMutation.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                {fitMutation.isPending ? 'Fitting Tyre...' : `Fit Tyre to ${fitPosition}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Remove Tyre Modal */}
      {showRemoveModal && removePosition && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-blue-200 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRemoveModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Trash2 className="w-5 h-5 text-red-500" /> Remove Tyre from {removePosition.wheel_position}
            </h3>
            <p className="text-xs text-slate-500 mb-1">
              Tyre: <span className="font-mono text-slate-900">{removePosition.tyre?.serial_number}</span>
            </p>
            <p className="text-xs text-slate-500 mb-5">
              The tyre will be returned to depot inventory.
            </p>

            {removeError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{removeError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Removal Reason</label>
                <select
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="DEPOT_REMOVAL">Depot Removal</option>
                  <option value="ROTATION">Rotation</option>
                  <option value="DAMAGED">Damaged / Defective</option>
                  <option value="RETREADING">Sending for Retread</option>
                  <option value="REPLACEMENT">Replacement</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-semibold text-xs transition bg-slate-50 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveConfirm}
                  disabled={removeMutation.isPending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50"
                >
                  {removeMutation.isPending ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

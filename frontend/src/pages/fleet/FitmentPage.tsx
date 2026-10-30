import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Layers,
  Sparkles,
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
      return 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]';
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
      return 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]';
    case 'CRITICAL':
      return 'bg-red-100 text-red-700 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

const COMMON_JK_MODELS = [
  'Jetway JUH5',
  'Jetsteel JDH3',
  'Jetway JUC3',
  'Jetway JUM',
  'Jetsteel JDL',
  'Jetway JUH',
];

const COMMON_SIZES = [
  '295/80R22.5',
  '10.00R20',
  '11R22.5',
  '295/90R20',
  '315/80R22.5',
];

export const FitmentPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query param to auto-select vehicle if routed from Add Vehicle
  const initialVehicleId = searchParams.get('vehicle_id') || '';
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);

  useEffect(() => {
    const qId = searchParams.get('vehicle_id') || '';
    if (qId && qId !== selectedVehicleId) {
      setSelectedVehicleId(qId);
    }
  }, [searchParams]);

  // Fit / Add Tyre Modal State
  const [showFitModal, setShowFitModal] = useState(false);
  const [fitMode, setFitMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [fitPosition, setFitPosition] = useState('');
  const [fitAxle, setFitAxle] = useState(1);
  const [fitTyreId, setFitTyreId] = useState('');
  const [fitOdometer, setFitOdometer] = useState('');
  const [fitNsd, setFitNsd] = useState('');
  const [fitRemarks, setFitRemarks] = useState('');
  const [fitError, setFitError] = useState<string | null>(null);

  // New Tyre Form fields (for Tab 2 in Fit Modal, or Add Tyre Modal)
  const [newSerial, setNewSerial] = useState('');
  const [newBrand, setNewBrand] = useState('JK Tyre');
  const [newModel, setNewModel] = useState('Jetway JUH5');
  const [newSize, setNewSize] = useState('295/80R22.5');
  const [newBlueprintNsd, setNewBlueprintNsd] = useState('16.5');
  const [newCurrentNsd, setNewCurrentNsd] = useState('16.5');
  const [newLifecycle, setNewLifecycle] = useState('NEW');

  // Add Tyre to Depot Inventory Modal State
  const [showAddTyreModal, setShowAddTyreModal] = useState(false);
  const [depotSerial, setDepotSerial] = useState('');
  const [depotBrand, setDepotBrand] = useState('JK Tyre');
  const [depotModel, setDepotModel] = useState('Jetway JUH5');
  const [depotSize, setDepotSize] = useState('295/80R22.5');
  const [depotBlueprintNsd, setDepotBlueprintNsd] = useState('16.5');
  const [depotCurrentNsd, setDepotCurrentNsd] = useState('16.5');
  const [depotLifecycle, setDepotLifecycle] = useState('NEW');
  const [depotTargetVehicleId, setDepotTargetVehicleId] = useState('');
  const [depotTargetPosition, setDepotTargetPosition] = useState('');
  const [depotError, setDepotError] = useState<string | null>(null);
  const [depotSuccess, setDepotSuccess] = useState<string | null>(null);

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
    enabled: showFitModal || showAddTyreModal,
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
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setShowFitModal(false);
      resetFitForm();
    },
    onError: (err: any) => {
      setFitError(err.response?.data?.error || 'Failed to fit tyre.');
    },
  });

  const registerAndFitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tyres', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary', selectedVehicleId] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setShowFitModal(false);
      resetFitForm();
    },
    onError: (err: any) => {
      setFitError(err.response?.data?.error || 'Failed to register and mount tyre.');
    },
  });

  const createDepotTyreMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tyres', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary', selectedVehicleId] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setDepotSuccess(data.message || 'Tyre registered successfully!');
      setTimeout(() => {
        setShowAddTyreModal(false);
        resetDepotForm();
      }, 900);
    },
    onError: (err: any) => {
      setDepotError(err.response?.data?.error || 'Failed to register tyre.');
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
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
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
    setNewSerial('');
    setNewBrand('JK Tyre');
    setNewModel('Jetway JUH5');
    setNewSize('295/80R22.5');
    setNewBlueprintNsd('16.5');
    setNewCurrentNsd('16.5');
    setNewLifecycle('NEW');
  };

  const resetDepotForm = () => {
    setDepotSerial('');
    setDepotBrand('JK Tyre');
    setDepotModel('Jetway JUH5');
    setDepotSize('295/80R22.5');
    setDepotBlueprintNsd('16.5');
    setDepotCurrentNsd('16.5');
    setDepotLifecycle('NEW');
    setDepotTargetVehicleId('');
    setDepotTargetPosition('');
    setDepotError(null);
    setDepotSuccess(null);
  };

  const openFitModal = (position: string, axle: number) => {
    resetFitForm();
    setFitPosition(position);
    setFitAxle(axle);
    if (vehicleData?.vehicle?.current_odometer) {
      setFitOdometer(vehicleData.vehicle.current_odometer.toString());
    }
    // If no tyres in depot, default immediately to Tab 2 ("NEW") so user is not blocked
    if (!availableTyres || availableTyres.length === 0) {
      setFitMode('NEW');
    } else {
      setFitMode('EXISTING');
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

    if (fitMode === 'EXISTING') {
      if (!fitTyreId || !fitPosition || !selectedVehicleId) {
        setFitError('Select an available tyre from the inventory.');
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
    } else {
      // Register & Fit New Tyre mode
      if (!fitPosition || !selectedVehicleId) {
        setFitError('Target vehicle and wheel position are required.');
        return;
      }
      registerAndFitMutation.mutate({
        serial_number: newSerial.trim().toUpperCase() || undefined,
        brand: newBrand.trim(),
        model: newModel.trim(),
        size: newSize.trim(),
        blueprint_nsd: parseFloat(newBlueprintNsd) || 16.5,
        current_nsd: parseFloat(newCurrentNsd) || 16.5,
        lifecycle_type: newLifecycle,
        vehicle_id: selectedVehicleId,
        wheel_position: fitPosition,
        axle_number: fitAxle,
      });
    }
  };

  const handleDepotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepotError(null);
    setDepotSuccess(null);

    createDepotTyreMutation.mutate({
      serial_number: depotSerial.trim().toUpperCase() || undefined,
      brand: depotBrand.trim(),
      model: depotModel.trim(),
      size: depotSize.trim(),
      blueprint_nsd: parseFloat(depotBlueprintNsd) || 16.5,
      current_nsd: parseFloat(depotCurrentNsd) || 16.5,
      lifecycle_type: depotLifecycle,
      vehicle_id: depotTargetVehicleId || undefined,
      wheel_position: depotTargetPosition || undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tyre Fitment Management</h1>
          <p className="text-xs text-[#5B6068] mt-0.5">
            Install, remove, rotate, and mount tyres across commercial vehicle wheel positions.
          </p>
        </div>

        {/* Global Add Tyre Action */}
        <button
          onClick={() => {
            resetDepotForm();
            if (selectedVehicleId) {
              setDepotTargetVehicleId(selectedVehicleId);
            }
            setShowAddTyreModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold text-xs rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Tyre to Inventory
        </button>
      </div>

      {/* Vehicle Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="block text-xs font-semibold text-slate-700 mb-2">Select Fleet Vehicle</label>
        <select
          value={selectedVehicleId}
          onChange={(e) => {
            setSelectedVehicleId(e.target.value);
            if (e.target.value) {
              setSearchParams({ vehicle_id: e.target.value });
            } else {
              setSearchParams({});
            }
          }}
          className="w-full max-w-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-yellow-500 font-semibold"
        >
          <option value="">Choose a vehicle to inspect &amp; fit tyres...</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number} — {v.wheel_config} ({v.make} {v.model})
            </option>
          ))}
        </select>
      </div>

      {/* Vacant Positions Notice & Quick Fit Banner */}
      {selectedVehicleId && vacantCount > 0 && (
        <div className="bg-[#FFF4EB] border border-[#FCD5B5] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8770E]/15 text-[#E8770E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {vacantCount} vacant wheel position{vacantCount > 1 ? 's' : ''} detected on {selectedVehicle?.vehicle_number}
              </div>
              <div className="text-[11px] text-[#5B6068]">
                Select any vacant position below to choose from depot inventory or register &amp; mount a brand new JK Tyre directly.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const firstVacant = positions.find((p) => p.tyre === null);
              if (firstVacant) {
                openFitModal(firstVacant.wheel_position, firstVacant.axle_number);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold text-xs rounded-xl shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Fit Next ({positions.find((p) => p.tyre === null)?.wheel_position || 'Vacant'})
          </button>
        </div>
      )}

      {/* Summary Bar */}
      {selectedVehicleId && vehicleData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <Truck className="w-7 h-7 text-slate-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{positions.length}</div>
              <div className="text-xs text-[#5B6068]">Total Wheel Positions</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{fittedCount}</div>
              <div className="text-xs text-emerald-600 font-semibold">Mounted Tyres</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-7 h-7 text-[#E8770E] shrink-0" />
            <div>
              <div className="text-lg font-black text-slate-900">{vacantCount}</div>
              <div className="text-xs text-[#E8770E] font-semibold">Vacant Positions</div>
            </div>
          </div>
        </div>
      )}

      {/* Positions Grid */}
      {selectedVehicleId && vehicleLoading && (
        <div className="py-16 text-center text-xs text-[#5B6068]">Loading vehicle positions...</div>
      )}

      {selectedVehicleId && !vehicleLoading && vehicleData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Disc className="w-4 h-4 text-[#5B6068]" /> Wheel Positions — {selectedVehicle?.vehicle_number}
            </h2>
            <span className="text-xs text-[#5B6068] font-mono">
              {fittedCount} / {positions.length} wheels equipped
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos: PositionData) => {
              const tyre = pos.tyre;
              const isFitted = tyre !== null;

              return (
                <div
                  key={pos.fitment_id}
                  className={`border rounded-2xl p-4 flex flex-col gap-3 transition ${
                    isFitted
                      ? 'bg-slate-50/60 border-slate-200'
                      : 'bg-[#FFF4EB]/30 border-dashed border-[#FCD5B5]'
                  }`}
                >
                  {/* Position Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {pos.wheel_position}
                    </span>
                    {isFitted ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Fitted
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#E8770E] bg-[#FFF4EB] px-2 py-0.5 rounded-full border border-[#FCD5B5]">
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
                      <div className="text-[#5B6068] text-[11px]">{tyre.model} • {tyre.size}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getTHIBadge(tyre.thi_status)}`}>
                          {tyre.thi_status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadge(tyre.lifecycle_type)}`}>
                          {tyre.lifecycle_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5B6068]">
                        NSD: <span className="text-slate-900 font-mono font-bold">{tyre.current_nsd} mm</span>
                        {' · '}THI: <span className="text-slate-900 font-mono font-bold">{tyre.current_thi?.toFixed(1)}/100</span>
                      </div>
                      <button
                        onClick={() => openRemoveModal(pos)}
                        className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Tyre
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <Disc className="w-8 h-8 text-slate-300" />
                      <span className="text-[11px] text-[#5B6068]">No tyre fitted</span>
                      <button
                        onClick={() => openFitModal(pos.wheel_position, pos.axle_number)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add / Fit Tyre
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
        <div className="py-16 text-center text-xs text-[#5B6068] bg-white border border-slate-200 rounded-2xl shadow-sm">
          Select a commercial vehicle above to view its wheel positions and fit tyres.
        </div>
      )}

      {/* ── Fit / Add Tyre Modal ── */}
      {showFitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowFitModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Fit Tyre to Position {fitPosition}
              </h3>
            </div>
            <p className="text-xs text-[#5B6068] mb-4">
              Vehicle: <span className="font-mono font-bold text-slate-900">{selectedVehicle?.vehicle_number}</span> ({selectedVehicle?.wheel_config})
            </p>

            {/* Mode Toggle Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFitMode('EXISTING')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  fitMode === 'EXISTING'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-[#5B6068] hover:text-slate-900'
                }`}
              >
                Choose from Inventory ({availableTyres?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setFitMode('NEW')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  fitMode === 'NEW'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-[#5B6068] hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#E8770E]" /> Register &amp; Mount New Tyre
              </button>
            </div>

            {fitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fitError}</span>
              </div>
            )}

            <form onSubmit={handleFitSubmit} className="space-y-4 text-xs">
              {fitMode === 'EXISTING' ? (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Available Inventory Tyre <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={fitTyreId}
                      onChange={(e) => {
                        setFitTyreId(e.target.value);
                        const t = availableTyres?.find((x) => x.id === e.target.value);
                        if (t) setFitNsd(t.current_nsd.toString());
                      }}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">Choose unmounted tyre from depot...</option>
                      {availableTyres?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.serial_number} — {t.model} [{t.lifecycle_type}] ({t.current_nsd} mm NSD, THI {t.current_thi?.toFixed(0)})
                        </option>
                      ))}
                    </select>

                    {(!availableTyres || availableTyres.length === 0) && (
                      <div className="mt-2 p-3 bg-[#FFF4EB] border border-[#FCD5B5] rounded-xl text-xs text-[#E8770E] flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>No unmounted tyres currently available in depot inventory.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFitMode('NEW')}
                          className="self-start text-xs font-bold text-slate-900 underline hover:no-underline"
                        >
                          → Switch to &quot;Register &amp; Mount New Tyre&quot; to add one now
                        </button>
                      </div>
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Fitment Remarks</label>
                    <textarea
                      rows={2}
                      value={fitRemarks}
                      onChange={(e) => setFitRemarks(e.target.value)}
                      placeholder="Optional notes or torque verification..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </>
              ) : (
                /* ── Register & Fit New Tyre Tab ── */
                <>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#5B6068]">
                    <span className="font-semibold text-slate-900">New Tyre Registration:</span> This will instantly register the tyre into your fleet and mount it to wheel position <span className="font-mono font-bold text-slate-900">{fitPosition}</span>.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Tyre Serial Number
                      </label>
                      <input
                        type="text"
                        value={newSerial}
                        onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                        placeholder="e.g. JK-984210 (or auto)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                      <span className="text-[10px] text-[#5B6068] mt-0.5 block">
                        Leave blank to auto-generate branded serial
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Manufacturer Brand</label>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tyre Pattern / Model</label>
                      <input
                        type="text"
                        list="jk-models-list"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                      />
                      <datalist id="jk-models-list">
                        {COMMON_JK_MODELS.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Commercial Size</label>
                      <input
                        type="text"
                        list="jk-sizes-list"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                      <datalist id="jk-sizes-list">
                        {COMMON_SIZES.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Blueprint NSD (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newBlueprintNsd}
                        onChange={(e) => setNewBlueprintNsd(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Current NSD (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newCurrentNsd}
                        onChange={(e) => setNewCurrentNsd(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Lifecycle</label>
                      <select
                        value={newLifecycle}
                        onChange={(e) => setNewLifecycle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                      >
                        <option value="NEW">NEW</option>
                        <option value="REUSE">REUSE</option>
                        <option value="RETREAD">RETREAD</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={fitMutation.isPending || registerAndFitMutation.isPending}
                className="w-full py-3 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {fitMutation.isPending || registerAndFitMutation.isPending
                  ? 'Saving and Mounting Tyre...'
                  : fitMode === 'EXISTING'
                  ? `Fit Selected Tyre to ${fitPosition}`
                  : `Register & Mount Tyre to ${fitPosition}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Global Add Tyre to Inventory Modal ── */}
      {showAddTyreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAddTyreModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Register Tyre to Fleet Depot
              </h3>
            </div>
            <p className="text-xs text-[#5B6068] mb-4">
              Add new, reused, or retreaded commercial tyres into fleet inventory or immediately mount to a vehicle.
            </p>

            {depotError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depotError}</span>
              </div>
            )}

            {depotSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{depotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDepotSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={depotSerial}
                    onChange={(e) => setDepotSerial(e.target.value.toUpperCase())}
                    placeholder="e.g. JK-582910"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-[#5B6068] mt-0.5 block">
                    Leave blank to auto-generate branded JK-XXXXXX
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Manufacturer Brand</label>
                  <input
                    type="text"
                    value={depotBrand}
                    onChange={(e) => setDepotBrand(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Model / Pattern</label>
                  <input
                    type="text"
                    list="depot-models-list"
                    value={depotModel}
                    onChange={(e) => setDepotModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                  />
                  <datalist id="depot-models-list">
                    {COMMON_JK_MODELS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tyre Size</label>
                  <input
                    type="text"
                    list="depot-sizes-list"
                    value={depotSize}
                    onChange={(e) => setDepotSize(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                  <datalist id="depot-sizes-list">
                    {COMMON_SIZES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Blueprint NSD (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={depotBlueprintNsd}
                    onChange={(e) => setDepotBlueprintNsd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current NSD (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={depotCurrentNsd}
                    onChange={(e) => setDepotCurrentNsd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lifecycle</label>
                  <select
                    value={depotLifecycle}
                    onChange={(e) => setDepotLifecycle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="NEW">NEW</option>
                    <option value="REUSE">REUSE</option>
                    <option value="RETREAD">RETREAD</option>
                  </select>
                </div>
              </div>

              {/* Optional immediate vehicle mounting */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-slate-700 font-semibold text-xs">
                  Immediate Mount (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={depotTargetVehicleId}
                    onChange={(e) => setDepotTargetVehicleId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-yellow-500 text-xs"
                  >
                    <option value="">Keep in Depot Inventory (Unmounted)</option>
                    {vehicles?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.wheel_config})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={depotTargetPosition}
                    onChange={(e) => setDepotTargetPosition(e.target.value.toUpperCase())}
                    placeholder="Wheel pos (e.g. A1-L)"
                    disabled={!depotTargetVehicleId}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-yellow-500 font-mono text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTyreModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDepotTyreMutation.isPending}
                  className="px-5 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {createDepotTyreMutation.isPending ? 'Registering...' : 'Register Tyre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Tyre Modal ── */}
      {showRemoveModal && removePosition && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRemoveModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Trash2 className="w-5 h-5 text-red-500" /> Remove Tyre from {removePosition.wheel_position}
            </h3>
            <p className="text-xs text-[#5B6068] mb-1">
              Tyre: <span className="font-mono text-slate-900 font-bold">{removePosition.tyre?.serial_number}</span>
            </p>
            <p className="text-xs text-[#5B6068] mb-5">
              The tyre will be dismounted and returned to depot inventory.
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
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
                  type="button"
                  onClick={() => setShowRemoveModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-semibold text-xs transition bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveConfirm}
                  disabled={removeMutation.isPending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer"
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

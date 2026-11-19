import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Sparkles,
  Fuel,
  MapPin,
  Disc,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  X,
  PlusCircle,
  Award,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

export const DriverActivitiesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Selected vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Modals state
  const [activeModal, setActiveModal] = useState<'REFUELING' | 'STOP_ODOMETER' | 'TYRE_CHECK' | null>(null);

  // Refueling form state
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelReceipt, setFuelReceipt] = useState('');
  const [fuelNotes, setFuelNotes] = useState('');

  // Stop & Odometer form state
  const [stopReason, setStopReason] = useState('Driver Rest & Meal');
  const [stopLocation, setStopLocation] = useState('');
  const [stopOdo, setStopOdo] = useState('');
  const [stopNotes, setStopNotes] = useState('');

  // Tyre Walkaround form state
  const [tyresChecked, setTyresChecked] = useState('12');
  const [visualCondition, setVisualCondition] = useState('Normal - All tyres in good condition');
  const [tyreOdo, setTyreOdo] = useState('');
  const [tyreNotes, setTyreNotes] = useState('');

  // Status message
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Fetch all fleet vehicles
  const { data: fleetVehicles = [] } = useQuery<any[]>({
    queryKey: ['driver-fleet-vehicles'],
    queryFn: async () => {
      const res = await api.get('/driver/fleet-vehicles');
      return res.data;
    },
  });

  // Fetch driver assigned vehicle (fallback)
  const { data: vehicleData } = useQuery<{ vehicle: any | null }>({
    queryKey: ['driver-assigned-vehicle'],
    queryFn: async () => {
      const res = await api.get('/driver/assigned-vehicle');
      return res.data;
    },
  });

  // Fetch driver activities
  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery<{
    assigned_activities: any[];
    activities: any[];
  }>({
    queryKey: ['driver-activities'],
    queryFn: async () => {
      const res = await api.get('/driver/activities');
      return res.data;
    },
  });

  // Fetch rewards summary
  const { data: rewardsData } = useQuery<{
    points_balance: number;
    discount_value: number;
    lifetime_earned: number;
    tier_badge: string;
  }>({
    queryKey: ['driver-rewards-data'],
    queryFn: async () => {
      const res = await api.get('/driver/rewards');
      return res.data;
    },
  });

  // Auto-select first vehicle
  useEffect(() => {
    if (!selectedVehicleId && (vehicleData?.vehicle?.id || (fleetVehicles.length > 0 && fleetVehicles[0].id))) {
      setSelectedVehicleId(vehicleData?.vehicle?.id || fleetVehicles[0].id);
    }
  }, [vehicleData, fleetVehicles, selectedVehicleId]);

  const activeVehicle = fleetVehicles.find((v) => v.id === selectedVehicleId) || vehicleData?.vehicle;

  // Activity submit mutation
  const activityMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/driver/activities', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['driver-activities'] });
      queryClient.invalidateQueries({ queryKey: ['driver-rewards-data'] });
      queryClient.invalidateQueries({ queryKey: ['driver-fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-vehicle'] });
      setActiveModal(null);
      setMsg({
        type: 'success',
        text: `Activity verified! Earned +${resData.points_earned} points (₹${resData.discount_value} JK Tyre Discount).`,
      });
      // Reset forms
      setFuelLitres('');
      setFuelCost('');
      setFuelStation('');
      setFuelReceipt('');
      setFuelNotes('');
      setStopLocation('');
      setStopNotes('');
      setTyreNotes('');
    },
    onError: (err: any) => {
      setMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit driver activity.',
      });
    },
  });

  const handleOpenModal = (type: 'REFUELING' | 'STOP_ODOMETER' | 'TYRE_CHECK') => {
    const odo = activeVehicle?.current_odometer?.toString() || '';
    if (type === 'REFUELING') {
      setFuelOdo(odo);
    } else if (type === 'STOP_ODOMETER') {
      setStopOdo(odo);
    } else if (type === 'TYRE_CHECK') {
      setTyreOdo(odo);
      setTyresChecked(activeVehicle?.expected_tyre_count?.toString() || '12');
    }
    setActiveModal(type);
  };

  const handleSubmitActivity = (e: React.FormEvent, type: 'REFUELING' | 'STOP_ODOMETER' | 'TYRE_CHECK') => {
    e.preventDefault();
    setMsg(null);

    let payload: any = {
      activity_type: type,
      vehicle_id: activeVehicle?.id,
    };

    if (type === 'REFUELING') {
      payload = {
        ...payload,
        odometer: parseFloat(fuelOdo),
        location: fuelStation,
        notes: fuelNotes,
        metadata: {
          fuel_litres: parseFloat(fuelLitres),
          fuel_cost: parseFloat(fuelCost),
          station_name: fuelStation,
          receipt_no: fuelReceipt,
        },
      };
    } else if (type === 'STOP_ODOMETER') {
      payload = {
        ...payload,
        odometer: parseFloat(stopOdo),
        location: stopLocation,
        notes: stopNotes,
        metadata: {
          stop_reason: stopReason,
          stop_location: stopLocation,
        },
      };
    } else if (type === 'TYRE_CHECK') {
      payload = {
        ...payload,
        odometer: parseFloat(tyreOdo),
        notes: tyreNotes,
        metadata: {
          tyres_checked: parseInt(tyresChecked, 10),
          visual_condition: visualCondition,
        },
      };
    }

    activityMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-gold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Driver Duty Workspace
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Assigned Driver Activities</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Perform assigned commercial vehicle duties (refueling, stoppage checkpoints, and physical tyre audits)
            to accumulate instant JK Tyre discounts and update fleet telemetry in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Wallet Balance</span>
              <span className="text-base font-black text-white font-mono">
                {(rewardsData?.points_balance ?? 0).toLocaleString()} pts
              </span>
              <span className="text-[10px] text-emerald-400 ml-1 font-bold">
                (₹{(rewardsData?.discount_value ?? 0).toLocaleString()})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            msg.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span className="font-semibold">{msg.text}</span>
          </div>
          <button type="button" onClick={() => setMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Vehicle Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Truck className="w-5 h-5 text-brand-gold" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Duty Vehicle
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 font-mono">
                {activeVehicle?.vehicle_number || 'No Vehicle Selected'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {activeVehicle?.wheel_config || '12-Wheeler'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Tap Vehicle Toggle Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Switch Truck:</span>
          {fleetVehicles.map((fv) => (
            <button
              key={fv.id}
              type="button"
              onClick={() => setSelectedVehicleId(fv.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center gap-1.5 ${
                selectedVehicleId === fv.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{fv.vehicle_number}</span>
              <span className="text-[10px] opacity-75 font-mono">({fv.current_odometer?.toLocaleString()} km)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3 Core Activity Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Activity 1: Refueling */}
        <div className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-5 shadow-sm flex flex-col justify-between transition group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Fuel className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +50 Pts (₹50)
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition">
                Log Fuel Refill
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Record litres pumped, fuel total cost, station location, and upload pump receipt for audit.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Updates fuel expense in admin dashboard
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal('REFUELING')}
            className="mt-5 w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Fuel className="w-4 h-4 text-amber-700" />
            Launch Refueling Form
          </button>
        </div>

        {/* Activity 2: Stoppage & Odometer */}
        <div className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-5 shadow-sm flex flex-col justify-between transition group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +30 Pts (₹30)
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-800 transition">
                Stop &amp; Odometer Halt
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Log intermediate halts (toll, driver rest dhaba, client delivery) and update verified odometer.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Updates vehicle odometer &amp; halt telemetry
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal('STOP_ODOMETER')}
            className="mt-5 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <MapPin className="w-4 h-4 text-blue-700" />
            Launch Checkpoint Form
          </button>
        </div>

        {/* Activity 3: Tyre Walkaround */}
        <div className="bg-white border border-slate-200 hover:border-purple-400 rounded-3xl p-5 shadow-sm flex flex-col justify-between transition group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                <Disc className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +40 Pts (₹40)
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-800 transition">
                Tyre Walkaround Audit
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Perform visual inspection on fitted commercial radials (cuts, embedded debris, pressure status).
              </p>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Certified commercial physical walkaround
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal('TYRE_CHECK')}
            className="mt-5 w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Disc className="w-4 h-4 text-purple-700" />
            Launch Tyre Check Form
          </button>
        </div>
      </div>

      {/* Submission Log Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Your Duty Submissions Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of activities submitted by you. Verified entries directly sync to Corporate OEM Vault.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {activitiesData?.activities?.length || 0} Total Records
          </span>
        </div>

        {(!activitiesData?.activities || activitiesData.activities.length === 0) ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No duty activities logged yet. Tap any of the 3 action cards above to submit your first activity.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Location / Station</th>
                  <th className="py-3 px-4">Details &amp; Notes</th>
                  <th className="py-3 px-4 text-right">Points Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activitiesData.activities.map((act: any) => {
                  const meta = act.metadata || {};
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {act.created_at ? new Date(act.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {act.activity_type === 'REFUELING' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-300 inline-flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-amber-600" /> Refueling
                          </span>
                        )}
                        {act.activity_type === 'STOP_ODOMETER' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-300 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600" /> Stoppage
                          </span>
                        )}
                        {act.activity_type === 'TYRE_CHECK' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-300 inline-flex items-center gap-1">
                            <Disc className="w-3 h-3 text-purple-600" /> Tyre Check
                          </span>
                        )}
                        {act.activity_type === 'TRIP_SCORE_REWARD' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-300 inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-600" /> Journey Score
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {act.vehicle_number || act.vehicle_id?.slice(0, 8) || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {act.odometer ? `${act.odometer.toLocaleString()} km` : '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {act.location || meta.station_name || meta.stop_location || 'En route'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {act.activity_type === 'REFUELING' && (
                          <span className="font-semibold text-amber-900 font-mono">
                            {meta.fuel_litres ? `${meta.fuel_litres} L` : ''}
                            {meta.fuel_cost ? ` (₹${meta.fuel_cost.toLocaleString()})` : ''}
                          </span>
                        )}
                        {act.activity_type === 'STOP_ODOMETER' && (
                          <span className="font-semibold text-blue-900">
                            {meta.stop_reason || act.title}
                          </span>
                        )}
                        {act.activity_type === 'TYRE_CHECK' && (
                          <span className="font-semibold text-purple-900">
                            {meta.visual_condition || '12 Wheels Verified'}
                          </span>
                        )}
                        {act.activity_type === 'TRIP_SCORE_REWARD' && (
                          <span className="font-mono text-emerald-800">
                            Score: {meta.trip_score ?? 'N/A'}/100 • {meta.distance_km ?? 0} km
                          </span>
                        )}
                        {act.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">{act.notes}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        +{act.points_earned || 0} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Modal: Refueling Log */}
      {activeModal === 'REFUELING' && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Fuel Refill</h3>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +50 Points (₹50 JK Tyre Discount)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmitActivity(e, 'REFUELING')} className="space-y-3.5 text-xs">
              {fleetVehicles.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commercial Vehicle *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      const sel = fleetVehicles.find((v) => v.id === e.target.value);
                      if (sel) setFuelOdo(sel.current_odometer?.toString() || '');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {fleetVehicles.map((fv) => (
                      <option key={fv.id} value={fv.id}>
                        {fv.vehicle_number} ({fv.wheel_config}) • Verified Odo: {fv.current_odometer?.toLocaleString()} km
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fuel Litres (L) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    placeholder="e.g. 160.0"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Cost (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    placeholder="e.g. 14400"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Fuel Station &amp; Location *</label>
                <input
                  type="text"
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  placeholder="e.g. IOCL Highway Oasis, NH-48 Km 182"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Odometer (km) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelOdo}
                    onChange={(e) => setFuelOdo(e.target.value)}
                    placeholder={activeVehicle?.current_odometer?.toString() || '0'}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Receipt / Invoice #</label>
                  <input
                    type="text"
                    value={fuelReceipt}
                    onChange={(e) => setFuelReceipt(e.target.value)}
                    placeholder="e.g. INV-88219"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Additional Notes</label>
                <input
                  type="text"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  placeholder="e.g. Full tank diesel before long expressway segment"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activityMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-brand-gold hover:bg-brand-warm-gold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Fuel className="w-4 h-4" />
                  {activityMutation.isPending ? 'Submitting…' : 'Submit & Claim +50 Pts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Stop & Odometer Checkpoint */}
      {activeModal === 'STOP_ODOMETER' && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Stop Checkpoint</h3>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +30 Points (₹30 JK Tyre Discount)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmitActivity(e, 'STOP_ODOMETER')} className="space-y-3.5 text-xs">
              {fleetVehicles.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commercial Vehicle *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      const sel = fleetVehicles.find((v) => v.id === e.target.value);
                      if (sel) setStopOdo(sel.current_odometer?.toString() || '');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {fleetVehicles.map((fv) => (
                      <option key={fv.id} value={fv.id}>
                        {fv.vehicle_number} ({fv.wheel_config}) • Verified Odo: {fv.current_odometer?.toLocaleString()} km
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Halt / Stop Reason *</label>
                <select
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="Driver Rest & Meal">Driver Rest &amp; Meal (Dhaba / Plaza)</option>
                  <option value="Toll Plaza / Border Inspection">Toll Plaza / State Border Checkpoint</option>
                  <option value="Customer Loading / Unloading">Customer Loading / Hub Unloading</option>
                  <option value="Weighbridge Verification">Weighbridge Tare / Gross Weighing</option>
                  <option value="Highway Congestion / Hold">Highway Traffic / Roadwork Delay</option>
                  <option value="Scheduled Maintenance Pause">Scheduled Tyre / Fluid Check Pause</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Checkpoint Location *</label>
                <input
                  type="text"
                  value={stopLocation}
                  onChange={(e) => setStopLocation(e.target.value)}
                  placeholder="e.g. Shree Ganesh Dhaba, Km 320 NH-48"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Odometer (km) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={stopOdo}
                  onChange={(e) => setStopOdo(e.target.value)}
                  placeholder={activeVehicle?.current_odometer?.toString() || '0'}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This reading updates vehicle odometer directly in the admin dashboard.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Checkpoint Notes</label>
                <input
                  type="text"
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="e.g. Mandatory 45-min rest period observed"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activityMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-brand-gold hover:bg-brand-warm-gold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  {activityMutation.isPending ? 'Submitting…' : 'Submit & Claim +30 Pts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Tyre Walkaround Inspection */}
      {activeModal === 'TYRE_CHECK' && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Disc className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Tyre Walkaround</h3>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +40 Points (₹40 JK Tyre Discount)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmitActivity(e, 'TYRE_CHECK')} className="space-y-3.5 text-xs">
              {fleetVehicles.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commercial Vehicle *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      const sel = fleetVehicles.find((v) => v.id === e.target.value);
                      if (sel) {
                        setTyreOdo(sel.current_odometer?.toString() || '');
                        setTyresChecked(sel.expected_tyre_count?.toString() || '12');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {fleetVehicles.map((fv) => (
                      <option key={fv.id} value={fv.id}>
                        {fv.vehicle_number} ({fv.wheel_config}) • Verified Odo: {fv.current_odometer?.toLocaleString()} km
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Odometer (km) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tyreOdo}
                    onChange={(e) => setTyreOdo(e.target.value)}
                    placeholder={activeVehicle?.current_odometer?.toString() || '0'}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tyres Inspected Count *</label>
                  <input
                    type="number"
                    min="2"
                    max="22"
                    value={tyresChecked}
                    onChange={(e) => setTyresChecked(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Visual Tyre Condition *</label>
                <select
                  value={visualCondition}
                  onChange={(e) => setVisualCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                >
                  <option value="Normal - All tyres in good condition">Normal — All radial tyres intact &amp; satisfactory</option>
                  <option value="Minor Pressure Drop Observed">Minor Pressure Drop Observed (Inflated at stop)</option>
                  <option value="Uneven Tread Wear Noticed">Uneven Tread Wear Noticed on Steer / Drive</option>
                  <option value="Foreign Stone / Nail Cleared">Stone / Foreign debris trapped in grooves cleared</option>
                  <option value="Sidewall Scuff / Cut Detected">Sidewall Scuff / Minor Cut Detected</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inspection Notes</label>
                <input
                  type="text"
                  value={tyreNotes}
                  onChange={(e) => setTyreNotes(e.target.value)}
                  placeholder="e.g. Cleaned stone trapped in tread grooves, all pressures ok"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activityMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-brand-gold hover:bg-brand-warm-gold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Disc className="w-4 h-4" />
                  {activityMutation.isPending ? 'Submitting…' : 'Submit & Claim +40 Pts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


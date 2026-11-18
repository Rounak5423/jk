import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { offlineQueue, QueuedItem } from '../../services/offlineQueue';
import { Vehicle, Trip, Alert } from '../../types';
import {
  Smartphone,
  Truck,
  Route,
  Play,
  Square,
  AlertTriangle,
  ClipboardCheck,
  RefreshCw,
  Camera,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Gift,
  Tag,
  Award,
  ArrowRight,
  Fuel,
  MapPin,
  Disc,
  X,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const DriverPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueItems, setQueueItems] = useState<QueuedItem[]>(offlineQueue.getItems());

  // Trip Start form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startOdo, setStartOdo] = useState('');

  // Trip End form state
  const [endOdo, setEndOdo] = useState('');

  // Assigned Activity Modal state
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
  const [tyresChecked, setTyresChecked] = useState('10');
  const [visualCondition, setVisualCondition] = useState('Normal - All tyres in good condition');
  const [tyreOdo, setTyreOdo] = useState('');
  const [tyreNotes, setTyreNotes] = useState('');

  // Error/Success messages
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleFlushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: vehicleData } = useQuery<{ vehicle: Vehicle | null }>({
    queryKey: ['driver-assigned-vehicle'],
    queryFn: async () => {
      const res = await api.get('/driver/assigned-vehicle');
      return res.data;
    },
  });

  const { data: fleetVehicles = [] } = useQuery<any[]>({
    queryKey: ['driver-fleet-vehicles'],
    queryFn: async () => {
      const res = await api.get('/driver/fleet-vehicles');
      return res.data;
    },
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: activeTripData } = useQuery<{ trip: Trip | null }>({
    queryKey: ['driver-active-trip'],
    queryFn: async () => {
      const res = await api.get('/driver/active-trip');
      return res.data;
    },
  });

  const { data: driverAlerts } = useQuery<Alert[]>({
    queryKey: ['driver-alerts'],
    queryFn: async () => {
      const res = await api.get('/driver/alerts');
      return res.data;
    },
  });

  const { data: rewardsData } = useQuery<{
    points_balance: number;
    discount_value: number;
    lifetime_earned: number;
    tier_badge: string;
    vouchers: any[];
  }>({
    queryKey: ['driver-rewards-data'],
    queryFn: async () => {
      const res = await api.get('/driver/rewards');
      return res.data;
    },
  });

  const { data: activitiesData } = useQuery<{
    assigned_activities: any[];
    activities: any[];
  }>({
    queryKey: ['driver-activities'],
    queryFn: async () => {
      const res = await api.get('/driver/activities');
      return res.data;
    },
  });

  useEffect(() => {
    if (!selectedVehicleId && (vehicleData?.vehicle?.id || (fleetVehicles.length > 0 && fleetVehicles[0].id))) {
      setSelectedVehicleId(vehicleData?.vehicle?.id || fleetVehicles[0].id);
    }
  }, [vehicleData, fleetVehicles, selectedVehicleId]);

  const vehicle = fleetVehicles.find((v) => v.id === selectedVehicleId) || vehicleData?.vehicle;
  const activeTrip = activeTripData?.trip;

  const activityMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/driver/activities', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['driver-activities'] });
      queryClient.invalidateQueries({ queryKey: ['driver-rewards-data'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-vehicle'] });
      setActiveModal(null);
      setMsg({
        type: 'success',
        text: `Activity verified! Earned +${resData.points_earned} points (₹${resData.discount_value} JK Tyre Discount).`,
      });
      // Reset fields
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
    const odo = vehicle?.current_odometer?.toString() || '';
    if (type === 'REFUELING') {
      setFuelOdo(odo);
    } else if (type === 'STOP_ODOMETER') {
      setStopOdo(odo);
    } else if (type === 'TYRE_CHECK') {
      setTyreOdo(odo);
      setTyresChecked(vehicle?.expected_tyre_count?.toString() || '10');
    }
    setActiveModal(type);
  };

  const handleSubmitActivity = (e: React.FormEvent, type: 'REFUELING' | 'STOP_ODOMETER' | 'TYRE_CHECK') => {
    e.preventDefault();
    setMsg(null);

    let payload: any = {
      activity_type: type,
      vehicle_id: vehicle?.id,
      trip_id: activeTrip?.id,
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

  // Pre-fill start odometer from selected vehicle current odometer
  useEffect(() => {
    if (vehicle) {
      setStartOdo(vehicle.current_odometer.toString());
    }
  }, [vehicle?.id, vehicle?.current_odometer]);

  const handleFlushQueue = async () => {
    const res = await offlineQueue.flush();
    setQueueItems(offlineQueue.getItems());
    queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] });
    queryClient.invalidateQueries({ queryKey: ['driver-assigned-vehicle'] });
    if (res.synced > 0) {
      setMsg({ type: 'success', text: `Synchronized ${res.synced} offline records with fleet portal.` });
    }
  };

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!vehicle) return;

    const payload = {
      vehicle_id: vehicle.id,
      origin,
      destination,
      start_odometer: parseFloat(startOdo),
    };

    if (!navigator.onLine) {
      offlineQueue.enqueue('TRIP_START', payload);
      setQueueItems(offlineQueue.getItems());
      setMsg({ type: 'success', text: 'Offline mode: Trip departure queued locally. Will sync when connected.' });
      return;
    }

    try {
      await api.post('/driver/start-trip', payload);
      queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-vehicle'] });
      setMsg({ type: 'success', text: 'Trip started successfully. Have a safe journey!' });
      setOrigin('');
      setDestination('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to start trip.' });
    }
  };

  const handleEndTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!activeTrip) return;

    const payload = {
      trip_id: activeTrip.id,
      end_odometer: parseFloat(endOdo),
    };

    if (!navigator.onLine) {
      offlineQueue.enqueue('TRIP_END', payload);
      setQueueItems(offlineQueue.getItems());
      setMsg({ type: 'success', text: 'Offline mode: Trip arrival queued locally. Will sync when connected.' });
      return;
    }

    try {
      await api.post('/driver/end-trip', payload);
      queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-vehicle'] });
      setMsg({ type: 'success', text: 'Trip completed and submitted to Fleet Owner portal.' });
      setEndOdo('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to complete trip.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Connectivity Status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#5B6068]" />
            <span className="text-xs font-bold text-[#5B6068] uppercase tracking-wider">Driver Mobile Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Active Duty Console</h1>
        </div>

        {/* Online / Offline Status Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'error'
              ? 'bg-red-100 border border-red-200 text-red-700'
              : 'bg-emerald-100 border border-emerald-200 text-emerald-700'
          }`}
        >
          {msg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Offline Queue Indicator */}
      {queueItems.length > 0 && (
        <div className="bg-[#FFF4EB] border border-[#FCD5B5] p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-[#E8770E] animate-spin" />
            <div>
              <div className="text-xs font-bold text-slate-900">
                {queueItems.length} submission(s) pending offline sync
              </div>
              <div className="text-[11px] text-[#5B6068]">
                Data saved securely on device. Retry automatically on connection.
              </div>
            </div>
          </div>
          <button
            onClick={handleFlushQueue}
            className="px-3 py-1.5 bg-cream hover:bg-[#FFF9E8] text-slate-900 border border-gold-light rounded-lg text-xs font-semibold transition shadow-sm"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Driver Rewards & Product Discounts Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-gold-border/60 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-brand-gold">
                <Gift className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                JK Tyre Driver Rewards
              </span>
              {rewardsData?.tier_badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {rewardsData.tier_badge}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-white font-mono">
                ₹{(rewardsData?.points_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({(rewardsData?.points_balance ?? 0).toLocaleString()} reward pts available)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Redeemable as instant discounts on JK commercial tyres, retreads &amp; tubes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/driver/rewards"
              className="px-4 py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black rounded-xl text-xs font-bold transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              {(rewardsData?.points_balance ?? 0) > 0 ? 'Redeem Discount' : 'View Rewards Wallet'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Operating Commercial Vehicle Card */}
      <div className="black-glow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-gold" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6068]">
              Operating Commercial Vehicle
            </span>
          </div>

          <div className="flex items-center gap-3">
            {fleetVehicles.length > 1 && !activeTrip && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Select Vehicle:</span>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 cursor-pointer shadow-sm focus:outline-none focus:border-brand-gold"
                >
                  {fleetVehicles.map((fv) => (
                    <option key={fv.id} value={fv.id}>
                      {fv.vehicle_number} ({fv.wheel_config}) • {fv.current_odometer?.toLocaleString()} km
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Target: {vehicle?.baseline_pressure || 130} psi
            </span>
          </div>
        </div>

        {vehicle ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
                  {vehicle.vehicle_number}
                  <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Fleet Asset
                  </span>
                </div>
                <div className="text-xs text-[#5B6068] mt-1">
                  {vehicle.wheel_config} ({vehicle.axle_count} Axles) • {vehicle.make} {vehicle.model}
                </div>
              </div>

              {fleetVehicles.length > 1 && !activeTrip && (
                <div className="flex items-center gap-2">
                  {fleetVehicles.map((fv) => (
                    <button
                      key={fv.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(fv.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        selectedVehicleId === fv.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {fv.vehicle_number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[#5B6068] block mb-0.5">Verified Odometer:</span>
                <span className="font-bold text-slate-900 font-mono text-base">
                  {vehicle.current_odometer?.toLocaleString()} km
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[#5B6068] block mb-0.5">Fitted Tyres:</span>
                <span className="font-bold text-slate-900 text-base">
                  {vehicle.fitted_tyre_count ?? vehicle.expected_tyre_count} / {vehicle.expected_tyre_count} tyres fitted
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#5B6068] py-4">No vehicle currently selected.</div>
        )}
      </div>

      {/* Assigned Operational Activities & Instant Rewards */}
      <div className="bg-cream border border-gold-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Driver Action Items
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Assigned Activities &amp; Bonus Rewards
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update refueling logs, checkpoint odometers, and tyre checks during duty to earn instant JK Tyre discount points.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-500/10 text-amber-800 border border-amber-300 rounded-full text-xs font-semibold">
            Trip Score + Activities Combined
          </span>
        </div>

        {/* 3 Activity Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Activity 1: Refueling */}
          <div className="bg-white border border-slate-200 hover:border-brand-gold/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Fuel className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +50 Pts (₹50)
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition">
                Refueling Log
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Log fuel litres pumped, pump cost, fuel station name, and current odometer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('REFUELING')}
              className="mt-4 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Fuel className="w-3.5 h-3.5 text-amber-700" />
              Log Fuel Refill
            </button>
          </div>

          {/* Activity 2: Stop & Odometer */}
          <div className="bg-white border border-slate-200 hover:border-brand-gold/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +30 Pts (₹30)
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-800 transition">
                Stop &amp; Odometer
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Log intermediate halts (rest, toll plaza, client loading) and verify current odometer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('STOP_ODOMETER')}
              className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-700" />
              Log Stop Checkpoint
            </button>
          </div>

          {/* Activity 3: Tyre Walkaround */}
          <div className="bg-white border border-slate-200 hover:border-brand-gold/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Disc className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +40 Pts (₹40)
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-800 transition">
                Tyre Walkaround
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Perform visual inspection on fitted commercial radial tyres (cuts, stones, wear).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('TYRE_CHECK')}
              className="mt-4 w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Disc className="w-3.5 h-3.5 text-purple-700" />
              Log Tyre Check
            </button>
          </div>
        </div>

        {/* Driver Recent Submissions Mini Feed */}
        {activitiesData?.activities && activitiesData.activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Your Recent Submissions ({activitiesData.activities.length})
              </span>
              <span className="text-[11px] text-slate-500">Syncs directly to Fleet Admin Console</span>
            </div>

            <div className="space-y-2">
              {activitiesData.activities.slice(0, 4).map((act: any) => (
                <div
                  key={act.id}
                  className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      {act.activity_type === 'REFUELING' ? (
                        <Fuel className="w-4 h-4 text-amber-600" />
                      ) : act.activity_type === 'STOP_ODOMETER' ? (
                        <MapPin className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Disc className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{act.title}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {act.location && <span>📍 {act.location}</span>}
                        {act.odometer && <span className="font-mono">Odo: {act.odometer.toLocaleString()} km</span>}
                        <span>• {new Date(act.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shrink-0 text-xs">
                    +{act.points_earned} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Trip or Start Trip Form */}
      {activeTrip ? (
        // Active Trip in progress
        <div className="cream-glow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6068] flex items-center gap-1.5">
              <Route className="w-4 h-4 text-[#5B6068]" /> Trip Currently In Progress
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
              ACTIVE
            </span>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900">{activeTrip.origin} → {activeTrip.destination}</div>
            <div className="text-xs text-[#5B6068] font-mono mt-0.5">Trip Code: {activeTrip.trip_code}</div>
            <div className="text-xs text-[#5B6068] mt-2">
              Departure Odometer: <span className="font-mono text-slate-900 font-bold">{activeTrip.start_odometer.toLocaleString()} km</span>
            </div>
          </div>

          {/* End Trip Form */}
          <form onSubmit={handleEndTrip} className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival Odometer Reading (km) *
              </label>
              <input
                type="number"
                step="0.1"
                min={activeTrip.start_odometer + 0.1}
                value={endOdo}
                onChange={(e) => setEndOdo(e.target.value)}
                placeholder={`Must be > ${activeTrip.start_odometer}`}
                required
                className="w-full bg-cream border border-gold-border rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" /> Complete Journey &amp; Submit Trip
            </button>
          </form>
        </div>
      ) : (
        // Start Trip Form
        <div className="cream-glow-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Play className="w-4 h-4 text-[#5B6068]" /> Start New Journey
          </h3>

          <form onSubmit={handleStartTrip} className="space-y-4 text-xs">
            {/* Fleet Commercial Vehicle Selector */}
            <div className="bg-white/80 border-2 border-brand-gold/40 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-gold" />
                  Select Vehicle for this Journey *
                </label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Fleet Multi-Vehicle Access
                </span>
              </div>

              <select
                value={selectedVehicleId}
                onChange={(e) => {
                  setSelectedVehicleId(e.target.value);
                  const sel = fleetVehicles.find((v) => v.id === e.target.value);
                  if (sel) setStartOdo(sel.current_odometer?.toString() || '');
                }}
                required
                className="w-full bg-cream border border-gold-border rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 cursor-pointer shadow-inner"
              >
                {fleetVehicles.length > 0 ? (
                  fleetVehicles.map((fv) => (
                    <option key={fv.id} value={fv.id}>
                      {fv.vehicle_number} — {fv.make || 'Commercial Truck'} {fv.model || ''} ({fv.wheel_config}) • Verified Odometer: {fv.current_odometer?.toLocaleString()} km
                    </option>
                  ))
                ) : vehicle ? (
                  <option value={vehicle.id}>
                    {vehicle.vehicle_number} — {vehicle.wheel_config} • Verified Odometer: {vehicle.current_odometer?.toLocaleString()} km
                  </option>
                ) : (
                  <option value="">Loading fleet vehicles…</option>
                )}
              </select>

              {fleetVehicles.length > 1 && (
                <div className="flex items-center gap-2 pt-1">
                  {fleetVehicles.map((fv) => (
                    <button
                      key={fv.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(fv.id);
                        setStartOdo(fv.current_odometer?.toString() || '');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                        selectedVehicleId === fv.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-brand-gold/50'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-brand-gold/60'
                      }`}
                    >
                      <span className="font-mono">{fv.vehicle_number}</span>
                      <span className="text-[10px] opacity-75 font-normal">{fv.current_odometer?.toLocaleString()} km</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                You can drive any commercial vehicle under this fleet. Tap any vehicle above to switch immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Origin Hub *</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Delhi Depot"
                  required
                  className="w-full bg-cream border border-gold-border rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Destination Hub *</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Jaipur Freight Yard"
                  required
                  className="w-full bg-cream border border-gold-border rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Departure Odometer Reading (km) *
              </label>
              <input
                type="number"
                step="0.1"
                min={vehicle?.current_odometer || 0}
                value={startOdo}
                onChange={(e) => setStartOdo(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Start Journey
            </button>
          </form>
        </div>
      )}

      {/* Driver Tyre Alerts */}
      <div className="bg-cream border border-gold-border p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E8770E]" /> Active Vehicle Tyre Alerts
        </h3>

        {!driverAlerts || driverAlerts.length === 0 ? (
          <div className="text-xs text-[#5B6068] py-3">No active tyre alerts for your vehicle.</div>
        ) : (
          <div className="space-y-2">
            {driverAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{a.wheel_position || 'Tyre'}: {a.code}</span>
                  <div className="text-[#5B6068] text-[11px] mt-0.5">{a.explanation}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  a.severity === 'WARNING'
                    ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {a.severity}
                </span>
              </div>
            ))}
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
                  placeholder="e.g. IOCL COCO Toll Plaza, NH-48 Km 182"
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
                    placeholder={vehicle?.current_odometer?.toString() || '0'}
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
                  placeholder={vehicle?.current_odometer?.toString() || '0'}
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
                    placeholder={vehicle?.current_odometer?.toString() || '0'}
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
                <label className="block text-slate-700 font-semibold mb-1">Inspection Notes &amp; Observations</label>
                <input
                  type="text"
                  value={tyreNotes}
                  onChange={(e) => setTyreNotes(e.target.value)}
                  placeholder="e.g. Verified dual tyre spacing and cleared small stones"
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


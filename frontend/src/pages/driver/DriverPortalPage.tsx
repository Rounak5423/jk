import React, { useState, useEffect } from 'react';
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

  const vehicle = vehicleData?.vehicle;
  const activeTrip = activeTripData?.trip;

  // Pre-fill start odometer from vehicle current odometer
  useEffect(() => {
    if (vehicle && !startOdo) {
      setStartOdo(vehicle.current_odometer.toString());
    }
  }, [vehicle]);

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header & Connectivity Status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Driver Mobile Portal</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Active Duty Console</h1>
        </div>

        {/* Online / Offline Status Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}
        >
          {msg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Offline Queue Indicator */}
      {queueItems.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <div className="text-xs font-bold text-white">
                {queueItems.length} submission(s) pending offline sync
              </div>
              <div className="text-[11px] text-slate-400">
                Data saved securely on device. Retry automatically on connection.
              </div>
            </div>
          </div>
          <button
            onClick={handleFlushQueue}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Assigned Vehicle Card */}
      <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-400" /> Assigned Commercial Vehicle
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Target: {vehicle?.baseline_pressure} psi
          </span>
        </div>

        {vehicle ? (
          <div>
            <div className="text-2xl font-black text-white font-mono">{vehicle.vehicle_number}</div>
            <div className="text-xs text-slate-400 mt-1">
              {vehicle.wheel_config} ({vehicle.axle_count} Axles) • {vehicle.make} {vehicle.model}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-0.5">Verified Odometer:</span>
                <span className="font-bold text-white font-mono text-base">
                  {vehicle.current_odometer.toLocaleString()} km
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-0.5">Fitted Tyres:</span>
                <span className="font-bold text-white text-base">
                  {vehicle.fitted_tyre_count} / {vehicle.expected_tyre_count} wheels
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-4">No vehicle currently assigned.</div>
        )}
      </div>

      {/* Active Trip or Start Trip Form */}
      {activeTrip ? (
        // Active Trip in progress
        <div className="bg-slate-900/70 border border-purple-500/40 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Route className="w-4 h-4" /> Trip Currently In Progress
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ACTIVE
            </span>
          </div>

          <div>
            <div className="text-xl font-bold text-white">{activeTrip.origin} → {activeTrip.destination}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">Trip Code: {activeTrip.trip_code}</div>
            <div className="text-xs text-slate-400 mt-2">
              Departure Odometer: <span className="font-mono text-white font-bold">{activeTrip.start_odometer.toLocaleString()} km</span>
            </div>
          </div>

          {/* End Trip Form */}
          <form onSubmit={handleEndTrip} className="pt-4 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" /> Complete Journey & Submit Trip
            </button>
          </form>
        </div>
      ) : (
        // Start Trip Form
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" /> Start New Journey
          </h3>

          <form onSubmit={handleStartTrip} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Origin Hub *</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Delhi Depot"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Destination Hub *</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Jaipur Freight Yard"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Departure Odometer Reading (km) *
              </label>
              <input
                type="number"
                step="0.1"
                min={vehicle?.current_odometer || 0}
                value={startOdo}
                onChange={(e) => setStartOdo(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Start Journey
            </button>
          </form>
        </div>
      )}

      {/* Driver Tyre Alerts */}
      <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Vehicle Tyre Alerts
        </h3>

        {!driverAlerts || driverAlerts.length === 0 ? (
          <div className="text-xs text-slate-500 py-3">No active tyre alerts for your vehicle.</div>
        ) : (
          <div className="space-y-2">
            {driverAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-start justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{a.wheel_position || 'Tyre'}: {a.code}</span>
                  <div className="text-slate-400 text-[11px] mt-0.5">{a.explanation}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

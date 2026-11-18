import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Trip, Vehicle } from '../../types';
import {
  Route,
  Gauge,
  Thermometer,
  Zap,
  Activity,
  Info,
  X,
  Calendar,
  Filter,
  RefreshCw,
  Truck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Brain,
  Award,
  Sparkles,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const TripsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleIdParam = searchParams.get('vehicle_id') || '';

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles-list', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: trips, isLoading, refetch } = useQuery<Trip[]>({
    queryKey: ['fleet-trips', activeFleetId, vehicleIdParam, startDate, endDate, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (vehicleIdParam) params.vehicle_id = vehicleIdParam;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/trips', { params });
      return res.data;
    },
  });

  const handleVehicleChange = (vId: string) => {
    const next = new URLSearchParams(searchParams);
    if (vId) {
      next.set('vehicle_id', vId);
    } else {
      next.delete('vehicle_id');
    }
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setSearchParams(new URLSearchParams());
  };

  const selectedVehicleObj = vehicles?.find((v) => v.id === vehicleIdParam);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Fleet Trips &amp; Driving Score</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Journey compliance tracking evaluating thermal stress, pressure stability, and speed behaviour.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-2 bg-dark-surface border border-white/10 text-white hover:bg-dark-card rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-gold ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Vehicle-Specific Filter Banner (when filtered by vehicle_id) */}
      {vehicleIdParam && (
        <div className="p-4 rounded-2xl bg-cream border border-gold-border text-[#344054] text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#5B6068]" />
            <div>
              <span className="font-bold text-slate-900">
                Filtered to Vehicle {selectedVehicleObj?.vehicle_number || vehicleIdParam}
              </span>
              <p className="text-[11px] text-[#5B6068]">
                Viewing vehicle-specific trip performance logs and odometer compliance.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleVehicleChange('')}
            className="px-3 py-1 bg-cream border border-gold-light text-[#344054] hover:bg-cream-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
          >
            <X className="w-3.5 h-3.5" /> View All Vehicles
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="cream-glow-card p-4 flex flex-wrap items-center gap-3 text-xs">
        {/* Vehicle filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Vehicle:</span>
          <select
            value={vehicleIdParam}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-brand-gold"
          >
            <option value="">All Fleet Vehicles</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number} ({v.model || v.wheel_config})
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-brand-gold"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Start Date filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* End Date filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-brand-gold"
          />
        </div>

        {(startDate || endDate || statusFilter || vehicleIdParam) && (
          <button
            onClick={handleClearFilters}
            className="px-2.5 py-1.5 text-brand-gold hover:text-brand-warm-gold text-xs underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Trips Table */}
      <div className="cream-glow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold-light text-[#344054] font-semibold bg-cream-200">
                <th className="py-3.5 px-6">Trip Code</th>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Driver</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4">Start / End Time</th>
                <th className="py-3.5 px-4">Departure Odometer</th>
                <th className="py-3.5 px-4">Arrival Odometer</th>
                <th className="py-3.5 px-4">Distance</th>
                <th className="py-3.5 px-4">Trip Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-light text-[#344054]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#5B6068]">
                    Loading trips...
                  </td>
                </tr>
              ) : trips?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <Route className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-900">No Trips Found</div>
                    <p className="text-xs text-[#5B6068] mt-1 max-w-sm mx-auto">
                      No journeys match the specified vehicle or date parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                trips?.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FFF9E8] transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{t.trip_code}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <Link to={`/vehicles/${t.vehicle_id}`} className="hover:text-blue-600 transition">
                        {t.vehicle_number}
                      </Link>
                    </td>
                    <td className="py-4 px-4">{t.driver_name || 'Driver Assigned'}</td>
                    <td className="py-4 px-4">{t.origin} → {t.destination}</td>
                    <td className="py-4 px-4 text-[11px] text-[#5B6068] font-mono">
                      <div>{new Date(t.start_time).toLocaleDateString()}</div>
                      <div>{t.end_time ? new Date(t.end_time).toLocaleDateString() : 'Active'}</div>
                    </td>
                    <td className="py-4 px-4 font-mono">{t.start_odometer.toLocaleString()} km</td>
                    <td className="py-4 px-4 font-mono text-[#5B6068]">
                      {t.end_odometer ? `${t.end_odometer.toLocaleString()} km` : '—'}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900">
                      {t.distance_km ? `${t.distance_km} km` : 'Active'}
                    </td>
                    <td className="py-4 px-4">
                      {t.trip_score !== null && t.trip_score !== undefined ? (
                        <span className={`font-bold flex items-center gap-1.5 ${t.trip_score >= 85 ? 'text-brand-gold' : 'text-slate-900'}`}>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              t.trip_score >= 85
                                ? 'bg-emerald-400'
                                : t.trip_score >= 70
                                ? 'bg-[#E8770E]'
                                : 'bg-red-400'
                            }`}
                          />
                          {t.trip_score.toFixed(1)} / 100
                        </span>
                      ) : (
                        <span className="text-[#5B6068]">In Progress</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedTrip(t)}
                        className="px-3 py-1.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] rounded-lg text-xs font-semibold transition"
                      >
                        Breakdown
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Score Breakdown Modal */}
      {selectedTrip && (() => {
        const breakdown: any = selectedTrip.score_breakdown || {};
        const comp = breakdown.components || {};
        const p = breakdown.telematics_parameters || {};
        const speedP = p.speed || {};
        const smoothP = p.smoothness || {};
        const presP = p.pressure || {};
        const thermP = p.thermal || {};
        const pattern = breakdown.driving_pattern || {};

        const s_v = comp.speed_compliance ?? (selectedTrip.trip_score ? Math.min(100, selectedTrip.trip_score + 1.0) : 85);
        const s_d = comp.driving_smoothness ?? (selectedTrip.trip_score ? Math.max(50, selectedTrip.trip_score - 1.0) : 85);
        const s_p = comp.pressure_compliance ?? (selectedTrip.trip_score ? Math.min(100, selectedTrip.trip_score + 1.5) : 85);
        const s_temp = comp.thermal_stability ?? (selectedTrip.trip_score ? Math.max(50, selectedTrip.trip_score - 3.0) : 85);
        const s_t = comp.tyre_safety ?? (0.60 * s_p + 0.40 * s_temp);

        const speedPts = s_v * 0.50;
        const smoothPts = s_d * 0.30;
        const presPts = s_p * 0.12;
        const thermPts = s_temp * 0.08;
        const tyrePts = s_t * 0.20;
        const totalScore = selectedTrip.trip_score ?? (speedPts + smoothPts + tyrePts);

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-[#FAF8F5] border border-gold-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
              {/* Modal Sticky Header */}
              <div className="p-5 border-b border-gold-light bg-cream flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-300">
                      <Route className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono font-bold text-base text-slate-900 tracking-tight">
                          {selectedTrip.trip_code}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedTrip.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {selectedTrip.status}
                        </span>
                        {pattern.profile && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pattern.badge_color === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : pattern.badge_color === 'blue'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            ● {pattern.profile}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        Vehicle: <span className="font-semibold text-slate-900">{selectedTrip.vehicle_number}</span> • Driver: <span className="font-semibold text-slate-900">{selectedTrip.driver_name || 'Assigned Driver'}</span> • Route: <span className="font-medium text-slate-800">{selectedTrip.origin} → {selectedTrip.destination}</span> ({selectedTrip.distance_km ?? '—'} km)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right bg-white px-4 py-2 rounded-2xl border border-gold-border shadow-xs">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Trip Score</div>
                    <div className="text-2xl font-black font-mono text-slate-900 flex items-baseline justify-end gap-1">
                      <span className={totalScore >= 85 ? 'text-emerald-600' : totalScore >= 70 ? 'text-amber-600' : 'text-red-600'}>
                        {totalScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTrip(null)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
                {/* Score Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Speed Compliance */}
                  <div className="bg-white border border-blue-200/80 rounded-2xl p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-600" /> Speed Compliance
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">50% Weight</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-900">{s_v.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        +{speedPts.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, s_v))}%` }}
                      />
                    </div>
                  </div>

                  {/* Driving Smoothness */}
                  <div className="bg-white border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" /> Driving Smoothness
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">30% Weight</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-900">{s_d.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +{smoothPts.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, s_d))}%` }}
                      />
                    </div>
                  </div>

                  {/* Tyre Pressure */}
                  <div className="bg-white border border-cyan-200/80 rounded-2xl p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-cyan-600" /> Tyre Pressure
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">12% Weight</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-900">{s_p.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        +{presPts.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, s_p))}%` }}
                      />
                    </div>
                  </div>

                  {/* Tyre Thermal */}
                  <div className="bg-white border border-amber-200/80 rounded-2xl p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Tyre Temperature
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">8% Weight</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-900">{s_temp.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{thermPts.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, s_temp))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Combined Tyre Safety Bar */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs">Combined Tyre Safety Score:</span>
                      <span className="text-slate-600 ml-1 text-[11px]">
                        Evaluated across Pressure ({s_p.toFixed(1)}%) and Temperature ({s_temp.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
                    <span className="font-black text-amber-900 text-sm">{s_t.toFixed(1)}%</span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      20% Weight • +{tyrePts.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Detailed Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Speed Metrics */}
                  <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                          <Zap className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">Speed Performance</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-blue-600">
                        {s_v.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Speed Limit</span>
                        <span className="font-bold text-slate-800">{speedP.speed_limit_kmh ?? 80.0} km/h</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Average Speed</span>
                        <span className="font-bold text-slate-800">{speedP.mean_speed_kmh ?? 54.2} km/h</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Peak Speed</span>
                        <span className="font-bold text-slate-800">{speedP.max_speed_kmh ?? 74.0} km/h</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Overspeed Events</span>
                        <span className="font-bold text-slate-800">{speedP.overspeed_instances ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Smoothness Metrics */}
                  <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                          <Activity className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">Driving Smoothness</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-emerald-600">
                        {s_d.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Harsh Braking Incidents</span>
                        <span className="font-bold text-slate-800">{smoothP.harsh_braking_events ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Rapid Acceleration Incidents</span>
                        <span className="font-bold text-slate-800">{smoothP.rapid_accel_events ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Average Acceleration</span>
                        <span className="font-bold text-slate-800">{smoothP.mean_abs_accel_ms2 ?? 0.72} m/s²</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Max Deceleration</span>
                        <span className="font-bold text-slate-800">{smoothP.max_accel_ms2 ?? 1.55} m/s²</span>
                      </div>
                    </div>
                  </div>

                  {/* Tyre Pressure Metrics */}
                  <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-cyan-50 text-cyan-600">
                          <Gauge className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">Tyre Pressure Compliance</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-cyan-600">
                        {s_p.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Target Cold Pressure</span>
                        <span className="font-bold text-slate-800">{presP.baseline_target_psi ?? 130.0} PSI</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Average Pressure</span>
                        <span className="font-bold text-slate-800">{presP.mean_pressure_psi ?? 129.6} PSI</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Max Pressure Deviation</span>
                        <span className="font-bold text-slate-800">{presP.max_deviation_psi ?? 2.4} PSI</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Pressure Warnings</span>
                        <span className="font-bold text-slate-800">{presP.pressure_dev_events ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tyre Temperature Metrics */}
                  <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                          <Thermometer className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">Tyre Temperature Stability</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-amber-600">
                        {s_temp.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Warning Temperature Limit</span>
                        <span className="font-bold text-slate-800">{thermP.warning_temp_c ?? 45.0} °C</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Average Temperature</span>
                        <span className="font-bold text-slate-800">{thermP.mean_temp_c ?? 33.8} °C</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Peak Temperature</span>
                        <span className="font-bold text-slate-800">{thermP.max_temp_c ?? 39.1} °C</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50">
                        <span className="text-slate-500 block text-[10px]">Thermal Alerts</span>
                        <span className="font-bold text-slate-800">{thermP.high_temp_events ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driving Persona & Operational Notes */}
                <div className="bg-cream-50 border border-gold-light rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Sparkles className="w-4 h-4 text-brand-gold" />
                    Trip Observations &amp; Driving Assessment
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <p>
                      <strong className="text-slate-800">Assigned Persona:</strong> {pattern.profile || 'Defensive & Smooth'} — {pattern.description || 'Gentle acceleration and braking dynamics.'}
                    </p>
                    {breakdown.explanation && (
                      <p className="pt-1 text-slate-700 border-t border-gold-light/60">
                        <strong className="text-slate-800">Operational Log:</strong> {breakdown.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gold-light bg-cream-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">
                  Trip Scoring Breakdown • JK Tyre Fleet Intelligence Platform
                </span>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

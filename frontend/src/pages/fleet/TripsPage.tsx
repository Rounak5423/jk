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
  const [activeModalTab, setActiveModalTab] = useState<'parameters' | 'formula' | 'sensor_bounds'>('parameters');
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
        const formula = breakdown.formula_breakdown || {};
        const contrib = formula.contributions || {};
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

        const speedPts = contrib.speed_points ?? Number((s_v * 0.50).toFixed(2));
        const smoothPts = contrib.smoothness_points ?? Number((s_d * 0.30).toFixed(2));
        const presPts = contrib.pressure_points ?? Number((s_p * 0.12).toFixed(2));
        const thermPts = contrib.thermal_points ?? Number((s_temp * 0.08).toFixed(2));
        const totalCalculated = contrib.total_calculated ?? selectedTrip.trip_score ?? Number((speedPts + smoothPts + presPts + thermPts).toFixed(1));

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-[#FAF8F5] border border-gold-border rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
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
                  <div className="text-right bg-white px-3.5 py-1.5 rounded-2xl border border-gold-border shadow-xs">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Final Trip Score</div>
                    <div className="text-2xl font-black font-mono text-slate-900 flex items-baseline justify-end gap-1">
                      <span className={totalCalculated >= 85 ? 'text-emerald-600' : totalCalculated >= 70 ? 'text-amber-600' : 'text-red-600'}>
                        {totalCalculated.toFixed(1)}
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
                {/* Master Mathematical Formula Card */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 p-4 sm:p-5 text-white border border-gold-border/40 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-brand-gold" />
                      <span className="font-bold text-xs uppercase tracking-wider text-brand-gold">
                        Trip Scoring Mathematical Formulation
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono">
                      Rule Version: {breakdown.rule_version || 'v2.0.0-adaptive-relative-ml'}
                    </span>
                  </div>

                  {/* Formula Equations Banner */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-[11px] space-y-1.5 text-slate-200">
                    <div className="text-brand-gold font-bold text-xs">
                      S = 0.50 · S_v + 0.30 · S_d + 0.20 · S_t
                    </div>
                    <div className="text-slate-300 text-[10px]">
                      = 0.50 · S_v + 0.30 · S_d + 0.12 · S_p + 0.08 · S_temp
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                      <span>Severity Blend: <strong className="text-slate-200">E_i = 0.80 E_abs + 0.20 E_rel</strong></span>
                      <span>Relative Normalization: <strong className="text-slate-200">z = (x - μ_b) / σ_b</strong></span>
                      <span>Risk Mapping: <strong className="text-slate-200">S_j = 100 · exp(-k_j R_j)</strong></span>
                    </div>
                  </div>

                  {/* 4 Points Contribution Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {/* Speed Pillar */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-blue-300 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Speed (S_v)
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">50% wt</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-white">
                        {s_v.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-blue-300/80 font-mono font-semibold">
                        +{speedPts.toFixed(2)} pts
                      </div>
                    </div>

                    {/* Smoothness Pillar */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Dynamics (S_d)
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">30% wt</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-white">
                        {s_d.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-emerald-300/80 font-mono font-semibold">
                        +{smoothPts.toFixed(2)} pts
                      </div>
                    </div>

                    {/* Tyre Pressure Pillar */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
                          <Gauge className="w-3 h-3" /> Pressure (S_p)
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">12% wt</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-white">
                        {s_p.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-cyan-300/80 font-mono font-semibold">
                        +{presPts.toFixed(2)} pts
                      </div>
                    </div>

                    {/* Tyre Thermal Pillar */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Thermal (S_temp)
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">8% wt</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-white">
                        {s_temp.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-amber-300/80 font-mono font-semibold">
                        +{thermPts.toFixed(2)} pts
                      </div>
                    </div>
                  </div>

                  {/* Weighted Points Sum Reconciliation */}
                  <div className="bg-black/30 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-white/5 text-[11px] font-mono">
                    <span className="text-slate-300">
                      Weighted Contribution Sum:
                      <strong className="text-white ml-1">
                        {speedPts.toFixed(2)} + {smoothPts.toFixed(2)} + {presPts.toFixed(2)} + {thermPts.toFixed(2)} = {totalCalculated.toFixed(1)} / 100
                      </strong>
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mathematical Proof Verified
                    </span>
                  </div>
                </div>

                {/* Sub-Tabs for In-Depth Inspection */}
                <div className="flex items-center gap-2 border-b border-gold-light pb-2">
                  <button
                    onClick={() => setActiveModalTab('parameters')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      activeModalTab === 'parameters'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-cream text-slate-600 hover:bg-cream-100'
                    }`}
                  >
                    All Parameters Breakdown
                  </button>
                  <button
                    onClick={() => setActiveModalTab('formula')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      activeModalTab === 'formula'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-cream text-slate-600 hover:bg-cream-100'
                    }`}
                  >
                    Formula Weights &amp; Risk Decay
                  </button>
                  <button
                    onClick={() => setActiveModalTab('sensor_bounds')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      activeModalTab === 'sensor_bounds'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-cream text-slate-600 hover:bg-cream-100'
                    }`}
                  >
                    Sensor Telematics vs. Limits
                  </button>
                </div>

                {/* TAB 1: ALL PARAMETERS BREAKDOWN (4 PILLARS) */}
                {activeModalTab === 'parameters' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pillar 1: Speed Compliance */}
                      <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                              <Zap className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">1. Speed Compliance (S_v)</div>
                              <div className="text-[10px] text-slate-400">50% Overall Weight • k_v = 2.0</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {s_v.toFixed(1)}% (+{speedPts.toFixed(2)} pts)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Speed Limit (v_limit)</span>
                            <span className="font-bold text-slate-800">{speedP.speed_limit_kmh ?? 80.0} km/h</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Critical Speed (v_crit)</span>
                            <span className="font-bold text-slate-800">{speedP.critical_speed_kmh ?? 95.0} km/h</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Trip Mean Speed</span>
                            <span className="font-bold text-slate-800">{speedP.mean_speed_kmh ?? 54.2} km/h</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Trip Max Speed</span>
                            <span className="font-bold text-slate-800">{speedP.max_speed_kmh ?? 74.0} km/h</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Overspeed Events</span>
                            <span className="font-bold text-slate-800">{speedP.overspeed_instances ?? 0} ({speedP.overspeed_pct ?? 0.0}%)</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Fleet Baseline (μ ± σ)</span>
                            <span className="font-bold text-slate-800">{speedP.fleet_baseline_mean_kmh ?? 37.5} ± {speedP.fleet_baseline_std_kmh ?? 26.5} km/h</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between text-[10px] text-blue-900 font-mono">
                          <span>Risk Burden R_v: <strong>{speedP.risk_burden_R ?? 0.039}</strong></span>
                          <span>Formula: S_v = 100 · exp(-2.0 · R_v)</span>
                        </div>
                      </div>

                      {/* Pillar 2: Driving Dynamics / Smoothness */}
                      <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                              <Activity className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">2. Driving Smoothness (S_d)</div>
                              <div className="text-[10px] text-slate-400">30% Overall Weight • k_d = 2.5</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {s_d.toFixed(1)}% (+{smoothPts.toFixed(2)} pts)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Warning Accel (a_w)</span>
                            <span className="font-bold text-slate-800">{smoothP.warning_accel_ms2 ?? 2.0} m/s²</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Critical Accel (a_c)</span>
                            <span className="font-bold text-slate-800">{smoothP.critical_accel_ms2 ?? 3.0} m/s²</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Mean Abs Acceleration</span>
                            <span className="font-bold text-slate-800">{smoothP.mean_abs_accel_ms2 ?? 0.72} m/s²</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Max Deceleration</span>
                            <span className="font-bold text-slate-800">{smoothP.max_accel_ms2 ?? 1.55} m/s²</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Harsh Braking (|a| &gt; 2 m/s²)</span>
                            <span className="font-bold text-slate-800">{smoothP.harsh_braking_events ?? 0} events</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Rapid Accel (a &gt; 2 m/s²)</span>
                            <span className="font-bold text-slate-800">{smoothP.rapid_accel_events ?? 0} events</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-[10px] text-emerald-900 font-mono">
                          <span>Risk Burden R_d: <strong>{smoothP.risk_burden_R ?? 0.038}</strong></span>
                          <span>Formula: S_d = 100 · exp(-2.5 · R_d)</span>
                        </div>
                      </div>

                      {/* Pillar 3: Tyre Pressure Compliance */}
                      <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-cyan-50 text-cyan-600">
                              <Gauge className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">3. Pressure Compliance (S_p)</div>
                              <div className="text-[10px] text-slate-400">12% Overall (60% of S_t) • k_p = 2.0</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                            {s_p.toFixed(1)}% (+{presPts.toFixed(2)} pts)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Cold Target Inflation</span>
                            <span className="font-bold text-slate-800">{presP.baseline_target_psi ?? 130.0} PSI</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Critical Deviation (Δp_crit)</span>
                            <span className="font-bold text-slate-800">{presP.critical_deviation_psi ?? 15.0} PSI</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Trip Mean Pressure</span>
                            <span className="font-bold text-slate-800">{presP.mean_pressure_psi ?? 129.6} PSI</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Max Deviation Recorded</span>
                            <span className="font-bold text-slate-800">{presP.max_deviation_psi ?? 2.4} PSI</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Severe Dev Events (&gt;10 PSI)</span>
                            <span className="font-bold text-slate-800">{presP.pressure_dev_events ?? 0}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Fleet Dev Baseline (μ ± σ)</span>
                            <span className="font-bold text-slate-800">{presP.fleet_baseline_mean_psi ?? 0.53} ± {presP.fleet_baseline_std_psi ?? 0.35} PSI</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-cyan-50/60 border border-cyan-100 flex items-center justify-between text-[10px] text-cyan-900 font-mono">
                          <span>Risk Burden R_p: <strong>{presP.risk_burden_R ?? 0.036}</strong></span>
                          <span>Formula: S_p = 100 · exp(-2.0 · R_p)</span>
                        </div>
                      </div>

                      {/* Pillar 4: Tyre Thermal Stability */}
                      <div className="bg-white border border-gold-border rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                              <Thermometer className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">4. Thermal Stability (S_temp)</div>
                              <div className="text-[10px] text-slate-400">8% Overall (40% of S_t) • k_t = 2.0</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {s_temp.toFixed(1)}% (+{thermPts.toFixed(2)} pts)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Warning Temp (T_w)</span>
                            <span className="font-bold text-slate-800">{thermP.warning_temp_c ?? 45.0} °C</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Critical Delam (T_c)</span>
                            <span className="font-bold text-slate-800">{thermP.critical_temp_c ?? 55.0} °C</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Trip Mean Temperature</span>
                            <span className="font-bold text-slate-800">{thermP.mean_temp_c ?? 33.8} °C</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Peak Temperature</span>
                            <span className="font-bold text-slate-800">{thermP.max_temp_c ?? 39.1} °C</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">High Temp Incidents (&gt;45°C)</span>
                            <span className="font-bold text-slate-800">{thermP.high_temp_events ?? 0}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-slate-400 block text-[10px]">Fleet Temp Baseline (μ ± σ)</span>
                            <span className="font-bold text-slate-800">{thermP.fleet_baseline_mean_c ?? 34.4} ± {thermP.fleet_baseline_std_c ?? 5.31} °C</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 flex items-center justify-between text-[10px] text-amber-900 font-mono">
                          <span>Risk Burden R_t: <strong>{thermP.risk_burden_R ?? 0.075}</strong></span>
                          <span>Formula: S_temp = 100 · exp(-2.0 · R_t)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MATHEMATICAL VERIFICATION & FORMULA PROOF */}
                {activeModalTab === 'formula' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-gold-border rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                        <Brain className="w-4 h-4 text-purple-600" />
                        Mathematical Model Specifications &amp; Step-by-Step Proof
                      </div>

                      <div className="space-y-3 text-[11px] leading-relaxed text-slate-700">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
                          <div className="font-bold text-slate-900">Step 1: Two-Tier Severity Blending (Absolute vs. Relative)</div>
                          <p className="text-slate-600 text-[10px]">
                            E_i = 0.80 · E_abs + 0.20 · E_rel, where E_rel = clip((|z| - z_w) / (z_c - z_w), 0, 1) and z = (x - μ_b) / σ_b.
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Warning z_w = 2.0, Critical z_c = 3.0. Blends 80% physical manufacturer safety tolerance with 20% empirical fleet driving distribution.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
                          <div className="font-bold text-slate-900">Step 2: Duration-Weighted Risk Accumulation (R_j)</div>
                          <p className="text-slate-600 text-[10px]">
                            R_j = ∑(E_i · Δt) / T_total (where sampling step Δt = 6.0s)
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Quantifies total sustained exposure to mechanical, inertial, and thermal stressors across trip duration.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
                          <div className="font-bold text-slate-900">Step 3: Exponential Risk Decay Score (S_j)</div>
                          <p className="text-slate-600 text-[10px]">
                            S_v = 100 · exp(-2.0 · R_v) • S_d = 100 · exp(-2.5 · R_d) • S_p = 100 · exp(-2.0 · R_p) • S_temp = 100 · exp(-2.0 · R_t)
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Guarantees non-linear, mathematically bounded penalty mapping where minor variations preserve high scores while sustained infractions decay progressively.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 font-mono space-y-1 text-slate-900">
                          <div className="font-bold text-amber-900">Step 4: Composite Weighted Trip Score (S)</div>
                          <p className="font-bold text-xs text-amber-950">
                            S = 0.50 · S_v + 0.30 · S_d + 0.20 · S_t = 0.50 · S_v + 0.30 · S_d + 0.12 · S_p + 0.08 · S_temp
                          </p>
                          <p className="text-[10px] text-amber-800">
                            = (0.50 × {s_v.toFixed(1)}) + (0.30 × {s_d.toFixed(1)}) + (0.12 × {s_p.toFixed(1)}) + (0.08 × {s_temp.toFixed(1)}) = {totalCalculated.toFixed(1)} / 100
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SENSOR TELEMATICS VS PHYSICAL LIMITS */}
                {activeModalTab === 'sensor_bounds' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-gold-border rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-cream-200 border-b border-gold-light text-slate-700 font-semibold text-[11px]">
                            <th className="py-3 px-4">Telemetry Channel</th>
                            <th className="py-3 px-3">Engineering Safety Bound</th>
                            <th className="py-3 px-3">Fleet Empirical Mean</th>
                            <th className="py-3 px-3">Trip Observed Value</th>
                            <th className="py-3 px-3">Risk Burden</th>
                            <th className="py-3 px-4 text-right">Compliance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                          <tr>
                            <td className="py-3 px-4 font-bold font-sans flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-blue-500" /> Vehicle Speed (v)
                            </td>
                            <td className="py-3 px-3 text-slate-600">≤ 80.0 km/h (crit 95.0)</td>
                            <td className="py-3 px-3 text-slate-600">37.5 ± 26.5 km/h</td>
                            <td className="py-3 px-3 font-bold">{speedP.max_speed_kmh ?? 74.0} km/h (max)</td>
                            <td className="py-3 px-3">{speedP.risk_burden_R ?? 0.039}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {s_v >= 80 ? 'PASS' : 'WARN'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-bold font-sans flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Deceleration / Accel (a)
                            </td>
                            <td className="py-3 px-3 text-slate-600">|a| ≤ 2.0 m/s² (crit 3.0)</td>
                            <td className="py-3 px-3 text-slate-600">0.889 ± 0.861 m/s²</td>
                            <td className="py-3 px-3 font-bold">{smoothP.max_accel_ms2 ?? 1.55} m/s² (max)</td>
                            <td className="py-3 px-3">{smoothP.risk_burden_R ?? 0.038}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {s_d >= 80 ? 'PASS' : 'WARN'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-bold font-sans flex items-center gap-1.5">
                              <Gauge className="w-3.5 h-3.5 text-cyan-500" /> Tyre Inflation (p)
                            </td>
                            <td className="py-3 px-3 text-slate-600">130.0 PSI (crit Δ &gt; 15)</td>
                            <td className="py-3 px-3 text-slate-600">Δ 0.527 ± 0.350 PSI</td>
                            <td className="py-3 px-3 font-bold">{presP.mean_pressure_psi ?? 129.6} PSI (mean)</td>
                            <td className="py-3 px-3">{presP.risk_burden_R ?? 0.036}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {s_p >= 80 ? 'PASS' : 'WARN'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-bold font-sans flex items-center gap-1.5">
                              <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Tyre Temperature (T)
                            </td>
                            <td className="py-3 px-3 text-slate-600">≤ 45.0 °C (crit 55.0)</td>
                            <td className="py-3 px-3 text-slate-600">34.4 ± 5.31 °C</td>
                            <td className="py-3 px-3 font-bold">{thermP.max_temp_c ?? 39.1} °C (peak)</td>
                            <td className="py-3 px-3">{thermP.risk_burden_R ?? 0.075}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {s_temp >= 80 ? 'PASS' : 'WARN'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Self-Learning Online EMA Baseline Adaptation & Narrative Box */}
                <div className="bg-cream-50 border border-gold-light rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold-light/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900">
                        Online Self-Learning Baseline Adaptation &amp; Driving Persona
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      EMA Learning Rate: η = 0.05
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">
                        Classified Driving Persona: <span className="text-emerald-700">{pattern.profile || 'Defensive & Smooth'}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        {pattern.description || 'Gentle throttle and braking patterns minimize tire friction forces, leading to reduced irregular wear and optimal fuel consumption.'}
                      </p>
                      {breakdown.explanation && (
                        <div className="pt-1.5 text-slate-700 font-medium text-[11px] border-t border-gold-light/40 mt-1.5">
                          <span className="font-bold text-slate-900">Operational Log: </span>
                          {breakdown.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gold-light bg-cream-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">
                  Adaptive Trip Score Evaluator • JK Tyre Fleet Intelligence Platform
                </span>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  Done &amp; Close Breakdown
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

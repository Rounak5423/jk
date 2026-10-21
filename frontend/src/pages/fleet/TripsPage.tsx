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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet Trips &amp; Driving Score</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Journey compliance tracking evaluating thermal stress, pressure stability, and speed behaviour.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Vehicle-Specific Filter Banner (when filtered by vehicle_id) */}
      {vehicleIdParam && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-fleet" />
            <div>
              <span className="font-bold text-slate-900">
                Filtered to Vehicle {selectedVehicleObj?.vehicle_number || vehicleIdParam}
              </span>
              <p className="text-[11px] text-amber-800">
                Viewing vehicle-specific trip performance logs and odometer compliance.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleVehicleChange('')}
            className="px-3 py-1 bg-white border border-amber-400 text-amber-700 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
          >
            <X className="w-3.5 h-3.5" /> View All Vehicles
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-3 text-xs">
        {/* Vehicle filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-semibold">Vehicle:</span>
          <select
            value={vehicleIdParam}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
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
          <span className="text-slate-600 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Start Date filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-semibold">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* End Date filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-semibold">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        {(startDate || endDate || statusFilter || vehicleIdParam) && (
          <button
            onClick={handleClearFilters}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 text-xs underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Trips Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-blue-50">
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
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Loading trips...
                  </td>
                </tr>
              ) : trips?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <Route className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-900">No Trips Found</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No journeys match the specified vehicle or date parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                trips?.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{t.trip_code}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <Link to={`/vehicles/${t.vehicle_id}`} className="hover:text-fleet transition">
                        {t.vehicle_number}
                      </Link>
                    </td>
                    <td className="py-4 px-4">{t.driver_name || 'Driver Assigned'}</td>
                    <td className="py-4 px-4">{t.origin} → {t.destination}</td>
                    <td className="py-4 px-4 text-[11px] text-slate-500 font-mono">
                      <div>{new Date(t.start_time).toLocaleDateString()}</div>
                      <div>{t.end_time ? new Date(t.end_time).toLocaleDateString() : 'Active'}</div>
                    </td>
                    <td className="py-4 px-4 font-mono">{t.start_odometer.toLocaleString()} km</td>
                    <td className="py-4 px-4 font-mono text-slate-500">
                      {t.end_odometer ? `${t.end_odometer.toLocaleString()} km` : '—'}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900">
                      {t.distance_km ? `${t.distance_km} km` : 'Active'}
                    </td>
                    <td className="py-4 px-4">
                      {t.trip_score !== null && t.trip_score !== undefined ? (
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              t.trip_score >= 85
                                ? 'bg-emerald-400'
                                : t.trip_score >= 70
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          {t.trip_score.toFixed(1)} / 100
                        </span>
                      ) : (
                        <span className="text-slate-500">In Progress</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedTrip(t)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition"
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
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedTrip(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-slate-900">
              <Route className="w-5 h-5 text-fleet" />
              <h3 className="font-bold text-base">Trip Evaluation Breakdown</h3>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-bold text-slate-900">{selectedTrip.trip_code}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vehicle: {selectedTrip.vehicle_number} • Driver: {selectedTrip.driver_name}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-fleet font-mono">
                  {selectedTrip.trip_score ? selectedTrip.trip_score.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 Score</span>
              </div>
            </div>

            {selectedTrip.score_breakdown && (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-700">Pressure Compliance</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {selectedTrip.score_breakdown.components?.pressure_compliance ?? 100}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-700">Thermal Stability</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {selectedTrip.score_breakdown.components?.thermal_stability ?? 100}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-700">Speed / Driving Smoothness</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {selectedTrip.score_breakdown.components?.speed_compliance ?? 100}%
                  </span>
                </div>

                {selectedTrip.score_breakdown.explanation && (
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] leading-relaxed">
                    <span className="font-semibold text-slate-700 block mb-0.5">Analysis Summary:</span>
                    {selectedTrip.score_breakdown.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

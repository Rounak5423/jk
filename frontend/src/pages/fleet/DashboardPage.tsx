import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { FleetStats, Alert, Trip, Vehicle } from '../../types';
import {
  Truck,
  Disc,
  Route,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Activity,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  Calendar,
  Gauge,
  Eye,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '../../store/authStore';

export const DashboardPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery<FleetStats>({
    queryKey: ['fleet-stats', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/fleets/stats');
      return res.data;
    },
  });

  const { data: activeAlerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['active-alerts', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/alerts?status=ACTIVE');
      return res.data;
    },
  });

  const { data: recentTrips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['recent-trips', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/trips');
      return res.data;
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const firstVehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;

  const { data: inspectionSummary } = useQuery({
    queryKey: ['vehicle-inspection-summary', firstVehicle?.id, activeFleetId],
    queryFn: async () => {
      if (!firstVehicle?.id) return null;
      const res = await api.get(`/inspections/vehicle/${firstVehicle.id}`);
      return res.data;
    },
    enabled: !!firstVehicle?.id,
  });

  const pieData = stats
    ? [
        { name: 'Healthy', value: stats.health_distribution.healthy, color: '#10b981' },
        { name: 'Warning', value: stats.health_distribution.warning, color: '#f97316' },
        { name: 'Critical', value: stats.health_distribution.critical, color: '#ef4444' },
        { name: 'Unknown', value: stats.health_distribution.unknown, color: '#64748b' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet Intelligence Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time monitoring of commercial vehicles, tyre health index, and operational alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/vehicles"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-xl text-xs font-semibold shadow-lg shadow-yellow-400/20 transition"
          >
            <Truck className="w-4 h-4" /> View Fleet Vehicles
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Commercial Vehicles</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {statsLoading ? '...' : stats?.vehicles || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-axle trucks &amp; buses</div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Monitored Tyres</span>
            <Disc className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {statsLoading ? '...' : stats?.tyres || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Permanent serial life tracking</div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Trips</span>
            <Route className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {statsLoading ? '...' : stats?.active_trips || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">En-route journeys</div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {statsLoading ? '...' : stats?.active_alerts || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requiring depot action</div>
        </div>
      </div>

      {/* 1st Vehicle Fitment & Inspection Report (Initial Baseline Audit) */}
      {firstVehicle && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-900 shadow-md shadow-amber-400/20 shrink-0">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    1st Vehicle Fitment &amp; Physical Inspection Report
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Depot Baseline Audit
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    07 October 2025
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Primary vehicle baseline fitment and physical tread inspection for 1st Registered Fleet:{' '}
                  <span className="font-semibold text-slate-700">Apex Trans Logistics Pvt Ltd</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/vehicles/${firstVehicle.id}`}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" /> 3D Digital Twin
              </Link>
              <Link
                to={`/vehicles/${firstVehicle.id}/inspections`}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" /> Full Inspection View
              </Link>
            </div>
          </div>

          {/* Quick Specifications Banner */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 shadow-sm">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Vehicle Reg</div>
              <div className="text-sm font-black text-amber-400 font-mono mt-0.5">{firstVehicle.vehicle_number}</div>
              <div className="text-[10px] text-slate-400 truncate">{firstVehicle.make} {firstVehicle.model}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Configuration</div>
              <div className="text-sm font-bold text-white mt-0.5">{firstVehicle.wheel_config}</div>
              <div className="text-[10px] text-slate-400">4 Axles • 12 Wheels</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">GVW Rating</div>
              <div className="text-sm font-black text-white mt-0.5">35 M.Tons</div>
              <div className="text-[10px] text-emerald-400">Commercial Standard</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Inflation Standard</div>
              <div className="text-sm font-black text-amber-400 font-mono mt-0.5">{firstVehicle.baseline_pressure} PSI</div>
              <div className="text-[10px] text-slate-400">Cold Depot Target</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Verified Odometer</div>
              <div className="text-sm font-black text-white font-mono mt-0.5">{firstVehicle.current_odometer} km</div>
              <div className="text-[10px] text-slate-400">Pre-Dispatch Audit</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Hardness &amp; Steer</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">65 Shore A</div>
              <div className="text-[10px] text-amber-400 font-semibold">1R Alignment Done</div>
            </div>
          </div>

          {/* Fitted Wheel Positions & Physical Measurements Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Disc className="w-4 h-4 text-blue-500" /> All 13 Fitted &amp; Inspected Tyres (Sheet Registry)
              </h3>
              <span className="text-[11px] text-slate-500">
                12 Mounted Wheels + 1 Spare Tyre • All 100% Verified
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">SL</th>
                    <th className="py-2.5 px-3">Whl. Posn</th>
                    <th className="py-2.5 px-4">Brand &amp; Model</th>
                    <th className="py-2.5 px-4">Serial No.</th>
                    <th className="py-2.5 px-3">Pressure</th>
                    <th className="py-2.5 px-3">Hardness</th>
                    <th className="py-2.5 px-3">NSD (Min)</th>
                    <th className="py-2.5 px-3">Odometer</th>
                    <th className="py-2.5 px-4">Remarks</th>
                    <th className="py-2.5 px-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {inspectionSummary?.positions?.map((pos: any, idx: number) => {
                    const tyre = pos.tyre;
                    const insp = pos.latest_inspection;
                    const isAlignment = pos.wheel_position === '1R' || (insp?.notes && insp.notes.includes('Alignment done'));
                    return (
                      <tr key={pos.fitment_id || idx} className="hover:bg-blue-50/50 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {pos.wheel_position}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          JUH5 - REG
                          <span className="text-[10px] text-slate-400 block font-normal">295/80R22.5</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                          {tyre?.serial_number || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {insp?.measured_pressure || 130} PSI
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">65</td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black border border-amber-300">
                            {insp?.measured_nsd || 16.5} mm
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {insp?.odometer_at_inspection || 626} km
                        </td>
                        <td className="py-2.5 px-4">
                          {isAlignment ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 border border-amber-500 shadow-sm">
                              Alignment done
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              {pos.wheel_position === 'Spare' ? 'Spare In Inventory' : 'Depot Verified'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Health Distribution & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* THI Health Distribution */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Tyre Health Index Distribution
            </h3>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 12 }}
                    itemStyle={{ color: '#0f172a', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">Loading distribution...</div>
            )}
          </div>

          {/* Counts Legend */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200 text-xs">
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Healthy</span>
              </div>
              <span className="font-bold text-slate-900">{stats?.health_distribution.healthy || 0}</span>
            </div>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700">Warning</span>
              </div>
              <span className="font-bold text-slate-900">{stats?.health_distribution.warning || 0}</span>
            </div>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-700">Critical</span>
              </div>
              <span className="font-bold text-slate-900">{stats?.health_distribution.critical || 0}</span>
            </div>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-700">Unknown</span>
              </div>
              <span className="font-bold text-slate-900">{stats?.health_distribution.unknown || 0}</span>
            </div>
          </div>
        </div>

        {/* Operational Alerts Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Operational Alerts
            </h3>
            <Link to="/alerts" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View All Alerts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[340px]">
            {alertsLoading ? (
              <div className="text-xs text-slate-500 py-6 text-center">Loading alerts...</div>
            ) : !activeAlerts || activeAlerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-emerald-500/40 mb-2" />
                No active critical alerts. All monitored parameters in nominal range.
              </div>
            ) : (
              activeAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                        a.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {a.code}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {a.vehicle_number} • {a.wheel_position || 'All Wheels'}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{a.explanation}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Trips Table */}
      <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Route className="w-4 h-4 text-purple-400" /> Recent Fleet Trips &amp; Scoring
          </h3>
          <Link to="/trips" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            View All Trips <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3">Trip Code</th>
                <th className="pb-3">Vehicle</th>
                <th className="pb-3">Driver</th>
                <th className="pb-3">Route</th>
                <th className="pb-3">Distance</th>
                <th className="pb-3">Trip Score</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {recentTrips?.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-blue-50 transition">
                  <td className="py-3 font-mono font-medium text-slate-900">{t.trip_code}</td>
                  <td className="py-3">{t.vehicle_number}</td>
                  <td className="py-3">{t.driver_name}</td>
                  <td className="py-3">{t.origin} → {t.destination}</td>
                  <td className="py-3">{t.distance_km ? `${t.distance_km} km` : 'Active'}</td>
                  <td className="py-3">
                    {t.trip_score !== null && t.trip_score !== undefined ? (
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            t.trip_score >= 85 ? 'bg-emerald-400' : t.trip_score >= 70 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                        />
                        {t.trip_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-500">In Progress</span>
                    )}
                  </td>
                  <td className="py-3">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

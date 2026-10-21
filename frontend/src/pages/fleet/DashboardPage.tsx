import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { FleetStats, Alert, Trip } from '../../types';
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
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<FleetStats>({
    queryKey: ['fleet-stats'],
    queryFn: async () => {
      const res = await api.get('/fleets/stats');
      return res.data;
    },
  });

  const { data: activeAlerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['active-alerts'],
    queryFn: async () => {
      const res = await api.get('/alerts?status=ACTIVE');
      return res.data;
    },
  });

  const { data: recentTrips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['recent-trips'],
    queryFn: async () => {
      const res = await api.get('/trips');
      return res.data;
    },
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

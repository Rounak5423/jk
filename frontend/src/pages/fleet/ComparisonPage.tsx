import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Truck,
  ArrowUpRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ComparisonPage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // 1. Fetch available fleet vehicles for selection
  const { data: allVehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles-comparison-picker'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  // Default selection: select first 4 vehicles on load
  useEffect(() => {
    if (allVehicles && allVehicles.length >= 2 && selectedIds.length === 0) {
      setSelectedIds(allVehicles.slice(0, Math.min(4, allVehicles.length)).map((v) => v.id));
    }
  }, [allVehicles]);

  // 2. Fetch comparison metrics for selected vehicles
  const { data: comparisons, isLoading: comparisonLoading, error: comparisonError } = useQuery({
    queryKey: ['vehicle-comparison', selectedIds],
    queryFn: async () => {
      if (selectedIds.length < 2) return [];
      const res = await api.get(`/analytics/comparison?vehicle_ids=${selectedIds.join(',')}`);
      return res.data;
    },
    enabled: selectedIds.length >= 2,
  });

  const toggleVehicle = (id: string) => {
    setWarningMessage(null);
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 2) {
        setWarningMessage('Comparison requires at least 2 vehicles to be selected.');
      }
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 10) {
        setWarningMessage('Maximum limit of 10 vehicles reached. Deselect a vehicle to add another.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredVehicles = allVehicles?.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return v.vehicle_number.toLowerCase().includes(q) || (v.model && v.model.toLowerCase().includes(q));
  }) || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cross-Vehicle Fleet Comparison</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Multi-select vehicle benchmarking comparing Tyre Health Index (THI) and operational risk against the 95.0 target standard.
        </p>
      </div>

      {/* Vehicle Selection Drawer */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-slate-900">Select Vehicles to Compare</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                selectedIds.length >= 2 && selectedIds.length <= 10
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-amber-100 text-amber-700 border border-amber-300'
              }`}
            >
              {selectedIds.length} of 10 selected (min: 2)
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle number..."
              className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {warningMessage && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{warningMessage}</span>
            </div>
            <button onClick={() => setWarningMessage(null)} className="text-amber-600 hover:text-slate-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Vehicle Checklist Chips */}
        {vehiclesLoading ? (
          <div className="text-xs text-slate-400 py-3">Loading fleet vehicles...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredVehicles.map((v) => {
              const isSelected = selectedIds.includes(v.id);
              const atLimit = selectedIds.length >= 10 && !isSelected;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVehicle(v.id)}
                  disabled={atLimit}
                  className={`p-2 rounded-xl text-left border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-yellow-50 border-yellow-400 text-slate-900 shadow-sm'
                      : atLimit
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-blue-400'
                  }`}
                >
                  <div className="truncate pr-1">
                    <span className="font-mono text-xs font-bold block truncate">{v.vehicle_number}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{v.wheel_config}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Message if < 2 selected */}
      {selectedIds.length < 2 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center shadow-sm space-y-2">
          <Info className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">Select at Least 2 Vehicles to Compare</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vehicle comparison requires a minimum of 2 vehicles and accepts up to 10 vehicles. Please select from the checklist above.
          </p>
        </div>
      ) : (
        <>
          {/* Comparison Bar Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-yellow-500" /> Vehicle Average THI vs. Target Standard (95.0)
              </h3>
              <span className="text-[11px] text-slate-500">Comparing {selectedIds.length} Vehicles</span>
            </div>

            <div className="h-72 w-full">
              {comparisonLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Computing vehicle comparison metrics...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisons || []} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="vehicle_number" stroke="#64748b" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit=" pts" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                      itemStyle={{ color: '#1e293b' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="average_thi" name="Vehicle Observed Average THI" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ideal_thi" name="Benchmark Target Standard (95.0)" fill="#F5C400" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-blue-50">
                    <th className="py-3.5 px-6">Vehicle Number</th>
                    <th className="py-3.5 px-4">Type &amp; Wheel Config</th>
                    <th className="py-3.5 px-4">Current Odometer</th>
                    <th className="py-3.5 px-4">Fitted Wheels</th>
                    <th className="py-3.5 px-4">Average THI</th>
                    <th className="py-3.5 px-4">Active Alerts</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {comparisons?.map((c: any) => (
                    <tr key={c.vehicle_id} className="hover:bg-blue-50 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        {c.vehicle_number}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-900">{c.wheel_config}</span>
                        <span className="text-[11px] text-slate-400 block">{c.vehicle_type}</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-900">
                        {c.current_odometer.toLocaleString()} km
                      </td>
                      <td className="py-4 px-4 font-semibold text-emerald-600">{c.fitted_wheels} wheels</td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                            c.average_thi >= 80
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : c.average_thi >= 60
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {c.average_thi.toFixed(1)} / 100
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {c.alert_count > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                            {c.alert_count} Active
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Nominal</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Link
                          to={`/vehicles/${c.vehicle_id}/inspections`}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          Inspect
                        </Link>
                        <Link
                          to={`/vehicles/${c.vehicle_id}`}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Vehicle, Vehicle3DTwin } from '../../types';
import { VehicleViewer3D } from '../../components/3d/VehicleViewer3D';
import { Truck, Eye, ArrowUpRight, Gauge, Disc, X, ShieldCheck, Activity, ClipboardCheck, Route } from 'lucide-react';

export const VehiclesPage: React.FC = () => {
  const [active3DVehicleId, setActive3DVehicleId] = useState<string | null>(null);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: twinData, isLoading: twinLoading } = useQuery<Vehicle3DTwin>({
    queryKey: ['vehicle-3d-twin', active3DVehicleId],
    queryFn: async () => {
      if (!active3DVehicleId) return null;
      const res = await api.get(`/vehicles/${active3DVehicleId}/3d-twin`);
      return res.data;
    },
    enabled: !!active3DVehicleId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet Vehicles</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial multi-axle vehicle registry with configuration-driven wheel arrangements.
          </p>
        </div>
      </div>

      {/* Vehicles Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-blue-50">
                <th className="py-3.5 px-6">Vehicle Number</th>
                <th className="py-3.5 px-4">Configuration</th>
                <th className="py-3.5 px-4">Model & Year</th>
                <th className="py-3.5 px-4">Target Pressure</th>
                <th className="py-3.5 px-4">Verified Odometer</th>
                <th className="py-3.5 px-4">Fitted Tyres</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading commercial fleet vehicles...
                  </td>
                </tr>
              ) : vehicles?.map((v) => (
                <tr key={v.id} className="hover:bg-blue-50 transition">
                  <td className="py-4 px-6 font-mono font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    {v.vehicle_number}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{v.wheel_config}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {v.axle_count} Axles • {v.vehicle_type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-700">
                    {v.make} {v.model} ({v.year})
                  </td>
                  <td className="py-4 px-4 font-medium text-blue-600">
                    {v.baseline_pressure} psi
                  </td>
                  <td className="py-4 px-4 font-mono font-medium text-slate-900">
                    {v.current_odometer.toLocaleString()} km
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-emerald-600">
                      {v.fitted_tyre_count} / {v.expected_tyre_count}
                    </span>
                    <span className="text-[10px] text-slate-500 block">mounted</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {v.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Details */}
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                        title="Vehicle Details"
                      >
                        Details <ArrowUpRight className="w-3 h-3" />
                      </Link>

                      {/* 3D View */}
                      <button
                        onClick={() => setActive3DVehicleId(v.id)}
                        className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
                        title="Interactive 3D Wheel Viewer"
                      >
                        <Eye className="w-3 h-3" /> 3D View
                      </button>

                      {/* Inspection */}
                      <Link
                        to={`/vehicles/${v.id}/inspections`}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                        title="Tread NSD & Visual Inspections"
                      >
                        <ClipboardCheck className="w-3 h-3 text-emerald-500" /> Inspection
                      </Link>

                      {/* Trips */}
                      <Link
                        to={`/trips?vehicle_id=${v.id}`}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                        title="Vehicle Journey & Telemetry Trips"
                      >
                        <Route className="w-3 h-3 text-blue-500" /> Trips
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3D Digital Twin Inspection Modal */}
      {active3DVehicleId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl bg-white border border-blue-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center font-black text-slate-900 text-sm shadow">
                  3D
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Digital Twin Vehicle Inspection
                    <span className="text-xs font-semibold text-blue-700 font-mono bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      {twinData?.vehicle_number || vehicles?.find((v) => v.id === active3DVehicleId)?.vehicle_number}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Configuration-driven physical axle arrangement & live tyre health telemetry
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/vehicles/${active3DVehicleId}/3d`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Open Dedicated Fullscreen 3D View"
                >
                  <Eye className="w-3.5 h-3.5" /> Fullscreen 3D
                </Link>
                <button
                  onClick={() => setActive3DVehicleId(null)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
                  title="Close 3D Inspector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950">
              {twinLoading || !twinData ? (
                <div className="h-[650px] flex items-center justify-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl">
                  <Activity className="w-5 h-5 animate-spin mr-2 text-blue-500" />
                  Generating 3D digital twin layout from vehicle configuration...
                </div>
              ) : (
                <VehicleViewer3D
                  twinData={twinData}
                  vehicle={vehicles?.find((v) => v.id === active3DVehicleId)}
                  onClose={() => setActive3DVehicleId(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

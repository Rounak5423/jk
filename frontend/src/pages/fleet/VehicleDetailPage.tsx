import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle, Vehicle3DTwin } from '../../types';
import { VehicleViewer3D } from '../../components/3d/VehicleViewer3D';
import {
  Truck,
  Eye,
  ArrowLeft,
  Disc,
  Gauge,
  Activity,
  AlertTriangle,
  ShieldCheck,
  X,
  ChevronRight,
  ClipboardCheck,
  Camera,
  Wrench,
  Plus,
} from 'lucide-react';

import { computeVehicleTHI } from '../../utils/thiUtils';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [show3DModal, setShow3DModal] = useState(false);

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ['vehicle-detail', id],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: twinData, isLoading: twinLoading } = useQuery<Vehicle3DTwin>({
    queryKey: ['vehicle-3d-twin', id],
    queryFn: async () => {
      if (!active3DVehicleIdSafe) return null;
      const res = await api.get(`/vehicles/${id}/3d-twin`);
      return res.data;
    },
    enabled: show3DModal && !!id,
  });

  const active3DVehicleIdSafe = id;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center">
        <Activity className="w-5 h-5 animate-spin mr-2 text-blue-500" />
        Loading vehicle details...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Vehicle not found.{' '}
        <Link to="/vehicles" className="text-blue-600 underline">
          Return to vehicle list
        </Link>
      </div>
    );
  }

  const thiData = computeVehicleTHI(vehicle);

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/vehicles"
            className="inline-flex items-center gap-1.5 text-xs text-[#5B6068] hover:text-slate-900 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Fleet Registry
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">{vehicle.vehicle_number}</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {vehicle.wheel_config}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            {vehicle.make} {vehicle.model} • Manufacturing Year: {vehicle.year}
          </p>
        </div>

        {/* 3D View & Inspection Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/vehicles/${vehicle.id}/inspections`}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" /> Physical Inspection &amp; Photos
          </Link>
          <Link
            to={`/vehicles/${vehicle.id}/3d`}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <Eye className="w-4 h-4 text-[#5B6068]" /> Dedicated 3D View
          </Link>
          <button
            onClick={() => setShow3DModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#14161A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-300" /> Open 3D Inspector
          </button>
        </div>
      </div>

      {/* Vehicle Specs Grid including Priority-Weighted Vehicle THI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Vehicle THI Card */}
        <div className="bg-cream border border-gold-border p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-300 block mb-1">Vehicle THI</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{thiData.thi.toFixed(1)}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                thiData.thi_status === 'HEALTHY'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : thiData.thi_status === 'WARNING'
                  ? 'bg-[#FFF4EB] text-[#E8770E] border-[#FCD5B5]'
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {thiData.thi_status}
            </span>
          </div>
          <span className="text-[10px] text-slate-300 block mt-0.5">
            {thiData.critical_tyres_count > 0
              ? `⚠️ ${thiData.critical_tyres_count} critical tyre (4x weight)`
              : thiData.warning_tyres_count > 0
              ? `⚡ ${thiData.warning_tyres_count} warning tyre`
              : 'All tyres optimal'}
          </span>
        </div>

        <div className="bg-cream border border-gold-border p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-300 block mb-1">Current Odometer</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{vehicle.current_odometer.toLocaleString()} km</span>
          <span className="text-[10px] text-slate-300 block mt-0.5">Monotonically verified</span>
        </div>

        <div className="bg-cream border border-gold-border p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-300 block mb-1">Recommended Pressure</span>
          <span className="text-xl font-bold text-white">{vehicle.baseline_pressure} psi</span>
          <span className="text-[10px] text-slate-300 block mt-0.5">Vehicle baseline</span>
        </div>

        <div className="bg-cream border border-gold-border p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-300 block mb-1">Baseline Mileage</span>
          <span className="text-xl font-bold text-white">{vehicle.baseline_mileage} km/L</span>
          <span className="text-[10px] text-slate-300 block mt-0.5">Commercial rating</span>
        </div>

        <div className="bg-cream border border-gold-border p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-300 block mb-1">Axle Setup</span>
          <span className="text-xl font-bold text-white">{vehicle.axle_count} Axles</span>
          <span className="text-[10px] text-slate-300 block mt-0.5">{vehicle.expected_tyre_count} Physical wheels</span>
        </div>
      </div>

      {/* Fitted Tyres Conventional Table */}
      <div className="cream-glow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Disc className="w-4 h-4 text-[#5B6068]" /> Active Fitted Tyres by Wheel Position
          </h3>
          <Link
            to={`/fitment?vehicle_id=${vehicle.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold text-xs rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" /> + Fit / Add Tyres
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold-border text-slate-300 font-semibold bg-cream-100">
                <th className="py-3 px-3">Position Code</th>
                <th className="py-3 px-3">Permanent Serial</th>
                <th className="py-3 px-3">Tyre Model</th>
                <th className="py-3 px-3">THI Score</th>
                <th className="py-3 px-3">Tread NSD</th>
                <th className="py-3 px-3">Health Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {(!vehicle.fitments || vehicle.fitments.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5B6068]">
                    <div className="flex flex-col items-center gap-2">
                      <Disc className="w-8 h-8 text-slate-300" />
                      <span>No tyres currently mounted on this vehicle.</span>
                      <Link
                        to={`/fitment?vehicle_id=${vehicle.id}`}
                        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add &amp; Fit Tyres Now
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicle.fitments?.map((f) => (
                <tr key={f.id} className="hover:bg-[#FFF9E8] transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{f.wheel_position}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{f.tyre?.serial_number || 'N/A'}</td>
                  <td className="py-3 px-3">{f.tyre?.model || 'JK Tyre'}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {f.tyre?.current_thi !== undefined ? `${f.tyre.current_thi.toFixed(1)} / 100` : 'N/A'}
                  </td>
                  <td className="py-3 px-3">{f.tyre?.current_nsd ? `${f.tyre.current_nsd.toFixed(1)} mm` : 'N/A'}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        f.tyre?.thi_status === 'HEALTHY'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : f.tyre?.thi_status === 'WARNING'
                          ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      {f.tyre?.thi_status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <Link
                        to={`/vehicles/${vehicle.id}/inspections`}
                        className="text-xs text-slate-700 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition"
                        title="Record physical measurement and tyre photo"
                      >
                        <Camera className="w-3 h-3 text-[#5B6068]" /> Inspect
                      </Link>
                      <button
                        onClick={() => setShow3DModal(true)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                      >
                        3D <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3D Digital Twin Modal */}
      {show3DModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#14161A] flex items-center justify-center font-bold text-white text-sm shadow">
                  3D
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Digital Twin Inspection • {vehicle.vehicle_number}
                    <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {vehicle.wheel_config}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Configuration-driven physical axle arrangement & live tyre health telemetry
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/vehicles/${vehicle.id}/3d`}
                  className="px-3 py-1.5 bg-[#14161A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Open Dedicated Fullscreen 3D View"
                >
                  <Eye className="w-3.5 h-3.5" /> Fullscreen 3D
                </Link>
                <button
                  onClick={() => setShow3DModal(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950">
              {twinLoading || !twinData ? (
                <div className="h-[650px] flex items-center justify-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl">
                  <Activity className="w-5 h-5 animate-spin mr-2 text-blue-500" />
                  Generating 3D digital twin layout...
                </div>
              ) : (
                <VehicleViewer3D twinData={twinData} vehicle={vehicle} onClose={() => setShow3DModal(false)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

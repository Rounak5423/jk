import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle, Vehicle3DTwin } from '../../types';
import { VehicleViewer3D } from '../../components/3d/VehicleViewer3D';
import {
  Truck,
  ArrowLeft,
  Activity,
  Layers,
  Disc,
  Gauge,
  ClipboardCheck,
  Route,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Vehicle3DPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch all fleet vehicles for quick switcher
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    }
  });

  // Fetch active vehicle detail
  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: ['vehicle-detail', id],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch 3D twin metadata
  const { data: twinData, isLoading: twinLoading } = useQuery<Vehicle3DTwin>({
    queryKey: ['vehicle-3d-twin', id],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${id}/3d-twin`);
      return res.data;
    },
    enabled: !!id
  });

  if (vehicleLoading || twinLoading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-center">
        <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-900">Loading 3D Digital Twin...</h2>
        <p className="text-xs text-slate-500 mt-1">
          Generating physical axle arrangement and streaming tyre telemetry
        </p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600 mb-4">Vehicle not found.</p>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fleet Vehicles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5B6068] mb-1">
            <Link to="/vehicles" className="hover:text-slate-900 transition flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Fleet Vehicles
            </Link>
            <span>/</span>
            <Link to={`/vehicles/${vehicle.id}`} className="hover:text-slate-900 transition font-mono">
              {vehicle.vehicle_number}
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">3D Digital Twin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14161A] flex items-center justify-center font-bold text-white text-base shadow-sm">
              3D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {vehicle.vehicle_number}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {vehicle.wheel_config}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {vehicle.status}
                </span>
              </div>
              <p className="text-xs text-[#5B6068] mt-0.5">
                {vehicle.make} {vehicle.model} • {vehicle.axle_count} Axles • {vehicle.expected_tyre_count} Physical Wheel Mounts
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Vehicle Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {vehicles && vehicles.length > 1 && (
            <select
              value={vehicle.id}
              onChange={(e) => navigate(`/vehicles/${e.target.value}/3d`)}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              title="Switch Vehicle"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.wheel_config})
                </option>
              ))}
            </select>
          )}

          <Link
            to={`/vehicles/${vehicle.id}`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm border border-slate-200"
          >
            Vehicle Details <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to={`/vehicles/${vehicle.id}/inspections`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm border border-slate-200"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> Inspections
          </Link>

          <Link
            to={`/trips?vehicle_id=${vehicle.id}`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm border border-slate-200"
          >
            <Route className="w-3.5 h-3.5 text-blue-600" /> Trips
          </Link>
        </div>
      </div>

      {/* 3D Digital Twin Viewer in Full Height */}
      <VehicleViewer3D
        twinData={twinData}
        vehicle={vehicle}
        fullscreen={true}
        onClose={() => navigate('/vehicles')}
      />
    </div>
  );
};

export default Vehicle3DPage;

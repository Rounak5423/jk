import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Vehicle, Vehicle3DTwin } from '../../types';
import { VehicleViewer3D } from '../../components/3d/VehicleViewer3D';
import { computeVehicleTHI, computeFleetAverageVehicleTHI } from '../../utils/thiUtils';
import {
  Truck,
  Eye,
  ArrowUpRight,
  Gauge,
  Disc,
  X,
  ShieldCheck,
  Activity,
  ClipboardCheck,
  Route,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  RefreshCw,
  Building2,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const VehiclesPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [active3DVehicleId, setActive3DVehicleId] = useState<string | null>(null);
  const [thiFilter, setThiFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');

  // Add Vehicle Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [registeredVehicle, setRegisteredVehicle] = useState<{ id: string; vehicle_number: string; wheel_config: string } | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [make, setMake] = useState('Tata Motors');
  const [model, setModel] = useState('Signa 2823.K');
  const [year, setYear] = useState(new Date().getFullYear());
  const [wheelConfig, setWheelConfig] = useState('10-Wheeler');
  const [vehicleType, setVehicleType] = useState('HEAVY_TRUCK');
  const [baselinePressure, setBaselinePressure] = useState('110');
  const [baselineMileage, setBaselineMileage] = useState('4.5');
  const [currentOdometer, setCurrentOdometer] = useState('0');
  const [locationName, setLocationName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles', activeFleetId],
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

  // Calculate Vehicle THI with critical priority weighting for each vehicle
  const vehiclesWithThi = (vehicles || []).map((v) => {
    const thiData = computeVehicleTHI(v);
    return {
      ...v,
      ...thiData,
    };
  });

  // Fleet Average Vehicle THI: strictly the average of the vehicle THIs across ALL vehicles
  const avgFleetVehicleTHI = computeFleetAverageVehicleTHI(vehicles || []);

  const healthyVehicles = vehiclesWithThi.filter((v) => v.thi_status === 'HEALTHY');
  const warningVehicles = vehiclesWithThi.filter((v) => v.thi_status === 'WARNING');
  const criticalVehicles = vehiclesWithThi.filter((v) => v.thi_status === 'CRITICAL');

  const displayedVehicles = vehiclesWithThi.filter((v) => {
    if (thiFilter === 'CRITICAL') return v.thi_status === 'CRITICAL';
    if (thiFilter === 'WARNING') return v.thi_status === 'WARNING';
    if (thiFilter === 'HEALTHY') return v.thi_status === 'HEALTHY';
    return true;
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/vehicles', payload);
      return res.data;
    },
    onSuccess: (newVeh) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-stats'] });
      setRegisteredVehicle(newVeh);
      setFormSuccess(`Vehicle ${newVeh.vehicle_number} registered successfully!`);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Failed to register vehicle.');
    },
  });

  const resetAddForm = () => {
    setRegisteredVehicle(null);
    setVehicleNumber('');
    setMake('Tata Motors');
    setModel('Signa 2823.K');
    setYear(new Date().getFullYear());
    setWheelConfig('10-Wheeler');
    setVehicleType('HEAVY_TRUCK');
    setBaselinePressure('110');
    setBaselineMileage('4.5');
    setCurrentOdometer('0');
    setLocationName('');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleWheelConfigChange = (cfg: string) => {
    setWheelConfig(cfg);
    if (cfg === '10-Wheeler') {
      setBaselinePressure('110');
      setModel('Signa 2823.K');
      setVehicleType('HEAVY_TRUCK');
    } else if (cfg === '12-Wheeler') {
      setBaselinePressure('130');
      setModel('Signa 3525.K');
      setVehicleType('HEAVY_TRUCK');
    } else if (cfg === '14-Wheeler') {
      setBaselinePressure('130');
      setModel('Signa 4225.T');
      setVehicleType('HEAVY_TRUCK');
    } else if (cfg === '16-Wheeler') {
      setBaselinePressure('135');
      setModel('Signa 4825.TK');
      setVehicleType('HEAVY_TRUCK');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const vNum = vehicleNumber.trim().toUpperCase();
    if (!vNum) {
      setFormError('Vehicle registration number is required.');
      return;
    }

    createVehicleMutation.mutate({
      fleet_id: activeFleetId || undefined,
      vehicle_number: vNum,
      make: make.trim(),
      model: model.trim(),
      year: Number(year) || new Date().getFullYear(),
      wheel_config: wheelConfig,
      vehicle_type: vehicleType,
      baseline_pressure: parseFloat(baselinePressure) || 110.0,
      baseline_mileage: parseFloat(baselineMileage) || 4.5,
      current_odometer: parseFloat(currentOdometer) || 0.0,
      current_location_name: locationName.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Vehicle Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Fleet Vehicles</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Commercial multi-axle vehicle registry with configuration-driven wheel arrangements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/my-fleets"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] font-semibold rounded-xl text-xs transition cursor-pointer"
            title="Switch or Register New Fleets"
          >
            <Building2 className="w-4 h-4 text-[#5B6068]" /> Manage / Add Fleet
          </Link>
          <button
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>
      </div>

      {/* ══ VEHICLE THI INTELLIGENCE SECTION ══════════════════════════════ */}
      {(!isLoading && vehicles && vehicles.length > 0) && (
        <div className="cream-glow-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Tyre Health Index (THI) Section
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cream-100 text-slate-600 border border-gold-light uppercase tracking-wider">
                  Critical Priority Weighted
                </span>
              </div>
              <p className="text-xs text-[#5B6068] mt-1">
                Vehicle THI is the weighted average of its fitted tyres with critical tyres weighted 4x more to reflect blowout risk. The fleet average is the mean of all vehicle THIs.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setThiFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  thiFilter === 'ALL'
                    ? 'bg-brand-gold text-black border border-gold-border font-bold'
                    : 'bg-cream text-slate-500 border border-transparent hover:text-slate-700'
                }`}
              >
                All ({vehiclesWithThi.length})
              </button>
              <button
                type="button"
                onClick={() => setThiFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  thiFilter === 'CRITICAL'
                    ? 'bg-brand-gold text-black border border-gold-border font-bold'
                    : 'bg-cream text-slate-500 border border-transparent hover:text-slate-700'
                }`}
              >
                Critical ({criticalVehicles.length})
              </button>
              <button
                type="button"
                onClick={() => setThiFilter('WARNING')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  thiFilter === 'WARNING'
                    ? 'bg-brand-gold text-black border border-gold-border font-bold'
                    : 'bg-cream text-slate-500 border border-transparent hover:text-slate-700'
                }`}
              >
                Warning ({warningVehicles.length})
              </button>
              <button
                type="button"
                onClick={() => setThiFilter('HEALTHY')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  thiFilter === 'HEALTHY'
                    ? 'bg-brand-gold text-black border border-gold-border font-bold'
                    : 'bg-cream text-slate-500 border border-transparent hover:text-slate-700'
                }`}
              >
                Healthy ({healthyVehicles.length})
              </button>
            </div>
          </div>

          {/* 4 THI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Fleet Average Vehicle THI */}
            <div className="black-glow-card p-4 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Fleet Average Vehicle THI
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 flex items-center justify-center">
                  <Gauge className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {avgFleetVehicleTHI.toFixed(1)}
                </span>
                <span className="text-xs text-slate-300 font-medium">/ 100</span>
                <span
                  className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${
                    avgFleetVehicleTHI >= 85
                      ? 'bg-emerald-500 text-white'
                      : avgFleetVehicleTHI >= 70
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {avgFleetVehicleTHI >= 85 ? 'HEALTHY' : avgFleetVehicleTHI >= 70 ? 'WARNING' : 'CRITICAL'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    avgFleetVehicleTHI >= 85
                      ? 'bg-emerald-500'
                      : avgFleetVehicleTHI >= 70
                      ? 'bg-[#E8770E]'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, avgFleetVehicleTHI))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-2">
                Mean of all {vehiclesWithThi.length} vehicles in fleet
              </span>
            </div>

            {/* Card 2: Healthy Vehicles */}
            <div
              onClick={() => setThiFilter('HEALTHY')}
              className={`black-glow-card p-4 transition cursor-pointer ${
                thiFilter === 'HEALTHY' ? 'ring-2 ring-emerald-500/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Optimal Vehicles
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {healthyVehicles.length}
                </span>
                <span className="text-xs text-slate-300 font-medium">vehicles</span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">
                  THI ≥ 85
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-3">
                All mounted tyres in safe, optimal condition
              </span>
            </div>

            {/* Card 3: Warning Vehicles */}
            <div
              onClick={() => setThiFilter('WARNING')}
              className={`black-glow-card p-4 transition cursor-pointer ${
                thiFilter === 'WARNING' ? 'ring-2 ring-[#E8770E]/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Warning Vehicles
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#E8770E]/10 text-[#E8770E] flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {warningVehicles.length}
                </span>
                <span className="text-xs text-slate-300 font-medium">vehicles</span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                  70 ≤ THI &lt; 85
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-3">
                Under-inflation or accelerated tread wear
              </span>
            </div>

            {/* Card 4: Critical Vehicles */}
            <div
              onClick={() => setThiFilter('CRITICAL')}
              className={`black-glow-card p-4 transition cursor-pointer ${
                thiFilter === 'CRITICAL' ? 'ring-2 ring-red-500/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Critical Vehicles
                </span>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {criticalVehicles.length}
                </span>
                <span className="text-xs text-slate-300 font-medium">vehicles</span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                  THI &lt; 70
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-3">
                Severe blowout risk • Critical tyre weighted 4x
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when 0 vehicles */}
      {!isLoading && (!vehicles || vehicles.length === 0) && (
        <div className="bg-cream border border-gold-border rounded-3xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cream-100 border border-gold-light flex items-center justify-center mx-auto text-[#5B6068] shadow-sm">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Vehicles in Fleet</h3>
            <p className="text-xs text-[#5B6068] mt-1 max-w-md mx-auto">
              There are currently 0 vehicles registered in this fleet. Add your first commercial truck, bus, or trailer to begin digital twin tracking and tyre health monitoring.
            </p>
          </div>
          <button
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add First Vehicle
          </button>
        </div>
      )}

      {/* Vehicles Table Card */}
      {(!vehicles || vehicles.length > 0 || isLoading) && (
        <div className="cream-glow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gold-light text-[#344054] font-semibold bg-cream-200">
                  <th className="py-3.5 px-6">Vehicle Number</th>
                  <th className="py-3.5 px-4">Configuration</th>
                  <th className="py-3.5 px-4">Model &amp; Year</th>
                  <th className="py-3.5 px-4">Vehicle THI</th>
                  <th className="py-3.5 px-4">Target Pressure</th>
                  <th className="py-3.5 px-4">Verified Odometer</th>
                  <th className="py-3.5 px-4">Fitted Tyres</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-light text-[#344054]">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#5B6068]">
                      Loading commercial fleet vehicles...
                    </td>
                  </tr>
                ) : displayedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#5B6068]">
                      No vehicles matching the selected THI filter ({thiFilter}).
                    </td>
                  </tr>
                ) : (
                  displayedVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-[#FFF9E8] transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#5B6068]" />
                        {v.vehicle_number}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-900">{v.wheel_config}</span>
                        <span className="text-[11px] text-[#5B6068] block">
                          {v.axle_count} Axles • {v.vehicle_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {v.make} {v.model} ({v.year})
                      </td>

                      {/* ── Vehicle THI (Priority Weighted) ── */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {v.thi.toFixed(1)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              v.thi_status === 'HEALTHY'
                                ? 'bg-emerald-500 text-white'
                                : v.thi_status === 'WARNING'
                                ? 'bg-amber-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            {v.thi_status}
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              v.thi >= 85 ? 'bg-emerald-500' : v.thi >= 70 ? 'bg-[#E8770E]' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, v.thi))}%` }}
                          />
                        </div>
                        {v.critical_tyres_count > 0 ? (
                          <span
                            className="text-[10px] text-red-600 font-semibold block mt-1"
                            title="Critical tyres impact vehicle THI with 4x priority weighting"
                          >
                            ⚠️ {v.critical_tyres_count} critical tyre{v.critical_tyres_count > 1 ? 's' : ''} (4x weight)
                          </span>
                        ) : v.warning_tyres_count > 0 ? (
                          <span
                            className="text-[10px] text-[#E8770E] font-semibold block mt-1"
                            title="Warning tyres impact vehicle THI with 2x priority weighting"
                          >
                            ⚡ {v.warning_tyres_count} warning tyre{v.warning_tyres_count > 1 ? 's' : ''} (2x weight)
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#5B6068] block mt-1">
                            All tyres optimal
                          </span>
                        )}
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
                        <span className="text-[10px] text-[#5B6068] block">mounted</span>
                        {v.fitted_tyre_count < v.expected_tyre_count && (
                          <Link
                            to={`/fitment?vehicle_id=${v.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E8770E] hover:underline mt-0.5"
                            title="Open Fitment part to mount tyres"
                          >
                            + Fit {v.expected_tyre_count - v.fitted_tyre_count} tyres
                          </Link>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500 text-white">
                          {v.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Fit Tyres Action */}
                          <Link
                            to={`/fitment?vehicle_id=${v.id}`}
                            className="px-2.5 py-1.5 bg-brand-gold hover:bg-brand-warm-gold text-black rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
                            title="Mount &amp; Manage Tyres in Fitment Section"
                          >
                            <Wrench className="w-3 h-3" /> Fit Tyres
                          </Link>

                          {/* Details */}
                          <Link
                            to={`/vehicles/${v.id}`}
                            className="px-2.5 py-1.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                            title="Vehicle Details"
                          >
                            Details <ArrowUpRight className="w-3 h-3" />
                          </Link>

                          {/* 3D View */}
                          <button
                            onClick={() => setActive3DVehicleId(v.id)}
                            className="px-2.5 py-1.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                            title="Interactive 3D Wheel Viewer"
                          >
                            <Eye className="w-3 h-3" /> 3D View
                          </button>

                          {/* Inspection */}
                          <Link
                            to={`/vehicles/${v.id}/inspections`}
                            className="px-2.5 py-1.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                            title="Tread NSD &amp; Visual Inspections"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> 2D Inspection
                          </Link>

                          {/* Trips */}
                          <Link
                            to={`/trips?vehicle_id=${v.id}`}
                            className="px-2.5 py-1.5 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm"
                            title="Vehicle Journey &amp; Telemetry Trips"
                          >
                            <Route className="w-3 h-3 text-blue-500" /> Trips
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register New Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-cream border border-gold-border rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-cream-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-slate-900 text-sm shadow">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Register New Fleet Vehicle
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Configuration-driven axle arrangement &amp; 3D digital twin layout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form or Post-Registration Prompt */}
            {registeredVehicle ? (
              <div className="p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Vehicle {registeredVehicle.vehicle_number} Registered!
                  </h3>
                  <p className="text-xs text-[#5B6068] mt-1 max-w-sm mx-auto">
                    The {registeredVehicle.wheel_config} profile has been initialized. Proceed to the fitment section to install tyres on this vehicle.
                  </p>
                </div>

                <div className="p-4 bg-cream border border-gold-border rounded-2xl max-w-sm mx-auto text-left text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Axle Configuration:</span>
                    <span className="font-bold text-slate-900">{registeredVehicle.wheel_config}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fitment Status:</span>
                    <span className="font-semibold text-[#E8770E]">0 Tyres Mounted</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <Link
                    to={`/fitment?vehicle_id=${registeredVehicle.id}`}
                    onClick={() => {
                      setShowAddModal(false);
                      resetAddForm();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    <Wrench className="w-4 h-4" /> Add &amp; Fit Tyres Now
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetAddForm();
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-cream border border-gold-light hover:bg-cream-100 text-[#344054] font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Done / Later
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Row 1: Vehicle Number & Year */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vehicle Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. DL-01-AF-3525"
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Model Year
                    </label>
                    <input
                      type="number"
                      min="2010"
                      max="2030"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Row 2: Wheel Config & Vehicle Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Truck Wheel Configuration <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={wheelConfig}
                      onChange={(e) => handleWheelConfigChange(e.target.value)}
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-gold"
                    >
                      <option value="10-Wheeler">10-Wheeler (3 Axles, 10 Wheels — 28T Hauler)</option>
                      <option value="12-Wheeler">12-Wheeler (4 Axles, 12 Wheels — 35T Tipper/Hauler)</option>
                      <option value="14-Wheeler">14-Wheeler (5 Axles, 14 Wheels — 42T Multi-Axle)</option>
                      <option value="16-Wheeler">16-Wheeler (5 Axles, 16 Wheels — 48T+ Heavy Multi-Axle)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Heavy commercial trucks only (starting from 10-wheelers)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Truck Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-brand-gold"
                    >
                      <option value="HEAVY_TRUCK">Heavy Commercial Truck (Cargo / Hauler)</option>
                      <option value="TIPPER_TRUCK">Heavy Duty Tipper / Mining Dumper</option>
                      <option value="TRACTOR_TRAILER">Tractor-Trailer (Prime Mover)</option>
                      <option value="TANKER_TRUCK">Commercial Tanker / Bulk Carrier</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Fleet operational category
                    </span>
                  </div>
                </div>

                {/* Row 3: Make & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Manufacturer / Make
                    </label>
                    <input
                      type="text"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="e.g. Tata Motors"
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. Signa 2823.K"
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Row 4: Pressure & Odometer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Cold Pressure (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={baselinePressure}
                      onChange={(e) => setBaselinePressure(e.target.value)}
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Recommended: 110 PSI (10-Wheeler), 130 PSI (12/14-Wheeler), 135 PSI (16-Wheeler)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Verified Odometer (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentOdometer}
                      onChange={(e) => setCurrentOdometer(e.target.value)}
                      className="w-full px-3 py-2 bg-cream border border-gold-border rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Row 5: Location Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Home Depot / Current Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Okhla Logistics Center, New Delhi"
                      className="w-full pl-9 pr-3 py-2 bg-cream border border-gold-border rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-cream border border-gold-light text-[#344054] hover:bg-cream-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createVehicleMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-brand-warm-gold disabled:opacity-50 text-black font-bold rounded-xl text-xs shadow-md shadow-brand-gold/20 transition cursor-pointer"
                  >
                    {createVehicleMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Register Vehicle
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3D Digital Twin Inspection Modal */}
      {active3DVehicleId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl bg-cream border border-gold-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="px-6 py-4 border-b border-gold-light flex items-center justify-between bg-cream-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#14161A] flex items-center justify-center font-bold text-white text-sm shadow">
                  3D
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Digital Twin Vehicle Inspection
                    <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {twinData?.vehicle_number || vehicles?.find((v) => v.id === active3DVehicleId)?.vehicle_number}
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#5B6068]">
                    Configuration-driven physical axle arrangement &amp; live tyre health telemetry
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

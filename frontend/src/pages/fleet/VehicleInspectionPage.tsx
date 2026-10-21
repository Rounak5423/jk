import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  ClipboardCheck,
  Truck,
  Disc,
  ArrowLeft,
  Plus,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Camera,
  RefreshCw,
  Gauge,
  Calendar,
  X,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface PositionData {
  fitment_id: string;
  wheel_position: string;
  axle_number: number;
  is_dual: boolean;
  is_inner: boolean;
  fitted_at: string | null;
  fitted_odometer: number;
  fitted_nsd: number;
  tyre: {
    id: string;
    serial_number: string;
    model: string;
    size: string;
    blueprint_nsd: number;
    current_nsd: number;
    current_thi: number;
    thi_status: string;
    total_km_run: number;
    lifecycle_type?: string;
    status?: string;
  } | null;
  latest_inspection: any | null;
  has_inspection_data: boolean;
}

type LifecycleDecision = '' | 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP';

function getLifecycleBadge(lt: string | null | undefined) {
  switch (lt) {
    case 'NEW': return 'bg-emerald-100 text-emerald-800';
    case 'REUSE': return 'bg-blue-100 text-blue-800';
    case 'RETREAD': return 'bg-amber-100 text-amber-800';
    case 'SCRAP': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export const VehicleInspectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [selectedTyreId, setSelectedTyreId] = useState('');
  const [measuredNsd, setMeasuredNsd] = useState('');
  const [measuredPressure, setMeasuredPressure] = useState('');
  const [odometer, setOdometer] = useState('');
  const [visualCondition, setVisualCondition] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Photo viewer lightbox modal
  const [viewingPhoto, setViewingPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // New inspection fields
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'WARNING' | 'FAIL' | 'FURTHER_ASSESSMENT'>('PASS');
  const [temperature, setTemperature] = useState('');
  const [lifecycleDecision, setLifecycleDecision] = useState<LifecycleDecision>('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [retreadDate, setRetreadDate] = useState('');
  const [retreadProvider, setRetreadProvider] = useState('');
  const [retreadNsd, setRetreadNsd] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-inspection-summary', id],
    queryFn: async () => {
      const res = await api.get(`/inspections/vehicle/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/inspections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary', id] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.error || 'Failed to submit inspection.');
    },
  });

  const resetForm = () => {
    setSelectedTyreId('');
    setMeasuredNsd('');
    setMeasuredPressure('');
    setOdometer('');
    setVisualCondition('NORMAL');
    setNotes('');
    setSubmitError(null);
    setInspectionResult('PASS');
    setTemperature('');
    setLifecycleDecision('');
    setLifecycleReason('');
    setRetreadDate('');
    setRetreadProvider('');
    setRetreadNsd('');
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setPhotoFile(f);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const removeSelectedPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const openInspectionModal = (tyreId?: string) => {
    resetForm();
    if (tyreId) {
      setSelectedTyreId(tyreId);
    }
    if (data?.vehicle?.current_odometer) {
      setOdometer(data.vehicle.current_odometer.toString());
    }
    if (data?.vehicle?.baseline_pressure) {
      setMeasuredPressure(data.vehicle.baseline_pressure.toString());
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedTyreId || !measuredNsd || !odometer) {
      setSubmitError('Please complete tyre selection, NSD measurement, and odometer.');
      return;
    }

    const formData = new FormData();
    formData.append('vehicle_id', id!);
    formData.append('tyre_id', selectedTyreId);
    formData.append('measured_nsd', measuredNsd);
    if (measuredPressure) formData.append('measured_pressure', measuredPressure);
    formData.append('odometer', odometer);
    formData.append('visual_condition', visualCondition);
    formData.append('notes', notes.trim());
    formData.append('inspection_result', inspectionResult);
    if (temperature) formData.append('temperature_at_inspection', temperature);
    if (lifecycleDecision) {
      formData.append('lifecycle_type_change', lifecycleDecision);
      formData.append('lifecycle_reason', lifecycleReason || '');
      if (lifecycleDecision === 'RETREAD') {
        if (retreadDate) formData.append('retread_date', retreadDate);
        if (retreadProvider) formData.append('retread_provider', retreadProvider);
        if (retreadNsd) formData.append('measured_nsd', retreadNsd);
      }
    }
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    createInspectionMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="h-8 bg-slate-200 rounded-xl w-64 animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-16 bg-white rounded-2xl border border-bordergray shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-graphite">Unable to Load Vehicle Inspections</h3>
        <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
          {(error as any)?.response?.data?.error || 'Vehicle not found or unauthorized access.'}
        </p>
        <Link
          to="/vehicles"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-graphite text-white text-xs font-bold rounded-xl shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
        </Link>
      </div>
    );
  }

  const { vehicle, positions, recent_inspections } = data;
  const token = localStorage.getItem('jk_token') || '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/vehicles"
              className="p-1.5 rounded-lg border border-bordergray text-secondary hover:text-graphite hover:bg-slate-50 transition shadow-sm"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-black text-graphite tracking-tight">
              Vehicle Inspection — <span className="font-mono text-fleet">{vehicle.vehicle_number}</span>
            </h1>
          </div>
          <p className="text-xs text-secondary mt-1 ml-8">
            Physical tread-depth (NSD) inspection, verified odometer checks, visual condition audits, and tyre defect photos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/trips?vehicle_id=${vehicle.id}`}
            className="px-3 py-2 bg-white border border-bordergray text-secondary hover:text-graphite rounded-xl text-xs font-semibold shadow-sm transition"
          >
            View Vehicle Trips
          </Link>
          <button
            onClick={() => openInspectionModal()}
            className="px-4 py-2 bg-fleet hover:bg-yellow-400 text-graphite font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record New Inspection
          </button>
        </div>
      </div>

      {/* Vehicle Summary Banner */}
      <div className="bg-graphite rounded-2xl p-6 text-white grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-md">
        <div>
          <div className="text-[11px] text-slate-400">Make &amp; Model</div>
          <div className="text-sm font-bold text-white mt-0.5">{vehicle.make} {vehicle.model}</div>
          <div className="text-[10px] text-slate-400">{vehicle.wheel_config}</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">Verified Odometer</div>
          <div className="text-base font-black text-white font-mono mt-0.5">{vehicle.current_odometer.toLocaleString()} km</div>
          <div className="text-[10px] text-emerald-400">Monotonically verified</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">Baseline Pressure</div>
          <div className="text-base font-black text-fleet font-mono mt-0.5">{vehicle.baseline_pressure} psi</div>
          <div className="text-[10px] text-slate-400">Cold OEM inflation standard</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">Fitted Positions</div>
          <div className="text-base font-black text-white mt-0.5">{positions.length} Fitted</div>
          <div className="text-[10px] text-slate-400">
            {positions.filter((p: PositionData) => p.has_inspection_data).length} Inspected
          </div>
        </div>
      </div>

      {/* Wheel Positions Inspection Status Grid */}
      <div className="bg-white rounded-2xl border border-bordergray p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-bordergray">
          <div>
            <h2 className="text-base font-bold text-graphite">Wheel Positions &amp; Physical Measurements</h2>
            <p className="text-xs text-secondary">
              Actual mounted tyre readings with photographic defect verification. No simulated or fabricated measurements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((pos: PositionData) => {
            const hasData = pos.has_inspection_data;
            const tyre = pos.tyre;
            const insp = pos.latest_inspection;

            return (
              <div
                key={pos.fitment_id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  hasData
                    ? 'border-bordergray bg-white shadow-sm'
                    : 'border-dashed border-amber-300 bg-amber-50/40'
                }`}
              >
                <div>
                  {/* Position Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-graphite px-2 py-0.5 rounded bg-slate-100">
                      {pos.wheel_position}
                    </span>
                    {hasData ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Inspected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Pending Audit
                      </span>
                    )}
                  </div>

                  {/* Tyre Information */}
                  {tyre ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="font-mono font-bold text-graphite truncate">{tyre.serial_number}</div>
                      <div className="text-[11px] text-secondary">{tyre.model} • {tyre.size}</div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-bordergray/60">
                        <div>
                          <div className="text-[10px] text-secondary">Current NSD</div>
                          <div className="font-bold text-graphite">{tyre.current_nsd} mm</div>
                          <div className="text-[9px] text-secondary">Original: {tyre.blueprint_nsd} mm</div>
                        </div>

                        <div>
                          <div className="text-[10px] text-secondary">THI Score</div>
                          <div className={`font-bold ${
                            tyre.thi_status === 'HEALTHY' ? 'text-emerald-700' :
                            tyre.thi_status === 'WARNING' ? 'text-orange-700' : 'text-rose-700'
                          }`}>
                            {tyre.current_thi}/100 ({tyre.thi_status})
                          </div>
                        </div>
                      </div>

                      {tyre.lifecycle_type && (
                        <div className="pt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadge(tyre.lifecycle_type)}`}>
                            {tyre.lifecycle_type}
                          </span>
                        </div>
                      )}

                      {/* Latest Inspection Note & Photo Button */}
                      {insp && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                          <div className="flex justify-between text-secondary text-[10px]">
                            <span>Last Inspected:</span>
                            <span>{new Date(insp.inspected_at).toLocaleDateString()}</span>
                          </div>
                          <div className="font-medium text-graphite">
                            Condition: <span className="font-bold">{insp.visual_condition}</span>
                          </div>
                          {insp.notes && (
                            <p className="text-[10px] text-secondary italic line-clamp-2">"{insp.notes}"</p>
                          )}

                          {/* Photo preview button if attached */}
                          {insp.photo_url && (
                            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPhoto({
                                    url: `/api/v1/inspections/photo/${insp.photo_url}?token=${token}`,
                                    title: `Wheel ${pos.wheel_position} — Tyre ${tyre.serial_number}`,
                                    subtitle: `Measured NSD: ${insp.measured_nsd} mm • Inspected: ${new Date(insp.inspected_at).toLocaleDateString()}`,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold transition shadow-sm cursor-pointer"
                              >
                                <Camera className="w-3 h-3 text-blue-600" /> View Tyre Photo
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-secondary py-4 text-center">No tyre currently fitted</div>
                  )}
                </div>

                {/* Inspect Action */}
                {tyre && (
                  <button
                    onClick={() => openInspectionModal(tyre.id)}
                    className="mt-3 w-full py-1.5 bg-slate-100 hover:bg-fleet hover:text-graphite text-secondary font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Inspect Wheel {pos.wheel_position}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Vehicle Inspections Table */}
      <div className="bg-white rounded-2xl border border-bordergray overflow-hidden shadow-sm">
        <div className="p-6 pb-4 border-b border-bordergray">
          <h2 className="text-base font-bold text-graphite">Recent Inspection Records for {vehicle.vehicle_number}</h2>
          <p className="text-xs text-secondary mt-0.5">Physical depot audits, technician records, tread observations, and photo evidence.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-bordergray text-secondary font-semibold bg-slate-50">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-4">Tyre Serial</th>
                <th className="py-3 px-4">Measured NSD</th>
                <th className="py-3 px-4">Pressure</th>
                <th className="py-3 px-4">Odometer</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-6">Notes</th>
                <th className="py-3 px-4 text-right">Evidence Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordergray text-graphite">
              {recent_inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-secondary">
                    No physical inspection logs recorded yet for this vehicle.
                  </td>
                </tr>
              ) : (
                recent_inspections.map((ins: any) => (
                  <tr key={ins.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-6 font-mono text-secondary">
                      {new Date(ins.inspected_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-graphite">{ins.tyre_serial}</td>
                    <td className="py-3.5 px-4 font-bold text-graphite">{ins.measured_nsd} mm</td>
                    <td className="py-3.5 px-4 font-mono text-secondary">
                      {ins.measured_pressure ? `${ins.measured_pressure} psi` : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-secondary">
                      {ins.odometer_at_inspection ? `${ins.odometer_at_inspection.toLocaleString()} km` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ins.visual_condition === 'NORMAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ins.visual_condition}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-secondary text-[11px] max-w-xs truncate">{ins.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      {ins.photo_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingPhoto({
                              url: `/api/v1/inspections/photo/${ins.photo_url}?token=${token}`,
                              title: `Inspection Evidence — Tyre ${ins.tyre_serial || ''}`,
                              subtitle: `NSD: ${ins.measured_nsd} mm • ${ins.visual_condition} • ${new Date(ins.inspected_at).toLocaleString()}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" /> View Photo
                        </button>
                      ) : (
                        <span className="text-secondary text-[11px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-bordergray shadow-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-bordergray">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-fleet" />
                <h3 className="font-bold text-base text-graphite">Record Physical Tyre Inspection</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-secondary hover:text-graphite rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-graphite mb-1">Select Mounted Tyre Position *</label>
                <select
                  value={selectedTyreId}
                  onChange={(e) => setSelectedTyreId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                >
                  <option value="">Choose wheel position...</option>
                  {positions.map((p: PositionData) =>
                    p.tyre ? (
                      <option key={p.tyre.id} value={p.tyre.id}>
                        {p.wheel_position} — {p.tyre.serial_number} ({p.tyre.model})
                      </option>
                    ) : null
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-graphite mb-1">Measured NSD (mm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    value={measuredNsd}
                    onChange={(e) => setMeasuredNsd(e.target.value)}
                    placeholder="e.g. 14.2"
                    required
                    className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-graphite mb-1">Cold Pressure (psi)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={measuredPressure}
                    onChange={(e) => setMeasuredPressure(e.target.value)}
                    placeholder="e.g. 110"
                    className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Current Odometer (km) *</label>
                <input
                  type="number"
                  step="0.1"
                  min={vehicle.current_odometer}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet font-mono"
                />
                <span className="text-[10px] text-secondary mt-0.5 block">
                  Must be ≥ verified odometer ({vehicle.current_odometer} km)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Visual Condition Audit</label>
                <select
                  value={visualCondition}
                  onChange={(e) => setVisualCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                >
                  <option value="NORMAL">Normal Wear (Acceptable)</option>
                  <option value="UNEVEN_WEAR">Uneven Shoulder / Heel-and-Toe Wear</option>
                  <option value="SIDEWALL_CUT">Sidewall Cut / Abrasion</option>
                  <option value="BULGE">Carcass Bulge / Separation</option>
                  <option value="PUNCTURE">Puncture / Foreign Object</option>
                </select>
              </div>

              {/* Tyre Photograph Evidence Section */}
              <div className="border border-bordergray rounded-xl p-3.5 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-graphite flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" /> Tyre Photograph (Evidence / Defects)
                  </label>
                  <span className="text-[10px] text-secondary font-medium">JPEG, PNG, WebP (Max 16MB)</span>
                </div>

                {!photoPreview ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white rounded-xl p-4 cursor-pointer transition group">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 group-hover:bg-amber-100 group-hover:text-amber-800 flex items-center justify-center mb-1.5 transition">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-graphite group-hover:text-amber-700">
                      Click to upload or take tyre photo
                    </span>
                    <span className="text-[10px] text-secondary mt-0.5">
                      Attach clear visual proof of tread depth, wear pattern, or casing defect
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-bordergray">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-bordergray shrink-0 bg-slate-900">
                      <img src={photoPreview} alt="Tyre Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                      <div>
                        <div className="text-xs font-bold text-graphite truncate">{photoFile?.name}</div>
                        <div className="text-[10px] text-secondary mt-0.5">
                          {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : 'Image selected'}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                          <CheckCircle2 className="w-3 h-3" /> Attached for upload
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeSelectedPhoto}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold self-start cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspection Result */}
              <div>
                <label className="block font-semibold text-graphite mb-1">Inspection Result *</label>
                <select
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value as any)}
                  required
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                >
                  <option value="PASS">Pass</option>
                  <option value="WARNING">Warning</option>
                  <option value="FAIL">Fail</option>
                  <option value="FURTHER_ASSESSMENT">Requires Further Assessment</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block font-semibold text-graphite mb-1">Temperature at Inspection (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="e.g. 42.0"
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet font-mono"
                />
              </div>

              {/* Lifecycle Decision */}
              <div className="border border-bordergray rounded-xl p-3 space-y-3">
                <div className="text-xs font-bold text-graphite">
                  Lifecycle Decision
                  <span className="ml-1 text-[10px] font-normal text-secondary">(optional)</span>
                </div>
                <select
                  value={lifecycleDecision}
                  onChange={(e) => setLifecycleDecision(e.target.value as LifecycleDecision)}
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                >
                  <option value="">No change (keep current lifecycle)</option>
                  <option value="NEW">New — Enter first service</option>
                  <option value="REUSE">Reuse — Approve for continued service</option>
                  <option value="RETREAD">Retread — Post-retread assessment</option>
                  <option value="SCRAP">Scrap — Condemn tyre</option>
                </select>

                {lifecycleDecision === 'SCRAP' && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Scrapping is irreversible. Ensure tyre is not fitted before scrapping.</span>
                  </div>
                )}

                {lifecycleDecision && (
                  <div>
                    <label className="block font-semibold text-graphite mb-1">
                      {lifecycleDecision === 'SCRAP' ? 'Scrap Reason *' : 'Reason / Notes'}
                    </label>
                    <textarea
                      rows={2}
                      value={lifecycleReason}
                      onChange={(e) => setLifecycleReason(e.target.value)}
                      required={lifecycleDecision === 'SCRAP'}
                      placeholder={
                        lifecycleDecision === 'SCRAP'
                          ? 'Reason for condemning this tyre...'
                          : 'Reason for lifecycle change...'
                      }
                      className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                    />
                  </div>
                )}

                {lifecycleDecision === 'RETREAD' && (
                  <div className="space-y-2 pt-2 border-t border-bordergray">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-graphite mb-1">Retread Date</label>
                        <input
                          type="date"
                          value={retreadDate}
                          onChange={(e) => setRetreadDate(e.target.value)}
                          className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-graphite mb-1">Post-Retread NSD (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={retreadNsd}
                          onChange={(e) => setRetreadNsd(e.target.value)}
                          placeholder="e.g. 14.0"
                          className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-graphite mb-1">Retread Provider</label>
                      <input
                        type="text"
                        value={retreadProvider}
                        onChange={(e) => setRetreadProvider(e.target.value)}
                        placeholder="e.g. JK Retread Center"
                        className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Inspector Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Technician depot observations..."
                  className="w-full bg-slate-50 border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-bordergray text-secondary hover:text-graphite rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInspectionMutation.isPending}
                  className="px-4 py-2 bg-fleet hover:bg-yellow-400 text-graphite font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {createInspectionMutation.isPending ? 'Saving...' : 'Submit Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Preview Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-white animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  {viewingPhoto.title}
                </h3>
                {viewingPhoto.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{viewingPhoto.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setViewingPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.title}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Verified Physical Depot Inspection Evidence</span>
              <a
                href={viewingPhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                Open Original Image <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

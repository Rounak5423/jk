import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Inspection, Vehicle, Tyre } from '../../types';
import { ClipboardCheck, Plus, Camera, CheckCircle, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type LifecycleDecision = '' | 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP';

function getLifecycleBadge(lt: string | null | undefined) {
  if (!lt) return null;
  switch (lt) {
    case 'NEW':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'REUSE':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'RETREAD':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'SCRAP':
      return 'bg-red-100 text-red-700 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

function getResultBadge(result: string | null | undefined) {
  switch (result) {
    case 'PASS':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'WARNING':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'FAIL':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'FURTHER_ASSESSMENT':
      return 'bg-purple-100 text-purple-700 border border-purple-200';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

export const InspectionsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Core form state
  const [vehicleId, setVehicleId] = useState('');
  const [tyreId, setTyreId] = useState('');
  const [measuredNsd, setMeasuredNsd] = useState('');
  const [measuredPressure, setMeasuredPressure] = useState('');
  const [odometer, setOdometer] = useState('');
  const [visualCondition, setVisualCondition] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // New inspection fields
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'WARNING' | 'FAIL' | 'FURTHER_ASSESSMENT'>('PASS');
  const [temperature, setTemperature] = useState('');

  // Lifecycle decision
  const [lifecycleDecision, setLifecycleDecision] = useState<LifecycleDecision>('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [retreadDate, setRetreadDate] = useState('');
  const [retreadProvider, setRetreadProvider] = useState('');
  const [retreadNsd, setRetreadNsd] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: inspections, isLoading } = useQuery<Inspection[]>({
    queryKey: ['inspections', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/inspections');
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

  const { data: tyres } = useQuery<Tyre[]>({
    queryKey: ['fleet-tyres', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/tyres');
      return res.data;
    },
  });

  const selectedTyre = tyres?.find((t) => t.id === tyreId);

  const createInspectionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/inspections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.error || 'Failed to submit inspection');
    },
  });

  const resetForm = () => {
    setVehicleId('');
    setTyreId('');
    setMeasuredNsd('');
    setMeasuredPressure('');
    setOdometer('');
    setVisualCondition('NORMAL');
    setNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setInspectionResult('PASS');
    setTemperature('');
    setLifecycleDecision('');
    setLifecycleReason('');
    setRetreadDate('');
    setRetreadProvider('');
    setRetreadNsd('');
    setSubmitError(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setPhotoFile(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const formData = new FormData();
    formData.append('vehicle_id', vehicleId);
    formData.append('tyre_id', tyreId);
    formData.append('measured_nsd', measuredNsd);
    if (measuredPressure) formData.append('measured_pressure', measuredPressure);
    formData.append('odometer', odometer);
    formData.append('visual_condition', visualCondition);
    formData.append('notes', notes);
    formData.append('inspection_result', inspectionResult);
    if (temperature) formData.append('temperature_at_inspection', temperature);
    if (lifecycleDecision) {
      formData.append('lifecycle_type_change', lifecycleDecision);
      formData.append('lifecycle_reason', lifecycleReason);
      if (lifecycleDecision === 'RETREAD') {
        if (retreadDate) formData.append('retread_date', retreadDate);
        if (retreadProvider) formData.append('retread_provider', retreadProvider);
        if (retreadNsd) formData.append('measured_nsd', retreadNsd); // override NSD with post-retread
        if (retreadNsd) formData.set('measured_nsd', retreadNsd);
      }
    }
    if (photoFile) formData.append('photo', photoFile);

    createInspectionMutation.mutate(formData);
  };

  const scrapWhileFitted = lifecycleDecision === 'SCRAP' && selectedTyre?.status === 'FITTED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Depot Tyre Inspections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical non-skid depth (NSD) measurements, visual defect audits, and lifecycle decisions.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Physical Inspection
        </button>
      </div>

      {/* Inspections Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-blue-50">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Tyre Serial</th>
                <th className="py-3.5 px-4">Inspector</th>
                <th className="py-3.5 px-4">NSD</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4">Lifecycle</th>
                <th className="py-3.5 px-4">Visual Condition</th>
                <th className="py-3.5 px-6 text-right">Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading inspections...
                  </td>
                </tr>
              ) : inspections?.map((i) => (
                <tr key={i.id} className="hover:bg-blue-50 transition">
                  <td className="py-4 px-6 text-slate-500">
                    {new Date(i.inspected_at).toLocaleDateString()} {new Date(i.inspected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-900">{i.vehicle_number}</td>
                  <td className="py-4 px-4 font-mono font-medium text-slate-700">{i.tyre_serial}</td>
                  <td className="py-4 px-4 text-slate-700">{i.inspector_name}</td>
                  <td className="py-4 px-4 font-bold text-slate-900 font-mono">{i.measured_nsd.toFixed(1)} mm</td>
                  <td className="py-4 px-4">
                    {i.inspection_result ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getResultBadge(i.inspection_result)}`}>
                        {i.inspection_result.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {i.lifecycle_type_change ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadge(i.lifecycle_type_change)}`}>
                        → {i.lifecycle_type_change}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      i.visual_condition === 'NORMAL'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {i.visual_condition}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {i.photo_url ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                        <Camera className="w-3.5 h-3.5" /> Attached
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Inspection */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-blue-200 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-blue-600" /> Log Physical Tyre Inspection
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Record tread depth, pressure, visual condition, inspection result, and lifecycle decision.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Vehicle *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    const v = vehicles?.find((veh) => veh.id === e.target.value);
                    if (v) setOdometer(v.current_odometer.toString());
                  }}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose vehicle...</option>
                  {vehicles?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} ({v.wheel_config})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Tyre *</label>
                <select
                  value={tyreId}
                  onChange={(e) => setTyreId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose tyre...</option>
                  {tyres?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.serial_number} — {t.model} [{t.lifecycle_type}] ({t.current_nsd} mm)
                    </option>
                  ))}
                </select>
                {selectedTyre && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Current lifecycle: <span className={`font-semibold px-1.5 py-0.5 rounded ${getLifecycleBadge(selectedTyre.lifecycle_type)}`}>{selectedTyre.lifecycle_type}</span>
                    {' · '}Status: <span className="text-slate-500">{selectedTyre.status}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Measured NSD (mm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    value={measuredNsd}
                    onChange={(e) => setMeasuredNsd(e.target.value)}
                    placeholder="e.g. 14.2"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pressure (psi)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={measuredPressure}
                    onChange={(e) => setMeasuredPressure(e.target.value)}
                    placeholder="e.g. 108.5"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Odometer (km) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    placeholder="e.g. 45200"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 42.0"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inspection Result *</label>
                <select
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value as any)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="PASS">Pass</option>
                  <option value="WARNING">Warning</option>
                  <option value="FAIL">Fail</option>
                  <option value="FURTHER_ASSESSMENT">Requires Further Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Visual Casing Condition</label>
                <select
                  value={visualCondition}
                  onChange={(e) => setVisualCondition(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="NORMAL">Normal / Uniform Wear</option>
                  <option value="UNEVEN_WEAR">Uneven Shoulder / Crown Wear</option>
                  <option value="SIDEWALL_CUT">Sidewall Cut / Abrasion</option>
                  <option value="BULGE">Crown Bulge / Ply Separation</option>
                  <option value="PUNCTURE">Foreign Body / Nail Penetration</option>
                </select>
              </div>

              {/* Lifecycle Decision Section */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-800">Lifecycle Decision</span>
                  <span className="text-[10px] text-slate-400">(optional — leave unchanged for routine inspection)</span>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Change Lifecycle Type</label>
                  <select
                    value={lifecycleDecision}
                    onChange={(e) => setLifecycleDecision(e.target.value as LifecycleDecision)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No change (keep current)</option>
                    <option value="NEW">New — Enter first service</option>
                    <option value="REUSE">Reuse — Approve for continued service</option>
                    <option value="RETREAD">Retread — Post-retread assessment</option>
                    <option value="SCRAP">Scrap — Condemn tyre</option>
                  </select>
                </div>

                {/* SCRAP warning */}
                {lifecycleDecision === 'SCRAP' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold mb-0.5">Scrapping is irreversible.</div>
                      {scrapWhileFitted && (
                        <div className="font-semibold text-red-600">
                          ⚠ This tyre is currently FITTED. Remove it from the vehicle before scrapping.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lifecycle Reason */}
                {lifecycleDecision && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
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
                          : lifecycleDecision === 'REUSE'
                          ? 'Reason for reuse approval...'
                          : 'Additional notes...'
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Retread-specific fields */}
                {lifecycleDecision === 'RETREAD' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-400">Post-retread details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Retread Date</label>
                        <input
                          type="date"
                          value={retreadDate}
                          onChange={(e) => setRetreadDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Post-Retread NSD (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="25.0"
                          value={retreadNsd}
                          onChange={(e) => setRetreadNsd(e.target.value)}
                          placeholder="e.g. 14.0"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Retread Provider / Workshop</label>
                      <input
                        type="text"
                        value={retreadProvider}
                        onChange={(e) => setRetreadProvider(e.target.value)}
                        placeholder="e.g. JK Retread Center, Pune"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tyre Photograph (Optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {photoPreview && (
                  <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={photoPreview} alt="Tread Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Technician Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Inspection observations..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createInspectionMutation.isPending || (lifecycleDecision === 'SCRAP' && scrapWhileFitted)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {createInspectionMutation.isPending ? 'Submitting Inspection...' : 'Record Inspection'}
              </button>
              {scrapWhileFitted && (
                <p className="text-[11px] text-red-600 text-center">Remove tyre from vehicle before scrapping.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

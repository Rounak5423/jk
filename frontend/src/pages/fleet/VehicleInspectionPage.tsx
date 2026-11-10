import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle2DExplodedViewer, PositionData } from '../../components/inspection/Vehicle2DExplodedViewer';
import { Tyre, VehicleInspectionReport } from '../../types';
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
  Wrench,
  Trash2,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  FileText,
  Printer,
  History,
  FileCheck2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type LifecycleDecision = '' | 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP';

function getLifecycleBadge(lt: string | null | undefined) {
  switch (lt) {
    case 'NEW': return 'bg-emerald-100 text-emerald-800';
    case 'REUSE': return 'bg-blue-100 text-blue-800';
    case 'RETREAD': return 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]';
    case 'SCRAP': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export const VehicleInspectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeFleetId } = useAuthStore();

  // Active Tyre Inspection State
  const [selectedPos, setSelectedPos] = useState<PositionData | null>(null);
  const [inspectedTyreIds, setInspectedTyreIds] = useState<Set<string>>(new Set());

  // Tyre Inspection Form fields
  const [measuredNsd, setMeasuredNsd] = useState('');
  const [measuredPressure, setMeasuredPressure] = useState('');
  const [odometer, setOdometer] = useState('');
  const [visualCondition, setVisualCondition] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [temperature, setTemperature] = useState('');
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'WARNING' | 'FAIL' | 'FURTHER_ASSESSMENT'>('PASS');
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

  // Remove & Fit Replacement Tyre Modal State
  const [showRemoveFitModal, setShowRemoveFitModal] = useState(false);
  const [removalReason, setRemovalReason] = useState('DAMAGED');
  const [fitMode, setFitMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [replacementTyreId, setReplacementTyreId] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newModel, setNewModel] = useState('Jetway JUH5');
  const [newSize, setNewSize] = useState('295/80R22.5');
  const [newNsd, setNewNsd] = useState('16.5');
  const [newLifecycle, setNewLifecycle] = useState('NEW');
  const [removeFitError, setRemoveFitError] = useState<string | null>(null);

  // Quick Fit Modal for vacant position
  const [quickFitModal, setQuickFitModal] = useState<{ posCode: string; axle: number } | null>(null);
  const [quickFitMode, setQuickFitMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [quickFitTyreId, setQuickFitTyreId] = useState('');
  const [quickFitOdometer, setQuickFitOdometer] = useState('');
  const [quickFitRemarks, setQuickFitRemarks] = useState('');
  const [quickFitError, setQuickFitError] = useState<string | null>(null);

  // 100% Confirmation Modal State
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Close Inspection & Save Report State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [roadworthinessStatus, setRoadworthinessStatus] = useState<
    'CERTIFIED_ROADWORTHY' | 'CONDITIONAL' | 'ACTION_REQUIRED'
  >('CERTIFIED_ROADWORTHY');
  const [closeSuccessBanner, setCloseSuccessBanner] = useState<VehicleInspectionReport | null>(null);
  const [viewingReportModal, setViewingReportModal] = useState<VehicleInspectionReport | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Fetch Vehicle Inspection Summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-inspection-summary', id],
    queryFn: async () => {
      const res = await api.get(`/inspections/vehicle/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Available Unused Tyres (Inventory / Retread) for Fitment & Replacement
  const { data: availableTyres } = useQuery<Tyre[]>({
    queryKey: ['available-tyres', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/tyres/available');
      return res.data;
    },
    enabled: !!id,
  });

  const positions: PositionData[] = data?.positions ?? [];
  const vehicle = data?.vehicle;

  // Initialize inspected tyre IDs from positions that already have inspections recorded
  useEffect(() => {
    if (positions.length > 0) {
      const initialInspected = new Set<string>();
      positions.forEach((p) => {
        if (p.has_inspection_data && p.tyre?.id) {
          initialInspected.add(p.tyre.id);
        }
      });
      // Synchronize inspected set directly with backend cycle
      setInspectedTyreIds(initialInspected);

      // Auto-select first position if none selected or not present
      if (!selectedPos || !positions.some((p) => p.wheel_position === selectedPos.wheel_position)) {
        const firstWithTyre = positions.find((p) => p.tyre !== null);
        if (firstWithTyre) {
          selectPositionForInspection(firstWithTyre);
        }
      }
    }
  }, [positions]);

  const selectPositionForInspection = (pos: PositionData) => {
    setSelectedPos(pos);
    setSubmitError(null);
    if (pos.tyre) {
      setMeasuredNsd(pos.tyre.current_nsd?.toString() || '14.0');
    }
    if (vehicle?.baseline_pressure) {
      setMeasuredPressure(vehicle.baseline_pressure.toString());
    }
    if (vehicle?.current_odometer) {
      setOdometer(vehicle.current_odometer.toString());
    }
    setVisualCondition('NORMAL');
    setNotes('');
    setTemperature('38.5');
    setInspectionResult('PASS');
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // Calculate Inspection Progress Percentage
  const mountedTyresCount = positions.filter((p) => p.tyre !== null).length;
  const inspectedCount = positions.filter((p) => p.tyre && (inspectedTyreIds.has(p.tyre.id) || p.has_inspection_data)).length;
  const inspectionPercentage = mountedTyresCount > 0 ? Math.min(100, Math.round((inspectedCount / mountedTyresCount) * 100)) : 0;
  const isComplete = inspectionPercentage === 100 && mountedTyresCount > 0;

  // Defer confirmation modal until vehicle launch completes
  // (User can also click 'View Confirmation Certificate' at any time)


  // Inspection Submission Mutation
  const createInspectionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/inspections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const tyreId = variables.get('tyre_id') as string;
      if (tyreId) {
        setInspectedTyreIds((prev) => new Set([...prev, tyreId]));
      }
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });

      // Automatically advance to the next uninspected tyre on the vehicle!
      const currentIndex = positions.findIndex((p) => p.tyre?.id === tyreId);
      const nextUninspected = positions.find(
        (p, idx) => idx > currentIndex && p.tyre && !inspectedTyreIds.has(p.tyre.id) && !p.has_inspection_data
      ) || positions.find((p) => p.tyre && p.tyre.id !== tyreId && !inspectedTyreIds.has(p.tyre.id) && !p.has_inspection_data);

      if (nextUninspected) {
        selectPositionForInspection(nextUninspected);
      }
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.error || 'Failed to submit tyre inspection.');
    },
  });

  // Close Inspection & Save Report Mutation: saves report to database & starts new cycle
  const closeInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/inspections/vehicle/${id}/close`, {
        notes: closeNotes.trim(),
        status: roadworthinessStatus,
      });
      return res.data;
    },
    onSuccess: (resData) => {
      const savedReport: VehicleInspectionReport = resData.report;
      setCloseSuccessBanner(savedReport);
      setShowCloseModal(false);
      setShowConfirmationModal(false);
      setCloseNotes('');
      // Reset local cycle
      setInspectedTyreIds(new Set());
      setResetTrigger((prev) => prev + 1);
      // Invalidate queries to refresh summary with new cycle and saved reports list
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to close inspection.');
    },
  });

  // Remove and Replace Tyre Mutation
  const removeAndReplaceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPos?.tyre?.id) throw new Error('No tyre selected for removal.');

      // 1. Remove old tyre
      await api.post(`/tyres/${selectedPos.tyre.id}/remove`, {
        removal_reason: removalReason,
      });

      // 2. Fit replacement tyre
      if (fitMode === 'EXISTING') {
        if (!replacementTyreId) throw new Error('Please select a replacement tyre from inventory.');
        await api.post(`/tyres/${replacementTyreId}/fit`, {
          vehicle_id: id,
          wheel_position: selectedPos.wheel_position,
          axle_number: selectedPos.axle_number,
          fitted_odometer: vehicle?.current_odometer,
        });
      } else {
        // Register & fit new tyre
        await api.post('/tyres', {
          serial_number: newSerial.trim().toUpperCase() || undefined,
          brand: 'JK Tyre',
          model: newModel.trim(),
          size: newSize.trim(),
          blueprint_nsd: parseFloat(newNsd) || 16.5,
          current_nsd: parseFloat(newNsd) || 16.5,
          lifecycle_type: newLifecycle,
          vehicle_id: id,
          wheel_position: selectedPos.wheel_position,
          axle_number: selectedPos.axle_number,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-tyres-count'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary'] });
      setShowRemoveFitModal(false);
      setRemoveFitError(null);
      setReplacementTyreId('');
      setNewSerial('');
    },
    onError: (err: any) => {
      setRemoveFitError(err.response?.data?.error || err.message || 'Failed to remove and replace tyre.');
    },
  });

  const openQuickFitModal = (posCode: string, axle: number) => {
    setQuickFitError(null);
    setQuickFitTyreId('');
    setQuickFitRemarks('');
    setNewSerial('');
    setNewModel('Jetway JUH5');
    setNewSize('295/80R22.5');
    setNewNsd('16.5');
    setNewLifecycle('NEW');
    setQuickFitOdometer(vehicle?.current_odometer != null ? String(vehicle.current_odometer) : '0');
    setQuickFitMode(availableTyres && availableTyres.length > 0 ? 'EXISTING' : 'NEW');
    setQuickFitModal({ posCode, axle });
  };

  // Quick Fit Tyre Mutation (either from unused Depot Inventory or as Brand New Tyre)
  const quickFitMutation = useMutation({
    mutationFn: async () => {
      if (!quickFitModal || !id) throw new Error('Target position is missing.');

      if (quickFitMode === 'EXISTING') {
        if (!quickFitTyreId) throw new Error('Select an unused tyre from depot inventory.');
        const res = await api.post(`/tyres/${quickFitTyreId}/fit`, {
          vehicle_id: id,
          wheel_position: quickFitModal.posCode,
          axle_number: quickFitModal.axle,
          fitted_odometer: quickFitOdometer ? parseFloat(quickFitOdometer) : vehicle?.current_odometer,
          fitted_nsd: newNsd ? parseFloat(newNsd) : undefined,
          remarks: quickFitRemarks.trim(),
        });
        return res.data;
      } else {
        const res = await api.post('/tyres', {
          serial_number: newSerial.trim().toUpperCase() || undefined,
          brand: 'JK Tyre',
          model: newModel.trim() || 'Jetway JUH5',
          size: newSize.trim() || '295/80R22.5',
          blueprint_nsd: parseFloat(newNsd) || 16.5,
          current_nsd: parseFloat(newNsd) || 16.5,
          lifecycle_type: newLifecycle,
          vehicle_id: id,
          wheel_position: quickFitModal.posCode,
          axle_number: quickFitModal.axle,
        });
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspection-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['available-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-tyres'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-tyres-count'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-fitment-summary'] });
      setQuickFitModal(null);
      setQuickFitError(null);
      setQuickFitTyreId('');
      setNewSerial('');
    },
    onError: (err: any) => {
      setQuickFitError(err.response?.data?.error || err.message || 'Failed to fit tyre.');
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setPhotoFile(f);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const handleInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPos?.tyre?.id || !measuredNsd || !odometer) {
      setSubmitError('Please enter measured NSD and verified odometer.');
      return;
    }

    const formData = new FormData();
    formData.append('vehicle_id', id!);
    formData.append('tyre_id', selectedPos.tyre.id);
    formData.append('measured_nsd', measuredNsd);
    if (measuredPressure) formData.append('measured_pressure', measuredPressure);
    formData.append('odometer', odometer);
    formData.append('visual_condition', visualCondition);
    formData.append('notes', notes.trim());
    formData.append('inspection_result', inspectionResult);
    if (temperature) formData.append('temperature_at_inspection', temperature);
    if (photoFile) formData.append('photo', photoFile);

    createInspectionMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1850px] mx-auto space-y-4">
        <div className="h-8 bg-slate-200 rounded-xl w-64 animate-pulse" />
        <div className="h-72 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-[1850px] mx-auto text-center py-16 cream-glow-card">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Unable to Load Vehicle Inspections</h3>
        <p className="text-xs text-[#5B6068] mt-1 max-w-md mx-auto">
          {(error as any)?.response?.data?.error || 'Vehicle not found or unauthorized access.'}
        </p>
        <Link
          to="/vehicles"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#14161A] text-white text-xs font-bold rounded-xl shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
        </Link>
      </div>
    );
  }

  const token = localStorage.getItem('jk_token') || '';

  return (
    <div className="p-4 sm:p-8 max-w-[1850px] mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/vehicles"
              className="p-2 rounded-xl border border-slate-200 text-[#5B6068] hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
              title="Back to Vehicles"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Vehicle Physical Inspection — <span className="font-mono">{vehicle.vehicle_number}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                  {vehicle.wheel_config}
                </span>
              </h1>
              <p className="text-xs text-[#5B6068] mt-0.5">
                2D exploded axle audit, individual tread measurement, defect verification, and real-time fitment replacement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="px-3.5 py-2 cream-glow-card text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition"
          >
            Vehicle Details
          </Link>
          <Link
            to={`/fitment?vehicle_id=${vehicle.id}`}
            className="px-4 py-2 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Wrench className="w-4 h-4" /> Fitment Management
          </Link>
        </div>
      </div>

      {/* ── Inspection Successfully Closed Celebratory Banner ── */}
      {closeSuccessBanner && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <CheckCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-sm">Inspection Completed &amp; Saved to Database!</span>
                <span className="font-mono text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                  {closeSuccessBanner.report_number}
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  {closeSuccessBanner.roadworthiness_status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Full tyre telemetry archived. A fresh physical audit cycle has started for vehicle <strong className="text-white font-mono">{vehicle.vehicle_number}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewingReportModal(closeSuccessBanner)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4" /> View Saved Certificate
            </button>
            <button
              type="button"
              onClick={() => setCloseSuccessBanner(null)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Real-Time Inspection Progress Bar & 100% Confirmation ── */}
      <div className="cream-glow-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition ${
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : inspectionPercentage >= 50
                  ? 'bg-yellow-400 text-slate-900'
                  : 'bg-amber-100 text-[#E8770E]'
              }`}
            >
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">
                  Inspection Progress: {inspectionPercentage}% Complete
                </span>
                {isComplete && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Confirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5B6068]">
                {inspectedCount} of {mountedTyresCount} fitted tyres inspected &amp; verified.
                {!isComplete && ` (${mountedTyresCount - inspectedCount} pending)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Prominent Close Inspection Button */}
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              disabled={inspectedCount === 0}
              className={`px-4 py-2 font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                  : 'bg-[#14161A] hover:bg-slate-800 text-white'
              }`}
              title="Close physical tyre inspection, save report to database, and start a new inspection cycle"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Close Inspection &amp; Save
            </button>

            {isComplete ? (
              <button
                type="button"
                onClick={() => setShowConfirmationModal(true)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Award className="w-4 h-4" /> View Confirmation Certificate
              </button>
            ) : (
              <span className="text-xs font-bold text-[#E8770E] bg-[#FFF4EB] border border-[#FCD5B5] px-3 py-1.5 rounded-xl">
                Audit in Progress
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? 'bg-emerald-500'
                : inspectionPercentage >= 50
                ? 'bg-yellow-400'
                : 'bg-[#E8770E]'
            }`}
            style={{ width: `${inspectionPercentage}%` }}
          />
        </div>
      </div>

      {/* ── 2D Exploded Axle Vehicle Diagram (Matching Reference Picture) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Disc className="w-4 h-4 text-[#5B6068]" /> 2D Exploded Axle Vehicle Schematic
          </h2>
          <span className="text-xs text-[#5B6068]">
            Click any tyre rectangle to inspect or replace
          </span>
        </div>

        <Vehicle2DExplodedViewer
          vehicle={{
            id: vehicle.id,
            vehicle_number: vehicle.vehicle_number,
            wheel_config: vehicle.wheel_config,
            make: vehicle.make,
            model: vehicle.model,
            current_odometer: vehicle.current_odometer,
            baseline_pressure: vehicle.baseline_pressure,
          }}
          positions={positions}
          inspectedTyreIds={inspectedTyreIds}
          selectedPosition={selectedPos}
          onSelectPosition={(pos) => selectPositionForInspection(pos)}
          onQuickFit={(posCode, axle) => openQuickFitModal(posCode, axle)}
          isComplete={isComplete}
          onLaunchCompleted={() => {
            setTimeout(() => {
              setShowConfirmationModal(true);
            }, 1800);
          }}
          resetTrigger={resetTrigger}
          onCloseInspection={() => setShowCloseModal(true)}
        />
      </div>

      {/* ── Active Selected Tyre Inspection & Removal/Replacement Panel ── */}
      {selectedPos && selectedPos.tyre ? (
        <div className="cream-glow-card p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#14161A] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
                {selectedPos.wheel_position}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Inspect Wheel Position: <span className="font-mono text-blue-600">{selectedPos.wheel_position}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedPos.tyre.serial_number}
                  </span>
                </h3>
                <p className="text-xs text-[#5B6068]">
                  {selectedPos.tyre.model} • {selectedPos.tyre.size} • Baseline NSD: {selectedPos.tyre.blueprint_nsd} mm
                </p>
              </div>
            </div>

            {/* Remove Tyre Action Button */}
            <button
              type="button"
              onClick={() => {
                setRemoveFitError(null);
                setRemovalReason('DAMAGED');
                setFitMode('EXISTING');
                setReplacementTyreId('');
                setShowRemoveFitModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove &amp; Replace Tyre
            </button>
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Inspection Form */}
          <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Tread NSD (mm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="25.0"
                  required
                  value={measuredNsd}
                  onChange={(e) => setMeasuredNsd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-yellow-500 focus:bg-white"
                />
                <span className="text-[10px] text-[#5B6068] mt-0.5 block">
                  Current logged: {selectedPos.tyre.current_nsd} mm
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cold Inflation Pressure (PSI) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={measuredPressure}
                  onChange={(e) => setMeasuredPressure(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-yellow-500 focus:bg-white"
                />
                <span className="text-[10px] text-[#5B6068] mt-0.5 block">
                  Recommended: {vehicle.baseline_pressure} PSI
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verified Vehicle Odometer (km) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={vehicle.current_odometer}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-yellow-500 focus:bg-white"
                />
                <span className="text-[10px] text-[#5B6068] mt-0.5 block">
                  Base: {vehicle.current_odometer.toLocaleString()} km
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visual Condition Audit</label>
                <select
                  value={visualCondition}
                  onChange={(e) => setVisualCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-medium"
                >
                  <option value="NORMAL">Normal Wear (Acceptable)</option>
                  <option value="UNEVEN_WEAR">Uneven Shoulder / Heel-and-Toe</option>
                  <option value="SIDEWALL_CUT">Sidewall Cut / Abrasion</option>
                  <option value="BULGE">Carcass Bulge / Separation</option>
                  <option value="PUNCTURE">Puncture / Embedded Foreign Object</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection Status Result</label>
                <select
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500 font-medium"
                >
                  <option value="PASS">Pass (Healthy)</option>
                  <option value="WARNING">Warning (Watchlist)</option>
                  <option value="FAIL">Fail (Critical Defect)</option>
                  <option value="FURTHER_ASSESSMENT">Requires Depot Assessment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tyre Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Photo Attachment & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" /> Evidence Photo (Optional)
                </label>
                {!photoPreview ? (
                  <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-yellow-500 bg-slate-50 rounded-xl p-3 cursor-pointer transition">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 text-xs font-medium">Attach tyre condition photograph</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <img src={photoPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                    <span className="text-[11px] text-slate-700 flex-1 truncate">{photoFile?.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technician Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional observations or pressure adjustments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={createInspectionMutation.isPending}
                className="px-6 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {createInspectionMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm Tyre Inspection &amp; Next Tyre
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center cream-glow-card space-y-3">
          <Disc className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedPos && !selectedPos.tyre
                ? `Wheel Position ${selectedPos.wheel_position} Is Currently Vacant`
                : 'Select a wheel position to begin inspection'}
            </h3>
            <p className="text-xs text-[#5B6068] mt-0.5">
              Click on any mounted tyre in the 2D exploded axle diagram above to inspect it, or click any vacant <strong className="text-[#E8770E]">+ Fit</strong> slot to mount a new or unused inventory tyre.
            </p>
          </div>
          {(() => {
            const vacantPos =
              selectedPos && !selectedPos.tyre
                ? selectedPos
                : positions.find((p) => p.tyre === null);
            if (!vacantPos) return null;
            return (
              <button
                type="button"
                onClick={() => openQuickFitModal(vacantPos.wheel_position, vacantPos.axle_number)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Fit Tyre to {vacantPos.wheel_position}
              </button>
            );
          })()}
        </div>
      )}

      {/* ── Remove & Fit Replacement Tyre Modal ── */}
      {showRemoveFitModal && selectedPos?.tyre && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setShowRemoveFitModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Remove &amp; Fit Tyre — Position {selectedPos.wheel_position}
                </h3>
                <p className="text-xs text-[#5B6068]">
                  Current Tyre: <span className="font-mono font-bold text-slate-900">{selectedPos.tyre.serial_number}</span> ({selectedPos.tyre.model})
                </p>
              </div>
            </div>

            {removeFitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{removeFitError}</span>
              </div>
            )}

            {/* Step 1: Removal Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Removal <span className="text-red-500">*</span>
              </label>
              <select
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-yellow-500"
              >
                <option value="DAMAGED">Damaged / Defect Detected during Inspection</option>
                <option value="WORN_OUT">Tread Depth Worn Below Minimum Threshold</option>
                <option value="PUNCTURE">Puncture / Carcass Separation</option>
                <option value="RETREADING">Send Casing for Retreading</option>
                <option value="ROTATION">Fleet Tyre Rotation</option>
                <option value="OTHER">Other Depot Maintenance</option>
              </select>
            </div>

            {/* Step 2: Fitment Option for Replacement */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#E8770E]" /> Fitment Option: Select Replacement Tyre
                </label>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFitMode('EXISTING')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    fitMode === 'EXISTING' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#5B6068]'
                  }`}
                >
                  Choose from Inventory ({availableTyres?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('NEW')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    fitMode === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#5B6068]'
                  }`}
                >
                  Register &amp; Mount Brand New
                </button>
              </div>

              {fitMode === 'EXISTING' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Available Inventory Tyre
                  </label>
                  <select
                    value={replacementTyreId}
                    onChange={(e) => setReplacementTyreId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="">Select unmounted tyre from depot...</option>
                    {availableTyres?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.serial_number} — {t.model} [{t.lifecycle_type}] ({t.current_nsd} mm NSD, THI {t.current_thi?.toFixed(0)})
                      </option>
                    ))}
                  </select>
                  {(!availableTyres || availableTyres.length === 0) && (
                    <p className="text-[11px] text-[#E8770E] mt-1">
                      No tyres in inventory. Switch to &quot;Register &amp; Mount Brand New&quot; above.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Serial Number</label>
                      <input
                        type="text"
                        value={newSerial}
                        onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                        placeholder="Leave blank for auto"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Model</label>
                      <input
                        type="text"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Size</label>
                      <input
                        type="text"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Initial NSD (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newNsd}
                        onChange={(e) => setNewNsd(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRemoveFitModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeAndReplaceMutation.mutate()}
                disabled={removeAndReplaceMutation.isPending}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
              >
                {removeAndReplaceMutation.isPending ? 'Processing Removal & Fitment...' : 'Confirm Removal & Mount Replacement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Fit Vacant Position Modal (+ Fit on 2D Diagram) ── */}
      {quickFitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={() => setQuickFitModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#FFC800] text-black flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fit Tyre — Position <span className="font-mono text-blue-600">{quickFitModal.posCode}</span>
                </h3>
                <p className="text-xs text-[#5B6068]">
                  Vehicle: <span className="font-mono font-bold text-slate-900">{vehicle.vehicle_number}</span> ({vehicle.wheel_config} • {quickFitModal.axle === 0 ? 'Spare Mount' : `Axle ${quickFitModal.axle}`})
                </p>
              </div>
            </div>

            {quickFitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickFitError}</span>
              </div>
            )}

            {/* Mode Toggle Tabs: Unused Inventory vs Register New */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
              <button
                type="button"
                onClick={() => setQuickFitMode('EXISTING')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  quickFitMode === 'EXISTING' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#5B6068] hover:text-slate-900'
                }`}
              >
                From Inventory ({availableTyres?.length || 0} Unused)
              </button>
              <button
                type="button"
                onClick={() => setQuickFitMode('NEW')}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  quickFitMode === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#5B6068] hover:text-slate-900'
                }`}
              >
                Register &amp; Fit New Tyre
              </button>
            </div>

            {quickFitMode === 'EXISTING' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Unused Inventory Tyre <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={quickFitTyreId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickFitTyreId(val);
                      const chosen = availableTyres?.find((t) => t.id === val);
                      if (chosen && chosen.current_nsd != null) {
                        setNewNsd(String(chosen.current_nsd));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="">Choose unmounted tyre not in use...</option>
                    {availableTyres?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.serial_number} — {t.model} ({t.size}) [{t.lifecycle_type}] • {t.current_nsd} mm NSD • THI {t.current_thi?.toFixed(0)}
                      </option>
                    ))}
                  </select>
                  {(!availableTyres || availableTyres.length === 0) && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center justify-between gap-2">
                      <span>No unused tyres currently in depot inventory.</span>
                      <button
                        type="button"
                        onClick={() => setQuickFitMode('NEW')}
                        className="font-bold text-amber-900 underline cursor-pointer shrink-0"
                      >
                        Fit Brand New →
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fitted Odometer (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={quickFitOdometer}
                      onChange={(e) => setQuickFitOdometer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Measured NSD (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newNsd}
                      onChange={(e) => setNewNsd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fitment Remarks (Optional)</label>
                  <input
                    type="text"
                    value={quickFitRemarks}
                    onChange={(e) => setQuickFitRemarks(e.target.value)}
                    placeholder="e.g., Mounted from depot shelf during inspection"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                      placeholder="Leave blank to auto-generate"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tyre Condition / Type</label>
                    <select
                      value={newLifecycle}
                      onChange={(e) => setNewLifecycle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-yellow-500"
                    >
                      <option value="NEW">NEW (Virgin JK Tyre)</option>
                      <option value="REUSE">REUSE (Inspected Used)</option>
                      <option value="RETREAD">RETREAD (Casing Re-treaded)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">JK Tyre Model</label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tyre Size</label>
                    <input
                      type="text"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Initial Tread NSD (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="2"
                      max="25"
                      value={newNsd}
                      onChange={(e) => setNewNsd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Wheel Slot</label>
                    <input
                      type="text"
                      readOnly
                      value={quickFitModal.posCode}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickFitModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => quickFitMutation.mutate()}
                disabled={
                  quickFitMutation.isPending ||
                  (quickFitMode === 'EXISTING' && !quickFitTyreId)
                }
                className="px-5 py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {quickFitMutation.isPending
                  ? 'Mounting Tyre...'
                  : quickFitMode === 'EXISTING'
                  ? 'Mount Inventory Tyre'
                  : 'Register & Mount Tyre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 100% Inspection Confirmed Celebration Modal ── */}
      {showConfirmationModal && isComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Verified
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Vehicle Physical Inspection Confirmed!
              </h2>
              <p className="text-xs text-[#5B6068] mt-1">
                All <span className="font-bold text-slate-900">{mountedTyresCount} wheel positions</span> on vehicle{' '}
                <span className="font-mono font-bold text-slate-900">{vehicle.vehicle_number}</span> have been physically audited and certified for roadworthiness.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Vehicle:</span>
                <span className="font-bold text-slate-900">{vehicle.vehicle_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Inspected:</span>
                <span className="font-bold text-emerald-700">{mountedTyresCount} of {mountedTyresCount} (100%)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Verified Odometer:</span>
                <span className="font-bold text-slate-900">{vehicle.current_odometer.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Timestamp:</span>
                <span className="font-bold text-slate-900">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setShowCloseModal(true);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" /> Close &amp; Save Report to DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Closed Inspection Reports & Roadworthiness Certificates ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              Saved Closed Inspection Reports &amp; Roadworthiness Certificates
            </h2>
            <p className="text-xs text-[#5B6068] mt-0.5">
              Permanent certificates stored in database. Each closed report archives past cycle measurements and initiates a new physical inspection.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl self-start sm:self-auto border border-slate-200">
            {data?.saved_reports?.length || 0} Reports Archived
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3 px-6">Report Number</th>
                <th className="py-3 px-4">Completed Date</th>
                <th className="py-3 px-4">Roadworthiness Status</th>
                <th className="py-3 px-4">Audited Wheels</th>
                <th className="py-3 px-4">Inspection Breakdown</th>
                <th className="py-3 px-4">Verified Odometer</th>
                <th className="py-3 px-6 text-right">Certificate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!data?.saved_reports || data.saved_reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5B6068]">
                    No closed inspection reports saved yet for this vehicle. Complete physical wheel audits and click "Close Inspection &amp; Save" to generate the first official certificate.
                  </td>
                </tr>
              ) : (
                data.saved_reports.map((rpt: VehicleInspectionReport) => (
                  <tr key={rpt.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-6 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                        {rpt.report_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#5B6068]">
                      {new Date(rpt.completed_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rpt.roadworthiness_status === 'CERTIFIED_ROADWORTHY'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : rpt.roadworthiness_status === 'CONDITIONAL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {rpt.roadworthiness_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {rpt.inspected_wheels} / {rpt.total_wheels} ({rpt.total_wheels > 0 ? Math.round((rpt.inspected_wheels / rpt.total_wheels) * 100) : 0}%)
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold" title="Pass Nominal">
                          {rpt.pass_count} Pass
                        </span>
                        {rpt.warning_count > 0 && (
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-semibold" title="Warnings">
                            {rpt.warning_count} Warn
                          </span>
                        )}
                        {rpt.fail_count > 0 && (
                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-semibold" title="Fail / Attention">
                            {rpt.fail_count} Fail
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {rpt.odometer?.toLocaleString()} km
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setViewingReportModal(rpt)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-[#FFC800]" /> View Certificate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Historical Vehicle Inspections Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Recent Physical Inspection Records — {vehicle.vehicle_number}
          </h2>
          <p className="text-xs text-[#5B6068] mt-0.5">
            Verified tyre measurements, technician observations, and photographic evidence.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-4">Tyre Serial</th>
                <th className="py-3 px-4">Measured NSD</th>
                <th className="py-3 px-4">Pressure</th>
                <th className="py-3 px-4">Odometer</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-6 text-right">Photo Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!data.recent_inspections || data.recent_inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#5B6068]">
                    No historical inspection records logged yet for this vehicle.
                  </td>
                </tr>
              ) : (
                data.recent_inspections.map((insp: any) => (
                  <tr key={insp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-6 font-mono text-[11px] text-[#5B6068]">
                      {new Date(insp.inspected_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {insp.tyre_serial || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {insp.measured_nsd} mm
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {insp.measured_pressure ? `${insp.measured_pressure} psi` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {insp.odometer?.toLocaleString()} km
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{insp.visual_condition}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          insp.inspection_result === 'PASS'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : insp.inspection_result === 'WARNING'
                            ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {insp.inspection_result || 'PASS'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      {insp.photo_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingPhoto({
                              url: `/api/v1/inspections/photo/${insp.photo_url}?token=${token}`,
                              title: `Tyre ${insp.tyre_serial || 'Inspection Photo'}`,
                              subtitle: `Measured: ${insp.measured_nsd} mm • Date: ${new Date(insp.inspected_at).toLocaleDateString()}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold transition shadow-sm"
                        >
                          <Camera className="w-3 h-3 text-blue-600" /> View Photo
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Photo Lightbox Preview Modal ── */}
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

      {/* ── Close Physical Inspection & Save Report Modal ── */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Finalize &amp; Close Physical Inspection
                  </h3>
                  <p className="text-xs text-[#5B6068]">
                    Vehicle: <strong className="font-mono text-slate-900">{vehicle.vehicle_number}</strong> • Save permanent report to database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspection Session Audit Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audited Wheels</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {inspectedCount} / {mountedTyresCount}
                </span>
                <span className="text-[10px] text-slate-500 block">({inspectionPercentage}%)</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pass Nominal</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {positions.filter((p) => (inspectedTyreIds.has(p.tyre?.id || '') || p.has_inspection_data) && p.latest_inspection?.inspection_result === 'PASS').length || (isComplete ? mountedTyresCount : inspectedCount)}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Warnings</span>
                <span className="text-lg font-black text-amber-700 font-mono">
                  {positions.filter((p) => p.latest_inspection?.inspection_result === 'WARNING').length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Odometer</span>
                <span className="text-sm font-black text-slate-900 font-mono mt-1 block">
                  {vehicle.current_odometer.toLocaleString()} km
                </span>
              </div>
            </div>

            {/* Form Fields: Certification Status & Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Overall Roadworthiness Certification Status
                </label>
                <select
                  value={roadworthinessStatus}
                  onChange={(e) => setRoadworthinessStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-yellow-500"
                >
                  <option value="CERTIFIED_ROADWORTHY">
                    ✅ CERTIFIED ROADWORTHY (All inspected tyres meet highway safety specs)
                  </option>
                  <option value="CONDITIONAL">
                    ⚠️ CONDITIONAL (Approved with scheduled re-tread or pressure monitoring)
                  </option>
                  <option value="ACTION_REQUIRED">
                    ❌ ACTION REQUIRED (Immediate maintenance or tyre replacement required)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Technician Sign-Off Remarks &amp; Certification Notes
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Enter technician sign-off comments, road test observations, or maintenance instructions..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Notice Box explaining automatic reset & new inspection cycle */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="font-bold text-blue-950 block">Permanent Record &amp; New Inspection Cycle:</strong>
                  <span>
                    Closing this session saves an official report with full tyre measurements to the database. A fresh inspection cycle will immediately begin for vehicle <strong className="font-mono">{vehicle.vehicle_number}</strong> with all wheels reset to pending.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => closeInspectionMutation.mutate()}
                disabled={closeInspectionMutation.isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {closeInspectionMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Report &amp; Starting New Cycle...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Confirm &amp; Save Report (Start New Inspection)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Official Roadworthiness Certificate Lightbox Modal ── */}
      {viewingReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-300 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden text-slate-900 my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header & Print Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFC800] text-black font-black flex items-center justify-center text-xs">
                  JK
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Official Vehicle Inspection Certificate
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Report ID: {viewingReportModal.report_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
                  title="Print Certificate"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReportModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Body (Printable) */}
            <div className="p-6 sm:p-8 space-y-6 bg-white">
              {/* Certificate Watermark Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-slate-200 gap-4">
                <div>
                  <span className="text-[11px] font-mono font-black text-[#E8770E] tracking-wider uppercase">
                    JK TYRE &amp; INDUSTRIES FLEET SAFETY DIVISION
                  </span>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    Vehicle Roadworthiness Audit Certificate
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Formal certification of physical wheel inspection, tyre tread depth, inflation pressure &amp; integrity.
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-xs space-y-1">
                  <div className="text-slate-500">Report No: <strong className="text-slate-900">{viewingReportModal.report_number}</strong></div>
                  <div className="text-slate-500">Certified At: <strong className="text-slate-900">{new Date(viewingReportModal.completed_at).toLocaleString()}</strong></div>
                  <div className="text-slate-500">Inspector ID: <strong className="text-slate-900">{viewingReportModal.inspector_id}</strong></div>
                </div>
              </div>

              {/* Vehicle & Certification Badge Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vehicle Asset</span>
                  <div className="text-lg font-black font-mono text-slate-900">{vehicle.vehicle_number}</div>
                  <div className="text-slate-600 font-mono">{vehicle.wheel_config} • {vehicle.make || 'Heavy Commercial'} {vehicle.model || ''}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Verified Odometer</span>
                  <div className="text-lg font-black font-mono text-slate-900">{viewingReportModal.odometer?.toLocaleString()} km</div>
                  <div className="text-slate-600 font-mono">Baseline Pressure: {vehicle.baseline_pressure} PSI</div>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 text-xs ${
                  viewingReportModal.roadworthiness_status === 'CERTIFIED_ROADWORTHY'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : viewingReportModal.roadworthiness_status === 'CONDITIONAL'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Certification Status</span>
                  <div className="text-base font-black flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    {viewingReportModal.roadworthiness_status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] font-medium">
                    {viewingReportModal.inspected_wheels} of {viewingReportModal.total_wheels} wheel positions verified.
                  </div>
                </div>
              </div>

              {/* Technician Sign-Off Remarks */}
              {viewingReportModal.summary_notes && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Technician Sign-Off Notes &amp; Observations
                  </span>
                  <p className="text-xs text-slate-800 italic">
                    "{viewingReportModal.summary_notes}"
                  </p>
                </div>
              )}

              {/* Wheel-by-Wheel Measurement Snapshot Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Disc className="w-4 h-4 text-slate-600" />
                  Wheel Position Measurements Snapshot ({viewingReportModal.details?.length || 0} Positions)
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[#5B6068] font-bold text-[11px]">
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">Tyre Serial</th>
                        <th className="py-2.5 px-3">Model</th>
                        <th className="py-2.5 px-3">Measured NSD</th>
                        <th className="py-2.5 px-3">Pressure</th>
                        <th className="py-2.5 px-3">Visual Condition</th>
                        <th className="py-2.5 px-3 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {viewingReportModal.details?.map((wheel, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {wheel.wheel_position}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {wheel.tyre_serial || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {wheel.tyre_model || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                            {wheel.measured_nsd != null ? `${wheel.measured_nsd} mm` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {wheel.measured_pressure != null ? `${wheel.measured_pressure} PSI` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {wheel.visual_condition || 'NORMAL'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                wheel.inspection_result === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : wheel.inspection_result === 'WARNING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {wheel.inspection_result || (wheel.inspected ? 'PASS' : 'PENDING')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Certificate Signatures Footer */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
                <div>
                  <span>Database Signature: </span>
                  <span className="font-mono font-bold text-slate-800">{viewingReportModal.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-slate-800">Authorized Fleet Safety Inspector</div>
                    <div className="text-[11px] text-slate-400">JK Tyre Commercial Service Network</div>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-600 font-black text-xs">
                    ✓ PASS
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingReportModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


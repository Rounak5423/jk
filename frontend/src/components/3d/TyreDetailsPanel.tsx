import React from 'react';
import { WheelPositionConfig } from '../../types';
import { X, AlertTriangle, ShieldCheck, AlertCircle, HelpCircle, Activity, Gauge, Thermometer, Disc, ArrowRight } from 'lucide-react';

interface Props {
  selectedWheel: WheelPositionConfig | null;
  vehicleNumber: string;
  baselinePressure: number;
  onClose: () => void;
}

export const TyreDetailsPanel: React.FC<Props> = ({
  selectedWheel,
  vehicleNumber,
  baselinePressure,
  onClose,
}) => {
  if (!selectedWheel) return null;

  const tyre = selectedWheel.tyre;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Critical
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <HelpCircle className="w-3.5 h-3.5" /> Unknown / Offline
          </span>
        );
    }
  };

  return (
    <aside aria-label="Tyre telemetry details" className="absolute top-4 right-4 bottom-4 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col z-30 overflow-hidden text-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-red-500">JK TYRE DIGITAL TWIN</span>
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
            Wheel {selectedWheel.wheel_position}
            <span className="text-xs font-normal text-slate-400 font-mono">
              (Axle {selectedWheel.axle_index} - {selectedWheel.axle_type})
            </span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
        {/* Status & THI Score Card */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Health Status</span>
            {getStatusBadge(selectedWheel.status)}
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block mb-0.5">Tyre Health Index</span>
            <div className="text-2xl font-black text-white flex items-baseline justify-end gap-1">
              {tyre?.current_thi !== undefined ? tyre.current_thi.toFixed(1) : 'N/A'}
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
          </div>
        </div>

        {/* Permanent Identification */}
        <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Permanent Tyre ID</span>
            <span className="font-mono font-medium text-white">{tyre?.serial_number || 'Data unavailable'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Vehicle ID</span>
            <span className="font-mono text-slate-300">{vehicleNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Model & Size</span>
            <span className="text-slate-300">{tyre?.model || 'JK Tyre'} ({tyre?.size || 'Standard'})</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Distance Run</span>
            <span className="text-slate-300 font-medium">
              {tyre?.total_km_run !== undefined ? `${tyre.total_km_run.toLocaleString()} km` : 'Not measured'}
            </span>
          </div>
        </div>

        {/* Live Telemetry Metrics */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Live Operating Telemetry
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Pressure */}
            <div className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Pressure
              </div>
              <div className="text-lg font-bold text-white">
                {tyre?.pressure_psi !== undefined && tyre?.pressure_psi !== null ? `${tyre.pressure_psi.toFixed(1)} psi` : <span className="text-xs text-slate-400 font-normal">Data unavailable</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Target: {baselinePressure} psi
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Temperature
              </div>
              <div className="text-lg font-bold text-white">
                {tyre?.temperature_c !== undefined && tyre?.temperature_c !== null ? `${tyre.temperature_c.toFixed(1)} °C` : <span className="text-xs text-slate-400 font-normal">Data unavailable</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Limit: 85.0 °C
              </div>
            </div>
          </div>
        </div>

        {/* Tread Depth & Wear Life */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-yellow-400" /> Tread Depth & Wear Status
          </h4>
          <div className="bg-slate-800/40 border border-slate-700/50 p-3.5 rounded-xl space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Current Measured NSD</span>
              <span className="text-base font-bold text-white">
                {tyre?.current_nsd !== undefined ? `${tyre.current_nsd.toFixed(1)} mm` : 'Not measured'}
              </span>
            </div>

            {/* Progress bar */}
            {tyre?.blueprint_nsd && tyre?.current_nsd && (
              <div>
                <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(5, (tyre.current_nsd / tyre.blueprint_nsd) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Critical limit: 3.0 mm</span>
                  <span>Virgin: {tyre.blueprint_nsd} mm</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/50 flex justify-between text-xs">
              <span className="text-slate-400">Remaining Life:</span>
              <span className="font-medium text-slate-300">
                {tyre?.current_nsd !== undefined && tyre.current_nsd > 3.0 ? (
                  `~${Math.round(((tyre.current_nsd - 3.0) / 0.00022)).toLocaleString()} km (projected)`
                ) : (
                  'Insufficient history to estimate'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Explanation & Recommended Action */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Diagnostic Explanation</h4>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {tyre?.explanation || 'All measured parameters are within standard operating thresholds. Continue routine fleet monitoring.'}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Recommended Maintenance Action</h4>
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300 flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              {selectedWheel.status === 'CRITICAL' && 'Stop vehicle immediately; inspect for severe under-inflation, thermal damage or bald tread.'}
              {selectedWheel.status === 'WARNING' && 'Schedule cold pressure verification and tread rotation check at next scheduled depot stop.'}
              {selectedWheel.status === 'HEALTHY' && 'No urgent action needed. Next scheduled depot visual inspection in 5,000 km.'}
              {selectedWheel.status === 'UNKNOWN' && 'Perform physical inspection and TPMS sensor communication diagnostic.'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Tyre, TyreLifecycleHistory } from '../../types';
import {
  ArrowLeft, Activity, RotateCcw, History,
} from 'lucide-react';
import { TyreHealthy } from '../../components/tyre/TyreHealthy';
import { TyreWarning } from '../../components/tyre/TyreWarning';
import { TyreCritical } from '../../components/tyre/TyreCritical';

function getLifecycleBadgeClasses(lt: string) {
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

export const TyreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: tyre, isLoading } = useQuery<Tyre>({
    queryKey: ['tyre-detail', id],
    queryFn: async () => {
      const res = await api.get(`/tyres/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: lifecycleHistory } = useQuery<TyreLifecycleHistory[]>({
    queryKey: ['tyre-lifecycle-history', id],
    queryFn: async () => {
      const res = await api.get(`/tyres/${id}/lifecycle-history`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center">
        <Activity className="w-5 h-5 animate-spin mr-2 text-blue-500" />
        Loading permanent tyre lifecycle...
      </div>
    );
  }

  if (!tyre) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Tyre not found.{' '}
        <Link to="/tyres" className="text-blue-600 underline">
          Return to tyres
        </Link>
      </div>
    );
  }

  const rul = tyre.remaining_life_estimate;
  const TyreImage = tyre.thi_status === 'HEALTHY' ? TyreHealthy : tyre.thi_status === 'WARNING' ? TyreWarning : TyreCritical;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/tyres" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tyre Registry
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          {/* Left — tyre image */}
          <div className={`flex-shrink-0 flex items-center justify-center w-52 h-52 rounded-2xl border-2 ${
            tyre.thi_status === 'HEALTHY'  ? 'border-emerald-400 bg-emerald-50' :
            tyre.thi_status === 'WARNING'  ? 'border-orange-400 bg-orange-50'   :
                                             'border-red-400 bg-red-50'
          }`}>
            <TyreImage className="w-44 h-44 object-contain" />
          </div>

          {/* Right — title + badges + THI score */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{tyre.serial_number}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  tyre.thi_status === 'HEALTHY'  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  tyre.thi_status === 'WARNING'  ? 'bg-orange-100 text-orange-700 border border-orange-200'   :
                                                   'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {tyre.thi_status}
                </span>
                {tyre.lifecycle_type && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getLifecycleBadgeClasses(tyre.lifecycle_type)}`}>
                    {tyre.lifecycle_type}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {tyre.brand} {tyre.model} • Size: {tyre.size} • Retread Count: {tyre.retread_count}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 block mb-0.5">Tyre Health Index</span>
              <div className="text-3xl font-black text-slate-900 flex items-baseline sm:justify-end gap-1">
                {tyre.current_thi !== null && tyre.current_thi !== undefined ? tyre.current_thi.toFixed(1) : 'N/A'}
                <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Measured NSD</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{tyre.current_nsd?.toFixed(1)} mm</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Virgin: {tyre.blueprint_nsd} mm</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Wear Progression</span>
          <span className="text-xl font-bold text-amber-500">{tyre.wear_percentage}%</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tread consumption</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Cumulative Distance</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{tyre.total_km_run.toLocaleString()} km</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across all fitments</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Remaining Useful Life</span>
          <span className="text-xl font-bold text-emerald-600">
            {rul?.remaining_life_km ? `~${rul.remaining_life_km.toLocaleString()} km` : 'Insufficient history'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{rul?.status}</span>
        </div>
      </div>

      {/* RUL Estimation Analysis Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" /> Tread Wear & Remaining Life Analysis
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {rul?.message || 'Analyzing accumulated mileage and measured tread depth degradation.'}
        </p>

        {rul?.wear_rate_per_10k_km !== null && rul?.wear_rate_per_10k_km !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">Observed Wear Rate</span>
              <span className="font-bold text-slate-900 text-sm">{rul.wear_rate_per_10k_km} mm / 10,000 km</span>
            </div>
            <div>
              <span className="text-slate-400 block">Projected Total Distance</span>
              <span className="font-bold text-slate-900 text-sm">{rul.projected_total_km?.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-slate-400 block">Estimation Confidence</span>
              <span className="font-bold text-emerald-600 text-sm">{rul.confidence}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fitment History Lifecycle Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-blue-500" /> Permanent Fitment &amp; Remount History
        </h3>

        {/* List fitment records */}
        <div className="space-y-3">
          {(tyre as any).fitment_history?.map((fit: any, idx: number) => (
            <div
              key={fit.id || idx}
              className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-900 text-xs">
                  {fit.wheel_position}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    Axle {fit.axle_number} ({fit.is_dual ? 'Dual Set' : 'Single Steer'})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Mounted on {new Date(fit.fitted_at).toLocaleDateString()} at {fit.fitted_odometer?.toLocaleString()} km
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right">
                {fit.removed_at ? (
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                      Dismounted: {fit.removal_reason || 'ROTATION'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Removed on {new Date(fit.removed_at).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Currently Mounted
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle History Card */}
      {lifecycleHistory && lifecycleHistory.length > 0 && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" /> Lifecycle Change History
          </h3>
          <div className="space-y-3">
            {lifecycleHistory.map((entry) => (
              <div
                key={entry.id}
                className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadgeClasses(entry.previous_lifecycle_type)}`}>
                      {entry.previous_lifecycle_type}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getLifecycleBadgeClasses(entry.new_lifecycle_type)}`}>
                      {entry.new_lifecycle_type}
                    </span>
                  </div>
                  {entry.reason && (
                    <span className="text-slate-500 text-[11px] truncate max-w-xs">{entry.reason}</span>
                  )}
                </div>
                <div className="text-left md:text-right">
                  <div className="text-[11px] text-slate-500">{entry.changed_by_name}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {entry.nsd_at_change && (
                    <div className="text-[10px] text-slate-400">NSD: {entry.nsd_at_change} mm</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Tyre } from '../../types';
import { TyreHealthy } from './TyreHealthy';
import { TyreWarning } from './TyreWarning';
import { TyreCritical } from './TyreCritical';

interface TyreCardProps {
  tyre: Tyre;
}

function getTyreImage(status: Tyre['thi_status']) {
  switch (status) {
    case 'HEALTHY':
      return TyreHealthy;
    case 'WARNING':
      return TyreWarning;
    case 'CRITICAL':
    case 'UNKNOWN':
    default:
      return TyreCritical;
  }
}

function getStatusBadgeClasses(status: Tyre['thi_status']): string {
  switch (status) {
    case 'HEALTHY':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'WARNING':
      return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    case 'CRITICAL':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'UNKNOWN':
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
}

function getLifecycleBadgeClasses(lt: string): string {
  switch (lt) {
    case 'NEW':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'REUSE':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'RETREAD':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'SCRAP':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
}

function getTopBorderClass(status: Tyre['thi_status']): string {
  switch (status) {
    case 'HEALTHY':
      return 'border-t-emerald-500/40';
    case 'WARNING':
      return 'border-t-orange-500/40';
    case 'CRITICAL':
      return 'border-t-red-500/40';
    case 'UNKNOWN':
    default:
      return 'border-t-slate-500/40';
  }
}

function getStatusDotColor(status: Tyre['thi_status']): string {
  switch (status) {
    case 'HEALTHY':
      return 'bg-emerald-400';
    case 'WARNING':
      return 'bg-orange-400';
    case 'CRITICAL':
      return 'bg-red-400';
    case 'UNKNOWN':
    default:
      return 'bg-slate-400';
  }
}

function formatStatusLabel(status: Tyre['thi_status']): string {
  if (!status) return 'UNKNOWN';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export const TyreCard: React.FC<TyreCardProps> = ({ tyre }) => {
  const TyreImage = getTyreImage(tyre.thi_status);

  return (
    <div className={`bg-white border-2 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200 ${
      tyre.thi_status === 'HEALTHY'  ? 'border-emerald-400' :
      tyre.thi_status === 'WARNING'  ? 'border-orange-400'  :
      tyre.thi_status === 'CRITICAL' ? 'border-red-400'     :
                                       'border-slate-200'
    }`}>

      {/* Header: serial + status + lifecycle badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-bold text-slate-900 text-sm leading-tight truncate" title={tyre.serial_number}>
            {tyre.serial_number}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate" title={`${tyre.brand} ${tyre.model} · ${tyre.size}`}>
            {tyre.brand} {tyre.model} · {tyre.size}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
            tyre.thi_status === 'HEALTHY'  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
            tyre.thi_status === 'WARNING'  ? 'bg-orange-100 text-orange-700 border border-orange-300'   :
            tyre.thi_status === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-300'             :
                                             'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {tyre.thi_status}
          </span>
          {tyre.lifecycle_type && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${getLifecycleBadgeClasses(tyre.lifecycle_type)}`}>
              {tyre.lifecycle_type}
            </span>
          )}
        </div>
      </div>

      {/* Real tyre image — sized to show clearly */}
      <div className="flex justify-center items-center py-2 bg-slate-50 rounded-xl">
        <TyreImage className="h-44 w-44 object-contain" />
      </div>

      {/* Footer: status dot + View button */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusDotColor(tyre.thi_status)}`} />
          <span className={`text-xs font-semibold ${
            tyre.thi_status === 'HEALTHY'  ? 'text-emerald-600' :
            tyre.thi_status === 'WARNING'  ? 'text-orange-600'  :
            tyre.thi_status === 'CRITICAL' ? 'text-red-600'     :
                                             'text-slate-500'
          }`}>
            {formatStatusLabel(tyre.thi_status)}
          </span>
        </div>

        <Link
          to={`/tyres/${tyre.id}`}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
        >
          View <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

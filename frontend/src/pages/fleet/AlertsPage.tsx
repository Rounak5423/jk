import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Alert } from '../../types';
import { AlertTriangle, ShieldCheck, AlertCircle, CheckCircle, Check, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AlertsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Resolution modal state
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ['fleet-alerts', activeFleetId, statusFilter, severityFilter],
    queryFn: async () => {
      let url = '/alerts?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (severityFilter) url += `severity=${severityFilter}&`;
      const res = await api.get(url);
      return res.data;
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await api.post(`/alerts/${alertId}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-stats'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, note }: { alertId: string; note: string }) => {
      const res = await api.post(`/alerts/${alertId}/resolve`, { resolution_note: note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-stats'] });
      setResolvingAlert(null);
      setResolutionNote('');
    },
  });

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNote.trim()) return;
    resolveMutation.mutate({ alertId: resolvingAlert.id, note: resolutionNote });
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operational Alerts Center</h1>
          <p className="text-xs text-[#5B6068] mt-0.5">
            Deduplicated real-time notifications with explicit acknowledgment and resolution audit history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="RISK">Risk</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3.5 px-6">Alert Code</th>
                <th className="py-3.5 px-4">Vehicle &amp; Wheel</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Observed Metric</th>
                <th className="py-3.5 px-4">Explanation &amp; Recommended Action</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5B6068]">
                    Loading alerts...
                  </td>
                </tr>
              ) : alerts?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5B6068]">
                    No matching alerts found.
                  </td>
                </tr>
              ) : (
                alerts?.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : a.severity === 'WARNING'
                            ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}
                      >
                        {a.code}
                      </span>
                      <span className="text-[10px] text-[#5B6068] block mt-1">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-900 block">{a.vehicle_number}</span>
                      <span className="text-[11px] font-mono text-[#5B6068]">
                        {a.wheel_position || 'Vehicle Sensor'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">{a.category}</td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {a.observed_value !== null ? `${a.observed_value} ${a.unit}` : 'Threshold'}
                    </td>
                    <td className="py-4 px-4 max-w-md">
                      <div className="font-medium text-slate-900">{a.explanation}</div>
                      <div className="text-[11px] text-blue-600 mt-1 flex items-start gap-1">
                        <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Action: {a.recommended_action}</span>
                      </div>
                      {a.status === 'RESOLVED' && a.resolution_note && (
                        <div className="text-[10px] text-emerald-700 mt-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          Resolved: {a.resolution_note} ({a.resolved_by})
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          a.status === 'ACTIVE'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : a.status === 'ACKNOWLEDGED'
                            ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {a.status}
                      </span>
                      {a.status === 'ACKNOWLEDGED' && a.acknowledged_by && (
                        <span className="text-[9px] text-[#5B6068] block mt-0.5">By {a.acknowledged_by}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => ackMutation.mutate(a.id)}
                          disabled={ackMutation.isPending}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold transition"
                        >
                          Acknowledge
                        </button>
                      )}

                      {a.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setResolvingAlert(a);
                            setResolutionNote('');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          Resolve
                        </button>
                      )}

                      {a.status === 'RESOLVED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <Check className="w-3.5 h-3.5" /> Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setResolvingAlert(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Resolve Operational Alert
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Alert: <span className="font-bold text-slate-900">{resolvingAlert.code}</span> • Vehicle:{' '}
              <span className="font-mono text-slate-900">{resolvingAlert.vehicle_number}</span>
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Corrective Work Order / Resolution Note *
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain corrective maintenance action performed (e.g. reinflated to 110 psi, replaced valve core, remounted spare)..."
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-600/20"
                >
                  {resolveMutation.isPending ? 'Closing...' : 'Mark Alert Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

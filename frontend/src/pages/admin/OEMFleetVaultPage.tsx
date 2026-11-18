import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Database,
  Shield,
  RefreshCw,
  Download,
  Search,
  Eye,
  CheckCircle2,
  Truck,
  Disc,
  AlertTriangle,
  Copy,
  Check,
  FileCode,
  Layers,
  ArrowRight,
  X,
  Gauge,
  Thermometer,
  FileSpreadsheet,
  Fuel,
  MapPin,
  Award,
  Clock,
} from 'lucide-react';

interface FleetSummary {
  id: string;
  fleet_id: string;
  fleet_name: string;
  snapshot_type: string;
  captured_at: string;
  total_vehicles: number;
  total_tyres: number;
  average_thi: number;
  active_alerts_count: number;
  total_km_run: number;
  sync_channel: string;
  data_hash: string;
  payload_size_kb: number;
}

export const OEMFleetVaultPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'VEHICLES' | 'TYRES' | 'TELEMETRY' | 'DRIVER_DUTY' | 'RAW_JSON'>('VEHICLES');

  // Fetch summary of all fleet snapshots
  const { data: vaultSummary, isLoading, refetch } = useQuery({
    queryKey: ['admin-oem-vault-summary'],
    queryFn: async () => {
      const res = await api.get('/admin/oem-vault/summary');
      return res.data;
    },
  });

  // Fetch detail for a selected fleet
  const { data: fleetDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-oem-vault-detail', selectedFleetId],
    queryFn: async () => {
      if (!selectedFleetId) return null;
      const res = await api.get(`/admin/oem-vault/fleet/${selectedFleetId}`);
      return res.data;
    },
    enabled: !!selectedFleetId,
  });

  // Manual trigger mutation to capture fresh snapshots across all fleets
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/oem-vault/sync-now');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-oem-vault-summary'] });
      if (selectedFleetId) {
        queryClient.invalidateQueries({ queryKey: ['admin-oem-vault-detail', selectedFleetId] });
      }
    },
  });

  // Primary Export: Excel (.xlsx) dataset
  const handleExport = async (fleetId: string, fleetName: string) => {
    try {
      setIsExporting(fleetId);
      const res = await api.get(`/admin/oem-vault/export-excel/${fleetId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = fleetName.replace(/\s+/g, '_');
      link.setAttribute('download', `JK_TYRE_OEM_INGEST_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel Export failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  // Secondary Export: Raw JSON
  const handleExportJson = async (fleetId: string, fleetName: string) => {
    try {
      const res = await api.get(`/admin/oem-vault/export/${fleetId}`);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `JK_TYRE_OEM_INGEST_${fleetName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('JSON Export failed:', err);
    }
  };

  const copyToClipboard = (text: string, isJson: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isJson) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const fleets: FleetSummary[] = vaultSummary?.fleets || [];
  const filteredFleets = fleets.filter((f) =>
    f.fleet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.fleet_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const payload = fleetDetail?.latest_snapshot?.payload;

  return (
    <div className="space-y-6">
      {/* Top Corporate Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-1">
              <Database className="w-4 h-4" /> JK Tyre OEM Central Ingest & Corporate Intelligence
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">OEM Fleet Telemetry Vault</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Silent fleetwise telematics aggregation and asset condition pipeline. Captures real-time
              TPMS sensor streams, Tyre Health Indexes (THI), vehicle odometers, and wear profiles directly for
              JK Tyre corporate headquarters and predictive engineering.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="font-medium text-emerald-400">Ingest Pipeline Live</span>
            </div>

            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="px-4 py-2 bg-brand-gold hover:bg-brand-warm-gold disabled:opacity-50 text-black rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Ingesting Snapshots…' : 'Sync All Fleets Now'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="cream-glow-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6068]">Ingested Fleets</span>
            <Layers className="w-4 h-4 text-[#5B6068]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {vaultSummary?.total_fleets_ingested ?? 0}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">Active transport operators</div>
        </div>

        <div className="cream-glow-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6068]">Monitored Vehicles</span>
            <Truck className="w-4 h-4 text-[#5B6068]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {vaultSummary?.aggregate_totals?.vehicles ?? 0}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">Equipped commercial trucks</div>
        </div>

        <div className="cream-glow-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6068]">Tracked JK Tyres</span>
            <Disc className="w-4 h-4 text-[#5B6068]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {vaultSummary?.aggregate_totals?.tyres ?? 0}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">With permanent RFID/Stencil</div>
        </div>

        <div className="cream-glow-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6068]">Active Fault Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${(vaultSummary?.aggregate_totals?.active_alerts ?? 0) > 0 ? 'text-[#E8770E]' : 'text-[#5B6068]'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${(vaultSummary?.aggregate_totals?.active_alerts ?? 0) > 0 ? 'text-[#E8770E]' : 'text-slate-900'}`}>
            {vaultSummary?.aggregate_totals?.active_alerts ?? 0}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">Pending depot remediation</div>
        </div>

        <div className="cream-glow-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5B6068]">Total Snapshots</span>
            <CheckCircle2 className="w-4 h-4 text-[#5B6068]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {vaultSummary?.total_snapshots_recorded ?? 0}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">Archived in corporate store</div>
        </div>
      </div>

      {/* Search and Table Section */}
      <div className="cream-glow-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fleet name or ID…"
              className="w-full bg-cream border border-gold-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
            />
          </div>

          <div className="text-xs text-[#5B6068]">
            Showing <span className="font-bold text-slate-900">{filteredFleets.length}</span> fleet repositories
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#5B6068] text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E8770E]" /> Loading OEM Telemetry Vault records…
          </div>
        ) : filteredFleets.length === 0 ? (
          <div className="p-12 text-center text-[#5B6068] text-xs">
            No fleet records found in OEM Vault. Click "Sync All Fleets Now" to initialize.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gold-border text-slate-300 font-semibold bg-cream-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Fleet Transport Operator</th>
                  <th className="py-3 px-3">Telemetry Channel</th>
                  <th className="py-3 px-3 text-center">Vehicles</th>
                  <th className="py-3 px-3 text-center">Tyres</th>
                  <th className="py-3 px-3 text-center">Avg THI</th>
                  <th className="py-3 px-3 text-center">Alerts</th>
                  <th className="py-3 px-3">Last Ingest</th>
                  <th className="py-3 px-3">Payload / Hash</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-light text-slate-700">
                {filteredFleets.map((fleet) => (
                  <tr key={fleet.id} className="hover:bg-[#FFF9E8] transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{fleet.fleet_name}</div>
                      <div className="font-mono text-[10px] text-[#5B6068]">{fleet.fleet_id}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {fleet.sync_channel}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                      {fleet.total_vehicles}
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                      {fleet.total_tyres}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          fleet.average_thi >= 80
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : fleet.average_thi >= 60
                            ? 'bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {fleet.average_thi.toFixed(1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {fleet.active_alerts_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]">
                          {fleet.active_alerts_count}
                        </span>
                      ) : (
                        <span className="text-[#5B6068] text-[11px]">0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-slate-700">
                      <div>{fleet.captured_at ? new Date(fleet.captured_at).toLocaleDateString() : 'N/A'}</div>
                      <div className="text-[10px] text-[#5B6068]">
                        {fleet.captured_at ? new Date(fleet.captured_at).toLocaleTimeString() : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="text-[#5B6068] font-mono text-[11px]">{fleet.payload_size_kb} KB</div>
                      <button
                        onClick={() => copyToClipboard(fleet.data_hash || '')}
                        title="Click to copy SHA-256 integrity hash"
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[#5B6068] hover:text-slate-900 transition"
                      >
                        {fleet.data_hash ? `${fleet.data_hash.slice(0, 10)}…` : 'N/A'}
                        {copiedHash === fleet.data_hash ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFleetId(fleet.fleet_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-medium text-xs transition inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#5B6068]" /> Inspect
                        </button>
                        <button
                          onClick={() => handleExport(fleet.fleet_id, fleet.fleet_name)}
                          disabled={isExporting === fleet.fleet_id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Export multi-sheet Excel dataset (.xlsx) including driver duty, fuel & stoppages"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                          {isExporting === fleet.fleet_id ? 'Exporting…' : 'Export Excel'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Fleet Inspector Modal */}
      {selectedFleetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    JK Tyre OEM Telemetry Deep Inspection
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {fleetDetail?.fleet_name || 'Loading Fleet Data…'}
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({selectedFleetId})
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(selectedFleetId, fleetDetail?.fleet_name || 'Fleet')}
                  disabled={isExporting === selectedFleetId}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Download complete multi-sheet Excel workbook (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {isExporting === selectedFleetId ? 'Generating Excel…' : 'Download Excel (.xlsx)'}
                </button>
                <button
                  onClick={() => handleExportJson(selectedFleetId, fleetDetail?.fleet_name || 'Fleet')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer border border-slate-700"
                  title="Download Raw Corporate JSON Snapshot"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
                <button
                  onClick={() => setSelectedFleetId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subtabs */}
            <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40">
              <button
                onClick={() => setDetailTab('VEHICLES')}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                      detailTab === 'VEHICLES'
                        ? 'border-red-500 text-white bg-dark-surface'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
              >
                <Truck className="w-3.5 h-3.5" /> Vehicles ({payload?.vehicles?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('TYRES')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                  detailTab === 'TYRES'
                    ? 'border-red-500 text-white bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Disc className="w-3.5 h-3.5" /> Tyres & Wear ({payload?.tyres?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('TELEMETRY')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                  detailTab === 'TELEMETRY'
                    ? 'border-red-500 text-white bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" /> Telemetry Feed ({payload?.recent_telemetry?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('DRIVER_DUTY')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                  detailTab === 'DRIVER_DUTY'
                    ? 'border-red-500 text-white bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> Driver Duty & Stoppages ({payload?.driver_activities?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('RAW_JSON')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                  detailTab === 'RAW_JSON'
                    ? 'border-red-500 text-white bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" /> Raw Corporate JSON
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 text-slate-200">
              {isDetailLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> Decrypting and parsing OEM Telemetry snapshot…
                </div>
              ) : (
                <>
                  {detailTab === 'VEHICLES' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {payload?.vehicles?.map((v: any) => (
                          <div key={v.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-bold text-white font-mono">{v.vehicle_number}</div>
                                <div className="text-[11px] text-slate-400">{v.model} • {v.vehicle_type} ({v.wheel_config})</div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {v.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Odometer:</span>
                                <span className="font-mono font-medium text-slate-200">
                                  {v.current_odometer ? `${v.current_odometer.toLocaleString()} km` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Location:</span>
                                <span className="text-slate-300 truncate block">
                                  {v.current_location_name || 'En route'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                                Fitted Tyres ({v.active_tyre_fitments?.length || 0})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {v.active_tyre_fitments?.map((fit: any) => (
                                  <span
                                    key={fit.wheel_position}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                      fit.thi_status === 'HEALTHY'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : fit.thi_status === 'WARNING'
                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}
                                  >
                                    {fit.wheel_position}: {fit.serial_number || 'TYRE'} ({fit.current_thi ?? 'N/A'})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailTab === 'TYRES' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Serial ID</th>
                            <th className="py-2.5 px-3">Model & Size</th>
                            <th className="py-2.5 px-3">Lifecycle</th>
                            <th className="py-2.5 px-3 text-center">Current NSD</th>
                            <th className="py-2.5 px-3 text-center">Wear %</th>
                            <th className="py-2.5 px-3 text-center">THI Score</th>
                            <th className="py-2.5 px-3 text-center">TPMS Pres / Temp</th>
                            <th className="py-2.5 px-3 text-right">Accumulated KM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {payload?.tyres?.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-white">{t.serial_number}</td>
                              <td className="py-2.5 px-3 text-slate-300">{t.brand} {t.model} ({t.size})</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {t.lifecycle_type} ({t.retread_count}R)
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{t.current_nsd?.toFixed(1)} mm</td>
                              <td className="py-2.5 px-3 text-center font-mono">{t.wear_percentage}%</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.thi_status === 'HEALTHY'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : t.thi_status === 'WARNING'
                                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}
                                >
                                  {t.current_thi?.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                                {t.telemetry_snapshot?.pressure_psi ? `${t.telemetry_snapshot.pressure_psi.toFixed(1)} psi` : '—'} /{' '}
                                {t.telemetry_snapshot?.temperature_c ? `${t.telemetry_snapshot.temperature_c.toFixed(1)} °C` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                {t.total_km_run ? `${t.total_km_run.toLocaleString()} km` : '0 km'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {detailTab === 'TELEMETRY' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3">Vehicle</th>
                            <th className="py-2.5 px-3">Wheel Pos</th>
                            <th className="py-2.5 px-3 text-center">Pressure</th>
                            <th className="py-2.5 px-3 text-center">Temperature</th>
                            <th className="py-2.5 px-3 text-center">Speed</th>
                            <th className="py-2.5 px-3">Source Provenance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {payload?.recent_telemetry?.map((telem: any) => (
                            <tr key={telem.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-slate-400">
                                {telem.timestamp ? new Date(telem.timestamp).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-white font-bold">{telem.vehicle_id?.slice(0, 8)}…</td>
                              <td className="py-2 px-3 text-slate-300">{telem.wheel_position}</td>
                              <td className="py-2 px-3 text-center text-cyan-400">{telem.pressure_psi ?? '—'} psi</td>
                              <td className="py-2 px-3 text-center text-orange-400">{telem.temperature_c ?? '—'} °C</td>
                              <td className="py-2 px-3 text-center text-slate-300">{telem.speed_kmh ?? 0} km/h</td>
                              <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{telem.provenance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {detailTab === 'DRIVER_DUTY' && (
                    <div className="space-y-4">
                      {/* Driver Activities KPI Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Total Duty Submissions
                          </div>
                          <div className="text-xl font-bold text-white font-mono">
                            {payload?.metrics_summary?.total_driver_activities ?? payload?.driver_activities?.length ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Real-time driver updates</div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Fuel className="w-3.5 h-3.5 text-amber-400" /> Refuelings Logged
                          </div>
                          <div className="text-xl font-bold text-white font-mono">
                            {payload?.metrics_summary?.driver_refueling_count ?? 0}
                          </div>
                          <div className="text-[10px] text-amber-300/80 mt-0.5 font-mono">
                            {(payload?.metrics_summary?.total_fuel_litres_logged ?? 0).toLocaleString()} L • ₹{(payload?.metrics_summary?.total_fuel_cost_logged_inr ?? 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-400" /> Stoppages & Odometer
                          </div>
                          <div className="text-xl font-bold text-white font-mono">
                            {payload?.metrics_summary?.driver_stoppage_count ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">En route halt checkpoints</div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Disc className="w-3.5 h-3.5 text-emerald-400" /> Tyre Walkarounds
                          </div>
                          <div className="text-xl font-bold text-white font-mono">
                            {payload?.metrics_summary?.driver_tyre_inspection_count ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Physical inspections</div>
                        </div>
                      </div>

                      {/* Detailed Submissions Table */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span>Driver Ingest Logs & Performance Telemetry</span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                              ({payload?.driver_activities?.length || 0} events embedded in corporate snapshot)
                            </span>
                          </div>
                        </div>

                        {(!payload?.driver_activities || payload.driver_activities.length === 0) ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No driver activities logged yet for this fleet. Activities submitted via the Driver Portal (refueling, stoppages, inspections) will appear here in real-time.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                                <tr>
                                  <th className="py-2.5 px-3">Date / Time</th>
                                  <th className="py-2.5 px-3">Driver</th>
                                  <th className="py-2.5 px-3">Vehicle</th>
                                  <th className="py-2.5 px-3">Activity Type</th>
                                  <th className="py-2.5 px-3">Odometer</th>
                                  <th className="py-2.5 px-3">Location / Station</th>
                                  <th className="py-2.5 px-3">Telemetry & Duty Details</th>
                                  <th className="py-2.5 px-3">Notes</th>
                                  <th className="py-2.5 px-3 text-right">Points</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {payload.driver_activities.map((act: any) => {
                                  const meta = act.metadata || {};
                                  return (
                                    <tr key={act.id} className="hover:bg-slate-800/30">
                                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                        <div>{act.created_at ? new Date(act.created_at).toLocaleDateString() : 'N/A'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          {act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                                        {act.driver_name || act.driver_id || 'Unknown Driver'}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                                        {act.vehicle_number || act.vehicle_id || '—'}
                                      </td>
                                      <td className="py-2.5 px-3 whitespace-nowrap">
                                        {act.activity_type === 'REFUELING' && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                                            <Fuel className="w-2.5 h-2.5" /> Refueling
                                          </span>
                                        )}
                                        {act.activity_type === 'STOPPAGE_CHECKPOINT' && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" /> Stoppage
                                          </span>
                                        )}
                                        {act.activity_type === 'TYRE_INSPECTION' && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                            <Disc className="w-2.5 h-2.5" /> Tyre Check
                                          </span>
                                        )}
                                        {act.activity_type === 'TRIP_COMPLETION' && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                                            <Award className="w-2.5 h-2.5" /> Trip Finish
                                          </span>
                                        )}
                                        {!['REFUELING', 'STOPPAGE_CHECKPOINT', 'TYRE_INSPECTION', 'TRIP_COMPLETION'].includes(act.activity_type) && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                            {act.activity_type}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-300 whitespace-nowrap">
                                        {act.odometer_km ? `${act.odometer_km.toLocaleString()} km` : '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                                        {act.location_name || meta.pump_name || meta.stop_name || 'En route'}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                                        {act.activity_type === 'REFUELING' && (
                                          <div className="space-y-0.5">
                                            <span className="font-semibold text-amber-300 font-mono">
                                              {meta.litres ? `${meta.litres} L` : ''}
                                              {meta.total_cost_inr ? ` • ₹${meta.total_cost_inr.toLocaleString()}` : ''}
                                            </span>
                                            {meta.fuel_type && (
                                              <span className="text-[10px] text-slate-400 block">Fuel: {meta.fuel_type}</span>
                                            )}
                                          </div>
                                        )}
                                        {act.activity_type === 'STOPPAGE_CHECKPOINT' && (
                                          <div className="space-y-0.5">
                                            <span className="font-semibold text-purple-300">
                                              {meta.reason || 'Checkpoint Halt'}
                                            </span>
                                            {meta.duration_minutes ? (
                                              <span className="text-[10px] text-slate-400 block font-mono">Halt: {meta.duration_minutes} mins</span>
                                            ) : null}
                                          </div>
                                        )}
                                        {act.activity_type === 'TYRE_INSPECTION' && (
                                          <div className="space-y-0.5">
                                            <span className={`font-semibold ${
                                              meta.visual_condition === 'NORMAL' ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                              {meta.visual_condition || 'Visual Checked'}
                                            </span>
                                            {meta.wheel_position && (
                                              <span className="text-[10px] text-slate-400 block font-mono">Wheel: {meta.wheel_position}</span>
                                            )}
                                          </div>
                                        )}
                                        {act.activity_type === 'TRIP_COMPLETION' && (
                                          <div className="text-blue-300 font-mono">
                                            Score: {meta.trip_score ?? 'N/A'} • {meta.distance_km ?? 0} km
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                                        {act.notes || meta.notes || '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                        +{act.points_awarded || 0} pts
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === 'RAW_JSON' && (
                    <div className="relative">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(payload, null, 2), true)}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition z-10"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied JSON
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy JSON
                          </>
                        )}
                      </button>
                      <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[60vh] border border-slate-800">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  Disc,
  Truck,
  Table,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const ReportsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState<string | null>(null);

  const { data: tyres } = useQuery({
    queryKey: ['fleet-tyres-report', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/tyres');
      return res.data;
    },
  });

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await api.get('/export/excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `JK_Tyre_THI_Dataset_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download Excel dataset', err);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadCsv = async (table: string) => {
    setDownloadingCsv(table);
    try {
      const response = await api.get(`/export/csv?table=${table}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jktyre_${table}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(`Failed to download ${table} CSV`, err);
    } finally {
      setDownloadingCsv(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet Intelligence &amp; Research Exports</h1>
          <p className="text-xs text-[#5B6068] mt-0.5">
            Download database-derived telemetry datasets and operational reports for academic and fleet audit reviews.
          </p>
        </div>

        {/* Primary 13-Sheet Excel Download Button */}
        <button
          onClick={handleDownloadExcel}
          disabled={downloadingExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs shadow-sm transition self-start sm:self-auto disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-black" />
          {downloadingExcel ? 'Generating 13-Sheet Workbook...' : 'Download 13-Sheet Excel Dataset (.xlsx)'}
        </button>
      </div>

      {/* Provenance and Disclaimer Note */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs flex items-start gap-3 shadow-sm">
        <Info className="w-4 h-4 text-[#5B6068] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">Academic Review &amp; Data Integrity Compliance</span>
          <p className="text-[11px] text-[#5B6068] leading-relaxed">
            Exports contain live database records generated under deterministic physical models (monotonic odometers,
            calibrated thermal curves, and standard JK Tyre tyre models). Password hashes are strictly omitted.
            Sheets named <strong className="text-slate-800 font-semibold">"NSD Inspection Data"</strong> from legacy
            spreadsheets remain strictly excluded in compliance with data privacy protocols.
          </p>
        </div>
      </div>

      {/* 13-Sheet Dataset Featured Card */}
      <div className="p-6 rounded-2xl bg-[#14161A] border border-[#262A30] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Full Multi-Sheet Academic &amp; Audit Dataset</h2>
              <p className="text-xs text-slate-400">Standardized 13-sheet Microsoft Excel workbook (.xlsx)</p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1E2228] text-slate-200 border border-slate-700">
            13 Sheets Included
          </span>
        </div>

        {/* Sheet pill previews */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {[
            'README_PROVENANCE',
            'FLEETS',
            'USERS',
            'VEHICLES',
            'TYRES',
            'TYRE_FITMENTS',
            'TRIPS',
            'TELEMETRY_RECORDS',
            'THI_RECORDS',
            'ALERTS',
            'INSPECTIONS',
            'AUDIT_LOGS',
            'DATA_DICTIONARY',
          ].map((sheetName, idx) => (
            <span
              key={sheetName}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#1E2228] text-slate-300 border border-slate-800"
            >
              <span className="text-slate-500 mr-1">{idx + 1}.</span>
              {sheetName}
            </span>
          ))}
        </div>
      </div>

      {/* Granular CSV Exports */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Table className="w-4 h-4 text-cyan-500" /> Individual Table CSV Exports
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'vehicles', label: 'Vehicles Table', desc: 'Commercial units, layouts, and odometers', icon: Truck },
            { id: 'tyres', label: 'Tyres Table', desc: 'Permanent serials, NSD, and THI health', icon: Disc },
            { id: 'trips', label: 'Trips Table', desc: 'Driver routes, scores, and distances', icon: FileText },
            { id: 'alerts', label: 'Alerts Table', desc: 'Active and resolved operational warnings', icon: AlertTriangle },
          ].map((item) => {
            const Icon = item.icon;
            const isDownloading = downloadingCsv === item.id;
            return (
              <div
                key={item.id}
                className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1">
                    <Icon className="w-4 h-4 text-yellow-500" />
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>

                <button
                  onClick={() => handleDownloadCsv(item.id)}
                  disabled={isDownloading}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloading ? 'Exporting...' : `Download ${item.id}.csv`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reports Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" /> Healthy Fleet Standard
          </div>
          <div className="text-2xl font-black text-slate-900">
            {tyres ? tyres.filter((t: any) => t.thi_status === 'HEALTHY').length : 0} Tyres
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tyres operating within optimal cold pressure and temperature bounds with minimal tread wear.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4" /> Action Required (Warning)
          </div>
          <div className="text-2xl font-black text-slate-900">
            {tyres ? tyres.filter((t: any) => t.thi_status === 'WARNING').length : 0} Tyres
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Moderate mis-inflation or tread wear &gt; 70%. Schedule rotation at next depot stop.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4" /> Critical Replacement
          </div>
          <div className="text-2xl font-black text-slate-900">
            {tyres ? tyres.filter((t: any) => t.thi_status === 'CRITICAL').length : 0} Tyres
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Severe under-inflation, thermal spike, or tread depth &le; 3.0 mm legal safety limit.
          </p>
        </div>
      </div>
    </div>
  );
};

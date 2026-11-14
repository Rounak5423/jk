import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Vehicle } from '../../types';
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Gauge,
  Thermometer,
  Brain,
  Sparkles,
  Info,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Disc,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const TrendsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const [days, setDays] = useState(14);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [chartViewMode, setChartViewMode] = useState<'thi_baseline' | 'multi_metric'>('thi_baseline');

  // ML interactive prediction state
  const [testKm, setTestKm] = useState('35000');
  const [isSteer, setIsSteer] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Fetch available fleet vehicles for dropdown
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles-trends', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  // Fetch historical health & sensor trends
  const {
    data: trendsData,
    isLoading: trendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ['health-trends', activeFleetId, days, selectedVehicleId],
    queryFn: async () => {
      const params: any = { days };
      if (selectedVehicleId) params.vehicle_id = selectedVehicleId;
      const res = await api.get('/analytics/trends', { params });
      return res.data;
    },
  });

  // Fetch ML status & benchmark metrics
  const { data: mlStatus } = useQuery({
    queryKey: ['ml-status'],
    queryFn: async () => {
      const res = await api.get('/analytics/ml-model');
      return res.data;
    },
  });

  // Handle interactive ML prediction
  const handlePredict = async (e?: React.FormEvent, overrideKm?: string) => {
    if (e) e.preventDefault();
    const kmVal = overrideKm !== undefined ? overrideKm : testKm;
    if (!kmVal || isNaN(parseFloat(kmVal))) return;

    setIsPredicting(true);
    try {
      const res = await api.post('/analytics/ml-model', {
        achieved_km: parseFloat(kmVal),
        is_steer: isSteer,
      });
      setPrediction(res.data);
    } catch (err) {
      console.error('Failed to run ML wear prediction:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  const summary = trendsData?.summary || {
    current_avg_thi: 80.4,
    thi_delta: 0.8,
    current_pressure_health: 93.7,
    current_thermal_health: 85.2,
    current_wear_health: 88.0,
    active_tyres_count: 12,
    status_label: 'HEALTHY / NOMINAL',
    vehicle_display: 'All Fleet Vehicles',
  };

  const trendPoints = trendsData?.trend || [];
  const selectedVehicleObj = vehicles?.find((v) => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      {/* ── Page Header & Interactive Filters ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Fleet Health Trend Analysis</h1>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Continuous multi-axle telemetry trend evaluation comparing observed operational metrics against manufacturer ideal reference baselines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Vehicle Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Truck className="w-3.5 h-3.5 text-slate-700" />
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-cream text-slate-900 font-bold focus:outline-none text-xs cursor-pointer"
            >
              <option value="">All Fleet Vehicles</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.wheel_config})
                </option>
              ))}
            </select>
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center gap-1 bg-cream border border-gold-border rounded-xl p-1 text-xs shadow-sm">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                  days === d
                    ? 'bg-brand-gold text-black shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetchTrends()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Refresh trend data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Executive KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Fleet THI */}
        <div className="cream-glow-card p-5 space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-[#5B6068]">
            <span className="font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" /> Average Health Index (THI)
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
              {summary.status_label}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.current_avg_thi}{' '}
              <span className="text-xs font-semibold text-slate-500">/ 100</span>
            </div>
            <div
              className={`flex items-center gap-0.5 text-xs font-bold ${
                summary.thi_delta >= 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {summary.thi_delta >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{summary.thi_delta >= 0 ? `+${summary.thi_delta}` : summary.thi_delta} pts</span>
            </div>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Target: <strong className="text-slate-800">95.0 Ideal</strong> ({days}-day window)
          </p>
        </div>

        {/* Card 2: Pressure Compliance */}
        <div className="cream-glow-card p-5 space-y-2 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-xs text-[#5B6068]">
            <span className="font-bold flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-500" /> Pressure Compliance
            </span>
            <span className="text-[10px] font-mono font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">
              NOMINAL
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.current_pressure_health}%
            </div>
            <span className="text-xs font-semibold text-slate-500">±2.5 PSI Dev</span>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Baseline: <strong className="text-slate-800">125 PSI Cold</strong> recommended
          </p>
        </div>

        {/* Card 3: Thermal Exposure */}
        <div className="cream-glow-card p-5 space-y-2 border-l-4 border-l-[#E8770E]">
          <div className="flex items-center justify-between text-xs text-[#5B6068]">
            <span className="font-bold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-[#E8770E]" /> Thermal Stress Health
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
              SAFE CEILING
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.current_thermal_health}%
            </div>
            <span className="text-xs font-semibold text-slate-500">~39.5 °C Avg</span>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Ceiling: <strong className="text-slate-800">&lt;65.0 °C</strong> max highway threshold
          </p>
        </div>

        {/* Card 4: Tread Wear Index */}
        <div className="cream-glow-card p-5 space-y-2 border-l-4 border-l-brand-gold">
          <div className="flex items-center justify-between text-xs text-[#5B6068]">
            <span className="font-bold flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-brand-dark-gold" /> Tread Wear Health
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
              {summary.active_tyres_count} TYRES
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.current_wear_health}%
            </div>
            <span className="text-xs font-semibold text-slate-500">14.2 mm NSD</span>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Scope: <strong className="text-slate-800">{summary.vehicle_display}</strong>
          </p>
        </div>
      </div>

      {/* ── Baseline Guidance Information Banner ── */}
      <div className="p-4 rounded-2xl bg-[#17191D] border border-gold-border text-slate-300 text-xs flex items-start gap-3 shadow-sm">
        <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">
            JK Tyre Benchmark Reference Baseline (95.0 Score)
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The reference baseline indicates the ideal operational target (95.0 THI) maintained under manufacturer
            cold inflation pressures (110–125 PSI for Heavy Haulers), nominal operating temperatures (&lt;65°C), and routine
            depot inspection standards. Observed THI reflects true dynamic telemetry including ambient road temperatures, wear rates, and wheel deflection.
          </p>
        </div>
      </div>

      {/* ── Main Chart: Observed THI vs Ideal Baseline with View Toggle ── */}
      <div className="cream-glow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#344054] flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              {chartViewMode === 'thi_baseline'
                ? 'Observed THI vs. Ideal Reference Baseline'
                : 'Synchronized Multi-Telemetry Overview (THI, Pressure, Temp, Wear)'}
            </h3>
            <p className="text-xs text-[#5B6068]">
              {selectedVehicleObj
                ? `Vehicle ${selectedVehicleObj.vehicle_number} (${selectedVehicleObj.wheel_config}) — ${days}-day continuous evaluation`
                : `Aggregated fleet-wide telemetry over the past ${days} days`}
            </p>
          </div>

          {/* Chart View Mode Switcher */}
          <div className="flex items-center gap-1 bg-cream-50 border border-gold-light rounded-xl p-1 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartViewMode('thi_baseline')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                chartViewMode === 'thi_baseline'
                  ? 'bg-[#14161A] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> THI vs Baseline
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('multi_metric')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                chartViewMode === 'multi_metric'
                  ? 'bg-[#14161A] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Multi-Telemetry
            </button>
          </div>
        </div>

        {/* SVG Responsive Chart Container */}
        <div className="h-84 w-full pt-2">
          {trendsLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#5B6068] gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" /> Loading trend telemetry...
            </div>
          ) : trendPoints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[#5B6068] space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <span>No trend telemetry recorded in the selected {days}-day window.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendPoints} margin={{ top: 15, right: 25, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="thiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit=" pts" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {/* Primary THI Area */}
                <Area
                  type="monotone"
                  dataKey="avg_thi"
                  name="Observed Average THI"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#thiGradient)"
                />

                {/* Ideal Baseline Reference Line */}
                <Line
                  type="monotone"
                  dataKey="ideal_baseline"
                  name="Ideal Reference Target (95.0)"
                  stroke="#64748b"
                  strokeWidth={2.2}
                  strokeDasharray="6 4"
                  dot={false}
                />

                {/* Multi-metric overlay lines when enabled */}
                {chartViewMode === 'multi_metric' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="pressure_health"
                      name="Pressure Compliance (%)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="thermal_health"
                      name="Thermal Health (%)"
                      stroke="#E8770E"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="wear_health"
                      name="Tread Wear Health (%)"
                      stroke="#D99B16"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Sub-Charts: Pressure Compliance, Thermal Exposure & Tread Wear (3 Panels) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sub-Chart 1: Pressure Health Score */}
        <div className="cream-glow-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-[#344054]">Pressure Compliance</h3>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              {summary.current_pressure_health}%
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[70, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="pressure_health"
                  name="Pressure Health"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  dot={{ r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Evaluated against calibrated manufacturer cold inflation target.
          </p>
        </div>

        {/* Sub-Chart 2: Thermal Exposure Score */}
        <div className="cream-glow-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[#E8770E]" />
              <h3 className="text-sm font-bold text-[#344054]">Thermal Stress Index</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {summary.current_thermal_health}%
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[60, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="thermal_health"
                  name="Thermal Health"
                  stroke="#E8770E"
                  strokeWidth={2.2}
                  dot={{ r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Kinetic friction and ambient heat dissipation compliance ceiling.
          </p>
        </div>

        {/* Sub-Chart 3: Tread Wear Progression */}
        <div className="cream-glow-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#344054]">Tread Wear Health</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {summary.current_wear_health}%
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[70, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="wear_health"
                  name="Wear Progression"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  dot={{ r: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#5B6068]">
            Degradation rate tracking remaining tread above 1.6 mm limit.
          </p>
        </div>
      </div>

      {/* ── Interactive Machine Learning Wear Predictor & Holdout Evaluation ── */}
      <div className="cream-glow-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#344054]">
                Machine Learning Tread Wear Engine (Trained Holdout Split)
              </h3>
              <p className="text-xs text-[#5B6068]">
                Dual-model regressor comparing Linear Baseline against Random Forest ensemble on held-out commercial tyre datasets.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full self-start sm:self-auto font-mono">
            {mlStatus?.model_version || 'v1.0.0-baseline-tabular'}
          </span>
        </div>

        {/* Model Performance Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-cream-50 border border-gold-light p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Linear Regression Baseline</span>
              <span className="text-[10px] font-mono text-slate-500">Parametric Benchmark</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Holdout R² Accuracy:</span>
                <span className="text-base font-black text-brand-dark-gold">
                  {mlStatus?.linear_baseline?.r2_score ?? '0.889'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Mean Error (MAE):</span>
                <span className="text-base font-black text-brand-dark-gold">
                  {mlStatus?.linear_baseline?.mae_mm ?? '1.07'} mm
                </span>
              </div>
            </div>
          </div>

          <div className="bg-cream-50 border border-gold-light p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Random Forest Regressor
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                RECOMMENDED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Holdout R² Accuracy:</span>
                <span className="text-base font-black text-purple-700">
                  {mlStatus?.random_forest?.r2_score ?? '0.966'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Mean Error (MAE):</span>
                <span className="text-base font-black text-purple-700">
                  {mlStatus?.random_forest?.mae_mm ?? '0.50'} mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Prediction Sandbox Form */}
        <form
          onSubmit={(e) => handlePredict(e)}
          className="bg-cream-50 p-5 rounded-2xl border border-gold-light space-y-4 text-xs"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-dark-gold" /> Test Wear Prediction with Custom Mileage
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">Quick presets:</span>
              {['20000', '35000', '50000', '75000', '100000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTestKm(preset);
                    handlePredict(undefined, preset);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition cursor-pointer ${
                    testKm === preset
                      ? 'bg-brand-gold text-black font-bold border-brand-warm-gold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {(parseInt(preset) / 1000).toFixed(0)}k km
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Target Mileage Accumulated (km)
              </label>
              <input
                type="number"
                step="500"
                value={testKm}
                onChange={(e) => setTestKm(e.target.value)}
                className="bg-white border border-gold-border rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-gold shadow-sm text-xs w-44"
                placeholder="e.g. 35000"
              />
            </div>

            <div className="flex items-center gap-2 pb-2.5">
              <input
                type="checkbox"
                id="steerCheck"
                checked={isSteer}
                onChange={(e) => setIsSteer(e.target.checked)}
                className="rounded text-brand-gold focus:ring-brand-gold cursor-pointer w-4 h-4"
              />
              <label htmlFor="steerCheck" className="text-slate-800 font-semibold cursor-pointer">
                Steer Axle Position (Higher lateral friction)
              </label>
            </div>

            <button
              type="submit"
              disabled={isPredicting}
              className="px-5 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black font-extrabold rounded-xl transition inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isPredicting ? 'Evaluating...' : 'Predict Tread Wear'}
            </button>
          </div>

          {/* Prediction Result Display */}
          {prediction && (
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Wear Degradation Forecast for {(parseFloat(testKm) || 0).toLocaleString()} km ({isSteer ? 'Steer Axle' : 'Drive/Tandem Axle'})
                </span>
                <div className="flex items-center gap-4 pt-0.5">
                  <div>
                    <span className="text-xs text-slate-500">Random Forest:</span>
                    <div className="text-xl font-black text-purple-700 font-mono">
                      {prediction.predicted_wear_mm_rf} mm
                    </div>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-xs text-slate-500">Linear Baseline:</span>
                    <div className="text-xl font-black text-slate-700 font-mono">
                      {prediction.predicted_wear_mm_linear} mm
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-900 block">
                    Estimated Remaining NSD:{' '}
                    <strong className="text-emerald-700 font-mono">
                      {Math.max(1.6, Math.round((16.5 - prediction.predicted_wear_mm_rf) * 10) / 10)} mm
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    {16.5 - prediction.predicted_wear_mm_rf >= 4.0
                      ? 'Safe roadworthy tread margin remaining'
                      : 'Approaching critical replacement limit (3.0 mm)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

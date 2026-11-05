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
import { TrendingUp, Activity, Gauge, Thermometer, Brain, Sparkles, Filter, Info, Truck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const TrendsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const [days, setDays] = useState(14);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [testKm, setTestKm] = useState('35000');
  const [isSteer, setIsSteer] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['fleet-vehicles-trends', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['health-trends', activeFleetId, days, selectedVehicleId],
    queryFn: async () => {
      const params: any = { days };
      if (selectedVehicleId) params.vehicle_id = selectedVehicleId;
      const res = await api.get('/analytics/trends', { params });
      return res.data;
    },
  });

  const { data: mlStatus } = useQuery({
    queryKey: ['ml-status'],
    queryFn: async () => {
      const res = await api.get('/analytics/ml-model');
      return res.data;
    },
  });



  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/analytics/ml-model', {
        achieved_km: parseFloat(testKm),
        is_steer: isSteer,
      });
      setPrediction(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Fleet Health Trend Analysis</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Continuous telemetry trend evaluation comparing observed operational metrics against manufacturer ideal reference baselines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Vehicle selector */}
          <div className="flex items-center gap-1.5 bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-xs">
            <Truck className="w-3.5 h-3.5 text-[#5B6068]" />
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-cream text-slate-900 focus:outline-none text-xs"
            >
              <option value="">All Fleet Vehicles</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>
          </div>

          {/* Time window */}
          <div className="flex items-center gap-1 bg-cream border border-gold-border rounded-xl p-1 text-xs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  days === d ? 'bg-brand-gold text-black font-bold shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Baseline Explanation Banner */}
      <div className="p-4 rounded-2xl bg-[#17191D] border border-gold-border text-slate-300 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">
            JK Tyre Benchmark Reference Baseline (95.0 Score)
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The reference baseline indicates the ideal operational target (95.0 THI) maintained under manufacturer
            cold inflation pressures (110 psi for Heavy Haulers, 65 psi for LCVs), nominal thermal ranges (&lt;65°C), and routine
            depot inspections. Observed THI reflects true dynamic telemetry including ambient road temperatures and tyre deflection.
          </p>
        </div>
      </div>

      {/* Main Chart: Observed THI vs Ideal Baseline */}
      <div className="cream-glow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-[#344054] flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Observed THI vs. Ideal Reference Baseline
            </h3>
            <p className="text-xs text-[#5B6068]">
              Unified 0–100 index scale plotting observed fleet health against the manufacturer operational standard.
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          {trendsLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#5B6068]">
              Loading trends...
            </div>
          ) : !trendsData?.trend || trendsData.trend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[#5B6068]">
              No trend telemetry recorded in the selected {days}-day window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendsData.trend} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="thiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit=" pts" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="avg_thi"
                  name="Observed Average THI"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#thiGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="ideal_baseline"
                  name="Ideal Reference Target (95.0)"
                  stroke="#64748b"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sub-Charts: Pressure Compliance & Thermal Exposure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pressure Health Score */}
        <div className="cream-glow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-[#5B6068]" />
            <h3 className="text-sm font-bold text-[#344054]">Pressure Compliance Sub-Score</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="pressure_health"
                  name="Pressure Health"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Thermal Exposure Score */}
        <div className="cream-glow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="w-4 h-4 text-[#5B6068]" />
            <h3 className="text-sm font-bold text-[#344054]">Thermal Exposure Sub-Score</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="thermal_health"
                  name="Thermal Health"
                  stroke="#E8770E"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Machine Learning Tabular Baseline Card */}
      <div className="cream-glow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#5B6068]" />
            <h3 className="text-sm font-bold text-[#344054]">Machine Learning Wear Baseline (Demonstration)</h3>
          </div>
          <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
            Held-Out Tabular Evaluation
          </span>
        </div>

        <p className="text-xs text-[#5B6068] leading-relaxed mb-6">
          Linear Regression baseline and Random Forest regressor evaluated on holdout splits to predict tread wear (mm)
          from accumulated distance and axle position. Results represent synthetic demonstration benchmarks.
        </p>

        {/* ML Metrics Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
          <div className="bg-cream-50 border border-gold-light p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-900 block mb-2">Linear Regression Baseline</span>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-[#5B6068]">
                <span>Holdout R² Score:</span>
                <span className="text-brand-gold font-bold">{mlStatus?.linear_baseline?.r2_score}</span>
              </div>
              <div className="flex justify-between text-[#5B6068]">
                <span>Mean Absolute Error (MAE):</span>
                <span className="text-brand-gold font-bold">{mlStatus?.linear_baseline?.mae_mm} mm</span>
              </div>
            </div>
          </div>

          <div className="bg-cream-50 border border-gold-light p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-900 block mb-2">Random Forest Regressor</span>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-[#5B6068]">
                <span>Holdout R² Score:</span>
                <span className="text-brand-gold font-bold">{mlStatus?.random_forest?.r2_score}</span>
              </div>
              <div className="flex justify-between text-[#5B6068]">
                <span>Mean Absolute Error (MAE):</span>
                <span className="text-brand-gold font-bold">{mlStatus?.random_forest?.mae_mm} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Model Test */}
        <form onSubmit={handlePredict} className="flex flex-wrap items-end gap-3 text-xs bg-cream-50 p-4 rounded-xl border border-gold-light">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Achieved Distance (km)</label>
            <input
              type="number"
              value={testKm}
              onChange={(e) => setTestKm(e.target.value)}
              className="bg-cream border border-gold-border rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-brand-gold"
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="steerCheck"
              checked={isSteer}
              onChange={(e) => setIsSteer(e.target.checked)}
              className="rounded bg-white border-slate-300"
            />
            <label htmlFor="steerCheck" className="text-slate-700">Steer Axle Position</label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-lg transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Predict Wear
          </button>

          {prediction && (
            <div className="ml-auto text-right font-mono">
              <span className="text-[11px] text-[#5B6068] block">Predicted Wear:</span>
              <span className="text-sm font-bold text-brand-gold">
                {prediction.predicted_wear_mm_rf} mm (RF) / {prediction.predicted_wear_mm_linear} mm (Linear)
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  MapPin,
  Truck,
  Building2,
  Navigation,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface MapVehicle {
  id: string;
  vehicle_number: string;
  fleet_id: string;
  fleet_name: string;
  latitude: number;
  longitude: number;
  location_name: string;
  location_source: string;
  location_freshness: 'CURRENT' | 'STALE' | 'SIMULATED' | 'UNAVAILABLE';
  wheel_config: string;
  vehicle_type: string;
  status: string;
  current_odometer: number;
  average_thi: number;
  active_alerts_count: number;
  location_updated_at: string | null;
  provenance: string;
}

interface MapFleet {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  status: string;
  vehicle_count: number;
  active_alerts_count: number;
  provenance: string;
}

interface MapData {
  metrics: {
    total_fleets: number;
    active_fleets: number;
    total_vehicles: number;
    mapped_vehicles: number;
    unmapped_vehicles: number;
    freshness_breakdown: {
      current: number;
      stale: number;
      simulated: number;
      unavailable: number;
    };
  };
  fleets: MapFleet[];
  vehicles: MapVehicle[];
  disclaimer: string;
}

export const AdminMapPage: React.FC = () => {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<MapVehicle | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<MapFleet | null>(null);
  const [freshnessFilter, setFreshnessFilter] = useState<string>('ALL');
  const [vehicleSearch, setVehicleSearch] = useState<string>('');

  const fetchMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/map-locations');
      setData(res.data);
      if (res.data.vehicles?.length > 0 && !selectedVehicle) {
        setSelectedVehicle(res.data.vehicles[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load platform map locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  // India bounding box coordinates for SVG projection
  // Lat: 8.0 to 36.0, Lng: 68.0 to 96.0
  const minLat = 8.0;
  const maxLat = 36.0;
  const minLng = 68.0;
  const maxLng = 96.0;

  const projectToSvg = (lat: number, lng: number, width = 600, height = 650) => {
    // Normalise
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x, y };
  };

  const filteredVehicles = data?.vehicles.filter((v) => {
    if (freshnessFilter !== 'ALL' && v.location_freshness !== freshnessFilter) return false;
    if (vehicleSearch.trim()) {
      const q = vehicleSearch.toLowerCase();
      return (
        v.vehicle_number.toLowerCase().includes(q) ||
        v.fleet_name.toLowerCase().includes(q) ||
        v.location_name.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'CURRENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Live &lt;12h</span>;
      case 'STALE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF4EB] text-[#E8770E] border border-[#FCD5B5]">Stale &gt;12h</span>;
      case 'SIMULATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Simulated</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Unavailable</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Usage & Telematics Map</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
              JK Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time geospatial fleet distribution and transit corridor telemetry across India.
          </p>
        </div>

        <button
          onClick={fetchMapData}
          disabled={loading}
          className="px-3.5 py-2 bg-cream border border-gold-border rounded-xl text-xs font-semibold text-white hover:bg-[#FFF9E8] flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Coordinates
        </button>
      </div>

      {/* Synthetic Provenance Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">Synthetic Geospatial Environment Disclaimer</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            All markers tagged as <strong className="font-bold">SIMULATED</strong> represent physically correlated
            geographic points along major Indian commercial freight corridors (NH44, NH48, Golden Quadrilateral)
            synthetically generated for platform evaluation and demonstration.
          </p>
        </div>
      </div>

      {/* Aggregate Platform Metrics */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="cream-glow-card p-4">
            <div className="text-[11px] font-semibold text-slate-300">Total Fleets</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.metrics.total_fleets}</div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">{data.metrics.active_fleets} Active</div>
          </div>

          <div className="cream-glow-card p-4">
            <div className="text-[11px] font-semibold text-slate-300">Total Vehicles</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.metrics.total_vehicles}</div>
            <div className="text-[10px] text-slate-300 font-medium mt-0.5">Commercial Units</div>
          </div>

          <div className="cream-glow-card p-4">
            <div className="text-[11px] font-semibold text-slate-300">Geolocated</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.metrics.mapped_vehicles}</div>
            <div className="text-[10px] text-blue-700 font-medium mt-0.5">Plot On Map</div>
          </div>

          <div className="cream-glow-card p-4">
            <div className="text-[11px] font-semibold text-slate-300">Simulated Telemetry</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.metrics.freshness_breakdown.simulated}</div>
            <div className="text-[10px] text-amber-700 font-medium mt-0.5">Synthetic Feeds</div>
          </div>

          <div className="cream-glow-card p-4">
            <div className="text-[11px] font-semibold text-slate-300">Unmapped Vehicles</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.metrics.unmapped_vehicles}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">GPS Offline / Depot</div>
          </div>
        </div>
      )}

      {/* Main Map + Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Visualizer (2 Cols) */}
        <div className="lg:col-span-2 bg-cream rounded-2xl border border-gold-border p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-graphite" />
              <h2 className="text-sm font-bold text-white">Indian Highway Transit Network</h2>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2">
              <select
                value={freshnessFilter}
                onChange={(e) => setFreshnessFilter(e.target.value)}
                className="bg-cream border border-gold-border rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
              >
                <option value="ALL">All Freshness</option>
                <option value="CURRENT">Live (&lt;12h)</option>
                <option value="SIMULATED">Simulated</option>
                <option value="STALE">Stale (&gt;12h)</option>
              </select>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full h-[520px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Visual Highway Grid Backdrop */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>

            <svg viewBox="0 0 600 650" className="w-full h-full max-h-[520px]">
              {/* Simplified India Outer Contour Outline */}
              <path
                d="M 280,30 L 320,60 L 360,90 L 380,120 L 440,160 L 450,210 L 410,230 L 380,260 L 390,320 L 360,390 L 320,470 L 290,560 L 280,590 L 270,560 L 220,440 L 190,360 L 160,300 L 140,250 L 150,200 L 190,170 L 220,130 L 250,70 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="1.5"
                className="opacity-70"
              />

              {/* Major Transit Corridor Corridors */}
              <line x1="280" y1="160" x2="200" y2="350" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
              <line x1="280" y1="160" x2="410" y2="280" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
              <line x1="200" y1="350" x2="280" y2="520" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
              <line x1="280" y1="520" x2="340" y2="480" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
              <line x1="340" y1="480" x2="410" y2="280" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />

              {/* Fleet Hub Markers */}
              {data?.fleets.map((fleet) => {
                const pt = projectToSvg(fleet.latitude, fleet.longitude);
                const isSelected = selectedFleet?.id === fleet.id;
                return (
                  <g
                    key={`fleet-${fleet.id}`}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => {
                      setSelectedFleet(fleet);
                      setSelectedVehicle(null);
                    }}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    <circle r={isSelected ? 10 : 7} fill="#D9232D" stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      y="-12"
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none drop-shadow"
                    >
                      {fleet.city}
                    </text>
                  </g>
                );
              })}

              {/* Vehicle Markers */}
              {filteredVehicles.map((veh) => {
                const pt = projectToSvg(veh.latitude, veh.longitude);
                const isSelected = selectedVehicle?.id === veh.id;
                const fillColor = veh.location_freshness === 'SIMULATED' ? '#F5C400' : '#10B981';

                return (
                  <g
                    key={`veh-${veh.id}`}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => {
                      setSelectedVehicle(veh);
                      setSelectedFleet(null);
                    }}
                    className="cursor-pointer transition-transform hover:scale-150"
                  >
                    <circle
                      r={isSelected ? 7 : 4.5}
                      fill={fillColor}
                      stroke="#111827"
                      strokeWidth="1.5"
                      className={isSelected ? 'animate-pulse' : ''}
                    />
                    {isSelected && (
                      <circle r="12" fill="none" stroke="#F5C400" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Map Legend (Floating in corner) */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 backdrop-blur space-y-1.5 shadow-lg">
              <div className="font-bold text-white text-[11px] mb-1">Map Legend</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white"></span>
                <span>Fleet Operating Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fleet"></span>
                <span>Commercial Vehicle (Simulated)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Commercial Vehicle (GPS Live)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Details Panel (1 Col) */}
        <div className="bg-cream rounded-2xl border border-gold-border p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-bordergray">
            <h3 className="text-sm font-bold text-white">Selected Marker Details</h3>
            <span className="text-[10px] font-semibold text-slate-300">
              {selectedVehicle ? 'Vehicle Entity' : selectedFleet ? 'Fleet Hub' : 'None Selected'}
            </span>
          </div>

          {selectedVehicle ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-fleet">{selectedVehicle.vehicle_number}</span>
                  {getFreshnessBadge(selectedVehicle.location_freshness)}
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedVehicle.fleet_name}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Current Location</span>
                  <span className="font-semibold text-white text-right">{selectedVehicle.location_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Coordinates</span>
                  <span className="font-mono font-medium text-white">
                    {selectedVehicle.latitude.toFixed(4)}°N, {selectedVehicle.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Wheel Configuration</span>
                  <span className="font-semibold text-white">{selectedVehicle.wheel_config}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Verified Odometer</span>
                  <span className="font-semibold text-white">{selectedVehicle.current_odometer.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Fleet Health (Avg THI)</span>
                  <span className="font-bold text-emerald-700">{selectedVehicle.average_thi}/100</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-secondary">Active Alerts</span>
                  <span
                    className={`font-bold ${
                      selectedVehicle.active_alerts_count > 0 ? 'text-amber-600' : 'text-slate-600'
                    }`}
                  >
                    {selectedVehicle.active_alerts_count} Active
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Provenance</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {selectedVehicle.provenance}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`/vehicles/${selectedVehicle.id}`}
                  className="w-full py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-center block transition shadow-sm"
                >
                  View Vehicle 3D &amp; Telemetry
                </a>
              </div>
            </div>
          ) : selectedFleet ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1">
                <h4 className="font-bold text-sm text-fleet">{selectedFleet.name}</h4>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{selectedFleet.city} Depot</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Operating Status</span>
                  <span className="font-bold text-emerald-700">{selectedFleet.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Vehicles Enrolled</span>
                  <span className="font-semibold text-white">{selectedFleet.vehicle_count}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Active Alerts</span>
                  <span className="font-semibold text-amber-700">{selectedFleet.active_alerts_count}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-bordergray/60">
                  <span className="text-slate-300">Hub Coordinates</span>
                  <span className="font-mono text-white">
                    {selectedFleet.latitude.toFixed(4)}°N, {selectedFleet.longitude.toFixed(4)}°E
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-300 text-xs">
              Click any vehicle dot or fleet hub pin on the map to inspect live telematics.
            </div>
          )}

          {/* Quick Vehicle Search List */}
          <div className="pt-4 border-t border-bordergray space-y-2">
            <span className="text-[11px] font-bold text-white block">Quick Vehicle Filter</span>
            <input
              type="text"
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Filter by plate number or fleet..."
              className="w-full bg-cream border border-gold-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-300 focus:outline-none focus:border-brand-gold focus:ring-brand-gold"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {filteredVehicles.slice(0, 10).map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicle(v);
                    setSelectedFleet(null);
                  }}
                  className={`p-2 rounded-lg text-[11px] cursor-pointer flex items-center justify-between border transition ${
                    selectedVehicle?.id === v.id
                      ? 'bg-brand-gold border-gold-border text-black font-bold'
                      : 'bg-cream border-gold-light hover:bg-[#FFF9E8] text-slate-300'
                  }`}
                >
                  <span className="font-mono">{v.vehicle_number}</span>
                  <span className="text-[10px] text-slate-500">{v.fleet_name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

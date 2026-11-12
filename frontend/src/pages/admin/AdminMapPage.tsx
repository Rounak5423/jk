import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import L from 'leaflet';
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
  Compass,
  Radio,
  Eye,
  Crosshair,
  Maximize2
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

// Major Indian freight highway transit routes (real coordinates)
const HIGHWAY_ROUTES: [number, number][][] = [
  // NH44: Srinagar - Delhi - Nagpur - Hyderabad - Bangalore - Kanyakumari
  [
    [34.0837, 74.7973],
    [32.7266, 74.8570],
    [30.9010, 75.8573],
    [28.6139, 77.2090], // Delhi
    [27.1767, 78.0081], // Agra
    [26.2183, 78.1828], // Gwalior
    [21.1458, 79.0882], // Nagpur
    [17.3850, 78.4867], // Hyderabad
    [15.8281, 78.0373], // Kurnool
    [12.9716, 77.5946], // Bangalore
    [11.6643, 78.1460], // Salem
    [9.9252, 78.1198],  // Madurai
    [8.0883, 77.5385]   // Kanyakumari
  ],
  // NH48: Delhi - Jaipur - Ahmedabad - Vadodara - Mumbai - Pune - Bangalore - Chennai
  [
    [28.6139, 77.2090], // Delhi
    [26.9124, 75.7873], // Jaipur
    [24.5854, 73.7125], // Udaipur
    [23.0225, 72.5714], // Ahmedabad
    [22.3072, 73.1812], // Vadodara
    [21.1702, 72.8311], // Surat
    [19.0760, 72.8777], // Mumbai
    [18.5204, 73.8567], // Pune
    [16.8524, 74.5815], // Sangli
    [15.8497, 74.4977], // Belagavi
    [12.9716, 77.5946], // Bangalore
    [12.9165, 79.1325], // Vellore
    [13.0827, 80.2707]  // Chennai
  ],
  // Golden Quadrilateral East: Delhi - Agra - Kanpur - Varanasi - Kolkata
  [
    [28.6139, 77.2090],
    [27.1767, 78.0081],
    [26.4499, 80.3319],
    [25.3176, 82.9739],
    [24.7955, 85.0002],
    [23.6102, 85.2799],
    [22.5726, 88.3639]  // Kolkata
  ],
  // East-West Corridor: Kolkata - Bhubaneswar - Visakhapatnam - Chennai
  [
    [22.5726, 88.3639],
    [20.2961, 85.8245],
    [17.6868, 83.2185],
    [16.5062, 80.6480],
    [13.0827, 80.2707]
  ]
];

export const AdminMapPage: React.FC = () => {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<MapVehicle | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<MapFleet | null>(null);
  const [freshnessFilter, setFreshnessFilter] = useState<string>('ALL');
  const [vehicleSearch, setVehicleSearch] = useState<string>('');
  const [mapTileType, setMapTileType] = useState<'DARK' | 'LIGHT' | 'SATELLITE'>('DARK');
  const [liveTracking, setLiveTracking] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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

  // Poll for real-time live telematics updates every 15 seconds if enabled
  useEffect(() => {
    if (!liveTracking) return;
    const interval = setInterval(() => {
      api.get('/admin/map-locations').then((res) => {
        setData(res.data);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [liveTracking]);

  // Initialise Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered on India with country-wide zoom
    const map = L.map(mapContainerRef.current, {
      center: [21.5, 78.9],
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer (CartoDB Dark Matter)
    const tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19
      }
    ).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layers groups for live markers & routes
    const routesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    routesGroupRef.current = routesGroup;
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Render static highway transit corridors
    HIGHWAY_ROUTES.forEach((route) => {
      L.polyline(route, {
        color: '#38bdf8',
        weight: 2,
        opacity: 0.45,
        dashArray: '5, 8'
      }).addTo(routesGroup);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch base map tiles (Dark Matter / Standard OSM / Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const urls = {
      DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      LIGHT: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    tileLayerRef.current.setUrl(urls[mapTileType]);
  }, [mapTileType]);

  // Update Markers whenever data, search, filter, or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !data) return;

    markersGroupRef.current.clearLayers();

    // 1. Plot Fleet Operating Hubs
    data.fleets.forEach((fleet) => {
      if (fleet.latitude == null || fleet.longitude == null) return;
      const isSelected = selectedFleet?.id === fleet.id;

      const fleetIcon = L.divIcon({
        className: 'custom-fleet-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              width: ${isSelected ? '28px' : '22px'};
              height: ${isSelected ? '28px' : '22px'};
              background: #D9232D;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 0 12px rgba(217, 35, 45, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 11px;
              font-weight: bold;
              transition: transform 0.2s;
              transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            ">
              🏢
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.85);
              color: #f8fafc;
              padding: 2px 6px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              margin-top: 2px;
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.15);
              pointer-events: none;
            ">
              ${fleet.city}
            </div>
          </div>
        `,
        iconSize: [80, 40],
        iconAnchor: [40, 16]
      });

      const marker = L.marker([fleet.latitude, fleet.longitude], { icon: fleetIcon });
      marker.on('click', () => {
        setSelectedFleet(fleet);
        setSelectedVehicle(null);
      });
      marker.addTo(markersGroupRef.current!);
    });

    // 2. Filter & Plot Vehicles
    const filtered = data.vehicles.filter((v) => {
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
    });

    filtered.forEach((veh) => {
      if (veh.latitude == null || veh.longitude == null) return;
      const isSelected = selectedVehicle?.id === veh.id;
      const isLive = veh.location_freshness === 'CURRENT';
      const color = isLive ? '#10B981' : '#F5C400';

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            ${isSelected ? `
              <div style="
                position: absolute;
                top: -6px;
                left: -6px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px dashed ${color};
                animation: spin 3s linear infinite;
              "></div>
            ` : ''}
            <div style="
              width: ${isSelected ? '24px' : '18px'};
              height: ${isSelected ? '24px' : '18px'};
              background: ${color};
              border: 2px solid #0f172a;
              border-radius: 50%;
              box-shadow: 0 0 10px ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              transition: transform 0.2s;
              transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
            ">
              🚛
            </div>
            ${isSelected ? `
              <div style="
                background: #0f172a;
                color: ${color};
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 9px;
                font-family: monospace;
                font-weight: 800;
                margin-top: 3px;
                white-space: nowrap;
                border: 1px solid ${color}88;
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
              ">
                ${veh.vehicle_number}
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [60, 36],
        iconAnchor: [30, 12]
      });

      const marker = L.marker([veh.latitude, veh.longitude], { icon: vehicleIcon });
      marker.on('click', () => {
        setSelectedVehicle(veh);
        setSelectedFleet(null);
      });
      marker.addTo(markersGroupRef.current!);
    });
  }, [data, selectedVehicle, selectedFleet, freshnessFilter, vehicleSearch]);

  // Center on marker when selected
  const flyToLocation = (lat: number, lng: number, zoom = 9) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Live GPS &lt;12h</span>;
      case 'STALE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">Stale &gt;12h</span>;
      case 'SIMULATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">Corridor Telemetry</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">Unavailable</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1850px] mx-auto space-y-6">
      {/* Page Title & Real-Time Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Real-Time Fleet Telematics Map</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              JK Admin Live
            </span>
            {liveTracking && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Feed (15s)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time geospatial fleet distribution, interactive OpenStreetMap tiles, and live transit corridors across India.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Live Tracking */}
          <button
            onClick={() => setLiveTracking(!liveTracking)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              liveTracking
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Auto-refresh vehicle GPS coordinates every 15 seconds"
          >
            <Radio className={`w-3.5 h-3.5 ${liveTracking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            {liveTracking ? 'Live Feed: ON' : 'Live Feed: OFF'}
          </button>

          {/* Reset Map View */}
          <button
            onClick={() => mapInstanceRef.current?.flyTo([21.5, 78.9], 5)}
            className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            title="Center view on all India freight routes"
          >
            <Compass className="w-3.5 h-3.5 text-brand-gold" /> Center India
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchMapData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white hover:bg-slate-800 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-gold' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Aggregate Platform Metrics */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="text-[11px] font-semibold text-slate-400">Total Fleets</div>
            <div className="text-2xl font-black text-white mt-1">{data.metrics.total_fleets}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">{data.metrics.active_fleets} Active Depots</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="text-[11px] font-semibold text-slate-400">Total Vehicles</div>
            <div className="text-2xl font-black text-white mt-1">{data.metrics.total_vehicles}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Commercial Units</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="text-[11px] font-semibold text-slate-400">Geolocated Live</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{data.metrics.mapped_vehicles}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">Plot On Live Map</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="text-[11px] font-semibold text-slate-400">Transit Corridors</div>
            <div className="text-2xl font-black text-sky-400 mt-1">4 Routes</div>
            <div className="text-[10px] text-sky-400 font-medium mt-0.5">NH44, NH48, GQ East/West</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="text-[11px] font-semibold text-slate-400">GPS Coverage</div>
            <div className="text-2xl font-black text-brand-gold mt-1">
              {data.metrics.total_vehicles > 0
                ? `${Math.round((data.metrics.mapped_vehicles / data.metrics.total_vehicles) * 100)}%`
                : '100%'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Active Telematics</div>
          </div>
        </div>
      )}

      {/* Main Real-Time Map + Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Visualizer (2 Cols) */}
        <div className="lg:col-span-2 bg-[#14161A] rounded-2xl border border-slate-800 p-5 shadow-2xl flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-gold" />
              <h2 className="text-sm font-bold text-white">Live OpenStreetMap Telematics Display</h2>
            </div>

            {/* Map Tile Layers & Freshness Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Map Theme Toggle */}
              <div className="flex items-center rounded-xl bg-slate-900 p-0.5 border border-slate-700 text-xs">
                {(['DARK', 'LIGHT', 'SATELLITE'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMapTileType(mode)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      mapTileType === mode
                        ? 'bg-brand-gold text-black shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'DARK' ? 'Dark' : mode === 'LIGHT' ? 'Street' : 'Satellite'}
                  </button>
                ))}
              </div>

              {/* Freshness Filter */}
              <select
                value={freshnessFilter}
                onChange={(e) => setFreshnessFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-gold"
              >
                <option value="ALL">All Freshness</option>
                <option value="CURRENT">Live GPS (&lt;12h)</option>
                <option value="SIMULATED">Simulated</option>
                <option value="STALE">Stale (&gt;12h)</option>
              </select>
            </div>
          </div>

          {/* Real-Time Leaflet Map Container */}
          <div className="relative w-full h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Overlay Badge & Legend */}
            <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 backdrop-blur space-y-2 shadow-2xl z-[1000] pointer-events-auto">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-brand-gold" />
                Live Freight Map
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 border border-white flex items-center justify-center text-[7px]">🏢</span>
                  <span className="text-slate-300">Fleet Depot / Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center text-[7px]">🚛</span>
                  <span className="text-slate-300">Live Vehicle (Active GPS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 border border-slate-950 flex items-center justify-center text-[7px]">🚛</span>
                  <span className="text-slate-300">Simulated Corridor Unit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-sky-400 border-dashed"></span>
                  <span className="text-slate-300">NH Transit Corridors</span>
                </div>
              </div>
            </div>

            {/* Bottom-right quick jump to selected vehicle */}
            {selectedVehicle && selectedVehicle.latitude != null && (
              <div className="absolute bottom-4 right-4 z-[1000]">
                <button
                  onClick={() => flyToLocation(selectedVehicle.latitude, selectedVehicle.longitude, 12)}
                  className="px-3 py-1.5 bg-brand-gold text-black text-xs font-bold rounded-xl shadow-lg hover:bg-brand-warm-gold transition flex items-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Center on {selectedVehicle.vehicle_number}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Details Panel (1 Col) */}
        <div className="bg-[#14161A] rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-gold" /> Marker Telematics
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">
              {selectedVehicle ? 'Vehicle Unit' : selectedFleet ? 'Fleet Hub' : 'Select a Pin'}
            </span>
          </div>

          {selectedVehicle ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-brand-gold">{selectedVehicle.vehicle_number}</span>
                  {getFreshnessBadge(selectedVehicle.location_freshness)}
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedVehicle.fleet_name}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Current Location</span>
                  <span className="font-semibold text-white text-right">{selectedVehicle.location_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">GPS Coordinates</span>
                  <span className="font-mono font-medium text-emerald-400">
                    {selectedVehicle.latitude.toFixed(4)}°N, {selectedVehicle.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Wheel Configuration</span>
                  <span className="font-semibold text-white">{selectedVehicle.wheel_config}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Verified Odometer</span>
                  <span className="font-semibold text-white">{selectedVehicle.current_odometer.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Tyre Health (Avg THI)</span>
                  <span className="font-bold text-emerald-400">{selectedVehicle.average_thi}/100</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Active Alerts</span>
                  <span
                    className={`font-bold ${
                      selectedVehicle.active_alerts_count > 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {selectedVehicle.active_alerts_count} Active
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Provenance</span>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {selectedVehicle.provenance}
                  </span>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => flyToLocation(selectedVehicle.latitude, selectedVehicle.longitude, 12)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition text-xs border border-slate-700"
                >
                  <Crosshair className="w-3.5 h-3.5 text-brand-gold" /> Focus GPS
                </button>
                <a
                  href={`/vehicles/${selectedVehicle.id}`}
                  className="py-2.5 bg-brand-gold hover:bg-brand-warm-gold text-black font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition text-xs shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> 3D View
                </a>
              </div>
            </div>
          ) : selectedFleet ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <h4 className="font-bold text-sm text-brand-gold">{selectedFleet.name}</h4>
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{selectedFleet.city} Regional Operating Depot</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Operating Status</span>
                  <span className="font-bold text-emerald-400">{selectedFleet.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Vehicles Enrolled</span>
                  <span className="font-semibold text-white">{selectedFleet.vehicle_count}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Active Alerts</span>
                  <span className="font-semibold text-amber-400">{selectedFleet.active_alerts_count}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Hub GPS Coordinates</span>
                  <span className="font-mono text-emerald-400">
                    {selectedFleet.latitude.toFixed(4)}°N, {selectedFleet.longitude.toFixed(4)}°E
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => flyToLocation(selectedFleet.latitude, selectedFleet.longitude, 11)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition text-xs border border-slate-700"
                >
                  <Crosshair className="w-3.5 h-3.5 text-brand-gold" /> Center on Depot
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Click any vehicle dot or fleet hub pin on the map to inspect live telematics.
            </div>
          )}

          {/* Quick Vehicle Search List */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-white block">Fleet Quick Telematics Selector</span>
            <input
              type="text"
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Search plate number or location..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicle(v);
                    setSelectedFleet(null);
                    if (v.latitude != null && v.longitude != null) {
                      flyToLocation(v.latitude, v.longitude, 10);
                    }
                  }}
                  className={`p-2.5 rounded-xl text-[11px] cursor-pointer flex items-center justify-between border transition ${
                    selectedVehicle?.id === v.id
                      ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-bold shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" />
                    <span className="font-mono">{v.vehicle_number}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{v.location_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapPage;

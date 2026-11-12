import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { Vehicle3DTwin, WheelPositionConfig, Vehicle, Tyre } from '../../types';
import { TruckGLB, isValidWheelConfiguration, resolveWheelPositionName } from './TruckGLB';
import { ProceduralCommercialVehicle } from './ProceduralCommercialVehicle';
import { TyreDetailsPanel } from './TyreDetailsPanel';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Box,
  Truck,
  Sparkles,
  Info
} from 'lucide-react';

interface Props {
  twinData?: Vehicle3DTwin | null;
  vehicle?: Vehicle | null;
  tyres?: Tyre[];
  onClose?: () => void;
  fullscreen?: boolean;
}

export const VehicleViewer3D: React.FC<Props> = ({
  twinData,
  vehicle,
  tyres = [],
  onClose,
  fullscreen = false
}) => {
  // 3D Controls State
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [showTyres, setShowTyres] = useState(true);
  const [useGlbModel, setUseGlbModel] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<WheelPositionConfig | null>(null);

  const controlsRef = useRef<OrbitControlsType>(null);

  // Derive vehicle details
  const vehicleNumber = twinData?.vehicle_number ?? vehicle?.vehicle_number ?? 'VEHICLE';
  const wheelConfig = twinData?.wheel_config ?? vehicle?.wheel_config ?? '10-Wheeler';
  const baselinePressure = twinData?.baseline_pressure ?? vehicle?.baseline_pressure ?? 110.0;
  const axleCount = twinData?.axle_count ?? vehicle?.axle_count ?? 3;

  // Derive wheel count (strictly commercial heavy multi-axle trucks: 10, 12, 14, 16)
  const wheelCount = useMemo(() => {
    if (twinData?.wheels && twinData.wheels.length >= 10) {
      return twinData.wheels.length;
    }
    if ((vehicle as any)?.wheel_count && Number((vehicle as any).wheel_count) >= 10) {
      return Number((vehicle as any).wheel_count);
    }
    if (vehicle?.expected_tyre_count && vehicle.expected_tyre_count >= 10) {
      return vehicle.expected_tyre_count;
    }
    if (vehicle?.layout?.total_wheels && vehicle.layout.total_wheels >= 10) {
      return vehicle.layout.total_wheels;
    }
    if (wheelConfig.includes('16')) return 16;
    if (wheelConfig.includes('14')) return 14;
    if (wheelConfig.includes('12')) return 12;
    return 10;
  }, [twinData, vehicle, wheelConfig]);

  // Combined tyres data for GLB mapping
  const tyresData = useMemo(() => {
    if (twinData?.wheels && twinData.wheels.length > 0) {
      return twinData.wheels;
    }
    if (tyres && tyres.length > 0) {
      return tyres;
    }
    if (vehicle?.fitments && vehicle.fitments.length > 0) {
      return vehicle.fitments;
    }
    return [];
  }, [twinData, tyres, vehicle]);

  // Wheel configuration validation & axle breakdown
  const isConfigValid = useMemo(() => {
    return isValidWheelConfiguration(axleCount, wheelCount);
  }, [axleCount, wheelCount]);

  const axleBreakdown = useMemo(() => {
    const rearAxles = Math.max(1, Math.round((wheelCount - 2 * axleCount) / 2));
    const frontAxles = Math.max(1, axleCount - rearAxles);
    return { frontAxles, rearAxles };
  }, [axleCount, wheelCount]);

  // Count of fitted tyres
  const fittedTyresCount = useMemo(() => {
    if (twinData?.wheels && twinData.wheels.length > 0) {
      return twinData.wheels.filter(
        (w) => w.tyre && (w.tyre.tyre_id || w.tyre.serial_number || w.tyre.current_thi != null)
      ).length;
    }
    if (vehicle?.fitments) {
      return vehicle.fitments.filter((f: any) => !f.removed_at).length;
    }
    return null;
  }, [twinData, vehicle]);

  // Check if truck has any expired/critical tyres (THI < 60 or thi_status === 'CRITICAL' / 'EXP')
  const hasExpiredTyres = useMemo(() => {
    // 1. Check vehicle overall status if provided
    if ((vehicle as any)?.worst_thi_status === 'CRITICAL') return true;

    // 2. Check tyresData (twinData.wheels, tyres prop, or vehicle.fitments)
    return tyresData.some((item: any) => {
      const tyreObj = item?.tyre ?? item;
      if (!tyreObj) return false;

      // Check status string (CRITICAL, EXP, EXPIRED, SCRAP)
      const st = (tyreObj.thi_status || tyreObj.status || item.status || '')
        .toString()
        .toUpperCase();
      if (st === 'CRITICAL' || st === 'EXP' || st === 'EXPIRED' || st === 'SCRAP' || st === 'SCRAPPED') {
        return true;
      }

      // Check numerical THI (< 60 is Critical/Expired)
      const thiVal =
        tyreObj.thi != null
          ? Number(tyreObj.thi)
          : tyreObj.current_thi != null
          ? Number(tyreObj.current_thi)
          : null;
      if (thiVal != null && thiVal > 0 && thiVal < 60) {
        return true;
      }

      return false;
    });
  }, [vehicle, tyresData]);

  // Set initial selected tyre - prioritize the first wheel that actually has a fitted tyre
  React.useEffect(() => {
    if (!selectedWheel && twinData?.wheels && twinData.wheels.length > 0) {
      const firstFitted = twinData.wheels.find(
        (w) => w.tyre && (w.tyre.tyre_id || w.tyre.serial_number || w.tyre.current_thi != null)
      );
      const defaultWheel = firstFitted || twinData.wheels[0];
      setSelectedWheel(defaultWheel);
      setSelectedPosition(defaultWheel.wheel_position);
    }
  }, [twinData]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.95, 0);
      controlsRef.current.reset();
    }
  };

  const handleTyreClick = (clickData: any) => {
    setSelectedPosition(clickData.position);

    // If raw is already a WheelPositionConfig, use it
    if (clickData.raw && clickData.raw.wheel_position && clickData.raw.tyre !== undefined) {
      setSelectedWheel(clickData.raw);
      return;
    }

    // Otherwise, match against twinData wheels
    if (twinData?.wheels) {
      const match = twinData.wheels.find(
        (w) =>
          w.wheel_position === clickData.position ||
          resolveWheelPositionName(w.wheel_position) === resolveWheelPositionName(clickData.position)
      );
      if (match) {
        setSelectedWheel(match);
        return;
      }
    }

    // Build synthetic WheelPositionConfig for panel
    const thiVal = Number(clickData.thi || 0);
    const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' =
      thiVal >= 80 ? 'HEALTHY' : thiVal >= 60 ? 'WARNING' : 'CRITICAL';

    setSelectedWheel({
      axle_index: clickData.position?.startsWith('F') ? 1 : 2,
      axle_type: clickData.position?.startsWith('F') ? 'STEER' : 'DRIVE',
      wheel_position: clickData.position,
      x_offset: 0,
      is_dual: clickData.position?.includes('LO') || clickData.position?.includes('LI') || clickData.position?.includes('RI') || clickData.position?.includes('RO'),
      is_left: clickData.position?.includes('L'),
      is_inner: clickData.position?.includes('I'),
      health_color: status === 'HEALTHY' ? '#10b981' : status === 'WARNING' ? '#f97316' : status === 'CRITICAL' ? '#ef4444' : '#9ca3af',
      status,
      tyre: {
        tyre_id: clickData.raw?.id || `TYRE-${clickData.position}`,
        serial_number: clickData.stencil || 'N/A',
        model: clickData.raw?.model || 'JK Tyre Jetsteel JDH',
        size: clickData.raw?.size || '295/80 R22.5',
        current_thi: thiVal,
        thi_status: status,
        current_nsd: clickData.nsd || 14.5,
        blueprint_nsd: 16.0,
        pressure_psi: clickData.pressure,
        temperature_c: clickData.temperature,
        total_km_run: clickData.raw?.total_km_run || 32000,
        explanation: thiVal < 60 ? 'Severe thermal/pressure deviation detected on this position.' : 'Operating safely within standard limits.'
      }
    });
  };

  return (
    <div
      className={`relative w-full ${
        fullscreen ? 'h-[calc(100vh-140px)] min-h-[700px]' : 'h-[740px]'
      } rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col bg-[#0a0d14]`}
    >
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-400px)]">
        {/* Auto-rotation play/pause button */}
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            isAutoRotating
              ? 'bg-[#14161A] text-white border-slate-700'
              : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
          title={isAutoRotating ? 'Pause 360° Auto-Rotation' : 'Play 360° Auto-Rotation'}
        >
          {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isAutoRotating ? 'Pause 360°' : '360° Auto'}
        </button>

        {/* Exploded Axles View toggle */}
        <button
          onClick={() => setIsExploded(!isExploded)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            isExploded
              ? 'bg-[#14161A] text-white border-yellow-400/60 shadow-yellow-400/20'
              : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
          title={isExploded ? 'Collapse Axles to Standard Stance' : 'Explode Axles Outward for Clear Inspection'}
        >
          <Layers className="w-3.5 h-3.5" />
          {isExploded ? 'Collapse Axles' : 'Explode Axles'}
        </button>

        {/* Show/Hide Tyres toggle */}
        <button
          onClick={() => setShowTyres(!showTyres)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            showTyres
              ? 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
          }`}
          title="Toggle visibility of generated 3D wheels"
        >
          {showTyres ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showTyres ? 'Hide Tyres' : 'Show Tyres'}
        </button>

        {/* Reset Camera button */}
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 text-slate-200 border border-slate-700 hover:bg-slate-800 backdrop-blur-md transition shadow-lg"
          title="Reset Camera View to Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset View
        </button>

        {/* Model Switcher (Realistic GLB vs Procedural Twin) */}
        <button
          onClick={() => setUseGlbModel(!useGlbModel)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            useGlbModel
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}
          title="Switch between Realistic 3D Commercial GLB model and Procedural Twin"
        >
          {useGlbModel ? <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> : <Box className="w-3.5 h-3.5 text-slate-400" />}
          {useGlbModel ? 'GLB Commercial Twin' : 'Procedural Twin'}
        </button>

        {/* Vehicle Axle & Wheel Configuration Badge */}
        <div className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900/85 border border-slate-700 text-slate-300 backdrop-blur-md flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-[#5B6068]" />
          <span className="font-bold text-white">{vehicleNumber}</span>
          <span className="text-slate-400">
            • {wheelConfig} ({axleCount} Axles / {wheelCount} Wheels: {axleBreakdown.frontAxles} Front Steer + {axleBreakdown.rearAxles} Rear Dual
            {fittedTyresCount != null && fittedTyresCount < wheelCount
              ? ` • ${fittedTyresCount}/${wheelCount} Fitted`
              : ''}
            )
          </span>
        </div>
      </div>

      {/* Invalid Axle Configuration Notice */}
      {!isConfigValid && (
        <div className="absolute top-16 left-4 z-20 bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs px-3.5 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-lg">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Special wheel/axle arrangement ({axleCount} Axles, {wheelCount} Wheels). Rendering optimized multi-axle placement.
          </span>
        </div>
      )}

      {/* Main Three.js Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-[#070b0e]">
        <Canvas
          shadows
          camera={{
            position: [8, 5, 10],
            fov: 45
          }}
        >
          <PerspectiveCamera makeDefault position={[8, 5, 10]} fov={45} />
          <color attach="background" args={['#070b0e']} />

          {/* Lighting */}
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 15, 10]} intensity={2.4} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <directionalLight position={[-10, 8, -8]} intensity={1.0} />
          <directionalLight position={[0, -5, 0]} intensity={0.4} />

          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            autoRotate={isAutoRotating}
            autoRotateSpeed={1.5}
            enableDamping
            dampingFactor={0.05}
            minDistance={4}
            maxDistance={25}
            target={[0, 0.95, 0]}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />

          {/* 3D Vehicle Models with Suspense */}
          <Suspense
            fallback={
              <ProceduralCommercialVehicle
                wheels={twinData?.wheels || []}
                selectedPosition={selectedPosition}
                onSelectWheel={(w) => handleTyreClick(w)}
                vehicleType={twinData?.vehicle_type || 'HEAVY_TRUCK'}
                hasExpiredTyres={hasExpiredTyres}
              />
            }
          >
            {useGlbModel ? (
              <TruckGLB
                explode={isExploded}
                tyresData={tyresData}
                axleCount={axleCount}
                wheelCount={wheelCount}
                selectedPosition={selectedPosition}
                onTyreClick={handleTyreClick}
                showGeneratedTyres={showTyres}
                hasExpiredTyres={hasExpiredTyres}
              />
            ) : (
              <ProceduralCommercialVehicle
                wheels={twinData?.wheels || []}
                selectedPosition={selectedPosition}
                onSelectWheel={(w) => handleTyreClick(w)}
                vehicleType={twinData?.vehicle_type || 'HEAVY_TRUCK'}
                hasExpiredTyres={hasExpiredTyres}
              />
            )}
          </Suspense>

          {/* Ground Grid / Shadow Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[45, 45]} />
            <meshStandardMaterial color="#080c10" roughness={0.8} metalness={0.2} />
          </mesh>
          <gridHelper args={[45, 45, '#1e293b', '#0f172a']} position={[0, 0, 0]} />
        </Canvas>

        {/* Right-Side Tyre Details Flyout Panel */}
        <TyreDetailsPanel
          selectedWheel={selectedWheel}
          vehicleNumber={vehicleNumber}
          baselinePressure={baselinePressure}
          onClose={() => {
            setSelectedWheel(null);
            setSelectedPosition(null);
          }}
        />

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-4 text-xs text-slate-300">
          <span className="font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Tyre Health:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-400 font-medium">Healthy (≥80)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="text-orange-400 font-medium">Warning (60–79)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-red-400 font-medium">Critical (&lt;60)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-slate-400 font-medium">Neutral / Offline</span>
          </div>
        </div>

        {/* Interactive Hint */}
        <div className="absolute bottom-4 right-1/2 translate-x-1/2 z-10 pointer-events-none text-slate-400/80 text-xs bg-slate-950/75 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur-md shadow-lg">
          Click any coloured tyre to inspect live telemetry & diagnostics • Drag to rotate 360°
        </div>
      </div>
    </div>
  );
};

export default VehicleViewer3D;


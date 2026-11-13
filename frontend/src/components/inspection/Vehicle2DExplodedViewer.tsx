import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Disc,
  Wrench,
  RotateCcw,
  Volume2,
  VolumeX,
  Rocket,
  Sparkles,
  Gauge,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { inspectionAudio } from '../../utils/inspectionAudio';

export interface PositionData {
  fitment_id: string;
  wheel_position: string;
  axle_number: number;
  is_dual: boolean;
  is_inner: boolean;
  fitted_at: string | null;
  fitted_odometer: number;
  fitted_nsd: number;
  tyre: {
    id: string;
    serial_number: string;
    model: string;
    size: string;
    blueprint_nsd: number;
    current_nsd: number;
    current_thi: number;
    thi_status: string;
    total_km_run: number;
    lifecycle_type?: string;
    status?: string;
  } | null;
  latest_inspection: any | null;
  has_inspection_data: boolean;
}

export interface VehicleSummaryInfo {
  id: string;
  vehicle_number: string;
  wheel_config: string;
  make?: string;
  model?: string;
  current_odometer: number;
  baseline_pressure: number;
}

interface Props {
  vehicle: VehicleSummaryInfo;
  positions: PositionData[];
  inspectedTyreIds: Set<string>;
  selectedPosition: PositionData | null;
  onSelectPosition: (pos: PositionData) => void;
  onQuickFit?: (posCode: string, axle: number) => void;
  isComplete?: boolean;
  onLaunchCompleted?: () => void;
  resetTrigger?: number;
  onCloseInspection?: () => void;
}

interface AxleSpec {
  axleNum: number;
  x: number;
  isDual: boolean;
  isCab: boolean;
  label: string;
  positions: {
    side: 'TOP_OUTER' | 'TOP_INNER' | 'TOP_SINGLE' | 'BOTTOM_SINGLE' | 'BOTTOM_INNER' | 'BOTTOM_OUTER';
    defaultCode: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

type LaunchStage = 'DEPOT' | 'IGNITION' | 'LAUNCHING' | 'CRUISING';

export const Vehicle2DExplodedViewer: React.FC<Props> = ({
  vehicle,
  positions,
  inspectedTyreIds,
  selectedPosition,
  onSelectPosition,
  onQuickFit,
  isComplete: parentIsComplete,
  onLaunchCompleted,
  resetTrigger,
  onCloseInspection,
}) => {
  const [hoveredPos, setHoveredPos] = useState<PositionData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Sound state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Demo simulation state (allows testing road building & launch anytime!)
  const [demoInspectedIds, setDemoInspectedIds] = useState<Set<string>>(new Set());
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simTimeoutRef = useRef<number[]>([]);

  // Launch animation state
  const [launchStage, setLaunchStage] = useState<LaunchStage>('DEPOT');
  const [vehicleTranslateX, setVehicleTranslateX] = useState<number>(0);
  const launchTimerRef = useRef<number[]>([]);

  // Sound sync
  useEffect(() => {
    inspectionAudio.enabled = soundOn;
  }, [soundOn]);

  // Merge external and demo inspected IDs
  const effectiveInspectedIds = useMemo(() => {
    const merged = new Set<string>(inspectedTyreIds);
    demoInspectedIds.forEach((id) => merged.add(id));
    return merged;
  }, [inspectedTyreIds, demoInspectedIds]);

  const wheelConfig = vehicle.wheel_config || '10-Wheeler';
  const is12Wheeler = wheelConfig.includes('12');
  const is14Wheeler = wheelConfig.includes('14');
  const is16Wheeler = wheelConfig.includes('16');

  // Total wheels & axles determination
  let totalAxles = 3;
  let totalExpectedWheels = 10;
  if (is12Wheeler) {
    totalAxles = 4;
    totalExpectedWheels = 12;
  } else if (is14Wheeler) {
    totalAxles = 5;
    totalExpectedWheels = 14;
  } else if (is16Wheeler) {
    totalAxles = 5;
    totalExpectedWheels = 16;
  }

  // Define axle geometry corresponding to top-down view (front/cab on right, rear on left)
  const axles: AxleSpec[] = useMemo(() => {
    const tyreW = 54;
    const singleH = 22;
    const dualH = 18;

    if (is12Wheeler) {
      return [
        {
          axleNum: 1,
          x: 775,
          isDual: false,
          isCab: true,
          label: 'A1',
          positions: [
            { side: 'TOP_SINGLE', defaultCode: 'A1-L', x: 775 - tyreW / 2, y: 50, width: tyreW, height: singleH },
            { side: 'BOTTOM_SINGLE', defaultCode: 'A1-R', x: 775 - tyreW / 2, y: 288, width: tyreW, height: singleH },
          ],
        },
        {
          axleNum: 2,
          x: 645,
          isDual: false,
          isCab: false,
          label: 'A2',
          positions: [
            { side: 'TOP_SINGLE', defaultCode: 'A2-L', x: 645 - tyreW / 2, y: 50, width: tyreW, height: singleH },
            { side: 'BOTTOM_SINGLE', defaultCode: 'A2-R', x: 645 - tyreW / 2, y: 288, width: tyreW, height: singleH },
          ],
        },
        {
          axleNum: 3,
          x: 310,
          isDual: true,
          isCab: false,
          label: 'A3',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A3-LO', x: 310 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A3-LI', x: 310 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A3-RI', x: 310 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A3-RO', x: 310 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
        {
          axleNum: 4,
          x: 205,
          isDual: true,
          isCab: false,
          label: 'A4',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A4-LO', x: 205 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A4-LI', x: 205 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A4-RI', x: 205 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A4-RO', x: 205 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
      ];
    } else if (is14Wheeler || is16Wheeler) {
      return [
        {
          axleNum: 1,
          x: 775,
          isDual: false,
          isCab: true,
          label: 'A1',
          positions: [
            { side: 'TOP_SINGLE', defaultCode: 'A1-L', x: 775 - tyreW / 2, y: 50, width: tyreW, height: singleH },
            { side: 'BOTTOM_SINGLE', defaultCode: 'A1-R', x: 775 - tyreW / 2, y: 288, width: tyreW, height: singleH },
          ],
        },
        {
          axleNum: 2,
          x: 660,
          isDual: false,
          isCab: false,
          label: 'A2',
          positions: [
            { side: 'TOP_SINGLE', defaultCode: 'A2-L', x: 660 - tyreW / 2, y: 50, width: tyreW, height: singleH },
            { side: 'BOTTOM_SINGLE', defaultCode: 'A2-R', x: 660 - tyreW / 2, y: 288, width: tyreW, height: singleH },
          ],
        },
        {
          axleNum: 3,
          x: 540,
          isDual: is16Wheeler,
          isCab: false,
          label: 'A3',
          positions: is16Wheeler
            ? [
                { side: 'TOP_OUTER', defaultCode: 'A3-LO', x: 540 - tyreW / 2, y: 26, width: tyreW, height: dualH },
                { side: 'TOP_INNER', defaultCode: 'A3-LI', x: 540 - tyreW / 2, y: 52, width: tyreW, height: dualH },
                { side: 'BOTTOM_INNER', defaultCode: 'A3-RI', x: 540 - tyreW / 2, y: 284, width: tyreW, height: dualH },
                { side: 'BOTTOM_OUTER', defaultCode: 'A3-RO', x: 540 - tyreW / 2, y: 310, width: tyreW, height: dualH },
              ]
            : [
                { side: 'TOP_SINGLE', defaultCode: 'A3-L', x: 540 - tyreW / 2, y: 50, width: tyreW, height: singleH },
                { side: 'BOTTOM_SINGLE', defaultCode: 'A3-R', x: 540 - tyreW / 2, y: 288, width: tyreW, height: singleH },
              ],
        },
        {
          axleNum: 4,
          x: 280,
          isDual: true,
          isCab: false,
          label: 'A4',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A4-LO', x: 280 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A4-LI', x: 280 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A4-RI', x: 280 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A4-RO', x: 280 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
        {
          axleNum: 5,
          x: 180,
          isDual: true,
          isCab: false,
          label: 'A5',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A5-LO', x: 180 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A5-LI', x: 180 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A5-RI', x: 180 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A5-RO', x: 180 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
      ];
    } else {
      // Standard 10-Wheeler
      return [
        {
          axleNum: 1,
          x: 775,
          isDual: false,
          isCab: true,
          label: 'A1',
          positions: [
            { side: 'TOP_SINGLE', defaultCode: 'A1-L', x: 775 - tyreW / 2, y: 50, width: tyreW, height: singleH },
            { side: 'BOTTOM_SINGLE', defaultCode: 'A1-R', x: 775 - tyreW / 2, y: 288, width: tyreW, height: singleH },
          ],
        },
        {
          axleNum: 2,
          x: 290,
          isDual: true,
          isCab: false,
          label: 'A2',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A2-LO', x: 290 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A2-LI', x: 290 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A2-RI', x: 290 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A2-RO', x: 290 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
        {
          axleNum: 3,
          x: 185,
          isDual: true,
          isCab: false,
          label: 'A3',
          positions: [
            { side: 'TOP_OUTER', defaultCode: 'A3-LO', x: 185 - tyreW / 2, y: 26, width: tyreW, height: dualH },
            { side: 'TOP_INNER', defaultCode: 'A3-LI', x: 185 - tyreW / 2, y: 52, width: tyreW, height: dualH },
            { side: 'BOTTOM_INNER', defaultCode: 'A3-RI', x: 185 - tyreW / 2, y: 284, width: tyreW, height: dualH },
            { side: 'BOTTOM_OUTER', defaultCode: 'A3-RO', x: 185 - tyreW / 2, y: 310, width: tyreW, height: dualH },
          ],
        },
      ];
    }
  }, [is12Wheeler, is14Wheeler, is16Wheeler]);

  // Map database wheel position to diagram slot (handles '1R', 'A1-R', '3RO', 'A3-LO', 'R1_LO', etc.)
  const findPositionData = (defaultCode: string, axleNum: number, side: string): PositionData | null => {
    // 1. Direct exact match
    let match = positions.find((p) => p.wheel_position.toUpperCase() === defaultCode.toUpperCase());
    if (match) return match;

    const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const defNorm = clean(defaultCode); // e.g. "A3RO", "A1R"
    const defNoA = defNorm.startsWith('A') ? defNorm.slice(1) : defNorm; // e.g. "3RO", "1R"

    // 2. Normalized alphanumeric match (ignores hyphens, underscores, spaces, and 'A' prefix)
    match = positions.find((p) => {
      const pNorm = clean(p.wheel_position);
      const pNoA = pNorm.startsWith('A') ? pNorm.slice(1) : pNorm;
      return (
        pNorm === defNorm ||
        pNoA === defNoA ||
        pNorm === defNoA ||
        pNoA === defNorm
      );
    });
    if (match) return match;

    // 3. Axle number + side / dual / inner match (if DB has axle_number)
    match = positions.find((p) => {
      if (p.axle_number && p.axle_number === axleNum) {
        const pNorm = clean(p.wheel_position);
        if (side === 'TOP_SINGLE' && !p.is_dual && (pNorm.includes('L') && !pNorm.includes('R'))) return true;
        if (side === 'BOTTOM_SINGLE' && !p.is_dual && (pNorm.includes('R') && !pNorm.includes('L'))) return true;
        if (side === 'TOP_OUTER' && p.is_dual && !p.is_inner && (pNorm.includes('LO') || pNorm.includes('L'))) return true;
        if (side === 'TOP_INNER' && p.is_dual && p.is_inner && (pNorm.includes('LI') || pNorm.includes('L'))) return true;
        if (side === 'BOTTOM_INNER' && p.is_dual && p.is_inner && (pNorm.includes('RI') || pNorm.includes('R'))) return true;
        if (side === 'BOTTOM_OUTER' && p.is_dual && !p.is_inner && (pNorm.includes('RO') || pNorm.includes('R'))) return true;
      }
      return false;
    });
    if (match) return match;

    // 4. Legacy naming aliases (FL, FR, FL2, FR2, R1_LO, R2_LO, etc.)
    match = positions.find((p) => {
      const code = clean(p.wheel_position);
      if (axleNum === 1) {
        if (side === 'TOP_SINGLE' && (code === 'FL' || code === '1L' || code === 'A1L' || code === 'FL1')) return true;
        if (side === 'BOTTOM_SINGLE' && (code === 'FR' || code === '1R' || code === 'A1R' || code === 'FR1')) return true;
      } else if (axleNum === 2) {
        if (is12Wheeler || is14Wheeler || is16Wheeler) {
          if (side === 'TOP_SINGLE' && (code === 'FL2' || code === '2L' || code === 'A2L')) return true;
          if (side === 'BOTTOM_SINGLE' && (code === 'FR2' || code === '2R' || code === 'A2R')) return true;
        } else {
          // 10-wheeler axle 2 is drive R1
          if (side === 'TOP_OUTER' && (code === 'R1LO' || code === '2LO' || code === 'R1L')) return true;
          if (side === 'TOP_INNER' && (code === 'R1LI' || code === '2LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R1RI' || code === '2RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R1RO' || code === '2RO' || code === 'R1R')) return true;
        }
      } else if (axleNum === 3) {
        if (is14Wheeler) {
          if (side === 'TOP_SINGLE' && (code === 'FL3' || code === '3L' || code === 'A3L')) return true;
          if (side === 'BOTTOM_SINGLE' && (code === 'FR3' || code === '3R' || code === 'A3R')) return true;
        } else if (is12Wheeler || is16Wheeler) {
          if (side === 'TOP_OUTER' && (code === 'R1LO' || code === '3LO' || code === 'R1L')) return true;
          if (side === 'TOP_INNER' && (code === 'R1LI' || code === '3LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R1RI' || code === '3RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R1RO' || code === '3RO' || code === 'R1R')) return true;
        } else {
          // 10-wheeler axle 3 is drive R2
          if (side === 'TOP_OUTER' && (code === 'R2LO' || code === '3LO' || code === 'R2L')) return true;
          if (side === 'TOP_INNER' && (code === 'R2LI' || code === '3LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R2RI' || code === '3RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R2RO' || code === '3RO' || code === 'R2R')) return true;
        }
      } else if (axleNum === 4) {
        if (is14Wheeler) {
          if (side === 'TOP_OUTER' && (code === 'R1LO' || code === '4LO' || code === 'R1L')) return true;
          if (side === 'TOP_INNER' && (code === 'R1LI' || code === '4LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R1RI' || code === '4RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R1RO' || code === '4RO' || code === 'R1R')) return true;
        } else if (is12Wheeler || is16Wheeler) {
          if (side === 'TOP_OUTER' && (code === 'R2LO' || code === '4LO' || code === 'R2L')) return true;
          if (side === 'TOP_INNER' && (code === 'R2LI' || code === '4LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R2RI' || code === '4RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R2RO' || code === '4RO' || code === 'R2R')) return true;
        }
      } else if (axleNum === 5) {
        if (is14Wheeler) {
          if (side === 'TOP_OUTER' && (code === 'R2LO' || code === '5LO' || code === 'R2L')) return true;
          if (side === 'TOP_INNER' && (code === 'R2LI' || code === '5LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R2RI' || code === '5RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R2RO' || code === '5RO' || code === 'R2R')) return true;
        } else if (is16Wheeler) {
          if (side === 'TOP_OUTER' && (code === 'R3LO' || code === '5LO' || code === 'R3L')) return true;
          if (side === 'TOP_INNER' && (code === 'R3LI' || code === '5LI')) return true;
          if (side === 'BOTTOM_INNER' && (code === 'R3RI' || code === '5RI')) return true;
          if (side === 'BOTTOM_OUTER' && (code === 'R3RO' || code === '5RO' || code === 'R3R')) return true;
        }
      }
      return false;
    });

    return match || null;
  };

  // Mounted tyres and inspection status
  const mountedPositions = useMemo(() => positions.filter((p) => p.tyre !== null), [positions]);
  const totalMounted = mountedPositions.length;

  const inspectedCount = useMemo(() => {
    return mountedPositions.filter((p) => p.tyre && (effectiveInspectedIds.has(p.tyre.id) || p.has_inspection_data)).length;
  }, [mountedPositions, effectiveInspectedIds]);

  const rawPercent = totalMounted > 0 ? (inspectedCount / totalMounted) * 100 : 0;
  const progressPercent = Math.min(100, Math.round(rawPercent));
  const isAllInspected = progressPercent === 100 && totalMounted > 0;

  // Road geometry calculation
  // Total road spans x=30 to x=970 (width: 940)
  // Paved frontier X advances proportional to progressPercent
  const roadStartX = 30;
  const roadEndX = 970;
  const roadTotalSpan = roadEndX - roadStartX;
  // If not inspected, small 35px depot pad; at 100%, covers full road
  const pavedFrontierX = roadStartX + Math.max(35, (progressPercent / 100) * roadTotalSpan);

  // Check each axle inspection status
  const axleStatuses = useMemo(() => {
    return axles.map((axle) => {
      let totalAxleTyres = 0;
      let inspectedAxleTyres = 0;
      axle.positions.forEach((slot) => {
        const p = findPositionData(slot.defaultCode, axle.axleNum, slot.side);
        if (p?.tyre) {
          totalAxleTyres++;
          if (effectiveInspectedIds.has(p.tyre.id) || p.has_inspection_data) {
            inspectedAxleTyres++;
          }
        }
      });
      const isCleared = totalAxleTyres > 0 && inspectedAxleTyres === totalAxleTyres;
      return {
        axleNum: axle.axleNum,
        x: axle.x,
        isCleared,
        total: totalAxleTyres,
        inspected: inspectedAxleTyres,
      };
    });
  }, [axles, positions, effectiveInspectedIds]);

  // Sound effect when progress advances
  const prevProgressRef = useRef<number>(progressPercent);
  useEffect(() => {
    if (progressPercent > prevProgressRef.current) {
      if (progressPercent === 100) {
        inspectionAudio.playInspectionPass();
      } else {
        inspectionAudio.playRoadPaving();
      }
    }
    prevProgressRef.current = progressPercent;
  }, [progressPercent]);

  // Trigger Launch Sequence - Powerful Forward Drive along Highway
  const triggerLaunch = () => {
    // Clear any pending timers
    launchTimerRef.current.forEach((t) => clearTimeout(t));
    launchTimerRef.current = [];

    // Stage 1: Engine Ignition (Vibrating in Depot Bay, Headlights & Nitro flare)
    setLaunchStage('IGNITION');
    setVehicleTranslateX(0);
    inspectionAudio.playEngineIgnition();

    const t1 = window.setTimeout(() => {
      // Stage 2: Powerful Launch Thrust (Truck accelerates smoothly in one continuous motion completely out of the frame!)
      setLaunchStage('LAUNCHING');
      setVehicleTranslateX(1400);
      inspectionAudio.playVehicleLaunch();

      const t2 = window.setTimeout(() => {
        // Stage 3: Dispatched Highway Cruising (Truck is fully en route, telemetry active)
        setLaunchStage('CRUISING');
        if (onLaunchCompleted) {
          onLaunchCompleted();
        }
      }, 1650);

      launchTimerRef.current.push(t2);
    }, 1200);

    launchTimerRef.current.push(t1);
  };

  // Reset to Depot Bay
  const resetToDepot = () => {
    launchTimerRef.current.forEach((t) => clearTimeout(t));
    launchTimerRef.current = [];
    simTimeoutRef.current.forEach((t) => clearTimeout(t));
    simTimeoutRef.current = [];
    setLaunchStage('DEPOT');
    setVehicleTranslateX(0);
  };

  // Reset trigger from parent (e.g. after inspection report closed and saved to DB)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setDemoInspectedIds(new Set());
      setIsSimulating(false);
      resetToDepot();
    }
  }, [resetTrigger]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      launchTimerRef.current.forEach((t) => clearTimeout(t));
      simTimeoutRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Quick Demo Simulator: sequentially inspects tyres, builds road, launches truck
  const runInspectionDemo = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    resetToDepot();
    setDemoInspectedIds(new Set());

    const tyresToInspect = mountedPositions.map((p) => p.tyre!.id);
    if (tyresToInspect.length === 0) {
      setIsSimulating(false);
      return;
    }

    tyresToInspect.forEach((tyreId, index) => {
      const t = window.setTimeout(() => {
        setDemoInspectedIds((prev) => new Set([...prev, tyreId]));
        inspectionAudio.playTyreClick();

        if (index === tyresToInspect.length - 1) {
          // Last tyre inspected!
          setIsSimulating(false);
          const launchTimeout = window.setTimeout(() => {
            triggerLaunch();
          }, 600);
          launchTimerRef.current.push(launchTimeout);
        }
      }, (index + 1) * 220);

      simTimeoutRef.current.push(t);
    });
  };

  const isVehicleActiveMoving = launchStage === 'LAUNCHING' || launchStage === 'CRUISING';
  const isIgnited = launchStage !== 'DEPOT';

  return (
    <div className="relative w-full bg-[#0D1017] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden select-none text-white">
      {/* ── Top HUD Control & Mission Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80 text-xs">
        {/* Left: Road Construction & Inspection Gauges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-slate-300">ROAD CONSTRUCTION:</span>
            <span className="font-mono font-black text-[#FFC800] text-xs">
              {progressPercent}% PAVED
            </span>
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 ml-1">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[#FFC800] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 font-mono text-[11px]">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span>Audited:</span>
            <strong className="text-white">{inspectedCount}</strong> / {totalMounted} Tyres
          </div>

          {/* Launch Status Indicator */}
          {launchStage === 'DEPOT' ? (
            isAllInspected ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-xl font-bold text-[11px] animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> Roadway Ready • Ready for Launch
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Paving Underway ({totalMounted - inspectedCount} Pending)
              </span>
            )
          ) : launchStage === 'IGNITION' ? (
            <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-1 rounded-xl font-bold text-[11px] animate-pulse">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Engine Ignition • Throttle Spooling
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl font-bold text-[11px]">
              <Rocket className="w-3.5 h-3.5 text-emerald-400" /> EN ROUTE • Highway 44 (88 km/h)
            </span>
          )}
        </div>

        {/* Right: Interactive Actions (Launch, Close Inspection, Replay, Audio) */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Launch Trigger Button (Available if 100% inspected) */}
          {launchStage === 'DEPOT' && isAllInspected && (
            <button
              type="button"
              onClick={triggerLaunch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-[11px] shadow-lg shadow-emerald-500/30 transition animate-bounce cursor-pointer active:scale-95"
            >
              <Rocket className="w-3.5 h-3.5" /> 🚀 Launch Vehicle!
            </button>
          )}

          {/* Close Inspection & Save Report Button */}
          {onCloseInspection && (
            <button
              type="button"
              onClick={onCloseInspection}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-extrabold rounded-xl text-[11px] shadow-md transition cursor-pointer active:scale-95 ${
                isAllInspected
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Close physical tyre inspection, save report to database, and start a new inspection cycle"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Close Inspection &amp; Save
            </button>
          )}

          {/* Replay Launch Button */}
          {launchStage !== 'DEPOT' && (
            <>
              <button
                type="button"
                onClick={triggerLaunch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer"
                title="Replay launch animation"
              >
                <RotateCcw className="w-3 h-3" /> Replay Launch
              </button>
              <button
                type="button"
                onClick={resetToDepot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold rounded-xl text-[11px] transition cursor-pointer"
                title="Return to depot inspection bay"
              >
                🅿️ Depot Bay
              </button>
            </>
          )}

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              soundOn
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundOn ? 'Sound Effects Enabled (Click to Mute)' : 'Sound Effects Muted (Click to Enable)'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── 2D Roadbed & Exploded Vehicle SVG Canvas ── */}
      <div className="w-full overflow-x-auto relative rounded-2xl bg-[#090B10]">
        <svg
          viewBox="0 0 1020 370"
          className="w-full min-w-[780px] h-auto drop-shadow-md select-none"
          style={{ maxHeight: '440px' }}
        >
          {/* Defs, Filters, Patterns & Gradients */}
          <defs>
            {/* Active yellow wheel highlight glow */}
            <filter id="active-yellow-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFC800" floodOpacity="0.9" />
            </filter>

            {/* Inspected wheel emerald glow */}
            <filter id="inspected-green-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10B981" floodOpacity="0.8" />
            </filter>

            {/* Laser paving wavefront glow */}
            <filter id="laser-beam-glow" x="-50%" y="-20%" width="200%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#38BDF8" floodOpacity="0.9" />
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10B981" floodOpacity="0.9" />
            </filter>

            {/* Headlight volumetric flare blur */}
            <filter id="headlight-blur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="7" />
            </filter>

            {/* Unpaved subgrade blueprint grid pattern */}
            <pattern id="blueprint-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1E2433" strokeWidth="0.8" />
              <circle cx="12" cy="12" r="0.8" fill="#334155" />
            </pattern>

            {/* Hazard curb stripe pattern (red & white kerbs) */}
            <pattern id="curb-stripes" width="16" height="8" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8" height="8" fill="#DC2626" />
              <rect x="8" y="0" width="8" height="8" fill="#F8FAFC" />
            </pattern>

            {/* Road paving frontier laser gradient */}
            <linearGradient id="laser-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="70%" stopColor="#FFC800" stopOpacity="1" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>

            {/* Paved asphalt gradient */}
            <linearGradient id="asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#12151B" />
              <stop offset="50%" stopColor="#1A1E27" />
              <stop offset="100%" stopColor="#14171E" />
            </linearGradient>

            {/* Conical headlight beam gradient (front faces right) */}
            <linearGradient id="headlight-cone-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.95" />
              <stop offset="20%" stopColor="#FEF08A" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#FEF08A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
            </linearGradient>

            {/* Nitro flame gradient */}
            <linearGradient id="nitro-grad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
              <stop offset="30%" stopColor="#F97316" stopOpacity="1" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </linearGradient>

            {/* Clip path for the paved highway portion */}
            <clipPath id="paved-road-clip">
              <rect x="20" y="12" width={pavedFrontierX - 20} height="344" rx="8" />
            </clipPath>
          </defs>

          {/* ============================================================== */}
          {/* LAYER 1: BASE SUBGRADE & UNPAVED ROADWAY                       */}
          {/* ============================================================== */}
          {/* Deep dark base ground */}
          <rect x="0" y="0" width="1020" height="370" fill="#0A0C12" />

          {/* Unpaved road bed foundation */}
          <rect
            x="20"
            y="12"
            width="980"
            height="344"
            rx="8"
            fill="#12151D"
            stroke="#1E2330"
            strokeWidth="1.5"
          />

          {/* Blueprint engineering grid on unpaved ground */}
          <rect x="20" y="12" width="980" height="344" rx="8" fill="url(#blueprint-grid)" />

          {/* Blueprint caution watermarks on unpaved roadway */}
          <g opacity="0.35">
            <text x="500" y="98" textAnchor="middle" fill="#64748B" fontSize="11" fontFamily="monospace" letterSpacing="3">
              [ ROADWAY UNDER AUDIT // UNPAVED SUBGRADE FOUNDATION ]
            </text>
            <text x="500" y="274" textAnchor="middle" fill="#64748B" fontSize="11" fontFamily="monospace" letterSpacing="3">
              [ COMPLETE WHEEL INSPECTIONS TO PAVE HIGHWAY ]
            </text>
          </g>

          {/* Unpaved boundary guideline markings */}
          <line x1="20" y1="20" x2="1000" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="20" y1="348" x2="1000" y2="348" stroke="#334155" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="20" y1="178" x2="1000" y2="178" stroke="#334155" strokeWidth="1.2" strokeDasharray="8 8" opacity="0.5" />

          {/* ============================================================== */}
          {/* LAYER 2: FRESHLY PAVED HIGHWAY (Clipped to pavedFrontierX)     */}
          {/* ============================================================== */}
          <g clipPath="url(#paved-road-clip)">
            {/* Jet black highway asphalt surface */}
            <rect x="20" y="12" width="980" height="344" fill="url(#asphalt-grad)" />

            {/* Top & Bottom Rumble Strip Curbs */}
            <rect x="20" y="12" width="980" height="7" fill="url(#curb-stripes)" />
            <rect x="20" y="349" width="980" height="7" fill="url(#curb-stripes)" />

            {/* Solid White Highway Boundary Shoulder Lines */}
            <line x1="20" y1="22" x2="1000" y2="22" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.95" />
            <line x1="20" y1="346" x2="1000" y2="346" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.95" />

            {/* Inner Lane Division Dashes (Solid grounded highway markings) */}
            <line
              x1="20"
              y1="82"
              x2="1000"
              y2="82"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeDasharray="16 16"
              opacity="0.6"
            />
            <line
              x1="20"
              y1="286"
              x2="1000"
              y2="286"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeDasharray="16 16"
              opacity="0.6"
            />

            {/* Double Yellow Highway Center Dashes (Under chassis) */}
            <line
              x1="20"
              y1="175"
              x2="1000"
              y2="175"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeDasharray="24 16"
            />
            <line
              x1="20"
              y1="181"
              x2="1000"
              y2="181"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeDasharray="24 16"
            />

            {/* Glowing Retroreflective Cat's Eyes (Road Studs) along edges */}
            {[70, 150, 230, 310, 390, 470, 550, 630, 710, 790, 870, 950].map((cx) => (
              <g key={`stud-${cx}`}>
                <circle cx={cx} cy="22" r="2.2" fill="#10B981" />
                <circle cx={cx} cy="346" r="2.2" fill="#10B981" />
              </g>
            ))}

            {/* Axle Clearance Highway Stencils (Lights up when axle tyres are verified!) */}
            {axleStatuses.map((as) => (
              <g key={`axle-stencil-${as.axleNum}`}>
                {as.isCleared && (
                  <g className="transition-all duration-300">
                    {/* Glowing clearance pad under this axle */}
                    <rect
                      x={as.x - 42}
                      y="166"
                      width="84"
                      height="24"
                      rx="6"
                      fill="#064E3B"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                    <text
                      x={as.x}
                      y="182"
                      textAnchor="middle"
                      fill="#34D399"
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="monospace"
                      letterSpacing="0.5"
                    >
                      A{as.axleNum} PAVED ✓
                    </text>
                  </g>
                )}
              </g>
            ))}

            {/* Highway Cleared Banner on Road when 100% */}
            {isAllInspected && (
              <g opacity="0.85">
                <text
                  x="870"
                  y="182"
                  textAnchor="middle"
                  fill="#FFC800"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  letterSpacing="1"
                >
                  HIGHWAY READY ➔
                </text>
              </g>
            )}
          </g>

          {/* ============================================================== */}
          {/* LAYER 3: DYNAMIC LASER PAVING FRONTIER BEAM                    */}
          {/* ============================================================== */}
          {!isAllInspected && (
            <g className="transition-all duration-300">
              {/* Laser Beam Vertical Line */}
              <line
                x1={pavedFrontierX}
                y1="12"
                x2={pavedFrontierX}
                y2="356"
                stroke="url(#laser-grad)"
                strokeWidth="4"
                filter="url(#laser-beam-glow)"
                className="animate-paver-beam"
              />

              {/* Laser Beam Core Highlight */}
              <line
                x1={pavedFrontierX}
                y1="12"
                x2={pavedFrontierX}
                y2="356"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                opacity="0.9"
              />

              {/* Top & Bottom Paver Emitter Carriages */}
              <circle cx={pavedFrontierX} cy="14" r="5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx={pavedFrontierX} cy="354" r="5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Laser Paving Wavefront Sparks */}
              <circle cx={pavedFrontierX + 3} cy="90" r="2.5" fill="#FFC800" className="animate-ping" />
              <circle cx={pavedFrontierX + 4} cy="180" r="3" fill="#38BDF8" className="animate-ping" />
              <circle cx={pavedFrontierX + 3} cy="270" r="2.5" fill="#10B981" className="animate-ping" />

              {/* Floating Paver HUD Tag */}
              <g transform={`translate(${Math.min(910, pavedFrontierX - 35)}, 334)`}>
                <rect x="0" y="0" width="70" height="18" rx="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
                <text x="35" y="12" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  PAVER {progressPercent}%
                </text>
              </g>
            </g>
          )}

          {/* ============================================================== */}
          {/* LAYER 4: VEHICLE & MOUNTED TYRES (Moves on Launch!)           */}
          {/* ============================================================== */}
          <g
            style={{
              transform: `translateX(${vehicleTranslateX}px)`,
              transition:
                launchStage === 'LAUNCHING'
                  ? 'transform 1.6s cubic-bezier(0.25, 0.1, 0.25, 1)'
                  : 'transform 0.4s ease-out',
            }}
            className={launchStage === 'IGNITION' ? 'animate-engine-rumble' : ''}
          >
            {/* ── EXHAUST NITRO FLAMES & SMOKE (Ignition / Launch) ── */}
            {isIgnited && (
              <g>
                {/* Upper and lower exhaust flame cones */}
                <polygon
                  points="90,172 45,166 45,178"
                  fill="url(#nitro-grad)"
                  className="animate-nitro-flame"
                />
                <polygon
                  points="90,184 45,178 45,190"
                  fill="url(#nitro-grad)"
                  className="animate-nitro-flame"
                />

                {/* Billowing Smoke Puffs drifting backwards */}
                <circle cx="55" cy="172" r="10" fill="#64748B" opacity="0.7" className="animate-smoke-puff" />
                <circle cx="35" cy="184" r="14" fill="#475569" opacity="0.5" className="animate-smoke-puff" />
              </g>
            )}

            {/* ── HEADLIGHT VOLUMETRIC CONES (Ignition / Launch) ── */}
            {isIgnited && (
              <g className="animate-headlight-aura">
                {/* Top Conical Headlight Beam (shooting from cab front to the right) */}
                <polygon
                  points="850,135 1100,75 1100,195"
                  fill="url(#headlight-cone-grad)"
                  filter="url(#headlight-blur)"
                />
                {/* Bottom Conical Headlight Beam */}
                <polygon
                  points="850,221 1100,161 1100,281"
                  fill="url(#headlight-cone-grad)"
                  filter="url(#headlight-blur)"
                />

                {/* Radiant Headlight Lens Flares */}
                <circle cx="850" cy="135" r="7" fill="#FFFBEB" filter="url(#active-yellow-glow)" />
                <circle cx="850" cy="221" r="7" fill="#FFFBEB" filter="url(#active-yellow-glow)" />
                <circle cx="850" cy="135" r="3" fill="#FFFFFF" />
                <circle cx="850" cy="221" r="3" fill="#FFFFFF" />
              </g>
            )}

            {/* 1. Main Trailer / Chassis Body (Off-White rectangle with 2.5px dark border) */}
            <rect
              x="95"
              y="108"
              width="605"
              height="140"
              rx="4"
              fill="#FFFFFF"
              stroke="#14161A"
              strokeWidth="2.5"
            />

            {/* 2. Cab (Branded Yellow box on the right) */}
            <rect
              x="705"
              y="108"
              width="145"
              height="140"
              rx="4"
              fill="#FFC800"
              stroke="#14161A"
              strokeWidth="2.5"
            />

            {/* Cab Windshield Bar (Vertical dark bar at front of cab) */}
            <rect
              x="834"
              y="126"
              width="7"
              height="104"
              rx="3.5"
              fill="#14161A"
            />

            {/* Cab Side Windows */}
            <rect x="718" y="116" width="36" height="22" rx="3" fill="#0F172A" />
            <rect x="718" y="218" width="36" height="22" rx="3" fill="#0F172A" />

            {/* Vehicle Registration Text inside Chassis */}
            <text
              x="395"
              y="166"
              textAnchor="middle"
              fill="#14161A"
              fontSize="28"
              fontWeight="900"
              letterSpacing="2"
              fontFamily="monospace"
            >
              {vehicle.vehicle_number}
            </text>

            {/* Wheel count & axle count subtitle */}
            <text
              x="395"
              y="194"
              textAnchor="middle"
              fill="#5B6068"
              fontSize="13"
              fontWeight="600"
              fontFamily="monospace"
            >
              {totalExpectedWheels} wheels, {totalAxles} axles
            </text>

            {/* Spare Wheel Mount (Fitted Spare Tyre or Vacant Mount) */}
            {(() => {
              const sparePos = positions.find((p) => p.wheel_position.toUpperCase().includes('SPARE'));
              const hasSpare = !!sparePos?.tyre;
              const isSpareInspected = sparePos?.tyre
                ? effectiveInspectedIds.has(sparePos.tyre.id) || sparePos.has_inspection_data
                : false;
              const isSpareSelected = selectedPosition?.wheel_position?.toUpperCase().includes('SPARE');

              return (
                <g
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => {
                    if (hasSpare && sparePos) {
                      onSelectPosition(sparePos);
                    } else if (onQuickFit) {
                      onQuickFit(sparePos?.wheel_position || 'Spare', 0);
                    } else if (sparePos) {
                      onSelectPosition(sparePos);
                    }
                  }}
                  onMouseEnter={() => {
                    if (sparePos) {
                      setHoveredPos(sparePos);
                      setTooltipPos({ x: 570, y: 178 });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredPos(null);
                    setTooltipPos(null);
                  }}
                >
                  <title>{hasSpare ? 'Fitted Spare Wheel' : 'Vacant Spare Wheel Mount'}</title>

                  {/* Selected ring for spare */}
                  {isSpareSelected && (
                    <circle
                      cx="570"
                      cy="178"
                      r="27"
                      fill="none"
                      stroke="#FFC800"
                      strokeWidth="3"
                      filter="url(#active-yellow-glow)"
                    />
                  )}

                  {/* Inspected ring for spare */}
                  {isSpareInspected && !isSpareSelected && (
                    <circle
                      cx="570"
                      cy="178"
                      r="26"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                      filter="url(#inspected-green-glow)"
                    />
                  )}

                  {/* Spare Tyre Circle */}
                  <circle
                    cx="570"
                    cy="178"
                    r="24"
                    fill={hasSpare ? (isSpareInspected ? '#10B981' : '#14161A') : '#1E2433'}
                    stroke={hasSpare ? (isSpareInspected ? '#059669' : '#334155') : '#E8770E'}
                    strokeWidth={hasSpare ? 2 : 1.5}
                    strokeDasharray={!hasSpare ? '4 4' : undefined}
                  />

                  {/* Inner Hub Rim if has spare */}
                  {hasSpare && (
                    <circle cx="570" cy="178" r="14" fill="#0D1017" stroke="#475569" strokeWidth="1.2" />
                  )}

                  {/* Spare Text or Checkmark */}
                  {hasSpare ? (
                    isSpareInspected ? (
                      <text x="570" y="182" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                        ✓
                      </text>
                    ) : (
                      <text x="570" y="182" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        SPARE
                      </text>
                    )
                  ) : (
                    <text x="570" y="182" textAnchor="middle" fill="#E8770E" fontSize="8" fontWeight="bold">
                      + Spare
                    </text>
                  )}
                </g>
              );
            })()}

            {/* 3. Dashed Axle Lines across vehicle & protruding outside to tyres */}
            {axles.map((axle) => (
              <g key={`axle-line-${axle.axleNum}`}>
                <line
                  x1={axle.x}
                  y1="22"
                  x2={axle.x}
                  y2="334"
                  stroke="#14161A"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                />
                <text
                  x={axle.x}
                  y={axle.isCab ? 185 : 236}
                  textAnchor="middle"
                  fontSize={axle.isCab ? 14 : 12}
                  fontWeight="bold"
                  fill="#14161A"
                  fontFamily="monospace"
                >
                  {axle.label}
                </text>
              </g>
            ))}

            {/* 4. Tyres Mounted at Exploded Axle Ends */}
            {axles.map((axle) =>
              axle.positions.map((slot) => {
                const posData = findPositionData(slot.defaultCode, axle.axleNum, slot.side);
                const tyre = posData?.tyre;
                const hasTyre = !!tyre;
                const isInspected = tyre
                  ? effectiveInspectedIds.has(tyre.id) || posData?.has_inspection_data
                  : false;
                const isSelected =
                  selectedPosition?.wheel_position === (posData?.wheel_position || slot.defaultCode);

                let rectFill = '#14161A';
                let strokeColor = '#14161A';
                let strokeWidth = 1.5;

                if (!hasTyre) {
                  rectFill = '#1E2433';
                  strokeColor = '#E8770E';
                  strokeWidth = 1.5;
                } else if (isInspected) {
                  rectFill = '#10B981'; // Emerald green inspected!
                  strokeColor = '#059669';
                }

                if (isSelected) {
                  strokeColor = '#FFC800';
                  strokeWidth = 3;
                }

                const displayPosCode = posData?.wheel_position || slot.defaultCode;

                return (
                  <g
                    key={`wheel-${slot.defaultCode}`}
                    className="cursor-pointer transition-all duration-150"
                    onClick={() => {
                      if (hasTyre && posData) {
                        onSelectPosition(posData);
                      } else if (onQuickFit) {
                        onQuickFit(posData?.wheel_position || slot.defaultCode, posData?.axle_number || axle.axleNum);
                      } else if (posData) {
                        onSelectPosition(posData);
                      }
                    }}
                    onMouseEnter={() => {
                      if (posData) {
                        setHoveredPos(posData);
                        setTooltipPos({ x: slot.x + slot.width / 2, y: slot.y });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredPos(null);
                      setTooltipPos(null);
                    }}
                  >
                    <title>
                      {hasTyre
                        ? `${displayPosCode}: ${tyre?.serial_number || 'Mounted'}`
                        : `${displayPosCode}: Vacant — Click to fit tyre`}
                    </title>
                    {/* Selected Highlight Ring */}
                    {isSelected && (
                      <rect
                        x={slot.x - 3}
                        y={slot.y - 3}
                        width={slot.width + 6}
                        height={slot.height + 6}
                        rx="5"
                        fill="none"
                        stroke="#FFC800"
                        strokeWidth="3.5"
                        filter="url(#active-yellow-glow)"
                      />
                    )}

                    {/* Inspected Glow Ring */}
                    {isInspected && !isSelected && (
                      <rect
                        x={slot.x - 2}
                        y={slot.y - 2}
                        width={slot.width + 4}
                        height={slot.height + 4}
                        rx="4"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="1.5"
                        filter="url(#inspected-green-glow)"
                      />
                    )}

                    {/* Main Tyre Solid Rectangle */}
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      rx="3.5"
                      fill={rectFill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={!hasTyre ? '3 3' : undefined}
                      pointerEvents="all"
                      className="hover:opacity-90 transition"
                    />

                    {/* Speed streak blur lines when launched */}
                    {isVehicleActiveMoving && hasTyre && (
                      <line
                        x1={slot.x - 14}
                        y1={slot.y + slot.height / 2}
                        x2={slot.x}
                        y2={slot.y + slot.height / 2}
                        stroke="#94A3B8"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="animate-wind-streak"
                      />
                    )}

                    {/* Inner text or checkmark on tyre */}
                    {hasTyre ? (
                      <>
                        {/* Physical tyre tread rib grooves */}
                        <line
                          x1={slot.x + 3}
                          y1={slot.y + slot.height * 0.28}
                          x2={slot.x + slot.width - 3}
                          y2={slot.y + slot.height * 0.28}
                          stroke={isInspected ? '#059669' : '#334155'}
                          strokeWidth="0.8"
                          strokeDasharray="4 3"
                          opacity="0.75"
                          className={isVehicleActiveMoving ? 'animate-tread-rolling' : ''}
                        />
                        <line
                          x1={slot.x + 3}
                          y1={slot.y + slot.height * 0.72}
                          x2={slot.x + slot.width - 3}
                          y2={slot.y + slot.height * 0.72}
                          stroke={isInspected ? '#059669' : '#334155'}
                          strokeWidth="0.8"
                          strokeDasharray="4 3"
                          opacity="0.75"
                          className={isVehicleActiveMoving ? 'animate-tread-rolling' : ''}
                        />

                        {isInspected ? (
                          <text
                            x={slot.x + slot.width / 2}
                            y={slot.y + slot.height / 2 + 3.5}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            ✓
                          </text>
                        ) : (
                          <text
                            x={slot.x + slot.width / 2}
                            y={slot.y + slot.height / 2 + 3.2}
                            textAnchor="middle"
                            fill="#F8FAFC"
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {displayPosCode}
                          </text>
                        )}
                      </>
                    ) : (
                      <text
                        x={slot.x + slot.width / 2}
                        y={slot.y + slot.height / 2 + 3}
                        textAnchor="middle"
                        fill="#E8770E"
                        fontSize="9"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        + Fit
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* High-speed wind streaks streaming backward from truck during forward drive */}
            {isVehicleActiveMoving && (
              <g opacity="0.75">
                <line x1="880" y1="90" x2="980" y2="90" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="30 15" className="animate-wind-streak" />
                <line x1="860" y1="265" x2="960" y2="265" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="25 15" className="animate-wind-streak" />
                <line x1="720" y1="60" x2="800" y2="60" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="20 10" className="animate-wind-streak" />
                <line x1="720" y1="300" x2="800" y2="300" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="20 10" className="animate-wind-streak" />
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* ── Cruising Telemetry HUD Overlay (When Dispatched) ── */}
      {launchStage === 'CRUISING' && (
        <div className="mt-3 p-3 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
              <Rocket className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-white text-xs">DISPATCH ACTIVE:</span>
                <span className="font-mono text-emerald-400 font-bold text-xs">EN ROUTE ON HIGHWAY 44</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Speed: <strong className="text-white">88 km/h</strong> • Tyre Status: <strong className="text-emerald-400">100% AUDITED NOMINAL</strong> • Telemetry Live
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCloseInspection && (
              <button
                type="button"
                onClick={onCloseInspection}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Close Inspection &amp; Save Report
              </button>
            )}
            <button
              type="button"
              onClick={triggerLaunch}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Replay
            </button>
            <button
              type="button"
              onClick={resetToDepot}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              🅿️ Return to Depot
            </button>
          </div>
        </div>
      )}

      {/* ── Hover Info Tooltip Bar ── */}
      {hoveredPos && tooltipPos && (
        <div className="absolute top-16 left-6 right-6 pointer-events-none flex items-center justify-between p-2.5 bg-[#14161A] text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in duration-150 z-20">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-[#FFC800] bg-slate-800 px-2 py-0.5 rounded">
              {hoveredPos.wheel_position}
            </span>
            {hoveredPos.tyre ? (
              <>
                <span className="font-mono font-bold">{hoveredPos.tyre.serial_number}</span>
                <span className="text-slate-400 text-[11px]">{hoveredPos.tyre.model}</span>
                <span className="text-slate-400 text-[11px]">
                  NSD: <strong className="text-white">{hoveredPos.tyre.current_nsd} mm</strong>
                </span>
              </>
            ) : (
              <span className="text-[#E8770E]">Vacant position — Click to fit tyre</span>
            )}
          </div>
          <div>
            {hoveredPos.tyre &&
            (effectiveInspectedIds.has(hoveredPos.tyre.id) || hoveredPos.has_inspection_data) ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Inspected &amp; Road Paved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Click to Inspect &amp; Pave
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Schematic Legend & Guidance ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-3 mt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-[#14161A] border border-slate-700 rounded" />
            <span>Pending Wheel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-emerald-500 rounded" />
            <span>Inspected (✓)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-white border border-[#FFC800] ring-2 ring-[#FFC800]/40 rounded" />
            <span>Active Selection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-[#1E2433] border border-dashed border-[#E8770E] rounded" />
            <span>Vacant Position</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 bg-gradient-to-r from-emerald-500 to-[#FFC800] rounded" />
            <span>Constructed Highway</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 italic">
          Tip: Each wheel inspected paves the road ahead • Full inspection clears vehicle launch!
        </div>
      </div>
    </div>
  );
};

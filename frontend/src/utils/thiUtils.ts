import { Vehicle } from '../types';

export interface VehicleTHIResult {
  thi: number;
  unweighted_thi: number;
  thi_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  critical_tyres_count: number;
  warning_tyres_count: number;
  healthy_tyres_count: number;
  lowest_tyre_thi: number;
}

/**
 * Calculates a vehicle's Tyre Health Index (THI) as the arithmetic average
 * of all fitted tyres' THI scores.
 */
export function computeVehicleTHI(vehicle: Vehicle): VehicleTHIResult {
  // If backend precalculated THI, use it as baseline
  if (vehicle.thi !== undefined && vehicle.thi !== null) {
    return {
      thi: vehicle.thi,
      unweighted_thi: vehicle.unweighted_thi ?? vehicle.thi,
      thi_status: (vehicle.thi_status as any) || (vehicle.thi < 60 ? 'CRITICAL' : vehicle.thi < 80 ? 'WARNING' : 'HEALTHY'),
      critical_tyres_count: vehicle.critical_tyres_count ?? 0,
      warning_tyres_count: vehicle.warning_tyres_count ?? 0,
      healthy_tyres_count: vehicle.healthy_tyres_count ?? 0,
      lowest_tyre_thi: vehicle.lowest_tyre_thi ?? vehicle.thi,
    };
  }

  const fitments = vehicle.fitments || [];
  if (fitments.length === 0) {
    return {
      thi: 100.0,
      unweighted_thi: 100.0,
      thi_status: 'HEALTHY',
      critical_tyres_count: 0,
      warning_tyres_count: 0,
      healthy_tyres_count: 0,
      lowest_tyre_thi: 100.0,
    };
  }

  let totalSum = 0;
  let critCount = 0;
  let warnCount = 0;
  let healthyCount = 0;
  let lowestThi = 100.0;

  for (const f of fitments) {
    const score = f.tyre?.current_thi ?? 100.0;
    const status = (f.tyre?.thi_status || (score < 60 ? 'CRITICAL' : score < 80 ? 'WARNING' : 'HEALTHY')).toUpperCase();

    lowestThi = Math.min(lowestThi, score);
    totalSum += score;

    if (score < 60 || status === 'CRITICAL') {
      critCount++;
    } else if (score < 80 || status === 'WARNING') {
      warnCount++;
    } else {
      healthyCount++;
    }
  }

  const vehThi = Number((totalSum / fitments.length).toFixed(1));

  let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
  if (vehThi < 60 || critCount > 0) overallStatus = 'CRITICAL';
  else if (vehThi < 80 || warnCount > 0) overallStatus = 'WARNING';

  return {
    thi: vehThi,
    unweighted_thi: vehThi,
    thi_status: overallStatus,
    critical_tyres_count: critCount,
    warning_tyres_count: warnCount,
    healthy_tyres_count: healthyCount,
    lowest_tyre_thi: Number(lowestThi.toFixed(1)),
  };
}

/**
 * Calculates the fleet-level average vehicle THI as the mean of all individual vehicle THIs.
 */
export function computeFleetAverageVehicleTHI(vehicles: Vehicle[]): number {
  if (!vehicles || vehicles.length === 0) return 100.0;
  const thisList = vehicles.map(v => computeVehicleTHI(v).thi);
  const sum = thisList.reduce((acc, val) => acc + val, 0);
  return Number((sum / thisList.length).toFixed(1));
}

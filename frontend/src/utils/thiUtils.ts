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
 * Calculates a vehicle's Tyre Health Index (THI) as the weighted average
 * of all fitted tyres, giving higher priority to critical tyres so they
 * impact the vehicle's overall THI more heavily.
 *
 * Priority Weights:
 * - Critical tyre (score < 70 or CRITICAL): weight = 4.0
 * - Warning tyre (70 <= score < 85 or WARNING): weight = 2.0
 * - Healthy tyre (score >= 85 or HEALTHY): weight = 1.0
 */
export function computeVehicleTHI(vehicle: Vehicle): VehicleTHIResult {
  // If backend precalculated the weighted THI, use it as baseline
  if (vehicle.thi !== undefined && vehicle.thi !== null) {
    return {
      thi: vehicle.thi,
      unweighted_thi: vehicle.unweighted_thi ?? vehicle.thi,
      thi_status: (vehicle.thi_status as any) || (vehicle.thi < 70 ? 'CRITICAL' : vehicle.thi < 85 ? 'WARNING' : 'HEALTHY'),
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

  let totalWeight = 0;
  let weightedSum = 0;
  let unweightedSum = 0;
  let critCount = 0;
  let warnCount = 0;
  let healthyCount = 0;
  let lowestThi = 100.0;

  for (const f of fitments) {
    const score = f.tyre?.current_thi ?? 100.0;
    const status = (f.tyre?.thi_status || (score < 70 ? 'CRITICAL' : score < 85 ? 'WARNING' : 'HEALTHY')).toUpperCase();

    lowestThi = Math.min(lowestThi, score);
    unweightedSum += score;

    // Critical tyres have 4x priority weight, Warning tyres 2x, Healthy tyres 1x
    let weight = 1.0;
    if (score < 70 || status === 'CRITICAL') {
      weight = 4.0;
      critCount++;
    } else if (score < 85 || status === 'WARNING') {
      weight = 2.0;
      warnCount++;
    } else {
      weight = 1.0;
      healthyCount++;
    }

    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
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

  const vehThi = Number((weightedSum / totalWeight).toFixed(1));
  const unweighted = Number((unweightedSum / fitments.length).toFixed(1));

  let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
  if (vehThi < 70 || critCount > 0) overallStatus = 'CRITICAL';
  else if (vehThi < 85 || warnCount > 0) overallStatus = 'WARNING';

  return {
    thi: vehThi,
    unweighted_thi: unweighted,
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

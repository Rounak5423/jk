export type Role = 'SUPER_ADMIN' | 'FLEET_MANAGER' | 'DRIVER';

export interface User {
  id: string;
  fleet_id: string | null;
  fleet_name?: string | null;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  phone_number?: string | null;
  driver_license_no?: string | null;
  assigned_vehicle_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Fleet {
  id: string;
  name: string;
  registration_no?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  vehicle_count?: number;
  fitted_tyres_count?: number;
  active_alerts_count?: number;
  health_summary?: {
    healthy: number;
    warning: number;
    critical: number;
  };
  created_at: string;
}

export interface WheelPositionConfig {
  axle_index: number;
  axle_type: string;
  wheel_position: string;
  x_offset: number;
  is_dual: boolean;
  is_left: boolean;
  is_inner: boolean;
  health_color: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  tyre?: {
    tyre_id: string;
    serial_number: string;
    model: string;
    size: string;
    current_thi: number;
    thi_status: string;
    current_nsd: number;
    blueprint_nsd: number;
    pressure_psi?: number | null;
    temperature_c?: number | null;
    total_km_run: number;
    explanation?: string;
  } | null;
}

export interface Vehicle3DTwin {
  vehicle_id: string;
  vehicle_number: string;
  vehicle_type: string;
  wheel_config: string;
  axle_count: number;
  baseline_pressure: number;
  current_odometer: number;
  wheels: WheelPositionConfig[];
}

export interface Vehicle {
  id: string;
  fleet_id: string;
  fleet_name?: string;
  vehicle_number: string;
  vehicle_type: string;
  wheel_config: string;
  axle_count: number;
  layout: {
    layout_type: string;
    axle_count: number;
    total_wheels: number;
    axles: Array<{
      index: number;
      type: string;
      dual: boolean;
      positions: string[];
      x_offset: number;
    }>;
  };
  make?: string;
  model?: string;
  year?: number;
  baseline_pressure: number;
  baseline_mileage: number;
  current_odometer: number;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  location_source?: string;
  location_updated_at?: string | null;
  status: string;
  fitted_tyre_count: number;
  expected_tyre_count: number;
  thi?: number;
  unweighted_thi?: number;
  thi_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  critical_tyres_count?: number;
  warning_tyres_count?: number;
  healthy_tyres_count?: number;
  lowest_tyre_thi?: number;
  fitments?: Array<{
    id: string;
    wheel_position: string;
    is_dual: boolean;
    tyre?: {
      serial_number: string;
      model: string;
      current_thi: number;
      thi_status: string;
      current_nsd: number;
    };
  }>;
  created_at: string;
}

export interface Tyre {
  id: string;
  fleet_id: string;
  serial_number: string;
  brand: string;
  model: string;
  size: string;
  blueprint_nsd: number;
  current_nsd: number;
  wear_percentage: number;
  retread_count: number;
  total_km_run: number;
  current_thi: number;
  thi_status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  status: 'FITTED' | 'IN_INVENTORY' | 'RETREADING' | 'SCRAPPED';
  lifecycle_type: 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP';
  active_fitment?: {
    id: string;
    vehicle_id: string;
    axle_number: number;
    wheel_position: string;
    fitted_odometer: number;
  } | null;
  remaining_life_estimate?: {
    remaining_life_km: number | null;
    projected_total_km: number | null;
    wear_rate_per_10k_km: number | null;
    status: string;
    message: string;
    confidence: string;
    assumptions?: string;
  };
  active_alerts?: Alert[];
  thi_history?: Array<{
    id: string;
    score: number;
    status: string;
    calculated_at: string;
    components: {
      pressure_score: number | null;
      temp_score: number | null;
      wear_score: number | null;
      rrc_score: number | null;
    };
    explanation: string;
    inputs: Record<string, any>;
  }>;
  created_at: string;
}

export interface Alert {
  id: string;
  fleet_id: string;
  vehicle_id?: string | null;
  vehicle_number?: string | null;
  tyre_id?: string | null;
  tyre_serial?: string | null;
  wheel_position?: string | null;
  code: string;
  category: string;
  severity: 'NORMAL' | 'WARNING' | 'RISK' | 'CRITICAL';
  observed_value?: number | null;
  unit?: string | null;
  explanation: string;
  recommended_action: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  driver_id: string;
  driver_name?: string;
  trip_code: string;
  origin: string;
  destination: string;
  start_time: string;
  start_odometer: number;
  end_time?: string | null;
  end_odometer?: number | null;
  distance_km?: number | null;
  trip_score?: number | null;
  trip_score_status?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | null;
  score_breakdown?: {
    trip_score: number;
    status: string;
    components?: {
      speed_compliance?: number;
      driving_smoothness?: number;
      tyre_safety?: number;
      pressure_compliance?: number;
      thermal_stability?: number;
      fuel_efficiency?: number;
    };
    risk_burdens?: {
      r_speed?: number;
      r_smoothness?: number;
      r_pressure?: number;
      r_temperature?: number;
    };
    driving_pattern?: {
      profile: string;
      description: string;
      badge_color?: string;
      mean_abs_accel?: number;
      max_decel_ms2?: number;
      overspeed_ratio?: number;
    };
    explanation: string;
  } | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface Inspection {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  tyre_id: string;
  tyre_serial?: string;
  inspector_id: string;
  inspector_name?: string;
  measured_nsd: number;
  measured_pressure?: number | null;
  odometer_at_inspection: number;
  visual_condition: string;
  photo_url?: string | null;
  notes?: string | null;
  inspected_at: string;
  inspection_result?: 'PASS' | 'WARNING' | 'FAIL' | 'FURTHER_ASSESSMENT';
  lifecycle_type_change?: 'NEW' | 'REUSE' | 'RETREAD' | 'SCRAP' | null;
  lifecycle_reason?: string | null;
  retread_date?: string | null;
  retread_provider?: string | null;
  retread_count_after?: number | null;
  temperature_at_inspection?: number | null;
}

export interface TyreLifecycleHistory {
  id: string;
  tyre_id: string;
  fleet_id: string;
  previous_lifecycle_type: string;
  new_lifecycle_type: string;
  previous_status?: string | null;
  new_status?: string | null;
  related_inspection_id?: string | null;
  related_fitment_id?: string | null;
  changed_by_user_id: string;
  changed_by_name?: string | null;
  reason?: string | null;
  remarks?: string | null;
  nsd_at_change?: number | null;
  km_at_change?: number | null;
  retread_count?: number | null;
  scrap_reason?: string | null;
  created_at: string;
}

export interface FleetStats {
  fleet_id: string;
  vehicles: number;
  tyres: number;
  active_trips: number;
  active_alerts: number;
  health_distribution: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
}

export interface VehicleInspectionReport {
  id: string;
  report_number: string;
  fleet_id: string;
  vehicle_id: string;
  vehicle_number?: string;
  inspector_id: string;
  inspector_name?: string;
  odometer: number;
  total_wheels: number;
  inspected_wheels: number;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  roadworthiness_status: string;
  summary_notes?: string;
  details: Array<{
    wheel_position: string;
    axle_number: number;
    is_dual: boolean;
    is_inner: boolean;
    tyre_id?: string | null;
    tyre_serial?: string | null;
    tyre_model?: string | null;
    measured_nsd?: number | null;
    measured_pressure?: number | null;
    visual_condition?: string;
    inspection_result?: string;
    notes?: string | null;
    photo_url?: string | null;
    inspected: boolean;
  }>;
  completed_at: string;
}


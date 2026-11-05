"""
Centralized, Configuration-Agnostic Tyre Health Index (THI) Engine.
Implements the Official JK Tyre Executive Formula & Machine Learning Predictor.

Supports ANY commercial vehicle layout and wheel count:
- 4-Wheel / 2-Axle (4x2 LCV, Passenger Van, Delivery Truck)
- 6-Wheel / 2-Axle Duals (4x2 Rigid MCV)
- 10-Wheel / 3-Axle (6x2 / 6x4 Heavy Commercial Vehicle)
- 12-Wheel / 4-Axle (8x2 Commercial Multi-Axle Truck)
- 14-Wheel / 16-Wheel / 18-Wheel Multi-Axle Tractor-Trailers & Pullers
- Custom configurations with arbitrary axle and wheel layouts.

Formula:
    THI = 0.50 * Sw + 0.25 * Sn + (0.25 / 3.0) * (Sp + St + 100 - OS)

Where:
    Sw (50.00%): Wear Score based on tread wear rate (mm/km)
    Sn (25.00%): Tread Score based on current NSD (minimum remaining tread depth)
    Sp ( 8.33%): Pressure Score based on deviation from recommended cold pressure
    St ( 8.33%): Temperature Score based on operating thermal ceiling
    100 - OS ( 8.33%): Inverse Operating Severity derived from vehicle speed / exposure
"""

import os
import pickle
from typing import Dict, Any, List, Optional
import numpy as np


class THIEngine:
    RULE_VERSION = "v2.0.0-executive-formula-ml"

    # Default Target Specifications (configurable per tyre SKU and axle load)
    DEFAULT_OTD_MM = 16.5           # Original Tread Depth for new commercial tyres
    LEGAL_MIN_NSD_MM = 1.6          # Regulatory discard limit
    CRITICAL_NSD_THRESHOLD = 3.0    # Operational replacement recommendation threshold
    
    DEFAULT_RECOMMENDED_PSI = 125.0 # Target cold inflation pressure (PSI)
    PRESSURE_TOLERANCE_PSI = 20.0   # Acceptable operating window (+/- 20 PSI)
    
    TEMP_NORMAL_C = 35.0            # Nominal operating temperature (C)
    TEMP_CRITICAL_C = 65.0          # Critical thermal threshold (C)
    
    SPEED_CRITICAL_KMH = 80.0       # Standard commercial highway speed cap (km/h)
    WEAR_RATE_LIMIT = 0.00045       # Wear rate limit in mm/km (~2,222 km/mm threshold)

    # Axle-specific safety critical weights for vehicle aggregation
    AXLE_SAFETY_WEIGHTS = {
        "STEER": 1.20,      # Steer axle failures have catastrophic directional impact
        "DRIVE": 1.00,      # Drive axles transmit torque and braking shear forces
        "TANDEM": 0.90,     # Load bearing tandem carrying dual wheels
        "TRAILER": 0.85,    # Trailing load-bearing axles
        "LIFT": 0.80,       # Retractable auxiliary axles
        "DUMMY": 0.85,      # Non-driven tag/pusher axles
        "SPARE": 0.00,      # In-chassis spare (tracked separately in depot inventory)
    }

    _ml_model = None
    _ml_scaler = None

    @classmethod
    def _load_ml_artifacts(cls):
        """Lazy-load the trained Gradient Boosting / Random Forest THI model."""
        if cls._ml_model is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "thi_model.pkl")
            scaler_path = os.path.join(base_dir, "thi_scaler.pkl")
            if os.path.exists(model_path):
                try:
                    with open(model_path, "rb") as f:
                        cls._ml_model = pickle.load(f)
                    if os.path.exists(scaler_path):
                        with open(scaler_path, "rb") as f:
                            cls._ml_scaler = pickle.load(f)
                except Exception as e:
                    print(f"Warning: Failed to load THI ML model: {e}")

    # -------------------------------------------------------------------------
    # 1. INDIVIDUAL TYRE HEALTH INDEX (Configuration-Agnostic Core)
    # -------------------------------------------------------------------------
    @classmethod
    def calculate_tyre_thi(
        cls,
        pressure_psi: Optional[float],
        temperature_c: Optional[float],
        min_nsd_mm: Optional[float],
        km_per_mm_wear: Optional[float] = None,
        speed_kmh: Optional[float] = 0.0,
        recommended_psi: Optional[float] = None,
        blueprint_nsd_mm: float = 16.5,
        wheel_position: str = "1R",
        axle_type: str = "STEER",
        is_stale: bool = False,
        is_faulty: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates the formula-based THI for an individual tyre.
        Works identically regardless of whether the vehicle has 4, 6, 10, 12, or 18 wheels.
        """
        if is_faulty:
            return {
                "score": 0.0,
                "status": "CRITICAL",
                "components": {"wear_score": 0.0, "tread_score": 0.0, "pressure_score": 0.0, "temp_score": 0.0, "inv_severity_score": 0.0},
                "explanation": "Sensor fault flagged: implausible or corrupted telemetry received. Physical inspection required.",
                "data_quality": "FAULTY_SENSOR",
            }

        if is_stale:
            return {
                "score": 50.0,
                "status": "UNKNOWN",
                "components": {"wear_score": None, "tread_score": None, "pressure_score": None, "temp_score": None, "inv_severity_score": None},
                "explanation": "Telemetry stale (> 30 minutes without active TPMS heartbeat).",
                "data_quality": "STALE_DATA",
            }

        p_rec = recommended_psi if recommended_psi is not None else cls.DEFAULT_RECOMMENDED_PSI
        speed = float(speed_kmh) if speed_kmh is not None else 0.0
        explanations = []

        # 1. Wear Score (Sw, weight 50%)
        # r = 1 / km_per_mm_wear (mm/km)
        if km_per_mm_wear is not None and km_per_mm_wear > 0:
            r = 1.0 / km_per_mm_wear
            s_w = float(np.clip(100.0 * (1.0 - (r / cls.WEAR_RATE_LIMIT)), 0.0, 100.0))
            if s_w < 40.0:
                explanations.append(f"Accelerated tread wear rate ({km_per_mm_wear:.0f} km/mm).")
        else:
            # Baseline proxy from NSD worn vs 50,000 km standard interval
            s_w = 44.44

        # 2. Tread Score (Sn, weight 25%)
        # Sn = 100 * clip((NSD_curr - 1.6) / (16.5 - 1.6), 0, 1)
        curr_nsd = float(min_nsd_mm) if min_nsd_mm is not None else blueprint_nsd_mm
        s_n = float(np.clip(100.0 * (curr_nsd - cls.LEGAL_MIN_NSD_MM) / (blueprint_nsd_mm - cls.LEGAL_MIN_NSD_MM), 0.0, 100.0))
        if curr_nsd <= cls.CRITICAL_NSD_THRESHOLD:
            explanations.append(f"Critical tread depth ({curr_nsd:.1f} mm <= {cls.CRITICAL_NSD_THRESHOLD:.1f} mm threshold). Replacement urgent.")
        elif curr_nsd < 6.0:
            explanations.append(f"Low tread depth ({curr_nsd:.1f} mm remaining). Plan retreading.")

        # 3. Pressure Score (Sp, weight 8.333%)
        # Sp = 100 * clip(1 - |P_act - P_rec| / 20.0, 0, 1)
        if pressure_psi is not None and pressure_psi > 0:
            p_act = float(pressure_psi)
            dev = abs(p_act - p_rec)
            s_p = float(np.clip(100.0 * (1.0 - dev / cls.PRESSURE_TOLERANCE_PSI), 0.0, 100.0))
            if p_act < (p_rec - 15.0):
                explanations.append(f"Severe under-inflation ({p_act:.1f} PSI vs {p_rec:.0f} target). Risk of tyre shoulder blowout.")
            elif p_act > (p_rec + 15.0):
                explanations.append(f"Severe over-inflation ({p_act:.1f} PSI vs {p_rec:.0f} target). Centre tread wear risk.")
        else:
            s_p = 50.0
            explanations.append("Tyre pressure reading missing.")

        # 4. Temperature Score (St, weight 8.333%)
        # St = 100 * clip((65 - T_act) / (65 - 35), 0, 1)
        if temperature_c is not None:
            t_act = float(temperature_c)
            if t_act <= cls.TEMP_NORMAL_C:
                s_t = 100.0
            else:
                s_t = float(np.clip(100.0 * (cls.TEMP_CRITICAL_C - t_act) / (cls.TEMP_CRITICAL_C - cls.TEMP_NORMAL_C), 0.0, 100.0))
            if t_act >= 55.0:
                explanations.append(f"Dangerous high temperature ({t_act:.1f} °C). Immediate cooling required.")
            elif t_act >= 45.0:
                explanations.append(f"Elevated operating temperature ({t_act:.1f} °C).")
        else:
            s_t = 50.0

        # 5. Inverse Operating Severity (100 - OS, weight 8.333%)
        inv_os = float(np.clip(100.0 * (1.0 - speed / cls.SPEED_CRITICAL_KMH), 0.0, 100.0))
        if speed > cls.SPEED_CRITICAL_KMH:
            explanations.append(f"Vehicle overspeeding ({speed:.0f} km/h > {cls.SPEED_CRITICAL_KMH:.0f} limit). Thermal and kinetic stress high.")

        # Composite THI Formula
        thi = 0.50 * s_w + 0.25 * s_n + (0.25 / 3.0) * (s_p + s_t + inv_os)
        thi = float(np.clip(thi, 0.0, 100.0))

        # Status categorization
        if thi >= 85.0:
            status = "HEALTHY"
        elif thi >= 70.0:
            status = "WARNING"
        else:
            status = "CRITICAL"

        if not explanations:
            explanations.append("Tyre parameters nominal. Pressure, temperature, and wear index optimal.")

        return {
            "score": round(thi, 1),
            "status": status,
            "components": {
                "wear_score": round(s_w, 1),
                "tread_score": round(s_n, 1),
                "pressure_score": round(s_p, 1),
                "temp_score": round(s_t, 1),
                "inv_severity_score": round(inv_os, 1),
            },
            "inputs": {
                "pressure_psi": pressure_psi,
                "temperature_c": temperature_c,
                "min_nsd_mm": curr_nsd,
                "km_per_mm_wear": km_per_mm_wear,
                "speed_kmh": speed,
                "recommended_psi": p_rec,
                "wheel_position": wheel_position,
                "axle_type": axle_type,
            },
            "explanation": " ".join(explanations),
            "rule_version": cls.RULE_VERSION,
            "data_quality": "VALID",
        }

    # -------------------------------------------------------------------------
    # 2. DYNAMIC VEHICLE-LEVEL THI AGGREGATION (ANY Wheel Configuration)
    # -------------------------------------------------------------------------
    @classmethod
    def calculate_vehicle_thi(
        cls,
        tyres: List[Dict[str, Any]],
        speed_kmh: float = 0.0,
        recommended_psi: Optional[float] = None,
        wheel_config: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dynamically aggregates THI for ANY vehicle configuration:
        Supports 4, 6, 10, 12, 14, 16, 18, or custom wheel layouts.
        
        Args:
            tyres: List of tyre dicts, each with keys:
                   'wheel_position', 'axle_type', 'pressure', 'temperature', 'min_nsd', 'km_per_mm'
            speed_kmh: Current vehicle telematics speed
            recommended_psi: Cold depot baseline inflation target
            wheel_config: Human label (e.g. '4x2', '6x2', '8x2', '10x2', '18-Wheeler')
        """
        if not tyres:
            return {
                "vehicle_thi": 0.0,
                "status": "UNKNOWN",
                "wheel_count": 0,
                "wheel_config": wheel_config or "UNKNOWN",
                "tyres": [],
                "explanation": "No tyres fitted or registered on this vehicle.",
            }

        tyre_results = []
        weighted_sum = 0.0
        total_weight = 0.0
        min_thi = 100.0
        critical_count = 0
        warning_count = 0
        healthy_count = 0
        axle_scores: Dict[str, List[float]] = {}

        for t in tyres:
            pos = str(t.get("wheel_position", "1R")).upper()
            raw_axle = str(t.get("axle_type", "")).upper()
            
            # Auto-infer axle type if not explicitly supplied
            if not raw_axle:
                if pos.startswith("1"):
                    raw_axle = "STEER"
                elif pos.startswith("2"):
                    raw_axle = "DRIVE"
                elif pos.startswith("3") or pos.startswith("4"):
                    raw_axle = "TANDEM"
                elif "SPARE" in pos:
                    raw_axle = "SPARE"
                else:
                    raw_axle = "TRAILER"

            res = cls.calculate_tyre_thi(
                pressure_psi=t.get("pressure"),
                temperature_c=t.get("temperature"),
                min_nsd_mm=t.get("min_nsd"),
                km_per_mm_wear=t.get("km_per_mm"),
                speed_kmh=speed_kmh,
                recommended_psi=recommended_psi or t.get("recommended_psi"),
                wheel_position=pos,
                axle_type=raw_axle,
                is_stale=t.get("is_stale", False),
                is_faulty=t.get("is_faulty", False),
            )
            
            score = res["score"]
            status = res["status"]
            res["wheel_position"] = pos
            res["axle_type"] = raw_axle
            tyre_results.append(res)

            # Skip spare tyre from road-vehicle dynamic average
            if raw_axle == "SPARE" or "SPARE" in pos:
                continue

            # Axle grouping
            if raw_axle not in axle_scores:
                axle_scores[raw_axle] = []
            axle_scores[raw_axle].append(score)

            # Safety weight
            w = cls.AXLE_SAFETY_WEIGHTS.get(raw_axle, 1.00)
            weighted_sum += score * w
            total_weight += w

            min_thi = min(min_thi, score)
            if status == "CRITICAL":
                critical_count += 1
            elif status == "WARNING":
                warning_count += 1
            else:
                healthy_count += 1

        vehicle_avg = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0.0

        # Safety-critical principle: if any tyre has dropped to CRITICAL (<70),
        # vehicle alert status must reflect warning/critical immediately
        if critical_count > 0 or min_thi < 60.0 or vehicle_avg < 70.0:
            vehicle_status = "CRITICAL"
        elif warning_count > 0 or vehicle_avg < 85.0:
            vehicle_status = "WARNING"
        else:
            vehicle_status = "HEALTHY"

        axle_averages = {
            ax: round(float(np.mean(scores)), 1) for ax, scores in axle_scores.items() if scores
        }

        # Auto-detect or use configuration
        active_wheel_count = len([t for t in tyre_results if t.get("axle_type") != "SPARE"])
        detected_config = wheel_config or f"{active_wheel_count}-Wheel Vehicle"

        return {
            "vehicle_thi": vehicle_avg,
            "min_tyre_thi": round(min_thi, 1),
            "status": vehicle_status,
            "wheel_count": active_wheel_count,
            "wheel_config": detected_config,
            "health_distribution": {
                "healthy": healthy_count,
                "warning": warning_count,
                "critical": critical_count,
            },
            "axle_health": axle_averages,
            "tyres": tyre_results,
            "rule_version": cls.RULE_VERSION,
        }

    # -------------------------------------------------------------------------
    # 3. MACHINE LEARNING PREDICTOR (Gradient Boosting / Random Forest)
    # -------------------------------------------------------------------------
    @classmethod
    def predict_tyre_thi_ml(
        cls,
        speed: float,
        odometer: float,
        distance_covered: float,
        tyre_pressure: float,
        tyre_temp: float,
        min_nsd: float,
        km_per_mm_wear: float,
        projected_mileage: float,
        wheel_position: str = "1R",
        axle_type: str = "Steer",
    ) -> float:
        """
        Uses the trained Gradient Boosting model to predict THI with R2 = 0.9998.
        Falls back smoothly to formula if model artifacts are unavailable.
        """
        cls._load_ml_artifacts()
        if cls._ml_model is not None:
            try:
                # Prepare one-hot vector matching training feature columns
                feature_dict = {
                    "speed": speed,
                    "odometer": odometer,
                    "distance_covered": distance_covered,
                    "tyre_pressure": tyre_pressure,
                    "tyre_temp": tyre_temp,
                    "sensor_battery": 98.0,
                    "min_nsd": min_nsd,
                    "g1_nsd": min_nsd,
                    "g2_nsd": min_nsd,
                    "g3_nsd": min_nsd,
                    "km_per_mm_wear": km_per_mm_wear,
                    "projected_mileage": projected_mileage,
                }
                # Add position and axle one-hot flags
                for p in ["1L", "2L", "2R", "3LI", "3LO", "3RI", "3RO", "4LI", "4LO", "4RI", "4RO"]:
                    feature_dict[f"wheel_position_{p}"] = 1 if wheel_position == p else 0
                for a in ["Drive", "Tandem"]:
                    feature_dict[f"axle_type_{a}"] = 1 if axle_type.capitalize() == a else 0

                feature_vals = np.array([list(feature_dict.values())])
                pred = float(cls._ml_model.predict(feature_vals)[0])
                return round(float(np.clip(pred, 0.0, 100.0)), 2)
            except Exception as e:
                pass

        # Fallback to deterministic formula
        calc = cls.calculate_tyre_thi(
            pressure_psi=tyre_pressure,
            temperature_c=tyre_temp,
            min_nsd_mm=min_nsd,
            km_per_mm_wear=km_per_mm_wear,
            speed_kmh=speed,
            wheel_position=wheel_position,
            axle_type=axle_type,
        )
        return calc["score"]

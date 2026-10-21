"""
Centralized, Explainable Rule-Based Tyre Health Index (THI) Engine.
Computes a deterministic score in [0, 100] with full factor breakdown and explanation.
Provisional demo settings derived from events.xlsx and JK Tyre baseline calibrations.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone


class THIEngine:
    RULE_VERSION = "v1.0.0-demo-provisional"

    # Baseline Recommended Pressure (psi) by Vehicle Type (from events.xlsx)
    BASELINE_PRESSURES = {
        "HEAVY_TRUCK": 110.0,
        "LIGHT_TRUCK": 65.0,
        "BUS": 105.0,
        "PASSENGER_CAR": 32.0,
    }

    # Provisional demo weights summing to 1.0
    DEFAULT_WEIGHTS = {
        "pressure": 0.40,
        "temperature": 0.25,
        "wear": 0.25,
        "severity_rrc": 0.10,
    }

    @classmethod
    def calculate_thi(
        cls,
        pressure_psi: Optional[float],
        temperature_c: Optional[float],
        current_nsd_mm: Optional[float],
        blueprint_nsd_mm: float = 16.5,
        vehicle_type: str = "HEAVY_TRUCK",
        speed_kmh: Optional[float] = None,
        is_stale: bool = False,
        is_faulty: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates THI score, component breakdown, and plain-text explanation.
        Handles missing, invalid, faulty, and stale data explicitly.
        """
        # 1. Check for faulty sensor or completely missing telemetry
        if is_faulty:
            return {
                "score": 0.0,
                "status": "CRITICAL",
                "components": {
                    "pressure_score": 0.0,
                    "temp_score": 0.0,
                    "wear_score": None,
                    "rrc_score": None,
                },
                "inputs": {
                    "pressure_psi": pressure_psi,
                    "temperature_c": temperature_c,
                    "current_nsd_mm": current_nsd_mm,
                    "is_faulty": True,
                },
                "explanation": "Sensor fault flagged: implausible or corrupted telemetry received. Inspection required immediately.",
                "rule_version": cls.RULE_VERSION,
                "data_quality": "FAULTY_SENSOR",
            }

        if is_stale:
            return {
                "score": 50.0,
                "status": "UNKNOWN",
                "components": {
                    "pressure_score": None,
                    "temp_score": None,
                    "wear_score": None,
                    "rrc_score": None,
                },
                "inputs": {
                    "pressure_psi": pressure_psi,
                    "temperature_c": temperature_c,
                    "current_nsd_mm": current_nsd_mm,
                    "is_stale": True,
                },
                "explanation": "Telemetry stale (> 30 minutes without active TPMS heartbeat). Health cannot be verified.",
                "rule_version": cls.RULE_VERSION,
                "data_quality": "STALE_DATA",
            }

        # Check if critical telemetry is missing
        if pressure_psi is None and temperature_c is None:
            return {
                "score": 50.0,
                "status": "UNKNOWN",
                "components": {
                    "pressure_score": None,
                    "temp_score": None,
                    "wear_score": None,
                    "rrc_score": None,
                },
                "inputs": {
                    "pressure_psi": None,
                    "temperature_c": None,
                    "current_nsd_mm": current_nsd_mm,
                },
                "explanation": "Telemetry unavailable: No pressure or temperature readings received.",
                "rule_version": cls.RULE_VERSION,
                "data_quality": "MISSING_DATA",
            }

        baseline_p = cls.BASELINE_PRESSURES.get(vehicle_type, 110.0)
        explanations = []

        # 2. Pressure Evaluation
        p_score = 100.0
        p_status = "NORMAL"
        if pressure_psi is None or pressure_psi <= 0 or pressure_psi > (2.5 * baseline_p):
            p_score = 0.0
            p_status = "CRITICAL"
            explanations.append(f"Implausible or missing pressure reading ({pressure_psi} psi).")
        else:
            p_dev = (pressure_psi - baseline_p) / baseline_p
            if p_dev < -0.20:
                p_score = 10.0
                p_status = "CRITICAL"
                explanations.append(f"Severe under-inflation ({pressure_psi:.1f} psi, {p_dev*100:.1f}% deviation from {baseline_p:.0f} psi).")
            elif p_dev < -0.10:
                p_score = 65.0
                p_status = "WARNING"
                explanations.append(f"Moderate under-inflation ({pressure_psi:.1f} psi, {p_dev*100:.1f}% deviation).")
            elif p_dev > 0.20:
                p_score = 30.0
                p_status = "CRITICAL"
                explanations.append(f"Severe over-inflation ({pressure_psi:.1f} psi, +{p_dev*100:.1f}% deviation).")
            elif p_dev > 0.10:
                p_score = 75.0
                p_status = "WARNING"
                explanations.append(f"Moderate over-inflation ({pressure_psi:.1f} psi, +{p_dev*100:.1f}% deviation).")
            else:
                p_score = 100.0
                p_status = "NORMAL"

        # 3. Temperature Evaluation
        t_score = 100.0
        t_status = "NORMAL"
        if temperature_c is None or temperature_c < -40 or temperature_c > 150:
            t_score = 0.0
            t_status = "CRITICAL"
            explanations.append(f"Implausible or missing temperature ({temperature_c} °C).")
        elif temperature_c > 85.0:
            t_score = 15.0
            t_status = "CRITICAL"
            explanations.append(f"Dangerous overheating ({temperature_c:.1f} °C > 85 °C limit). Immediate cooling required.")
        elif temperature_c > 65.0:
            t_score = 65.0
            t_status = "WARNING"
            explanations.append(f"Elevated operating temperature ({temperature_c:.1f} °C).")
        elif temperature_c < 0.0:
            t_score = 85.0
            t_status = "WARNING"
            explanations.append(f"Low ambient temperature ({temperature_c:.1f} °C).")
        else:
            t_score = 100.0
            t_status = "NORMAL"

        # 4. Tread Depth / Wear Evaluation
        w_score = 100.0
        w_status = "NORMAL"
        if current_nsd_mm is not None:
            if current_nsd_mm <= 3.0:
                w_score = 0.0
                w_status = "CRITICAL"
                explanations.append(f"Critical tread wear: NSD at {current_nsd_mm:.1f} mm (safety limit 3.0 mm). Immediate replacement required.")
            else:
                pct_wear = max(0.0, min(100.0, ((blueprint_nsd_mm - current_nsd_mm) / blueprint_nsd_mm) * 100.0))
                if pct_wear >= 85.0:
                    w_score = 20.0
                    w_status = "CRITICAL"
                    explanations.append(f"Severe tread wear ({pct_wear:.1f}% worn, {current_nsd_mm:.1f} mm remaining).")
                elif pct_wear >= 70.0:
                    w_score = 55.0
                    w_status = "WARNING"
                    explanations.append(f"High tread wear ({pct_wear:.1f}% worn). Schedule retread/replacement.")
                elif pct_wear >= 50.0:
                    w_score = 80.0
                    w_status = "NORMAL"
                else:
                    w_score = 100.0
                    w_status = "NORMAL"
        else:
            w_score = 90.0  # Default assumption when NSD has not been measured yet

        # 5. Operating Severity / Rolling Resistance (RRC proxy)
        # RRC increases with lower pressure and higher thermal deflection
        rrc_score = 100.0
        if p_score < 70 or t_score < 70:
            rrc_score = min(p_score, t_score)
        else:
            rrc_score = 100.0

        # Weighted calculation
        weights = cls.DEFAULT_WEIGHTS
        final_score = (
            weights["pressure"] * p_score +
            weights["temperature"] * t_score +
            weights["wear"] * w_score +
            weights["severity_rrc"] * rrc_score
        )

        # Safety-critical principle: if any key factor is in CRITICAL or WARNING state,
        # or if final_score breaches threshold (< 60 Critical, 60-80 Warning, >= 80 Healthy),
        # assign status and ensure final_score is aligned with the threshold bands.
        if final_score < 60.0 or p_status == "CRITICAL" or t_status == "CRITICAL" or w_status == "CRITICAL":
            status = "CRITICAL"
            final_score = min(final_score, 55.0, min(p_score, t_score, w_score) + 15.0)
        elif final_score < 80.0 or p_status == "WARNING" or t_status == "WARNING" or w_status == "WARNING":
            status = "WARNING"
            final_score = min(max(final_score, 60.0), 78.0)
        else:
            status = "HEALTHY"

        final_score = max(0.0, min(100.0, round(final_score, 1)))

        if not explanations:
            explanations.append("All tyre operating parameters (pressure, temperature, tread depth) are optimal.")

        return {
            "score": final_score,
            "status": status,
            "components": {
                "pressure_score": round(p_score, 1),
                "temp_score": round(t_score, 1),
                "wear_score": round(w_score, 1),
                "rrc_score": round(rrc_score, 1),
            },
            "inputs": {
                "pressure_psi": pressure_psi,
                "temperature_c": temperature_c,
                "current_nsd_mm": current_nsd_mm,
                "baseline_pressure_psi": baseline_p,
                "speed_kmh": speed_kmh,
            },
            "explanation": " ".join(explanations),
            "rule_version": cls.RULE_VERSION,
            "data_quality": "VALID",
        }

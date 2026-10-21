"""
Centralized Trip Score Calculation Engine.
Calculates an explainable Trip Score in [0, 100] evaluating driver operating behavior,
pressure compliance during journey, thermal accumulation, and speed compliance.
Provisional demo settings clearly labelled.
"""

from typing import Dict, Any, List, Optional


class TripScoreEngine:
    RULE_VERSION = "v1.0.0-trip-provisional"

    @classmethod
    def calculate_trip_score(
        cls,
        telemetry_samples: List[Dict[str, Any]],
        baseline_pressure: float = 110.0,
        baseline_mileage: float = 4.5,
    ) -> Dict[str, Any]:
        """
        Calculates trip score and factor breakdown from trip telemetry stream.
        """
        if not telemetry_samples:
            return {
                "trip_score": 85.0,
                "status": "GOOD",
                "components": {
                    "pressure_compliance": 85.0,
                    "thermal_stability": 90.0,
                    "speed_compliance": 85.0,
                    "fuel_efficiency": 85.0,
                },
                "explanation": "No high-frequency telemetry samples recorded; provisional standard score assigned.",
                "sample_count": 0,
            }

        sample_count = len(telemetry_samples)
        pressures = [s.get("pressure_psi") for s in telemetry_samples if s.get("pressure_psi") is not None]
        temperatures = [s.get("temperature_c") for s in telemetry_samples if s.get("temperature_c") is not None]
        speeds = [s.get("speed_kmh") for s in telemetry_samples if s.get("speed_kmh") is not None]

        explanations = []

        # 1. Pressure Compliance during trip
        if pressures:
            deviations = [abs(p - baseline_pressure) / baseline_pressure for p in pressures]
            severe_under = sum(1 for d, p in zip(deviations, pressures) if p < baseline_pressure and d > 0.15)
            compliance_ratio = 1.0 - (severe_under / len(pressures))
            pressure_comp_score = max(20.0, min(100.0, round(compliance_ratio * 100.0, 1)))
            if severe_under > 0:
                explanations.append(f"Recorded {severe_under} instances of significant under-inflation during journey.")
        else:
            pressure_comp_score = 80.0

        # 2. Thermal Stability
        if temperatures:
            max_temp = max(temperatures)
            high_temp_count = sum(1 for t in temperatures if t > 70.0)
            if max_temp > 85.0:
                thermal_score = 30.0
                explanations.append(f"Severe thermal spike detected ({max_temp:.1f} °C). High risk of tyre delamination.")
            elif high_temp_count > 0:
                thermal_score = max(50.0, 100.0 - (high_temp_count / len(temperatures) * 50.0))
                explanations.append(f"Tyre operated at elevated temperatures (> 70 °C) in {high_temp_count} telemetry samples.")
            else:
                thermal_score = 100.0
        else:
            thermal_score = 85.0

        # 3. Speed Compliance & Harsh Driving
        if speeds:
            over_speed_count = sum(1 for sp in speeds if sp > 85.0)
            excessive_speed = sum(1 for sp in speeds if sp > 100.0)
            if excessive_speed > 0:
                speed_score = max(20.0, 60.0 - (excessive_speed * 5.0))
                explanations.append(f"Excessive speed violations (> 100 km/h) recorded {excessive_speed} times.")
            elif over_speed_count > 0:
                speed_score = max(50.0, 100.0 - (over_speed_count / len(speeds) * 60.0))
                explanations.append(f"Speed exceeded 85 km/h commercial threshold in {over_speed_count} instances.")
            else:
                speed_score = 100.0
        else:
            speed_score = 85.0

        # 4. Fuel & Operating Efficiency
        efficiency_score = 90.0

        # Weighted aggregate
        final_score = round(
            0.35 * pressure_comp_score +
            0.25 * thermal_score +
            0.25 * speed_score +
            0.15 * efficiency_score,
            1,
        )

        if final_score >= 85.0:
            status = "EXCELLENT"
        elif final_score >= 70.0:
            status = "GOOD"
        elif final_score >= 50.0:
            status = "AVERAGE"
        else:
            status = "POOR"

        if not explanations:
            explanations.append("Smooth trip with high pressure compliance and optimal thermal profile.")

        return {
            "trip_score": final_score,
            "status": status,
            "components": {
                "pressure_compliance": round(pressure_comp_score, 1),
                "thermal_stability": round(thermal_score, 1),
                "speed_compliance": round(speed_score, 1),
                "fuel_efficiency": round(efficiency_score, 1),
            },
            "explanation": " ".join(explanations),
            "sample_count": sample_count,
            "rule_version": cls.RULE_VERSION,
        }

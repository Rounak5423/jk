"""
Tyre Wear & Remaining Useful Life (RUL) estimation engine.
Calculates wear trends from reliable historical NSD and distance measurements.
"""

from typing import Dict, Any, List, Optional


class WearEngine:
    MIN_DISTANCE_KM = 1000.0
    CRITICAL_LIMIT_NSD_MM = 3.0

    @classmethod
    def estimate_remaining_life(
        cls,
        blueprint_nsd: float,
        current_nsd: float,
        total_km_run: float,
        inspection_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Estimates remaining tyre life only when sufficient historical tread and distance data support it.
        Otherwise returns clear 'Insufficient history to estimate' status.
        """
        usable_tread = max(0.0, current_nsd - cls.CRITICAL_LIMIT_NSD_MM)

        # Need at least MIN_DISTANCE_KM and measurable wear
        worn_mm = blueprint_nsd - current_nsd
        if total_km_run < cls.MIN_DISTANCE_KM or worn_mm <= 0.1:
            return {
                "remaining_life_km": None,
                "projected_total_km": None,
                "wear_rate_per_10k_km": None,
                "status": "INSUFFICIENT_HISTORY",
                "message": "Insufficient history to estimate. Requires at least 1,000 km and measurable wear.",
                "confidence": "NONE",
            }

        # Wear rate in mm worn per 1,000 km
        wear_rate_per_km = worn_mm / total_km_run
        wear_rate_per_10k_km = round(wear_rate_per_km * 10000.0, 2)

        if wear_rate_per_km <= 0:
            return {
                "remaining_life_km": None,
                "projected_total_km": None,
                "wear_rate_per_10k_km": 0.0,
                "status": "INSUFFICIENT_HISTORY",
                "message": "Insufficient history to estimate.",
                "confidence": "NONE",
            }

        projected_remaining_km = round(usable_tread / wear_rate_per_km, 0)
        projected_total_km = round(total_km_run + projected_remaining_km, 0)

        confidence = "HIGH" if (inspection_history and len(inspection_history) >= 3 and total_km_run > 10000) else "MODERATE"

        return {
            "remaining_life_km": projected_remaining_km,
            "projected_total_km": projected_total_km,
            "wear_rate_per_10k_km": wear_rate_per_10k_km,
            "status": "ESTIMATED",
            "message": f"Estimated {projected_remaining_km:,.0f} km remaining until 3.0 mm critical safety limit.",
            "confidence": confidence,
            "assumptions": "Linear wear progression assumed based on accumulated mileage and observed NSD degradation.",
        }

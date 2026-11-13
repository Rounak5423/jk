"""
RUL Service Integration for JK Tyre Fleet Intelligence Platform.
Bridges the RUL predictor with existing Vehicle/Tyre models.
"""
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
from datetime import datetime

from .rul_predictor import RULPredictor
from .wear_engine import WearEngine


class RULService:
    """
    Service layer for Remaining Useful Life predictions.
    Handles data transformation between JK Tyre models and RUL predictor.
    """
    
    _predictor = None
    _model_available = False
    
    @classmethod
    def _get_predictor(cls) -> Optional[RULPredictor]:
        """Lazy load the RUL predictor."""
        if cls._predictor is None:
            try:
                cls._predictor = RULPredictor()
                cls._model_available = True
            except (FileNotFoundError, Exception) as e:
                print(f"RUL model not available: {e}")
                cls._model_available = False
                cls._predictor = None
        return cls._predictor
    
    @classmethod
    def is_model_available(cls) -> bool:
        """Check if trained RUL model is available."""
        cls._get_predictor()
        return cls._model_available
    
    @classmethod
    def prepare_inspection_history(cls, inspections: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Transform inspection data from JK Tyre format to RUL model format.
        
        Parameters:
        -----------
        inspections : list of dicts
            Inspection records with keys: inspection_date, nsd_fl_mm, nsd_fr_mm, etc.
            OR g1_mm, g2_mm, g3_mm for groove depths
        
        Returns:
        --------
        pd.DataFrame formatted for RUL predictor
        """
        if not inspections:
            return pd.DataFrame()
        
        rows = []
        for idx, insp in enumerate(inspections):
            # Check if groove depths are provided directly
            if "g1_mm" in insp and "g2_mm" in insp and "g3_mm" in insp:
                # Use provided groove depths
                g1 = insp["g1_mm"]
                g2 = insp["g2_mm"]
                g3 = insp["g3_mm"]
            else:
                # Use single NSD value for all grooves (fallback)
                nsd = insp.get("nsd_fl_mm", insp.get("nsd_fr_mm", 10.0))
                g1 = g2 = g3 = nsd
            
            row = {
                "tyre_id": insp.get("tyre_id", "unknown"),
                "position": insp.get("position", "FL"),
                "km_covered_km": insp.get("odometer_km", 0),
                "odometer_km": insp.get("odometer_km", 0),
                "g1_mm": g1,
                "g2_mm": g2,
                "g3_mm": g3,
                "otd_mm": insp.get("otd_mm", 16.0),
                "inspection_no": idx + 1,
                "inspection": f"K{idx + 2}",
                "inspection_date": insp.get("inspection_date"),
            }
            
            # Add sensor data if available
            if "pressure_mean" in insp:
                row["pressure_mean_prev"] = insp.get("pressure_mean")
                row["pressure_std_prev"] = insp.get("pressure_std", 0)
                row["temp_mean_prev"] = insp.get("temp_mean", 70)
                row["temp_max_prev"] = insp.get("temp_max", 80)
            
            rows.append(row)
        
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    
    @classmethod
    def predict_rul(
        cls,
        tyre_id: int,
        inspection_history: List[Dict[str, Any]],
        d_limit: float = 1.6,
        latest_only: bool = True
    ) -> Dict[str, Any]:
        """
        Predict Remaining Useful Life for a tyre.
        
        Parameters:
        -----------
        tyre_id : int
            Tyre ID from database
        inspection_history : list
            Historical inspection records
        d_limit : float
            Minimum safe tread depth threshold (mm)
        latest_only : bool
            Return only latest prediction
        
        Returns:
        --------
        dict with RUL prediction results
        """
        predictor = cls._get_predictor()
        
        # Fallback to formula-based method if model unavailable
        if not cls._model_available or predictor is None:
            return cls._fallback_prediction(inspection_history, d_limit)
        
        try:
            # Prepare data
            history_df = cls.prepare_inspection_history(inspection_history)
            
            if history_df.empty:
                return {
                    "status": "ERROR",
                    "message": "No valid inspection history",
                    "rul_km": None,
                    "confidence": "UNAVAILABLE"
                }
            
            # Get predictions
            predictions = predictor.predict(history_df, d_limit=d_limit, latest_only=latest_only)
            
            if predictions.empty:
                return cls._fallback_prediction(inspection_history, d_limit)
            
            # Format response
            latest = predictions.iloc[0] if latest_only else predictions.to_dict('records')
            
            if latest_only:
                return cls._format_prediction(latest)
            else:
                return [cls._format_prediction(row) for row in latest]
                
        except Exception as e:
            print(f"RUL prediction error: {e}")
            return cls._fallback_prediction(inspection_history, d_limit)
    
    @classmethod
    def _format_prediction(cls, pred: pd.Series) -> Dict[str, Any]:
        """Format a single prediction row for API response."""
        return {
            "tyre_id": str(pred.get("tyre_id", "")),
            "position": pred.get("position", ""),
            "inspection_date": str(pred.get("inspection_date", "")),
            "current_tread_avg_mm": round(float(pred.get("d_avg_mm", 0)), 2),
            "current_tread_min_mm": round(float(pred.get("d_min_mm", 0)), 2),
            "initial_tread_mm": round(float(pred.get("d_initial_mm", 0)), 2),
            "threshold_limit_mm": round(float(pred.get("d_limit_mm", 0)), 2),
            "remaining_tread_mm": round(float(pred.get("remaining_tread_mm", 0)), 2),
            "remaining_tread_pct": round(float(pred.get("remaining_tread_pct", 0)), 1),
            "km_covered": round(float(pred.get("km_covered_km", 0)), 0),
            "rul_ml_km": round(float(pred.get("rul_ml_km", 0)), 0) if pd.notna(pred.get("rul_ml_km")) else None,
            "rul_formula_km": round(float(pred.get("rul_formula_km", 0)), 0) if pd.notna(pred.get("rul_formula_km")) else None,
            "rul_recommended_km": round(float(pred.get("rul_recommended_km", 0)), 0) if pd.notna(pred.get("rul_recommended_km")) else None,
            "rul_low_80pct_km": round(float(pred.get("rul_low_80pct_km", 0)), 0) if pd.notna(pred.get("rul_low_80pct_km")) else None,
            "rul_high_80pct_km": round(float(pred.get("rul_high_80pct_km", 0)), 0) if pd.notna(pred.get("rul_high_80pct_km")) else None,
            "wear_rate_ml_mm_per_km": round(float(pred.get("wear_rate_ml_mm_per_km", 0)), 6) if pd.notna(pred.get("wear_rate_ml_mm_per_km")) else None,
            "wear_rate_formula_mm_per_km": round(float(pred.get("wear_rate_formula_mm_per_km", 0)), 6) if pd.notna(pred.get("wear_rate_formula_mm_per_km")) else None,
            "cumulative_wear_rate_mm_per_km": round(float(pred.get("cum_rate_avg_mm_per_km", 0)), 6),
            "threshold_km": round(float(pred.get("k_threshold_tyre_km", 0)), 0) if pd.notna(pred.get("k_threshold_tyre_km")) else None,
            "recommended_method": pred.get("recommended_method", "FORMULA"),
            "status": pred.get("status", "OK"),
            "confidence": pred.get("confidence", "MEDIUM"),
            "model_available": True,
        }
    
    @classmethod
    def _fallback_prediction(cls, inspection_history: List[Dict[str, Any]], d_limit: float) -> Dict[str, Any]:
        """
        Fallback to existing WearEngine when ML model unavailable.
        Uses the same formulas as the RUL model: RUL = remaining_tread / wear_rate
        """
        if not inspection_history:
            return {
                "status": "ERROR",
                "message": "No inspection history",
                "rul_km": None,
                "confidence": "UNAVAILABLE",
                "model_available": False
            }
        
        latest = inspection_history[-1]
        
        # Extract groove depths if available, otherwise use single NSD value
        if "g1_mm" in latest and "g2_mm" in latest and "g3_mm" in latest:
            # Use groove depths (matches RUL model formulas exactly)
            g1 = latest.get("g1_mm", 0)
            g2 = latest.get("g2_mm", 0)
            g3 = latest.get("g3_mm", 0)
            d_avg = (g1 + g2 + g3) / 3
            d_min = min(g1, g2, g3)
            current_nsd = d_avg  # Use average for wear rate calculation
        else:
            # Fallback to single NSD value
            current_nsd = latest.get("nsd_fl_mm", 10.0)
            d_min = current_nsd
        
        blueprint_nsd = latest.get("otd_mm", 16.0)
        total_km = latest.get("odometer_km", 0)
        
        # Calculate using your RUL formula: RUL = max(0, d_min - d_limit) / wear_rate
        remaining_tread = max(0, d_min - d_limit)
        wear_total = blueprint_nsd - current_nsd
        
        if total_km > 0 and wear_total > 0:
            wear_rate = wear_total / total_km  # mm/km
            rul_km = remaining_tread / wear_rate if wear_rate > 0 else None
            wear_rate_per_10k = wear_rate * 10000
            
            return {
                "status": "ESTIMATED",
                "message": f"Estimated {rul_km:,.0f} km remaining until {d_limit} mm threshold" if rul_km else "Unable to estimate",
                "rul_km": round(rul_km) if rul_km else None,
                "projected_total_km": round(total_km + rul_km) if rul_km else None,
                "wear_rate_per_10k_km": round(wear_rate_per_10k, 2),
                "confidence": "HIGH" if total_km > 10000 and wear_total > 1.0 else "MODERATE",
                "method": "FORMULA_FALLBACK",
                "model_available": False,
                "assumptions": f"Linear wear: {wear_rate:.6f} mm/km based on {total_km:,.0f} km history"
            }
        else:
            return {
                "status": "INSUFFICIENT_HISTORY",
                "message": "Insufficient history to estimate",
                "rul_km": None,
                "confidence": "UNAVAILABLE",
                "method": "FORMULA_FALLBACK",
                "model_available": False
            }
    
    @classmethod
    def compare_with_formula(cls, tyre_id: int, inspection_history: List[Dict[str, Any]], d_limit: float = 1.6) -> Dict[str, Any]:
        """
        Compare ML predictions with formula-based calculations.
        Useful for validation and testing.
        """
        ml_result = cls.predict_rul(tyre_id, inspection_history, d_limit)
        formula_result = cls._fallback_prediction(inspection_history, d_limit)
        
        return {
            "tyre_id": tyre_id,
            "ml_prediction": ml_result,
            "formula_prediction": formula_result,
            "comparison": {
                "rul_difference_km": (
                    ml_result.get("rul_recommended_km", 0) - formula_result.get("rul_km", 0)
                    if ml_result.get("rul_recommended_km") and formula_result.get("rul_km")
                    else None
                ),
                "ml_available": ml_result.get("model_available", False)
            }
        }

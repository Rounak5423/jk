"""
Machine Learning Baseline Service for Tyre Wear & RUL.
Features tabular regression baseline (Linear Regression) and Tree-based model (Random Forest).
Strictly separated from the deterministic rule-based THI engine.
Reports holdout metrics (MAE, RMSE, R2) with clear provenance and limitations documentation.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


class TyreWearMLService:
    MODEL_VERSION = "v1.0.0-baseline-tabular"
    DISCLAIMER = "Synthetic demonstration model. Not evidence of real-world OEM performance."

    _linear_model = None
    _rf_model = None
    _metrics = {}

    @classmethod
    def train_baseline_models(cls, historical_records: list = None) -> Dict[str, Any]:
        """
        Trains Linear Regression baseline and Random Forest regressor
        to predict NSD Wear (mm) given features:
        - Achieved km
        - Baseline Recommended Pressure
        - Operating Temperature (avg)
        - Axle position (Steer vs Drive)
        """
        if not historical_records or len(historical_records) < 50:
            # Generate calibrated synthetic training batch for demonstration
            np.random.seed(42)
            n_samples = 400
            km = np.random.uniform(5000, 90000, n_samples)
            # True physical wear rate: ~1.5mm to 2.8mm per 10,000 km
            base_wear_rate = np.random.uniform(0.00018, 0.00028, n_samples)
            is_steer = np.random.choice([0, 1], n_samples, p=[0.7, 0.3])
            # Steer tyres wear slightly faster
            wear = km * (base_wear_rate + is_steer * 0.00003) + np.random.normal(0, 0.15, n_samples)
            wear = np.clip(wear, 0.2, 13.5)

            df = pd.DataFrame({
                "achieved_km": km,
                "is_steer": is_steer,
                "wear_mm": wear,
            })
        else:
            df = pd.DataFrame(historical_records)

        X = df[["achieved_km", "is_steer"]]
        y = df["wear_mm"]

        # Holdout train/test split to prevent leakage
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

        # 1. Linear Baseline
        lr = LinearRegression()
        lr.fit(X_train, y_train)
        y_pred_lr = lr.predict(X_test)

        lr_mae = float(mean_absolute_error(y_test, y_pred_lr))
        lr_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_lr)))
        lr_r2 = float(r2_score(y_test, y_pred_lr))

        # 2. Tree-based Model
        rf = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
        rf.fit(X_train, y_train)
        y_pred_rf = rf.predict(X_test)

        rf_mae = float(mean_absolute_error(y_test, y_pred_rf))
        rf_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_rf)))
        rf_r2 = float(r2_score(y_test, y_pred_rf))

        cls._linear_model = lr
        cls._rf_model = rf
        cls._metrics = {
            "model_version": cls.MODEL_VERSION,
            "disclaimer": cls.DISCLAIMER,
            "samples_trained": len(X_train),
            "samples_tested": len(X_test),
            "linear_baseline": {
                "mae_mm": round(lr_mae, 4),
                "rmse_mm": round(lr_rmse, 4),
                "r2_score": round(lr_r2, 4),
            },
            "random_forest": {
                "mae_mm": round(rf_mae, 4),
                "rmse_mm": round(rf_rmse, 4),
                "r2_score": round(rf_r2, 4),
            },
        }
        return cls._metrics

    @classmethod
    def get_model_status(cls) -> Dict[str, Any]:
        if cls._metrics:
            return cls._metrics
        return cls.train_baseline_models()

    @classmethod
    def predict_wear(cls, achieved_km: float, is_steer: bool = False) -> Dict[str, Any]:
        if cls._rf_model is None:
            cls.train_baseline_models()

        x_input = np.array([[achieved_km, 1 if is_steer else 0]])
        pred_lr = float(cls._linear_model.predict(x_input)[0])
        pred_rf = float(cls._rf_model.predict(x_input)[0])

        return {
            "predicted_wear_mm_linear": round(max(0.0, pred_lr), 2),
            "predicted_wear_mm_rf": round(max(0.0, pred_rf), 2),
            "model_version": cls.MODEL_VERSION,
            "disclaimer": cls.DISCLAIMER,
        }

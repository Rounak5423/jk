"""
Diagnostic Script: Evaluates Overfitting, Cross-Validation, and Comprehensive Accuracy Metrics.
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import KFold, cross_val_score, cross_validate, train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, mean_absolute_percentage_error

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data_source"
PICKLE_PATH = DATA_DIR / "trip2_data.pkl"
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_FILE = MODEL_DIR / "adaptive_trip_score_model.pkl"

def run_diagnostic():
    # 1. Load data
    with open(PICKLE_PATH, "rb") as f:
        df = pickle.load(f)

    # Import segmentation and feature extraction from train_trip_model
    from train_trip_model import (
        calculate_infographic_trip_score,
        extract_driving_pattern_features
    )

    total_samples = len(df)
    speeds = df["speed"].astype(float).values
    dt = 6.0
    dv = np.diff(speeds, prepend=speeds[0])
    accels = np.abs(dv / (3.6 * dt))
    pres_cols = [c for c in df.columns if "Pres" in c or "Pressure" in c]
    temp_cols = [c for c in df.columns if "Temp" in c]
    pres_mat = df[pres_cols].astype(float).values
    temp_mat = df[temp_cols].astype(float).values

    fleet_baselines = {
        "v_mean": float(np.mean(speeds)),
        "v_std": float(np.std(speeds)),
        "a_mean": float(np.mean(accels)),
        "a_std": float(np.std(accels)),
        "p_dev_mean": float(np.mean(np.abs(pres_mat - 130.0))),
        "p_dev_std": float(np.std(np.abs(pres_mat - 130.0))),
        "t_mean": float(np.mean(temp_mat)),
        "t_std": float(np.std(temp_mat)),
    }

    # Extract trips
    trip_records = []
    step = 400
    for start_idx in range(0, total_samples - 600, step):
        chunk = df.iloc[start_idx : start_idx + 600]
        ground_truth = calculate_infographic_trip_score(chunk, learned_baselines=fleet_baselines)
        feats = extract_driving_pattern_features(chunk)
        row_dict = {**feats}
        row_dict["trip_score"] = ground_truth["trip_score"]
        trip_records.append(row_dict)

    dataset_df = pd.DataFrame(trip_records)

    feature_cols = [
        "mean_speed", "max_speed", "speed_std", "overspeed_ratio", "idle_ratio", "cruising_ratio",
        "mean_abs_accel", "max_accel", "max_decel", "accel_std",
        "harsh_accel_events", "harsh_brake_events", "rapid_accel_events", "rapid_brake_events",
        "mean_abs_jerk", "mean_pressure", "pressure_std", "max_pressure_dev",
        "mean_temperature", "max_temperature", "temp_range", "total_distance_km"
    ]

    X = dataset_df[feature_cols].values
    y = dataset_df["trip_score"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 2. Check current model artifact
    with open(MODEL_FILE, "rb") as f:
        artifact = pickle.load(f)
    current_model = artifact["model"]

    # Evaluate on Train vs Test
    y_train_pred = current_model.predict(X_train)
    y_test_pred = current_model.predict(X_test)

    train_r2 = r2_score(y_train, y_train_pred)
    train_mae = mean_absolute_error(y_train, y_train_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))

    test_r2 = r2_score(y_test, y_test_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_mape = mean_absolute_percentage_error(y_test, y_test_pred) * 100

    print("=" * 65)
    print("TRAIN VS TEST COMPARISON (OVERFITTING CHECK):")
    print("=" * 65)
    print(f"Train R²: {train_r2:.4f}  |  Test R²: {test_r2:.4f}  (Difference: {train_r2 - test_r2:.4f})")
    print(f"Train MAE: {train_mae:.4f} |  Test MAE: {test_mae:.4f} (Difference: {test_mae - train_mae:.4f} score points)")
    print(f"Train RMSE: {train_rmse:.4f} | Test RMSE: {test_rmse:.4f}")
    print(f"Test MAPE: {test_mape:.3f}% (Prediction accuracy: {100.0 - test_mape:.3f}%)")

    # Accuracy within tolerance thresholds
    test_errors = np.abs(y_test - y_test_pred)
    within_01 = np.mean(test_errors <= 0.1) * 100
    within_025 = np.mean(test_errors <= 0.25) * 100
    within_05 = np.mean(test_errors <= 0.5) * 100
    within_10 = np.mean(test_errors <= 1.0) * 100

    print("\n" + "=" * 65)
    print("ACCURACY WITHIN ERROR TOLERANCE BOUNDS (TEST SET):")
    print("=" * 65)
    print(f"Predictions within ±0.10 points: {within_01:.1f}%")
    print(f"Predictions within ±0.25 points: {within_025:.1f}%")
    print(f"Predictions within ±0.50 points: {within_05:.1f}%")
    print(f"Predictions within ±1.00 points: {within_10:.1f}%")

    # 3. K-Fold Cross Validation (5-Fold)
    print("\n" + "=" * 65)
    print("5-FOLD CROSS-VALIDATION (GENERALIZATION CHECK):")
    print("=" * 65)
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(current_model, X, y, cv=cv, scoring="r2")
    cv_mae = -cross_val_score(current_model, X, y, cv=cv, scoring="neg_mean_absolute_error")
    
    print(f"CV R² scores across folds: {[round(s, 4) for s in cv_r2]}")
    print(f"Mean CV R²: {np.mean(cv_r2):.4f} ± {np.std(cv_r2):.4f}")
    print(f"CV MAE across folds: {[round(s, 4) for s in cv_mae]}")
    print(f"Mean CV MAE: {np.mean(cv_mae):.4f} ± {np.std(cv_mae):.4f}")

    # 4. Compare with regularized / pruned models
    print("\n" + "=" * 65)
    print("TESTING REGULARIZATION TO CHECK / REDUCE ANY OVERFITTING GAP:")
    print("=" * 65)
    
    regularized_rf = RandomForestRegressor(
        n_estimators=150,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42
    )
    regularized_rf.fit(X_train, y_train)
    r_train_r2 = r2_score(y_train, regularized_rf.predict(X_train))
    r_test_r2 = r2_score(y_test, regularized_rf.predict(X_test))
    r_train_mae = mean_absolute_error(y_train, regularized_rf.predict(X_train))
    r_test_mae = mean_absolute_error(y_test, regularized_rf.predict(X_test))

    print(f"Regularized RF -> Train R²: {r_train_r2:.4f} | Test R²: {r_test_r2:.4f} (Gap: {r_train_r2 - r_test_r2:.4f})")
    print(f"Regularized RF -> Train MAE: {r_train_mae:.4f} | Test MAE: {r_test_mae:.4f}")

    # Gradient Boosting check
    gbr = GradientBoostingRegressor(
        n_estimators=100, learning_rate=0.05, max_depth=3, subsample=0.8, random_state=42
    )
    gbr.fit(X_train, y_train)
    g_train_r2 = r2_score(y_train, gbr.predict(X_train))
    g_test_r2 = r2_score(y_test, gbr.predict(X_test))
    g_train_mae = mean_absolute_error(y_train, gbr.predict(X_train))
    g_test_mae = mean_absolute_error(y_test, gbr.predict(X_test))
    print(f"Regularized GBR -> Train R²: {g_train_r2:.4f} | Test R²: {g_test_r2:.4f} (Gap: {g_train_r2 - g_test_r2:.4f})")
    print(f"Regularized GBR -> Train MAE: {g_train_mae:.4f} | Test MAE: {g_test_mae:.4f}")


if __name__ == "__main__":
    run_diagnostic()


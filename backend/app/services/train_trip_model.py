"""
Trip Telematics Ingestion, Formula-based Scoring, and ML Self-Learning Training Pipeline
Based on the Final Adaptive & Relative Driver Trip Scoring Formula.
"""

import os
import sys
import time
import json
import pickle
import numpy as np
import pandas as pd
import openpyxl
from datetime import datetime
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge
from sklearn.cluster import KMeans
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data_source"
EXCEL_PATH = DATA_DIR / "trip2 data.xlsx"
PICKLE_PATH = DATA_DIR / "trip2_data.pkl"
MODEL_SAVE_DIR = Path(__file__).resolve().parent / "models"
MODEL_SAVE_DIR.mkdir(parents=True, exist_ok=True)


def load_telemetry_data():
    """Loads 158,400 rows of 6-second telematics data, using pickle cache if available."""
    if PICKLE_PATH.exists():
        print(f"Loading cached telematics data from {PICKLE_PATH}...")
        t0 = time.time()
        with open(PICKLE_PATH, "rb") as f:
            df = pickle.load(f)
        print(f"Loaded {len(df)} records in {time.time() - t0:.2f}s")
        return df

    print(f"Parsing raw Excel from {EXCEL_PATH} (this happens only once)...")
    t0 = time.time()
    wb = openpyxl.load_workbook(str(EXCEL_PATH), read_only=True, data_only=True)
    sheet = wb[wb.sheetnames[0]]

    rows = []
    headers = None
    for i, row in enumerate(sheet.iter_rows(values_only=True)):
        if i == 0:
            headers = list(row)
        else:
            if row[0] is not None:
                rows.append(row)

    df = pd.DataFrame(rows, columns=headers)
    print(f"Parsed {len(df)} rows in {time.time() - t0:.2f}s. Saving pickle cache...")
    with open(PICKLE_PATH, "wb") as f:
        pickle.dump(df, f, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"Saved {PICKLE_PATH} successfully!")
    return df


def calculate_infographic_trip_score(
    samples_df: pd.DataFrame,
    v_limit: float = 80.0,
    p_target: float = 130.0,
    t_warn: float = 45.0,
    t_critical: float = 55.0,
    learned_baselines: dict = None
) -> dict:
    """
    Implements the exact 'Final Adaptive & Relative Driver Trip Scoring Formula' from the specification.
    
    1. Overall Score: S = 0.50 * Sv + 0.30 * Sd + 0.20 * St
    2. Blended Severity: Ei = alpha * E_abs + (1 - alpha) * E_rel (alpha = 0.8)
    3. Relative Severity: z = (x - mu) / sigma, E_rel = clip((|z| - zw) / (zc - zw), 0, 1), zw=2, zc=3
    4. Duration-Weighted Risk: Rj = sum(Ei * Di) / T
    5. Component Score: Sj = 100 * exp(-kj * Rj)
    6. Speed: kv = 2.0, v_critical = v_limit + 15
    7. Smoothness: a_i = (v_i - v_{i-1}) / (3.6 * dt), aw = 2.0 m/s^2, ac = 3.0 m/s^2, kd = 2.5
    8. Tyre: St = 0.60 * Sp + 0.40 * Stemp, kp = 2.0, kt = 2.0
    """
    n_samples = len(samples_df)
    if n_samples < 2:
        return {"trip_score": 85.0, "status": "GOOD", "components": {}}

    dt = 6.0  # sensor frequency 6 seconds
    total_duration_t = n_samples * dt

    # Speed series
    speeds = samples_df["speed"].astype(float).values
    
    # Tyre pressures and temperatures
    pres_cols = [c for c in samples_df.columns if "Pres" in c or "Pressure" in c]
    temp_cols = [c for c in samples_df.columns if "Temp" in c]
    
    # Multi-tyre vehicle: compute mean and worst-case per sample
    pres_mat = samples_df[pres_cols].astype(float).values
    temp_mat = samples_df[temp_cols].astype(float).values
    
    # Baselines for relative scoring
    if not learned_baselines:
        learned_baselines = {
            "v_mean": 37.5, "v_std": 26.4,
            "a_mean": 0.85, "a_std": 0.90,
            "p_dev_mean": 0.50, "p_dev_std": 0.40,
            "t_mean": 37.6, "t_std": 2.5
        }

    alpha = 0.8
    zw, zc = 2.0, 3.0

    def compute_rel_severity(x_vals, mu, sigma):
        z = (x_vals - mu) / (sigma if sigma > 1e-4 else 1.0)
        e_rel = np.clip((np.abs(z) - zw) / (zc - zw), 0.0, 1.0)
        return e_rel

    # ---------------- 1. Speed Compliance (Sv) ----------------
    v_critical = v_limit + 15.0
    e_abs_v = np.clip((speeds - v_limit) / (v_critical - v_limit), 0.0, 1.0)
    e_rel_v = compute_rel_severity(speeds, learned_baselines["v_mean"], learned_baselines["v_std"])
    e_v = alpha * e_abs_v + (1 - alpha) * e_rel_v
    # Risk burden
    r_v = np.sum(e_v * dt) / total_duration_t
    k_v = 2.0
    s_v = float(100.0 * np.exp(-k_v * r_v))

    # ---------------- 2. Driving Smoothness (Sd) ----------------
    # Acceleration in m/s^2: a_i = (v_i - v_{i-1}) / (3.6 * dt)
    dv = np.diff(speeds, prepend=speeds[0])
    accel = dv / (3.6 * dt)
    abs_accel = np.abs(accel)
    
    aw, ac = 2.0, 3.0
    e_abs_d = np.clip((abs_accel - aw) / (ac - aw), 0.0, 1.0)
    e_rel_d = compute_rel_severity(abs_accel, learned_baselines["a_mean"], learned_baselines["a_std"])
    e_d = alpha * e_abs_d + (1 - alpha) * e_rel_d
    r_d = np.sum(e_d * dt) / total_duration_t
    k_d = 2.5
    s_d = float(100.0 * np.exp(-k_d * r_d))

    # ---------------- 3. Tyre Safety (St) ----------------
    # Pressure Score (Sp): evaluate deviations across all tyres on vehicle
    p_devs = np.abs(pres_mat - p_target)
    # Average deviation across wheels per timestamp
    mean_p_dev = np.mean(p_devs, axis=1)
    p_crit_dev = 15.0  # 15 PSI deviation is critical
    e_abs_p = np.clip(mean_p_dev / p_crit_dev, 0.0, 1.0)
    e_rel_p = compute_rel_severity(mean_p_dev, learned_baselines["p_dev_mean"], learned_baselines["p_dev_std"])
    e_p = alpha * e_abs_p + (1 - alpha) * e_rel_p
    r_p = np.sum(e_p * dt) / total_duration_t
    k_p = 2.0
    s_p = float(100.0 * np.exp(-k_p * r_p))

    # Temperature Score (Stemp)
    max_temps_per_sample = np.max(temp_mat, axis=1)
    e_abs_t = np.clip((max_temps_per_sample - t_warn) / (t_critical - t_warn), 0.0, 1.0)
    e_rel_t = compute_rel_severity(max_temps_per_sample, learned_baselines["t_mean"], learned_baselines["t_std"])
    e_t = alpha * e_abs_t + (1 - alpha) * e_rel_t
    r_t = np.sum(e_t * dt) / total_duration_t
    k_t = 2.0
    s_temp = float(100.0 * np.exp(-k_t * r_t))

    # Combine into Tyre Safety Score: St = 0.60 * Sp + 0.40 * Stemp
    s_t = 0.60 * s_p + 0.40 * s_temp

    # ---------------- 4. Overall Trip Score (S) ----------------
    # S = 0.50 * Sv + 0.30 * Sd + 0.20 * St
    final_score = 0.50 * s_v + 0.30 * s_d + 0.20 * s_t

    # Status classification (Section 10 of Infographic)
    if final_score >= 90.0:
        status = "EXCELLENT"
    elif final_score >= 75.0:
        status = "GOOD"
    elif final_score >= 60.0:
        status = "NEEDS_IMPROVEMENT"
    else:
        status = "POOR"

    return {
        "trip_score": round(final_score, 2),
        "status": status,
        "components": {
            "speed_compliance": round(s_v, 2),
            "driving_smoothness": round(s_d, 2),
            "tyre_safety": round(s_t, 2),
            "tyre_pressure_score": round(s_p, 2),
            "tyre_temperature_score": round(s_temp, 2),
        },
        "risk_burdens": {
            "r_speed": round(float(r_v), 5),
            "r_smoothness": round(float(r_d), 5),
            "r_pressure": round(float(r_p), 5),
            "r_temperature": round(float(r_t), 5),
        },
        "trip_duration_seconds": total_duration_t,
        "sample_count": n_samples,
    }


def extract_driving_pattern_features(trip_df: pd.DataFrame) -> dict:
    """
    Extracts rich multidimensional driving pattern features from a trip's 6-second telematics window.
    """
    speeds = trip_df["speed"].astype(float).values
    dt = 6.0
    n = len(speeds)
    duration_s = n * dt
    
    # Distance in km: sum(v_kmh * (6s / 3600s))
    distance_km = float(np.sum(speeds * (dt / 3600.0)))

    # Accelerations
    dv = np.diff(speeds, prepend=speeds[0])
    accel = dv / (3.6 * dt)
    abs_accel = np.abs(accel)
    
    # Jerk (rate of change of acceleration)
    jerk = np.diff(accel, prepend=accel[0]) / dt
    abs_jerk = np.abs(jerk)

    # Pressures and Temperatures
    pres_cols = [c for c in trip_df.columns if "Pres" in c or "Pressure" in c]
    temp_cols = [c for c in trip_df.columns if "Temp" in c]
    pres_mat = trip_df[pres_cols].astype(float).values
    temp_mat = trip_df[temp_cols].astype(float).values

    features = {
        # Speed dynamics
        "mean_speed": float(np.mean(speeds)),
        "max_speed": float(np.max(speeds)),
        "speed_std": float(np.std(speeds)),
        "overspeed_ratio": float(np.mean(speeds > 80.0)),
        "idle_ratio": float(np.mean(speeds == 0.0)),
        "cruising_ratio": float(np.mean((speeds >= 40.0) & (speeds <= 75.0))),
        
        # Smoothness dynamics
        "mean_abs_accel": float(np.mean(abs_accel)),
        "max_accel": float(np.max(accel)),
        "max_decel": float(np.abs(np.min(accel))),
        "accel_std": float(np.std(accel)),
        "harsh_accel_events": int(np.sum(accel > 2.0)),
        "harsh_brake_events": int(np.sum(accel < -2.0)),
        "rapid_accel_events": int(np.sum(accel > 1.2)),
        "rapid_brake_events": int(np.sum(accel < -1.2)),
        "mean_abs_jerk": float(np.mean(abs_jerk)),
        
        # Tyre thermal & load dynamics
        "mean_pressure": float(np.mean(pres_mat)),
        "pressure_std": float(np.std(pres_mat)),
        "max_pressure_dev": float(np.max(np.abs(pres_mat - 130.0))),
        "mean_temperature": float(np.mean(temp_mat)),
        "max_temperature": float(np.max(temp_mat)),
        "temp_range": float(np.max(temp_mat) - np.min(temp_mat)),
        
        # General
        "trip_duration_seconds": float(duration_s),
        "total_distance_km": float(distance_km),
    }
    return features


def run_training_pipeline():
    print("=" * 70)
    print("JK TYRE ADAPTIVE & RELATIVE DRIVER TRIP SCORING PIPELINE")
    print("=" * 70)

    # 1. Load Telematics Data
    df = load_telemetry_data()
    total_samples = len(df)
    print(f"Total telematics records available: {total_samples}")

    # 2. Compute Fleet-Wide Empirical Baselines
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
    print(f"Learned Fleet Baselines for Relative Scoring:")
    for k, v in fleet_baselines.items():
        print(f"  • {k}: {v:.4f}")

    # 3. Trip Segmentation
    # We partition the 158,400 records into realistic commercial trip windows of 600 samples (1 hour each)
    # and 300 samples (30 min each) to build a robust dataset of diverse trips
    window_sizes = [600, 300]
    trip_records = []
    
    print("\nSegmenting telematics stream into trips and calculating formula ground truth...")
    t0 = time.time()
    
    trip_id = 1
    # 600-sample segments (~1 hour journeys)
    step = 400  # overlapping windows to capture varying onset behaviors
    for start_idx in range(0, total_samples - 600, step):
        chunk = df.iloc[start_idx : start_idx + 600]
        ground_truth = calculate_infographic_trip_score(chunk, learned_baselines=fleet_baselines)
        feats = extract_driving_pattern_features(chunk)
        
        row_dict = {**feats}
        row_dict["trip_score"] = ground_truth["trip_score"]
        row_dict["status"] = ground_truth["status"]
        row_dict["s_speed"] = ground_truth["components"]["speed_compliance"]
        row_dict["s_smoothness"] = ground_truth["components"]["driving_smoothness"]
        row_dict["s_tyre"] = ground_truth["components"]["tyre_safety"]
        trip_records.append(row_dict)
        trip_id += 1

    dataset_df = pd.DataFrame(trip_records)
    print(f"Extracted {len(dataset_df)} distinct trip journeys in {time.time() - t0:.2f}s")
    print(f"Trip Score Distribution:\n{dataset_df['trip_score'].describe()}")

    # 4. Feature Selection for Model Training
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

    # 5. Tournament of Candidate ML Models
    print("\n" + "=" * 70)
    print("COMPARING CANDIDATE MODELS ACCORDING TO PARAMETERS IN DATA:")
    print("=" * 70)

    candidates = {
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=150, learning_rate=0.08, max_depth=4, random_state=42
        ),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=150, max_depth=8, random_state=42
        ),
        "Extra Trees Regressor": ExtraTreesRegressor(
            n_estimators=150, max_depth=8, random_state=42
        ),
        "Ridge Linear Regressor": Ridge(alpha=1.0),
    }

    best_name = None
    best_model = None
    best_r2 = -999.0
    best_metrics = {}
    tournament_results = {}

    for name, model in candidates.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        r2 = r2_score(y_test, preds)
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))

        tournament_results[name] = {"R2": round(r2, 4), "MAE": round(mae, 4), "RMSE": round(rmse, 4)}
        print(f"[{name}] -> R²: {r2:.4f} | MAE: {mae:.4f} | RMSE: {rmse:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_name = name
            best_model = model
            best_metrics = {"R2": round(r2, 4), "MAE": round(mae, 4), "RMSE": round(rmse, 4)}

    print(f"\n WINNER MODEL: {best_name} with R² = {best_metrics['R2']} and MAE = {best_metrics['MAE']}")

    # Feature Importance (if tree-based)
    feature_importances = {}
    if hasattr(best_model, "feature_importances_"):
        for f, imp in zip(feature_cols, best_model.feature_importances_):
            feature_importances[f] = round(float(imp), 4)
        # Sort descending
        feature_importances = dict(sorted(feature_importances.items(), key=lambda x: x[1], reverse=True))
        print("\nTop 5 Driving Pattern Features Influencing Score:")
        for f, val in list(feature_importances.items())[:5]:
            print(f"  • {f}: {val * 100:.2f}%")

    # 6. Unsupervised Driving Pattern Clustering (Style Profiling)
    print("\nFitting Unsupervised Driving Pattern Clusters (K-Means)...")
    cluster_features = ["mean_abs_accel", "max_decel", "overspeed_ratio", "mean_abs_jerk", "idle_ratio"]
    X_cluster = dataset_df[cluster_features].values
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    dataset_df["cluster"] = kmeans.fit_predict(X_cluster)

    cluster_profiles = {}
    cluster_names = ["Defensive & Smooth", "Balanced Commercial", "Aggressive / High Wear"]
    
    # Sort clusters by average trip score so index 0 is most smooth
    cluster_order = dataset_df.groupby("cluster")["trip_score"].mean().sort_values(ascending=False).index.tolist()
    
    for new_idx, old_c in enumerate(cluster_order):
        c_sub = dataset_df[dataset_df["cluster"] == old_c]
        c_name = cluster_names[new_idx]
        cluster_profiles[c_name] = {
            "cluster_id": new_idx,
            "avg_trip_score": round(float(c_sub["trip_score"].mean()), 2),
            "avg_abs_accel": round(float(c_sub["mean_abs_accel"].mean()), 4),
            "avg_max_decel": round(float(c_sub["max_decel"].mean()), 2),
            "trip_count": len(c_sub),
            "percentage": round(len(c_sub) / len(dataset_df) * 100, 1),
        }
        print(f"  Cluster [{c_name}]: Avg Score = {cluster_profiles[c_name]['avg_trip_score']} ({cluster_profiles[c_name]['percentage']}%)")

    # 7. Persist Models and Metadata for Production & Self-Learning
    model_artifact = {
        "best_model_name": best_name,
        "model": best_model,
        "kmeans": kmeans,
        "cluster_features": cluster_features,
        "cluster_order": cluster_order,
        "cluster_profiles": cluster_profiles,
        "feature_cols": feature_cols,
        "metrics": best_metrics,
        "feature_importances": feature_importances,
        "fleet_baselines": fleet_baselines,
        "version": "v2.0.0-adaptive-relative-ml",
        "trained_at": datetime.now().isoformat(),
        "total_trips_trained": len(dataset_df),
        "total_sensor_records": total_samples,
    }

    model_file = MODEL_SAVE_DIR / "adaptive_trip_score_model.pkl"
    with open(model_file, "wb") as f:
        pickle.dump(model_artifact, f)
    print(f"\nPersisted production model to {model_file}")

    # Also save human-readable JSON metadata
    meta_json = {
        "best_model_name": best_name,
        "metrics": best_metrics,
        "all_model_results": tournament_results,
        "feature_importances": feature_importances,
        "fleet_baselines": fleet_baselines,
        "cluster_profiles": cluster_profiles,
        "version": "v2.0.0-adaptive-relative-ml",
        "trained_at": datetime.now().isoformat(),
        "total_trips_trained": len(dataset_df),
        "total_sensor_records": total_samples,
    }
    meta_file = MODEL_SAVE_DIR / "adaptive_trip_score_metadata.json"
    with open(meta_file, "w") as f:
        json.dump(meta_json, f, indent=2)
    print(f"Saved metadata to {meta_file}")
    print("\nPipeline completed successfully!")


if __name__ == "__main__":
    run_training_pipeline()

"""
Feature engineering for RUL prediction model.
Transforms raw inspection history into ML-ready features.
"""
import numpy as np
import pandas as pd
from typing import List, Dict

DEFAULT_D_LIMIT_MM = 1.6

# Required input columns for building features
REQUIRED = [
    "tyre_id", "position", "km_covered_km", "g1_mm", "g2_mm", "g3_mm", 
    "otd_mm", "inspection_no"
]

# Feature sets for different model configurations
FEATURE_SETS = {
    "minimal": [
        "km_covered_km",
        "d_avg_mm",
        "d_min_mm",
        "cum_rate_avg_mm_per_km",
    ],
    "core": [
        "km_covered_km",
        "d_avg_mm",
        "d_min_mm",
        "d_initial_mm",
        "remaining_tread_mm",
        "remaining_tread_pct",
        "cum_rate_avg_mm_per_km",
        "cum_rate_min_mm_per_km",
        "wear_total_avg_mm",
        "wear_total_min_mm",
        "groove_range_mm",
        "groove_std_mm",
        "avg_minus_min_mm",
        "n_prior_inspections",
        "axle",
        "side_right",
        "is_dual_position",
        "is_inner",
    ],
    "core+sensor": [
        "km_covered_km",
        "d_avg_mm",
        "d_min_mm",
        "d_initial_mm",
        "remaining_tread_mm",
        "remaining_tread_pct",
        "cum_rate_avg_mm_per_km",
        "cum_rate_min_mm_per_km",
        "wear_total_avg_mm",
        "wear_total_min_mm",
        "groove_range_mm",
        "groove_std_mm",
        "avg_minus_min_mm",
        "n_prior_inspections",
        "rate_prev_avg_mm_per_km",
        "dK_prev_km",
        "dd_prev_avg_mm",
        "prev_wear_ratio",
        "pressure_mean_prev",
        "pressure_std_prev",
        "temp_mean_prev",
        "temp_max_prev",
        "axle",
        "side_right",
        "is_dual_position",
        "is_inner",
    ],
}


def build_features(history: pd.DataFrame, d_limit: float = DEFAULT_D_LIMIT_MM) -> pd.DataFrame:
    """
    Build RUL prediction features from raw inspection history.
    
    Parameters:
    -----------
    history : pd.DataFrame
        Raw inspection data with columns: tyre_id, position, km_covered_km, 
        g1_mm, g2_mm, g3_mm, otd_mm, inspection_no (and optionally sensor data)
    d_limit : float
        Minimum safe tread depth threshold in mm
    
    Returns:
    --------
    pd.DataFrame with engineered features
    """
    df = history.copy()
    
    # Sort by tyre and inspection order
    df = df.sort_values(["tyre_id", "km_covered_km"]).reset_index(drop=True)
    
    # Basic depth calculations
    g = ["g1_mm", "g2_mm", "g3_mm"]
    df["d_avg_mm"] = df[g].mean(axis=1)
    df["d_min_mm"] = df[g].min(axis=1)
    df["groove_range_mm"] = df[g].max(axis=1) - df[g].min(axis=1)
    df["groove_std_mm"] = df[g].std(axis=1, ddof=0)
    df["avg_minus_min_mm"] = df["d_avg_mm"] - df["d_min_mm"]
    
    # Initial and remaining tread
    df["d_initial_mm"] = df["otd_mm"] if "otd_mm" in df.columns else df.groupby("tyre_id")["d_avg_mm"].transform("first")
    df["d_limit_mm"] = d_limit
    df["remaining_tread_mm"] = (df["d_min_mm"] - df["d_limit_mm"]).clip(lower=0)
    df["remaining_tread_pct"] = np.where(
        df["d_initial_mm"] > df["d_limit_mm"],
        100 * df["remaining_tread_mm"] / (df["d_initial_mm"] - df["d_limit_mm"]),
        np.nan
    )
    
    # Cumulative wear
    df["wear_total_avg_mm"] = df["d_initial_mm"] - df["d_avg_mm"]
    df["wear_total_min_mm"] = df["d_initial_mm"] - df["d_min_mm"]
    df["cum_rate_avg_mm_per_km"] = df["wear_total_avg_mm"] / df["km_covered_km"]
    df["cum_rate_min_mm_per_km"] = df["wear_total_min_mm"] / df["km_covered_km"]
    df["cum_rate_per_1000km_avg"] = 1000 * df["cum_rate_avg_mm_per_km"]
    
    # Log versions for model
    df["log10_cum_rate_avg"] = np.log10(df["cum_rate_avg_mm_per_km"].where(df["cum_rate_avg_mm_per_km"] > 0))
    df["log10_cum_rate_min"] = np.log10(df["cum_rate_min_mm_per_km"].where(df["cum_rate_min_mm_per_km"] > 0))
    
    # History from previous inspection
    grp = df.groupby("tyre_id")
    df["prev_km_covered_km"] = grp["km_covered_km"].shift(1)
    df["prev_d_avg_mm"] = grp["d_avg_mm"].shift(1)
    df["prev_d_min_mm"] = grp["d_min_mm"].shift(1)
    df["dK_prev_km"] = df["km_covered_km"] - df["prev_km_covered_km"]
    df["dd_prev_avg_mm"] = df["prev_d_avg_mm"] - df["d_avg_mm"]
    df["dd_prev_min_mm"] = df["prev_d_min_mm"] - df["d_min_mm"]
    df["rate_prev_avg_mm_per_km"] = df["dd_prev_avg_mm"] / df["dK_prev_km"]
    df["rate_prev_min_mm_per_km"] = df["dd_prev_min_mm"] / df["dK_prev_km"]
    df["log10_rate_prev_avg"] = np.log10(df["rate_prev_avg_mm_per_km"].where(df["rate_prev_avg_mm_per_km"] > 0))
    df["n_prior_inspections"] = grp.cumcount()
    df["prev_wear_ratio"] = df["rate_prev_avg_mm_per_km"] / df["cum_rate_avg_mm_per_km"]
    
    # Position features
    if "position" in df.columns:
        df["axle"] = df["position"].str[0].astype(int)
        df["side_right"] = (df["position"].str[1] == "R").astype(int)
        df["is_dual_position"] = (df["position"].str.len() == 3).astype(int)
        df["is_inner"] = (df["position"].str[2:] == "I").astype(int)
    
    # Validation flags
    df["flag_missing_depth"] = df[g].isna().any(axis=1)
    df["flag_bad_distance"] = (df["dK_prev_km"] <= 0) & df["prev_km_covered_km"].notna()
    df["flag_depth_above_initial"] = df["d_avg_mm"] > df["d_initial_mm"]
    
    return df

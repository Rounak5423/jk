"""
predictor.py - inference interface for the Tyre Health Index / Fleet Intelligence Platform.

    from jk_rul import RULPredictor
    p = RULPredictor()                                   # loads models/rul_wear_rate_model.joblib + model_metadata.json
    out = p.predict(history_df, d_limit=1.6)             # history_df: one row per tyre per inspection (see features.REQUIRED)

Returns one row per tyre (latest inspection) unless latest_only=False. Never returns infinity: when no valid positive
wear rate exists, RUL is NaN and `status` explains why.
"""
import json, os
import numpy as np
import pandas as pd
import joblib
from .features import build_features, DEFAULT_D_LIMIT_MM

DEFAULT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))


class RULPredictor:
    def __init__(self, model_dir: str = DEFAULT_DIR, min_wear_mm_high_conf: float = None):
        self.model = joblib.load(os.path.join(model_dir, "rul_wear_rate_model.joblib"))
        self.meta = json.load(open(os.path.join(model_dir, "model_metadata.json")))
        self.features = self.meta["features"]
        self.min_wear = (min_wear_mm_high_conf if min_wear_mm_high_conf is not None
                         else self.meta["confidence_rules"]["min_total_wear_mm_for_high_confidence"])

    # -- formula-based rate chosen as best baseline in training -----------------------------------------------------
    def _formula_rate(self, f: pd.DataFrame) -> pd.Series:
        b = self.meta["recommended_config"] if self.meta["recommended_method"].startswith("FORMULA") else "B1"
        if b.startswith("B2"):
            r = f.cum_rate_min_mm_per_km
        elif b.startswith("B3"):
            r = f.rate_prev_avg_mm_per_km.where(f.rate_prev_avg_mm_per_km > 0, f.cum_rate_avg_mm_per_km)
        else:
            r = f.cum_rate_avg_mm_per_km
        return r.where(r > 0)

    def predict(self, history: pd.DataFrame, d_limit: float = None, latest_only: bool = True) -> pd.DataFrame:
        d_limit = DEFAULT_D_LIMIT_MM if d_limit is None else float(d_limit)
        f = build_features(history, d_limit=d_limit)
        feats_ok = f[self.features]
        # ML wear-rate estimate (imputer inside the pipeline handles missing history features)
        ml_ok = f.log10_cum_rate_avg.notna() & ~f.flag_missing_depth
        r_ml = pd.Series(np.nan, index=f.index)
        if ml_ok.any():
            r_ml[ml_ok] = 10 ** self.model.predict(feats_ok[ml_ok])
        r_f = self._formula_rate(f)
        rem = f.remaining_tread_mm

        def rul(r):
            out = rem / r
            return out.where(r.notna() & (r > 0))
        f["rul_ml_km"], f["rul_formula_km"] = rul(r_ml), rul(r_f)
        f["wear_rate_ml_mm_per_km"], f["wear_rate_formula_mm_per_km"] = r_ml, r_f
        r_med = pd.Series(self.meta["fleet_median_rate_mm_per_km"], index=f.index).where(~f.flag_missing_depth)
        f["wear_rate_fleet_median_mm_per_km"] = r_med
        f["rul_fleet_median_km"] = rul(r_med)
        rec = self.meta["recommended_method"]
        f["recommended_method"] = rec
        primary = {"ML": f.rul_ml_km, "FLEET_MEDIAN": f.rul_fleet_median_km}.get(rec, f.rul_formula_km)
        f["rul_recommended_km"] = primary.fillna(f.rul_formula_km).fillna(f.rul_fleet_median_km)
        q10, q90 = self.meta["interval_80pct_err_log10"]       # empirical, from only 36 leave-one-tyre-out predictions
        f["rul_low_80pct_km"] = f.rul_recommended_km * 10 ** q10
        f["rul_high_80pct_km"] = f.rul_recommended_km * 10 ** q90
        f["k_threshold_tyre_km"] = f.km_covered_km + f.rul_recommended_km                       # formula G (tyre cumulative km)
        f["k_threshold_odometer_km"] = (f.odometer_km + f.rul_recommended_km) if "odometer_km" in f else np.nan
        bad = f.flag_missing_depth | f.flag_bad_distance | f.flag_depth_above_initial
        status = np.select(
            [f.flag_missing_depth, f.flag_bad_distance, f.flag_depth_above_initial, rem.eq(0), f.rul_recommended_km.isna()],
            ["INVALID_INPUT_MISSING_DEPTH", "INVALID_INPUT_ODOMETER_NOT_INCREASING", "INVALID_INPUT_DEPTH_ABOVE_INITIAL",
             "AT_OR_BELOW_THRESHOLD", "UNAVAILABLE_NO_VALID_POSITIVE_WEAR_RATE"], default="OK")
        f["status"] = status
        f.loc[f.status == "AT_OR_BELOW_THRESHOLD", ["rul_recommended_km", "rul_ml_km", "rul_formula_km", "rul_fleet_median_km", "rul_low_80pct_km", "rul_high_80pct_km"]] = 0.0
        conf = np.where(f.status != "OK", "UNAVAILABLE",
                np.where(bad | (f.wear_total_avg_mm < self.min_wear), "LOW", "MEDIUM"))
        f["confidence"] = conf   # HIGH is deliberately never issued: model trained on 12 tyres with proxy labels
        cols = ["tyre_id", "position", "inspection", "inspection_date", "km_covered_km", "odometer_km", "g1_mm", "g2_mm", "g3_mm",
                "d_avg_mm", "d_min_mm", "d_initial_mm", "d_limit_mm", "remaining_tread_mm", "remaining_tread_pct",
                "cum_rate_avg_mm_per_km", "wear_rate_ml_mm_per_km", "wear_rate_formula_mm_per_km",
                "rul_ml_km", "rul_formula_km", "rul_fleet_median_km", "rul_recommended_km", "rul_low_80pct_km", "rul_high_80pct_km",
                "recommended_method",
                "k_threshold_tyre_km", "k_threshold_odometer_km", "status", "confidence"]
        out = f[[c for c in cols if c in f.columns]]
        if latest_only:
            out = out.loc[f.groupby("tyre_id").km_covered_km.idxmax()]
        return out.reset_index(drop=True)

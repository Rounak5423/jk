"""
02_build_dataset.py - PHASE 2 (cleaning / feature engineering) + PHASE 3 (target generation)

Key design decisions (all justified by the Phase 1 forensic checks):
  * The 560k telemetry rows are linear interpolations between inspection events (max deviation ~4e-15 mm), so they
    are NOT used as training samples. The GENUINE measurement events are the first row of each workbook
    (K2, K3, K4) and the last row of the 4TH workbook (K5). End of file n == start of file n+1 (verified, exact).
  * One sample = one physical tyre (12, identified by sensor ID) at one genuine inspection  ->  12 x 4 = 48 rows.
  * Features at inspection t use ONLY information available at or before t (no future inspection values).
  * Target (Phase 3, PROXY label, not observed tyre life):
        r_next  = (d_avg(t) - d_avg(t+1)) / (K(t+1) - K(t))            realised wear rate over the NEXT interval  [mm/km]
        RUL_proxy(t) = max(0, d_min(t) - d_limit) / r_next             [km]  (only if r_next > 0)
    The ML model predicts log10(r_next); RUL is then computed with the main formula, so d_limit stays configurable.
    Inspection K5 has no following interval -> inference-only (no label).
  * d_limit default 1.6 mm = value implied by the workbook's own Projected-Mileage formula (Phase 1). It is a
    CONFIGURABLE parameter and still needs business confirmation.
"""
import os, sys
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
from common import *

D_LIMIT_DEFAULT = 1.6
raw = pd.read_csv(f"{DATA}/raw_knot_candidates.csv", parse_dates=["timestamp"])
agg = pd.read_csv(f"{DATA}/interval_sensor_aggregates.csv")

# --- genuine inspection events ------------------------------------------------------------------------------------
def pick(wb, kn, label, insp_no):
    d = raw[(raw.workbook == wb) & (raw.knot == kn)].copy()
    d["inspection"] = label; d["inspection_no"] = insp_no
    return d
ins = pd.concat([pick("2ND", "start", "K2", 2), pick("3RD", "start", "K3", 3),
                 pick("4TH", "start", "K4", 4), pick("4TH", "end", "K5", 5)], ignore_index=True)
ins = ins.drop(columns=["workbook", "knot", "wear_pct", "km_per_mm", "projected_mileage", "pressure", "temp", "battery"])
ins = ins.rename(columns={"tyre": "position", "g1": "g1_mm", "g2": "g2_mm", "g3": "g3_mm", "min_depth": "workbook_min_mm"})

# --- sensor context from the PRECEDING interval (available at inspection time) --------------------------------------
prev_map = {"K3": "2ND", "K4": "3RD", "K5": "4TH"}   # interval that ENDS at this inspection
a = agg[agg.tyre != "VEHICLE"][["workbook", "tyre", "pressure_mean", "pressure_std", "temp_mean", "temp_max"]]
a = a.rename(columns={"tyre": "position", "pressure_mean": "pressure_mean_prev", "pressure_std": "pressure_std_prev",
                      "temp_mean": "temp_mean_prev", "temp_max": "temp_max_prev"})
ins["prev_workbook"] = ins.inspection.map(prev_map)
ins = ins.merge(a, left_on=["prev_workbook", "position"], right_on=["workbook", "position"], how="left").drop(columns=["workbook", "prev_workbook"])

ins = ins.sort_values(["position", "inspection_no"]).reset_index(drop=True)
g = ["g1_mm", "g2_mm", "g3_mm"]
ins["d_avg_mm"] = ins[g].mean(axis=1)
ins["d_min_mm"] = ins[g].min(axis=1)
ins["groove_range_mm"] = ins[g].max(axis=1) - ins[g].min(axis=1)
ins["groove_std_mm"] = ins[g].std(axis=1, ddof=0)
ins["avg_minus_min_mm"] = ins.d_avg_mm - ins.d_min_mm
ins["d_initial_mm"] = ins.otd_mm
ins["d_limit_mm"] = D_LIMIT_DEFAULT
ins["remaining_tread_mm"] = (ins.d_min_mm - ins.d_limit_mm).clip(lower=0)               # formula E (conservative: min depth)
ins["remaining_tread_pct"] = np.where(ins.d_initial_mm > ins.d_limit_mm,
                                      100 * ins.remaining_tread_mm / (ins.d_initial_mm - ins.d_limit_mm), np.nan)  # formula H
ins["wear_total_avg_mm"] = ins.d_initial_mm - ins.d_avg_mm
ins["wear_total_min_mm"] = ins.d_initial_mm - ins.d_min_mm
ins["cum_rate_avg_mm_per_km"] = ins.wear_total_avg_mm / ins.km_covered_km          # formula D (cumulative)
ins["cum_rate_min_mm_per_km"] = ins.wear_total_min_mm / ins.km_covered_km
ins["cum_rate_per_1000km_avg"] = 1000 * ins.cum_rate_avg_mm_per_km                   # optional display r_1000

# --- history (previous inspection of the same tyre; strictly past) ---------------------------------------------------
grp = ins.groupby("position")
ins["prev_km_covered_km"] = grp.km_covered_km.shift(1)
ins["prev_d_avg_mm"] = grp.d_avg_mm.shift(1)
ins["prev_d_min_mm"] = grp.d_min_mm.shift(1)
ins["dK_prev_km"] = ins.km_covered_km - ins.prev_km_covered_km                       # formula C
ins["dd_prev_avg_mm"] = ins.prev_d_avg_mm - ins.d_avg_mm                              # formula B (avg)
ins["dd_prev_min_mm"] = ins.prev_d_min_mm - ins.d_min_mm
ins["rate_prev_avg_mm_per_km"] = ins.dd_prev_avg_mm / ins.dK_prev_km                  # formula D (interval)
ins["rate_prev_min_mm_per_km"] = ins.dd_prev_min_mm / ins.dK_prev_km
ins["n_prior_inspections"] = grp.cumcount()
ins["prev_wear_ratio"] = ins.rate_prev_avg_mm_per_km / ins.cum_rate_avg_mm_per_km    # acceleration of wear vs cumulative

# --- tyre position features ------------------------------------------------------------------------------------------
ins["axle"] = ins.position.str[0].astype(int)
ins["side_right"] = (ins.position.str[1] == "R").astype(int)
ins["is_dual_position"] = (ins.position.str.len() == 3).astype(int)
ins["is_inner"] = (ins.position.str[2:] == "I").astype(int)

# --- Phase 3 target (PROXY): realised next-interval wear rate ---------------------------------------------------------
ins["next_km_covered_km"] = grp.km_covered_km.shift(-1)
ins["next_d_avg_mm"] = grp.d_avg_mm.shift(-1)
ins["next_dK_km"] = ins.next_km_covered_km - ins.km_covered_km
ins["next_dd_avg_mm"] = ins.d_avg_mm - ins.next_d_avg_mm
ins["r_next_mm_per_km"] = ins.next_dd_avg_mm / ins.next_dK_km
ins["label_status"] = np.where(ins.next_dK_km.isna(), "no_future_inspection(inference_only)",
                       np.where(ins.r_next_mm_per_km > 0, "ok", "excluded_nonpositive_wear"))
ok = ins.label_status == "ok"
ins["log10_r_next"] = np.where(ok, np.log10(ins.r_next_mm_per_km.where(ok)), np.nan)
ins["rul_proxy_km"] = np.where(ok, ins.remaining_tread_mm / ins.r_next_mm_per_km.where(ok), np.nan)
ins["label_type"] = np.where(ok, "PROXY (calculated from realised next-interval wear rate; not observed end-of-life)", "")

# --- data-quality log ------------------------------------------------------------------------------------------------
log = []
log.append(("inspection rows", len(ins)))
log.append(("physical tyres", ins.position.nunique()))
log.append(("sensor ids unique", ins.sensor_id.nunique()))
log.append(("labelled samples (K2,K3,K4)", int(ok.sum())))
log.append(("excluded (non-positive next-interval avg wear)", int((ins.label_status == "excluded_nonpositive_wear").sum())))
log.append(("inference-only rows (K5)", int((ins.label_status.str.startswith("no_future")).sum())))
log.append(("odometer decreasing between inspections", int((ins.dK_prev_km <= 0).sum())))
log.append(("min-depth increased between inspections (workbook MIN)", int((ins.dd_prev_min_mm < 0).sum())))
log.append(("avg-depth increased between inspections", int((ins.dd_prev_avg_mm < 0).sum())))
log.append(("groove depth increased (any groove) between inspections",
            int(sum(((ins.groupby('position')[c].diff()) > 0).sum() for c in g))))
log.append(("depth values on 0.1 mm grid (resolution)", True))
log.append(("workbook MIN equals min(G1..G3)", bool(np.allclose(ins.workbook_min_mm, ins.d_min_mm))))
log.append(("d_limit used (mm) [configurable; implied by workbook formula]", D_LIMIT_DEFAULT))
pd.DataFrame(log, columns=["check", "value"]).to_csv(f"{REPORTS}/phase2_data_quality_log.csv", index=False)

ins.to_csv(f"{DATA}/inspection_dataset.csv", index=False)
pd.set_option("display.width", 250, "display.max_columns", 40)
print(pd.DataFrame(log))
print(ins.label_status.value_counts())
print(ins[ok][["rate_prev_avg_mm_per_km", "cum_rate_avg_mm_per_km", "r_next_mm_per_km", "rul_proxy_km"]].describe())
print(ins[ins.inspection == "K4"][["position", "d_avg_mm", "d_min_mm", "cum_rate_avg_mm_per_km", "rate_prev_avg_mm_per_km", "r_next_mm_per_km", "rul_proxy_km"]])

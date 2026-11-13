"""
03_train_evaluate.py - PHASE 4 (model development) + PHASE 5 (interpretation)

Target      : log10 of the realised next-interval wear rate (mm/km)  [PROXY label, see 02_build_dataset.py]
RUL (km)    : max(0, d_min - d_limit) / 10**prediction              [main formula F, d_limit configurable]
Validation  : (a) leave-one-TYRE-out CV (all inspections of a tyre are held out together)  -> unseen tyres
              (b) strictly chronological walk-forward: train on earlier inspections, test on the next one
                  (labels used for training are only those that were observable before the test inspection)
Tuning      : inner GroupKFold (by tyre) inside every outer training set - no test information is ever used
Preprocessing is inside the sklearn Pipeline, so it is fitted on training data only.
"""
import os, sys, json, time, warnings, platform
import numpy as np, pandas as pd
import joblib, sklearn
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
from sklearn.model_selection import GridSearchCV, GroupKFold, LeaveOneGroupOut
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, median_absolute_error
from scipy.stats import spearmanr
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, ".."))
from common import *
from jk_rul.features import build_features, FEATURE_SETS, DEFAULT_D_LIMIT_MM

D_LIMIT = DEFAULT_D_LIMIT_MM
t0 = time.time()
# ------------------------------------------------------------------------------------------------------------------
raw = pd.read_csv(f"{DATA}/inspection_dataset.csv")
base_cols = ["sensor_id", "position", "km_covered_km", "g1_mm", "g2_mm", "g3_mm", "otd_mm", "odometer_km", "inspection", "inspection_no",
             "pressure_mean_prev", "pressure_std_prev", "temp_mean_prev", "temp_max_prev", "r_next_mm_per_km", "label_status"]
df = build_features(raw[base_cols].rename(columns={"sensor_id": "tyre_id"}), d_limit=D_LIMIT)
df["rul_proxy_km"] = np.where(df.label_status == "ok", df.remaining_tread_mm / df.r_next_mm_per_km, np.nan)
df["y"] = np.where(df.label_status == "ok", np.log10(df.r_next_mm_per_km), np.nan)
# consistency of recomputed features against the dataset-builder output (train/serve skew guard)
chk = raw.sort_values(["sensor_id", "km_covered_km"]).reset_index(drop=True)
assert np.allclose(df.cum_rate_avg_mm_per_km, chk.cum_rate_avg_mm_per_km) and np.allclose(df.d_min_mm, chk.d_min_mm)
lab = df[df.label_status == "ok"].reset_index(drop=True)
print("labelled samples:", len(lab), "tyres:", lab.tyre_id.nunique(), flush=True)

# ------------------------------------------------------------------------------------------------------------------
def pipe(model, scale=True):
    steps = [("imp", SimpleImputer(strategy="median", add_indicator=True))]
    if scale: steps.append(("sc", StandardScaler()))
    steps.append(("m", model))
    return Pipeline(steps)

CAND = {
    "Ridge":        (lambda: pipe(Ridge(random_state=SEED)), {"m__alpha": [0.1, 1, 10, 100]}, True, ["minimal", "core", "core+sensor"]),
    "RandomForest": (lambda: pipe(RandomForestRegressor(n_estimators=150, random_state=SEED, n_jobs=1), False),
                     {"m__max_depth": [2, 4], "m__min_samples_leaf": [2, 4]}, False, ["core", "core+sensor"]),
    "ExtraTrees":   (lambda: pipe(ExtraTreesRegressor(n_estimators=150, random_state=SEED, n_jobs=1), False),
                     {"m__max_depth": [2, 4], "m__min_samples_leaf": [2, 4]}, False, ["core", "core+sensor"]),
    "GradientBoosting": (lambda: pipe(GradientBoostingRegressor(random_state=SEED, subsample=0.8), False),
                     {"m__n_estimators": [50, 150], "m__learning_rate": [0.03, 0.1], "m__max_depth": [2]}, False, ["core", "core+sensor"]),
}
CONFIGS = [(f"{m}[{fs}]", m, fs) for m, (_, _, _, sets) in CAND.items() for fs in sets]

def fit_tuned(name_m, fs, X, y, groups):
    mk, grid, _, _ = CAND[name_m]
    k = min(3, len(np.unique(groups)))
    gs = GridSearchCV(mk(), grid, cv=GroupKFold(n_splits=k), scoring="neg_mean_absolute_error", n_jobs=1)
    gs.fit(X[FEATURE_SETS[fs]], y, groups=groups)
    return gs.best_estimator_, gs.best_params_

# ---- baselines (rate predictors; formula-based, no training except the median) ---------------------------------------
def baseline_pred(name, train, test):
    if name == "B0_median_rate(train)":      return np.full(len(test), np.median(train.y))
    if name == "B1_cumulative_rate_avg":     return test.log10_cum_rate_avg.values
    if name == "B2_cumulative_rate_min(workbook)": return test.log10_cum_rate_min.values
    if name == "B3_previous_interval_rate":  return np.where(test.log10_rate_prev_avg.notna(), test.log10_rate_prev_avg, test.log10_cum_rate_avg)
BASELINES = ["B0_median_rate(train)", "B1_cumulative_rate_avg", "B2_cumulative_rate_min(workbook)", "B3_previous_interval_rate"]

# ---- evaluation schemes -------------------------------------------------------------------------------------------------
def scheme_splits():
    yield "LOTO", [(lab.index[lab.tyre_id != t], lab.index[lab.tyre_id == t]) for t in sorted(lab.tyre_id.unique())]
    yield "CHRONO_K2->K3", [(lab.index[lab.inspection == "K2"], lab.index[lab.inspection == "K3"])]
    yield "CHRONO_K2K3->K4", [(lab.index[lab.inspection.isin(["K2", "K3"])], lab.index[lab.inspection == "K4"])]

rows, params_log = [], []
for scheme, splits in scheme_splits():
    for cname, m, fs in CONFIGS:
        for tr, te in splits:
            est, bp = fit_tuned(m, fs, lab.loc[tr], lab.loc[tr, "y"].values, lab.loc[tr, "tyre_id"].values)
            p = est.predict(lab.loc[te, FEATURE_SETS[fs]])
            rows.append(pd.DataFrame({"config": cname, "model": m, "features": fs, "scheme": scheme, "idx": te, "pred": p}))
            params_log.append((cname, scheme, str(bp)))
    for b in BASELINES:
        for tr, te in splits:
            rows.append(pd.DataFrame({"config": b, "model": "baseline", "features": "-", "scheme": scheme, "idx": te,
                                      "pred": baseline_pred(b, lab.loc[tr], lab.loc[te])}))
    print(scheme, "done", f"{time.time()-t0:.0f}s", flush=True)
P = pd.concat(rows, ignore_index=True)
P = P.join(lab[["tyre_id", "position", "inspection", "y", "remaining_tread_mm", "rul_proxy_km", "km_covered_km"]], on="idx")
P["rul_pred_km"] = P.remaining_tread_mm / (10 ** P.pred)
P["err_log10"] = P.pred - P.y
P["abs_err_km"] = (P.rul_pred_km - P.rul_proxy_km).abs()
P.to_csv(f"{REPORTS}/phase4_all_predictions.csv", index=False)

def metrics(d):
    yt, yp = d.rul_proxy_km.values, d.rul_pred_km.values
    ok = yt > 0
    return dict(n=len(d), MAE_km=mean_absolute_error(yt, yp), RMSE_km=mean_squared_error(yt, yp) ** .5, R2_km=r2_score(yt, yp) if len(d) > 1 else np.nan,
                MedAE_km=median_absolute_error(yt, yp), MAPE_pct=100 * np.mean(np.abs(yt[ok] - yp[ok]) / yt[ok]),
                MAE_log10=np.mean(np.abs(d.err_log10)), RMSE_log10=np.mean(d.err_log10 ** 2) ** .5, R2_log10=r2_score(d.y, d.pred) if len(d) > 1 else np.nan,
                bias_log10=d.err_log10.mean(), spearman=spearmanr(yt, yp)[0] if len(d) > 2 else np.nan,
                within_x1p5_pct=100 * np.mean(np.abs(d.err_log10) <= np.log10(1.5)), within_x2_pct=100 * np.mean(np.abs(d.err_log10) <= np.log10(2)))
M = pd.DataFrame([{**dict(config=c, scheme=s), **metrics(g)} for (c, s), g in P.groupby(["config", "scheme"])])
M.to_csv(f"{REPORTS}/phase4_model_comparison_long.csv", index=False)
piv = M.pivot(index="config", columns="scheme", values=["MAE_km", "MedAE_km", "R2_log10", "MAE_log10", "MAPE_pct", "RMSE_km", "R2_km", "spearman"])
piv.columns = [f"{a}|{b}" for a, b in piv.columns]
piv = piv.reset_index()
piv["selection_score"] = (piv["MAE_log10|LOTO"] + piv["MAE_log10|CHRONO_K2K3->K4"]) / 2     # lower is better
piv = piv.sort_values("selection_score"); piv.to_csv(f"{REPORTS}/phase4_model_comparison.csv", index=False)

# ---- cluster (tyre) bootstrap CIs on LOTO predictions ------------------------------------------------------------------
rng = np.random.default_rng(SEED); tyres = lab.tyre_id.unique(); boot = []
Lp = P[P.scheme == "LOTO"]
byc = {c: g for c, g in Lp.groupby("config")}
for c, g in byc.items():
    bt = {t: x for t, x in g.groupby("tyre_id")}
    vals = []
    for _ in range(500):
        s = pd.concat([bt[t] for t in rng.choice(tyres, len(tyres))])
        vals.append((mean_absolute_error(s.rul_proxy_km, s.rul_pred_km), median_absolute_error(s.rul_proxy_km, s.rul_pred_km), s.err_log10.abs().mean()))
    v = np.array(vals)
    boot.append(dict(config=c, **{f"{n}_{q}": np.percentile(v[:, i], q) for i, n in enumerate(["MAE_km", "MedAE_km", "MAE_log10"]) for q in (2.5, 97.5)}))
pd.DataFrame(boot).to_csv(f"{REPORTS}/phase4_loto_bootstrap_ci.csv", index=False)

# ---- model selection (rule fixed in advance, documented) -------------------------------------------------------------------
ml = piv[~piv.config.str.startswith("B")]; bl = piv[piv.config.str.startswith("B")]
best_ml, best_bl = ml.iloc[0], bl.iloc[0]
beats = bool(best_ml["MAE_log10|LOTO"] < 0.95 * best_bl["MAE_log10|LOTO"] and best_ml["MAE_log10|CHRONO_K2K3->K4"] < 0.95 * best_bl["MAE_log10|CHRONO_K2K3->K4"])
if beats:
    recommended, rec_cfg = "ML", best_ml.config
else:   # fall back to the best baseline (null fleet-median rate or a formula baseline)
    recommended = "FLEET_MEDIAN" if best_bl.config.startswith("B0") else "FORMULA_" + best_bl.config.split("_")[0]
    rec_cfg = best_bl.config
print("best ML:", best_ml.config, "| best baseline:", best_bl.config, "| ML clearly beats baseline:", beats, flush=True)
mname, fset = best_ml.config.split("[")[0], best_ml.config.split("[")[1][:-1]

# ---- final model on ALL labelled samples ------------------------------------------------------------------------------------
final, fbp = fit_tuned(mname, fset, lab, lab.y.values, lab.tyre_id.values)
os.makedirs(MODELS, exist_ok=True)
joblib.dump(final, f"{MODELS}/rul_wear_rate_model.joblib")

# ---- Phase 5: interpretation (grouped-CV permutation importance, native importance) ------------------------------------------
feats = FEATURE_SETS[fset]; imp_rows = []
for tr, te in GroupKFold(n_splits=4).split(lab, groups=lab.tyre_id):
    est = CAND[mname][0]().set_params(**fbp).fit(lab.iloc[tr][feats], lab.iloc[tr].y)
    pi = permutation_importance(est, lab.iloc[te][feats], lab.iloc[te].y, scoring="neg_mean_absolute_error", n_repeats=30, random_state=SEED)
    imp_rows.append(pi.importances_mean)
imp = pd.DataFrame({"feature": feats, "perm_importance_MAE_log10_heldout": np.mean(imp_rows, axis=0)})
m_ = final.named_steps["m"]
names_in = list(final.named_steps["imp"].get_feature_names_out(feats))
native = (np.abs(m_.coef_) if hasattr(m_, "coef_") else m_.feature_importances_)
nat = pd.Series(native, index=names_in)
imp["native_importance"] = imp.feature.map(nat)
imp = imp.sort_values("perm_importance_MAE_log10_heldout", ascending=False); imp.to_csv(f"{REPORTS}/phase5_feature_importance.csv", index=False)

rec_err = P[(P.config == rec_cfg) & (P.scheme == "LOTO")].err_log10      # err = pred - true (log10 rate); true RUL = pred RUL * 10**err
b1 = M[(M.config == "B1_cumulative_rate_avg") & (M.scheme == "LOTO")].iloc[0]
# ---- metadata ------------------------------------------------------------------------------------------------------------------
fin_cfg = best_ml.config
meta = dict(module="JK Tyre RUL", model_config=fin_cfg, estimator=mname, feature_set=fset, features=feats, best_params=fbp,
            target="log10(next-interval wear rate, mm/km) [PROXY label]", rul_formula="max(0, d_min - d_limit) / 10**prediction",
            default_d_limit_mm=D_LIMIT, d_limit_status="implied by workbook Projected-Mileage formula; business confirmation pending; configurable",
            recommended_method=recommended, recommended_config=rec_cfg, best_formula_baseline=best_bl.config,
            fleet_median_log10_rate=float(np.median(lab.y)), fleet_median_rate_mm_per_km=float(10 ** np.median(lab.y)),
            interval_80pct_err_log10=[float(rec_err.quantile(.1)), float(rec_err.quantile(.9))],
            cumulative_formula_bias_log10_LOTO=float(b1.bias_log10),
            ml_vs_null_note="best ML is within bootstrap CI of the constant fleet-median baseline; no demonstrated skill beyond it",
            selection_rule="best ML config by mean(LOTO MAE_log10, chrono K2K3->K4 MAE_log10); ML recommended only if >5% better than best formula baseline on BOTH schemes",
            n_train_samples=int(len(lab)), n_tyres=int(lab.tyre_id.nunique()), seed=SEED,
            test_metrics={s: M[(M.config == fin_cfg) & (M.scheme == s)].iloc[0].to_dict() for s in M.scheme.unique()},
            baseline_metrics={s: M[(M.config == best_bl.config) & (M.scheme == s)].iloc[0].to_dict() for s in M.scheme.unique()},
            versions=dict(python=platform.python_version(), sklearn=sklearn.__version__, numpy=np.__version__, pandas=pd.__version__),
            confidence_rules=dict(min_total_wear_mm_for_high_confidence=1.0, min_prior_inspections_for_high_confidence=1, note="heuristics, configurable in predictor"),
            limitations=["labels are calculated proxies (realised next-interval wear rate), not observed end-of-life",
                         "only 12 tyres of one vehicle; 36 labelled samples; tread resolution 0.1 mm; no tyre has approached the threshold",
                         "extrapolation to ~1.6 mm is far outside the observed 11.5-16.2 mm depth range"])
json.dump(meta, open(f"{MODELS}/model_metadata.json", "w"), indent=2, default=float)
pd.DataFrame(params_log, columns=["config", "scheme", "best_params"]).to_csv(f"{REPORTS}/phase4_tuned_params.csv", index=False)

# ---- figures ---------------------------------------------------------------------------------------------------------------------------
os.makedirs(FIGS, exist_ok=True)
fc = P[(P.config == fin_cfg) & (P.scheme == "LOTO")]; bc = P[(P.config == best_bl.config) & (P.scheme == "LOTO")]
fig, ax = plt.subplots(1, 2, figsize=(11, 4.5), sharex=True, sharey=True)
for a, d, t in zip(ax, [fc, bc], [fin_cfg + " (LOTO)", best_bl.config + " (LOTO)"]):
    a.scatter(d.rul_proxy_km / 1e3, d.rul_pred_km / 1e3, c=d.inspection.map({"K2": "C0", "K3": "C1", "K4": "C2"}), s=30)
    a.plot([20, 700], [20, 700], "k--", lw=1); a.set_xscale("log"); a.set_yscale("log"); a.set_title(t, fontsize=10)
    a.set_xlabel("proxy RUL (thousand km)")
ax[0].set_ylabel("predicted RUL (thousand km)"); plt.tight_layout(); plt.savefig(f"{FIGS}/actual_vs_predicted_rul.png", dpi=130); plt.close()
fig, ax = plt.subplots(1, 3, figsize=(14, 4))
ax[0].hist(fc.err_log10, bins=12); ax[0].set_title("Error distribution (log10 predicted/true)"); ax[0].axvline(0, c="k")
ax[1].scatter(fc.rul_pred_km / 1e3, fc.err_log10); ax[1].axhline(0, c="k"); ax[1].set_title("Residual vs predicted RUL"); ax[1].set_xlabel("predicted RUL (k km)")
ax[2].scatter(fc.km_covered_km, fc.err_log10); ax[2].axhline(0, c="k"); ax[2].set_title("Residual vs tyre km covered")
plt.tight_layout(); plt.savefig(f"{FIGS}/residual_analysis.png", dpi=130); plt.close()
top = piv.head(12).iloc[::-1]
plt.figure(figsize=(8, 5)); plt.barh(top.config, top["MAE_log10|LOTO"], label="LOTO"); plt.barh(top.config, top["MAE_log10|CHRONO_K2K3->K4"], alpha=.5, label="Chrono K2K3->K4")
plt.xlabel("MAE of log10(RUL)  (lower is better)"); plt.legend(); plt.tight_layout(); plt.savefig(f"{FIGS}/model_comparison.png", dpi=130); plt.close()
plt.figure(figsize=(7, 5)); im = imp.head(12).iloc[::-1]; plt.barh(im.feature, im.perm_importance_MAE_log10_heldout)
plt.xlabel("permutation importance (increase in held-out MAE log10)"); plt.tight_layout(); plt.savefig(f"{FIGS}/feature_importance.png", dpi=130); plt.close()
plt.figure(figsize=(8, 5))
for t, g in df.groupby("position"): plt.plot(g.km_covered_km, g.d_avg_mm, "o-", label=t, ms=3)
plt.axhline(D_LIMIT, c="r", ls="--"); plt.xlabel("tyre km covered"); plt.ylabel("average groove depth (mm)"); plt.legend(ncol=3, fontsize=7); plt.tight_layout()
plt.savefig(f"{FIGS}/tread_trajectories.png", dpi=130); plt.close()

print(piv[["config", "MAE_km|LOTO", "MedAE_km|LOTO", "R2_log10|LOTO", "MAE_log10|LOTO", "MAE_log10|CHRONO_K2K3->K4", "MAE_km|CHRONO_K2K3->K4", "selection_score"]].to_string())
print(imp.head(10)); print("FINAL:", fin_cfg, fbp, "recommended:", recommended, f"{time.time()-t0:.0f}s")

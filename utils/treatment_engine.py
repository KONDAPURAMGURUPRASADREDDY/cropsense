import pandas as pd
import numpy as np

# ============================================================
# CONSTANTS
# ============================================================

NUTRIENTS = ["N", "P", "K", "S", "Zn", "Fe", "B", "Mn", "Cu"]


# ============================================================
# SQI / PHI CLASSIFIERS
# ============================================================

def classify_sqi(sqi: float) -> str:
    if sqi <= 1.4:
        return "Very Poor"
    elif sqi <= 2.4:
        return "Poor"
    elif sqi <= 3.4:
        return "Moderate"
    elif sqi <= 4.2:
        return "Good"
    return "Excellent"


def classify_phi(phi: float) -> str:
    if phi <= 3.0:
        return "Severe Stress"
    elif phi <= 5.0:
        return "Moderate Stress"
    elif phi <= 7.5:
        return "At Risk but Recoverable"
    elif phi <= 9.0:
        return "Healthy"
    return "Very Healthy"


# ============================================================
# GROWTH STAGE WEIGHTS
# ============================================================

STAGE_RELEVANCE = {
    "germination": {"High": 1.0, "Medium": 0.7, "Low": 0.5},
    "vegetative": {"High": 1.0, "Medium": 0.8, "Low": 0.6},
    "flowering": {"High": 1.0, "Medium": 0.8, "Low": 0.6},
    "fruiting": {"High": 1.0, "Medium": 0.8, "Low": 0.6},
    "maturity": {"High": 0.8, "Medium": 0.6, "Low": 0.5},
}


# ============================================================
# LOAD CSV FILES
# ============================================================

def safe_read_csv(path):
    """Reads CSV safely without errors argument."""
    try:
        return pd.read_csv(path, encoding="utf-8")
    except:
        return pd.read_csv(path, encoding="latin1")


def load_reference_tables():
    nutrient_thresholds = safe_read_csv("soil_nutrient_thresholds.csv")
    crop_req = safe_read_csv("crop_nutrient_requirement.csv")
    treatment_recs = safe_read_csv("treatment_recommendations.csv")
    pest_actions = safe_read_csv("pest_disease_control.csv")
    return nutrient_thresholds, crop_req, treatment_recs, pest_actions


# ============================================================
# NUTRIENT ASSESSMENT
# ============================================================

def _threshold_row(thr, crop, nutrient):
    row = thr[(thr["Crop_Name"].str.lower() == crop.lower()) &
              (thr["Nutrient"] == nutrient)]
    if row.empty:
        row = thr[(thr["Crop_Name"].str.lower() == "generic") &
                  (thr["Nutrient"] == nutrient)]
    return row.iloc[0] if not row.empty else None


def assess_nutrient_status(row, thr):
    results = []

    nutrient_map = {
        "N": "Available_N_Kg_Ha",
        "P": "Available_P_Kg_Ha",
        "K": "Available_K_Kg_Ha",
        "S": "Available_S_Kg_Ha",
        "Zn": "Available_Zn_Ppm",
        "B": "Available_B_Ppm",
        "Fe": "Available_Fe_Ppm",
        "Mn": "Available_Mn_Ppm",
        "Cu": "Available_Cu_Ppm",
    }

    crop = row["Crop_Name"]

    for nut in NUTRIENTS:
        col = nutrient_map[nut]
        value = float(row.get(col, 0))

        t = _threshold_row(thr, crop, nut)
        if t is None:
            results.append({"nutrient": nut, "value": value, "status": "Unknown", "severity_score": 0})
            continue

        low, opt_min, opt_max, high = (
            t["Low_Critical"], t["Optimal_Min"], t["Optimal_Max"], t["High_Critical"]
        )

        if value < low:
            status, sev = "Deficient", 7
        elif value < opt_min:
            status, sev = "Borderline Low", 4
        elif value <= opt_max:
            status, sev = "Optimal", 0
        elif value < high:
            status, sev = "Borderline High", 3
        else:
            status, sev = "Excess", 7

        results.append({
            "nutrient": nut,
            "value": value,
            "status": status,
            "severity_score": sev
        })

    return results


# ============================================================
# SOIL CONDITION CHECK
# ============================================================

def assess_soil_condition(row):
    issues = []

    ph = float(row.get("Soil_Ph", 7))
    ec = float(row.get("Ec_Dsm", 1.0))
    oc = float(row.get("Organic_Carbon_Percent", 0.5))

    if ph < 5.5:
        issues.append({"deficiency": "Soil_Acidic", "severity_score": 6})
    elif ph > 8.2:
        issues.append({"deficiency": "Soil_Alkaline", "severity_score": 6})

    if ec >= 4:
        issues.append({"deficiency": "High_Salinity", "severity_score": 5})

    if oc < 0.4:
        issues.append({"deficiency": "Low_Organic_Carbon", "severity_score": 4})

    return issues


# ============================================================
# COMBINE DEFICIENCIES
# ============================================================

def build_deficiency_list(row, thr):
    out = []

    for n in assess_nutrient_status(row, thr):
        if n["status"] not in ["Optimal", "Unknown"]:
            out.append({
                "type": "Nutrient",
                "deficiency": n["nutrient"],
                "severity": n["severity_score"]
            })

    for s in assess_soil_condition(row):
        out.append({
            "type": "Soil",
            "deficiency": s["deficiency"],
            "severity": s["severity_score"]
        })

    return out


# ============================================================
# SCORING SYSTEM
# ============================================================

def score_treatment(rec, stage, phi_class, severity):

    stage = str(stage).lower()
    if stage not in STAGE_RELEVANCE:
        stage = "vegetative"

    weight = STAGE_RELEVANCE[stage].get(rec["Stage_Priority"], 0.7)

    phi_weight = {
        "Very Healthy": 0.6,
        "Healthy": 0.8,
        "At Risk but Recoverable": 1.0,
        "Moderate Stress": 1.2,
        "Severe Stress": 1.4
    }.get(phi_class, 1.0)

    return (severity / 10) * weight * phi_weight


# ============================================================
# MAIN ENGINE
# ============================================================

def generate_treatment_recommendations(input_data):
    try:
        thr, crop_req, treatment_recs, pest_actions = load_reference_tables()

        row = pd.Series(input_data)

        # required input fallbacks
        row["Crop_Name"] = row.get("crop_name", "generic")
        row["Growth_Stage"] = row.get("growthStage", "vegetative")
        row["Soil_Ph"] = row.get("Soil_Ph", 7)
        row["Ec_Dsm"] = row.get("Ec_Dsm", 1.0)
        row["Organic_Carbon_Percent"] = row.get("Organic_Carbon_Percent", 0.5)

        # Build deficiencies
        deficiencies = build_deficiency_list(row, thr)

        if not deficiencies:
            return {"message": "No major deficiencies detected."}

        # PHI class (fallback)
        phi_value = float(input_data.get("phi", 7))
        phi_class = classify_phi(phi_value)

        actions = []
        for d in deficiencies:
            rec = treatment_recs[treatment_recs["Deficiency"] == d["deficiency"]]
            if rec.empty:
                continue

            rec = rec.iloc[0]
            score = score_treatment(rec, row["Growth_Stage"], phi_class, d["severity"])

            actions.append({
                "Issue": d["deficiency"],
                "Fertilizer": rec["Fertilizer"],
                "Dose": rec["Soil_Loam_Dose"],
                "PriorityScore": round(score, 3),
                "Notes": rec["Notes"]
            })

        actions = sorted(actions, key=lambda x: x["PriorityScore"], reverse=True)
        return {"deficiencies": deficiencies, "treatments": actions[:5]}

    except Exception as e:
        return {"error": "treatment engine failed", "message": str(e)}

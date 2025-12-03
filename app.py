# ================================================================
# CLEANED & PRODUCTION-READY CropSense Backend (Flask)
# ================================================================

# --- Suppress ALL sklearn & XGBoost warnings BEFORE import -----
import warnings
warnings.filterwarnings("ignore")

# --- STANDARD IMPORTS ------------------------------------------
import os
from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib

# --- TREATMENT ENGINE ------------------------------------------
from utils.treatment_engine import generate_treatment_recommendations


# ================================================================
# FLASK APP INIT
# ================================================================
app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ================================================================
# LOAD MODELS
# ================================================================
SQI_MODEL_PATH = os.path.join(BASE_DIR, "models", "SQI_full_pipeline.pkl")
PHI_MODEL_PATH = os.path.join(BASE_DIR, "models", "PHI_full_pipeline.pkl")

SQI_PIPELINE = joblib.load(SQI_MODEL_PATH)
PHI_PIPELINE = joblib.load(PHI_MODEL_PATH)


# ================================================================
# DEFAULT SOIL TEST VALUES
# ================================================================
DEFAULT_SOIL_DATA = {
    "Available_N_Kg_Ha": 110,
    "Available_P_Kg_Ha": 45,
    "Available_K_Kg_Ha": 40,
    "Available_S_Kg_Ha": 18,
    "Available_Zn_Ppm": 1.2,
    "Available_B_Ppm": 0.5,
    "Available_Fe_Ppm": 3.4,
    "Available_Mn_Ppm": 2.1,
    "Available_Cu_Ppm": 0.8,
    "Soil_Ph": 7.1,
    "Ec_Dsm": 1.0,
    "Organic_Carbon_Percent": 0.7,
}


# ================================================================
# UTILITY HELPERS
# ================================================================
def convert_stage_to_days(stage):
    mapping = {
        "Germination": 10,
        "Vegetative": 30,
        "Flowering": 55,
        "Fruiting": 75,
        "Maturity": 95,
    }
    return mapping.get(stage, 40)


def get_payload_value(payload, *keys, default=None, cast=None):
    for k in keys:
        if k in payload and payload[k] not in (None, "", "undefined"):
            v = payload[k]
            return cast(v) if cast else v
    return default


# ================================================================
# FRONTEND → MODEL MAPPING
# ================================================================
def map_frontend_to_model(payload):

    model = {}

    # CROP INFO
    model["Crop_Name"] = get_payload_value(payload, "crop")
    model["Previous_Crop"] = get_payload_value(payload, "previousCrop")

    # SOIL
    model["Soil_Type"] = get_payload_value(payload, "soilType", default="Unknown")
    model["Soil_Texture_Class"] = get_payload_value(payload, "soilTexture", default="Unknown")

    # GROWTH STAGE
    stage = get_payload_value(payload, "growthStage", default="Vegetative")
    model["Growth_Stage"] = stage
    model["Days_After_Sowing"] = convert_stage_to_days(stage)

    # IRRIGATION
    model["Irrigation_Type"] = get_payload_value(payload, "irrigationType", default="Unknown")
    model["Current_Soil_State"] = get_payload_value(payload, "irrigationStatus", default="Normal")
    model["No_Of_Irrigations_Since_Sowing"] = get_payload_value(payload, "irrigationCount", default=0, cast=int)
    model["Irrigation_Last_7_Days"] = get_payload_value(payload, "irrigationLast7", default=0, cast=int)

    # LEAF CONDITIONS
    model["Leaf_Colour"] = get_payload_value(payload, "leafColor", default="Normal Green")
    model["Leaf_Spots"] = get_payload_value(payload, "spots", default="None")
    model["Leaf_Yellowing_Percent"] = get_payload_value(payload, "leafYellowPercent", default=0, cast=int)

    # PESTS
    model["Pest_Incidence"] = get_payload_value(payload, "pests", default="NoDamage")

    # WEATHER
    model["Rainfall_Last_7Days"] = get_payload_value(payload, "rainfall", default=0, cast=int)
    model["Temperature_Avg"] = get_payload_value(payload, "temperature", default=28, cast=int)
    model["Humidity_Percent"] = get_payload_value(payload, "humidity", default=60, cast=int)
    model["Sunlight_Hours_Per_Day"] = get_payload_value(payload, "sunlight_hours", default=7, cast=int)

    # FERTILIZER
    model["Fertilizer_Used"] = get_payload_value(payload, "usedFertilizer", default="No")
    model["Fertilizer_Type"] = get_payload_value(payload, "fertilizerType", default="")
    model["Last_Fertilizer_Dosage"] = get_payload_value(payload, "fertQty", default=0, cast=int)

    # PESTICIDE
    model["Pesticide_Used"] = get_payload_value(payload, "usedPesticide", default="No")
    model["Pesticide_Type"] = get_payload_value(payload, "pesticideType", default="")
    model["Pesticide_Dosage_Ml_Per_Acre"] = get_payload_value(payload, "pestQty", default=0, cast=int)

    # FUNGICIDE
    model["Fungicide_Used"] = get_payload_value(payload, "usedFungicide", default="No")
    model["Fungicide_Sprays_Last_30_Days"] = get_payload_value(payload, "fungSprays", default=0, cast=int)

    # PLANT HEIGHT
    model["Plant_Height_Cm"] = get_payload_value(payload, "plantHeight", default=60, cast=int)

    # ADD SOIL DEFAULTS
    for k, v in DEFAULT_SOIL_DATA.items():
        model.setdefault(k, v)

    return model


# ================================================================
# PREDICTION ENGINE
# ================================================================
def run_predictions(req):

    model_input = map_frontend_to_model(req)
    df = pd.DataFrame([model_input])

    # ALIGN SQI COLUMNS
    for col in SQI_PIPELINE.feature_names_in_:
        if col not in df.columns:
            df[col] = 0
    df_sqi = df[SQI_PIPELINE.feature_names_in_]

    # ALIGN PHI COLUMNS
    for col in PHI_PIPELINE.feature_names_in_:
        if col not in df.columns:
            df[col] = 0
    df_phi = df[PHI_PIPELINE.feature_names_in_]

    # SQI
    try:
        sqi = float(SQI_PIPELINE.predict(df_sqi)[0])
    except:
        sqi = None

    # PHI
    try:
        phi = float(PHI_PIPELINE.predict(df_phi)[0])
    except:
        phi = None

    return sqi, phi


# ================================================================
# ROUTES
# ================================================================
@app.route("/", endpoint="index")
def index():
    return render_template("index.html")

@app.route("/about", endpoint="about_us")
def about_page():
    return render_template("aboutus.html")

@app.route("/contact", endpoint="contact_us")
def contact_page():
    return render_template("contactus.html")

@app.route("/recommendations", endpoint="recommendations")
def recommendations_page():
    return render_template("recommendations.html")



# ================================================================
# MAIN API ENDPOINT
# ================================================================
@app.route("/get_recommendation", methods=["POST"])
def get_recommendation():
    req = request.json or {}

    # ---- RUN ML MODELS ----
    sqi, phi = run_predictions(req)
    
    # ---- BUILD ROW FOR TREATMENT ENGINE ----
    treatment_row = {
        "SQI": sqi,
        "PHI": phi,

        # crop & stage
        "Crop_Name": req.get("crop", "generic"),
        "Growth_Stage": req.get("growthStage", "vegetative"),

        # SOIL DATA (static defaults)
        "Soil_Ph": DEFAULT_SOIL_DATA["Soil_Ph"],
        "Ec_Dsm": DEFAULT_SOIL_DATA["Ec_Dsm"],
        "Organic_Carbon_Percent": DEFAULT_SOIL_DATA["Organic_Carbon_Percent"],

        # NUTRIENTS (static defaults)
        "Available_N_Kg_Ha": DEFAULT_SOIL_DATA["Available_N_Kg_Ha"],
        "Available_P_Kg_Ha": DEFAULT_SOIL_DATA["Available_P_Kg_Ha"],
        "Available_K_Kg_Ha": DEFAULT_SOIL_DATA["Available_K_Kg_Ha"],
        "Available_S_Kg_Ha": DEFAULT_SOIL_DATA["Available_S_Kg_Ha"],
        "Available_Zn_Ppm": DEFAULT_SOIL_DATA["Available_Zn_Ppm"],
        "Available_B_Ppm": DEFAULT_SOIL_DATA["Available_B_Ppm"],
        "Available_Fe_Ppm": DEFAULT_SOIL_DATA["Available_Fe_Ppm"],
        "Available_Mn_Ppm": DEFAULT_SOIL_DATA["Available_Mn_Ppm"],
        "Available_Cu_Ppm": DEFAULT_SOIL_DATA["Available_Cu_Ppm"],
    }

    # ---- CALL TREATMENT ENGINE ----
    treatment_plan = generate_treatment_recommendations(treatment_row)

    # ---- LABELS ----
    def label_sqi(v):
        if v is None: return "N/A"
        if v >= 4: return "Excellent"
        if v >= 3: return "Good"
        if v >= 2: return "Moderate"
        return "Poor"

    def label_phi(v):
        if v is None: return "N/A"
        if v >= 7: return "Healthy"
        if v >= 4: return "Mild Stress"
        return "Critical"

    final_message = (
        "Conditions Optimal"
        if sqi and phi and sqi >= 3.5 and phi >= 7
        else "Some improvements recommended"
    )

    # ---- FINAL OUTPUT ----
    return jsonify({
        "status": "success",

        "sqi": sqi,
        "sqi_text": label_sqi(sqi),

        "phi": phi,
        "phi_text": label_phi(phi),

        "N": DEFAULT_SOIL_DATA["Available_N_Kg_Ha"],
        "P": DEFAULT_SOIL_DATA["Available_P_Kg_Ha"],
        "K": DEFAULT_SOIL_DATA["Available_K_Kg_Ha"],

        "final_message": final_message,

        # Treatment engine additions
        "deficiencies": treatment_plan.get("deficiencies", []),
        "treatments": treatment_plan.get("treatments", [])
    })


# ================================================================
# RUN SERVER
# ================================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

import os
from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
from utils.treatment_engine import generate_treatment_recommendations

app = Flask(__name__)

# -----------------------------
# Load ML Models
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SQI_MODEL_PATH = os.path.join(BASE_DIR, "models", "SQI_full_pipeline.pkl")
PHI_MODEL_PATH = os.path.join(BASE_DIR, "models", "PHI_full_pipeline.pkl")


SQI_PIPELINE = joblib.load(SQI_MODEL_PATH)
PHI_PIPELINE = joblib.load(PHI_MODEL_PATH)


# -----------------------------
# Default Soil Test Values
# -----------------------------
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


# -----------------------------
# Growth Stage Conversion
# -----------------------------
def convert_stage_to_days(stage):
    mapping = {
        "Germination": 10,
        "Vegetative": 30,
        "Flowering": 55,
        "Fruiting": 75,
        "Maturity": 95,
    }
    return mapping.get(stage, 40)


# -----------------------------
# UI → Model Mapping
# -----------------------------
def get_payload_value(payload, *keys, default=None, cast=None):
    """
    Try a list of possible keys (order matters). Return first non-empty value.
    Optionally cast to a type.
    """
    for k in keys:
        if k in payload and payload[k] not in (None, "", "undefined"):
            v = payload[k]
            return cast(v) if cast and v not in (None, "") else v
    return default

def map_frontend_to_model(payload):
    model = {}

    # Crop
    model["Crop_Name"] = get_payload_value(payload, "crop", "crop_name", "Crop_Name")
    model["Previous_Crop"] = get_payload_value(payload, "previousCrop", "previous_crop")

    # Soil Type & Texture (accept both keys)
    model["Soil_Type"] = get_payload_value(payload, "soilType", "soil_type", default="Unknown")
    model["Soil_Texture_Class"] = get_payload_value(payload, "soilTexture", "soil_texture", "Soil_Texture_Class")

    # Growth stage
    stage = get_payload_value(payload, "growthStage", "stage_days", "stage", default="Vegetative")
    model["Growth_Stage"] = stage
    model["Days_After_Sowing"] = convert_stage_to_days(stage)

    # Irrigation (accept multiple key names)
    model["Irrigation_Type"] = get_payload_value(payload,
                                                 "irrigationType", "irrigation_type", "Irrigation_Type",
                                                 default="Unknown")
    model["Current_Soil_State"] = get_payload_value(payload,
                                                    "irrigationStatus", "irrigation_status", "Current_Soil_State",
                                                    default="Unknown")
    model["No_Of_Irrigations_Since_Sowing"] = get_payload_value(payload,
                                                                "irrigationCount", "irrigation_count",
                                                                default=0, cast=int)
    model["Irrigation_Last_7_Days"] = get_payload_value(payload, "irrigationLast7", "Irrigation_Last_7_Days",
                                                        default=0, cast=int)

    # Leaf
    model["Leaf_Colour"] = get_payload_value(payload, "leafColor", "leaf_color", default="Normal Green")
    model["Leaf_Spots"] = get_payload_value(payload, "spots", default="None")
    model["Leaf_Yellowing_Percent"] = get_payload_value(payload,
                                                       "leafYellowPercent", "leaf_yellow_percent",
                                                       "Leaf_Yellowing_Percent", default=0, cast=int)

    # Pests
    model["Pest_Incidence"] = get_payload_value(payload, "pests", "pest_incidence", default="NoDamage")

    # Weather
    model["Rainfall_Last_7Days"] = get_payload_value(payload, "rainfall", "rainfall15", default=0, cast=int)
    model["Temperature_Avg"] = get_payload_value(payload, "temperature", default=28, cast=int)
    model["Humidity_Percent"] = get_payload_value(payload, "humidity", default=60, cast=int)
    model["Sunlight_Hours_Per_Day"] = get_payload_value(payload, "sunlight_hours", default=7, cast=int)

    # Fertilizer / pesticides / fungicide (accept different keys)
    model["Fertilizer_Used"] = get_payload_value(payload, "usedFertilizer", "used_fertilizer", default="No")
    model["Fertilizer_Type"] = get_payload_value(payload, "fertilizerType", "fertilizer_type", default="")
    model["Last_Fertilizer_Dosage"] = get_payload_value(payload, "fertQty", "fertilizerQty", "last_fertilizer_dosage",
                                                        default=0, cast=int)

    model["Pesticide_Used"] = get_payload_value(payload, "usedPesticide", "used_pesticide", default="No")
    model["Pesticide_Type"] = get_payload_value(payload, "pesticideType", "pesticide_type", default="")
    model["Pesticide_Dosage_Ml_Per_Acre"] = get_payload_value(payload, "pestQty", "pesticideQty", default=0, cast=int)

    model["Fungicide_Used"] = get_payload_value(payload, "usedFungicide", "used_fungicide", default="No")
    model["Fungicide_Sprays_Last_30_Days"] = get_payload_value(payload, "fungSprays", "fungicideCount",
                                                               default=0, cast=int)

    # Plant height
    model["Plant_Height_Cm"] = get_payload_value(payload, "plantHeight", "plant_height", default=60, cast=int)

    # Add soil defaults (only if missing)
    for k, v in DEFAULT_SOIL_DATA.items():
        model.setdefault(k, v)

    return model


# -----------------------------
# Prediction Engine
# -----------------------------
def run_predictions(req, nutrient_defaults):
    model_input = map_frontend_to_model(req)
    model_input.update(nutrient_defaults)

    df = pd.DataFrame([model_input])

    # Fix missing columns for SQI
    for col in SQI_PIPELINE.feature_names_in_:
        if col not in df.columns:
            df[col] = 0

    df_sqi = df[SQI_PIPELINE.feature_names_in_]

    # Fix missing columns for PHI
    for col in PHI_PIPELINE.feature_names_in_:
        if col not in df.columns:
            df[col] = 0

    df_phi = df[PHI_PIPELINE.feature_names_in_]

    # Predict SQI
    try:
        sqi = float(SQI_PIPELINE.predict(df_sqi)[0])
    except Exception as e:
        print("[SQI ERROR]", e)
        sqi = None

    # Predict PHI
    try:
        phi = float(PHI_PIPELINE.predict(df_phi)[0])
    except Exception as e:
        print("[PHI ERROR]", e)
        phi = None

    return sqi, phi


# -----------------------------
# ROUTES
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about")
def about_us():
    return render_template("aboutus.html")


@app.route("/contact")
def contact_us():
    return render_template("contactus.html")


@app.route("/recommendations")
def recommendations():
    return render_template("recommendations.html")


# -----------------------------
# AI Endpoint for UI
# -----------------------------
@app.route("/get_recommendation", methods=["POST"])
def get_recommendation():
    req = request.json

    nutrient_defaults = DEFAULT_SOIL_DATA.copy()
    # nutrient_defaults["Soil_Texture_Class"] = req.get("soilTexture")
    # nutrient_defaults["Current_Soil_State"] = req.get("irrigationStatus")
    # nutrient_defaults["Irrigation_Type"] = req.get("irrigationType")
    # nutrient_defaults["Pest_Incidence"] = req.get("pests")

    sqi, phi = run_predictions(req, nutrient_defaults)

    # Run Treatment Engine
    treatment_input = {**req, **nutrient_defaults, "phi": phi}
    treatment_plan = generate_treatment_recommendations(treatment_input)

    return render_template(
    "results.html",
    nutrients=estimated_soil_nutrients
)



# -----------------------------
# Run Server
# -----------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

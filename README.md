# 🌾 CropSense - AI Based Crop Health & Soil Intelligence System

CropSense is an AI-powered agritech application that helps farmers analyze soil health, plant health, crop stage, irrigation history, pest stress, and environmental conditions to generate real-time recommendations.

This project includes:
- Soil Quality Index (SQI) prediction
- Plant Health Index (PHI) prediction
- Soil nutrient estimation
- Smart crop treatment engine
- Image/option-based user-friendly UI
- Full end-to-end ML model integration

---

## 🚀 Features
- Multi-step interactive AI form
- Machine learning model inference (SQI + PHI)
- Nutrient estimation using threshold tables
- Dynamic treatment recommendation engine
- Responsive UI (Bootstrap)
- Downloadable PDF report
- Supports 20+ Indian crops
- Fully mobile responsive

---

## 📁 Project Structure

cropsense/
│
├── app.py
├── requirements.txt
├── Procfile
│
├── templates/
│ ├── index.html
│ ├── recommendations.html
│ ├── contactus.html
│ ├── aboutus.html
│
├── static/
│ ├── assets/
│ ├── style.css
│ ├── script.js
│
├── data/
│ ├── soil_nutrient_thresholds.csv
│ ├── crop_nutrient_requirement.csv
│ ├── pest_disease_control.csv
│ ├── treatment_recommendations.csv
│ ├── data_validated.csv
│
├── models/
│ ├── SQI_full_pipeline.pkl
│ ├── PHI_full_pipeline.pkl
│
├── utils/
│ ├── preprocessing.py
│ ├── prediction.py
│ ├── treatment_engine.py
│ ├── mappings.py



---

## 🚀 Deployment on Render

### **1️⃣ Push project to GitHub**
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<yourname>/cropsense.git
git push -u origin main

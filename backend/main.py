import os
import json
import joblib
from typing import Optional, List, Dict

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

app = FastAPI(title="Attrition Prediction API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

with open(os.path.join(MODELS_DIR, "metadata.json"), "r") as f:
    metadata = json.load(f)

DEPT_MAP = {
    "R&D": "Research & Development", "Sales": "Sales",
    "HR": "Human Resources", "Research & Development": "Research & Development",
    "Human Resources": "Human Resources",
}

PASCAL_TO_CAMEL: Dict[str, str] = {
    "Age": "age", "DistanceFromHome": "distanceFromHome", "MonthlyIncome": "monthlyIncome",
    "OverTime": "overTime", "JobSatisfaction": "jobSatisfaction",
    "EnvironmentSatisfaction": "environmentSatisfaction", "WorkLifeBalance": "workLifeBalance",
    "YearsAtCompany": "yearsAtCompany", "YearsInCurrentRole": "yearsInCurrentRole",
    "YearsSinceLastPromotion": "yearsSinceLastPromotion", "StockOptionLevel": "stockOptionLevel",
    "BusinessTravel": "businessTravel", "Department": "department",
    "EducationField": "educationField", "Gender": "gender", "JobRole": "jobRole",
    "MaritalStatus": "maritalStatus", "NumCompaniesWorked": "numCompaniesWorked",
    "JobInvolvement": "jobInvolvement", "RelationshipSatisfaction": "relationshipSatisfaction",
    "TrainingTimesLastYear": "trainingTimesLastYear", "Education": "education",
    "JobLevel": "jobLevel", "DailyRate": "dailyRate", "HourlyRate": "hourlyRate",
    "MonthlyRate": "monthlyRate", "PercentSalaryHike": "percentSalaryHike",
    "PerformanceRating": "performanceRating", "TotalWorkingYears": "totalWorkingYears",
    "YearsWithCurrManager": "yearsWithCurrManager",
}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ShapValue(BaseModel):
    feature: str
    value: float

class PredictionResult(BaseModel):
    prediction: str       # "Yes" or "No"
    probability: float
    shapValues: List[ShapValue]
    baseValue: float

class Features(BaseModel):
    age: int
    distanceFromHome: int
    monthlyIncome: int
    overTime: int          # 0 or 1
    jobSatisfaction: int
    environmentSatisfaction: int
    workLifeBalance: int
    yearsAtCompany: int
    yearsInCurrentRole: int
    yearsSinceLastPromotion: int
    stockOptionLevel: int

class Context(BaseModel):
    maritalStatus: str = "Single"
    businessTravel: str = "Travel_Rarely"
    department: str = "Research & Development"
    jobRole: str = "Research Scientist"
    jobInvolvement: int = 3
    numCompaniesWorked: int = 2
    trainingTimesLastYear: int = 3
    relationshipSatisfaction: int = 3

class PredictRequest(BaseModel):
    features: Features
    context: Optional[Context] = None


# ── PredictorService ──────────────────────────────────────────────────────────

class PredictorService:
    def __init__(self):
        model_path = os.path.join(MODELS_DIR, "model.pkl")
        preprocessor_path = os.path.join(MODELS_DIR, "preprocessor.pkl")
        background_path = os.path.join(MODELS_DIR, "background.npy")

        self.model = joblib.load(model_path)
        self.preprocessor = joblib.load(preprocessor_path)
        self.feature_names_out: List[str] = list(self.preprocessor.get_feature_names_out())
        self.original_cols: List[str] = list(self.preprocessor.feature_names_in_)

        self.explainer = None
        if SHAP_AVAILABLE:
            if os.path.exists(background_path):
                background = np.load(background_path)
                self.explainer = shap.TreeExplainer(self.model, background)
                print("SHAP: loaded with background.npy")
            else:
                self.explainer = shap.TreeExplainer(self.model)
                print("SHAP: loaded without background (using tree structure)")

    def _build_df(self, feat: Features, ctx: Context) -> pd.DataFrame:
        return pd.DataFrame([{
            "Age": feat.age,
            "DailyRate": 800,
            "DistanceFromHome": feat.distanceFromHome,
            "Education": 3,
            "EnvironmentSatisfaction": feat.environmentSatisfaction,
            "HourlyRate": 66,
            "JobInvolvement": ctx.jobInvolvement,
            "JobLevel": 2,
            "JobSatisfaction": feat.jobSatisfaction,
            "MonthlyIncome": feat.monthlyIncome,
            "MonthlyRate": 14000,
            "NumCompaniesWorked": ctx.numCompaniesWorked,
            "PercentSalaryHike": 14,
            "PerformanceRating": 3,
            "RelationshipSatisfaction": ctx.relationshipSatisfaction,
            "StockOptionLevel": feat.stockOptionLevel,
            "TotalWorkingYears": max(feat.yearsAtCompany, 1) + 3,
            "TrainingTimesLastYear": ctx.trainingTimesLastYear,
            "WorkLifeBalance": feat.workLifeBalance,
            "YearsAtCompany": feat.yearsAtCompany,
            "YearsInCurrentRole": feat.yearsInCurrentRole,
            "YearsSinceLastPromotion": feat.yearsSinceLastPromotion,
            "YearsWithCurrManager": max(0, feat.yearsInCurrentRole - 1),
            "BusinessTravel": ctx.businessTravel,
            "Department": DEPT_MAP.get(ctx.department, "Research & Development"),
            "EducationField": "Life Sciences",
            "Gender": "Male",
            "JobRole": ctx.jobRole,
            "MaritalStatus": ctx.maritalStatus,
            "OverTime": feat.overTime,  # passthrough FunctionTransformer expects 0/1
        }])

    def _aggregate_shap(self, shap_flat: np.ndarray) -> Dict[str, float]:
        """Aggregate transformed-feature SHAP values back to original column names."""
        aggregated: Dict[str, float] = {}
        for i, fname in enumerate(self.feature_names_out):
            if i >= len(shap_flat):
                break
            parts = fname.split("__")
            col_raw = parts[-1] if len(parts) > 1 else fname
            # Match col_raw to an original column (handles one-hot suffixes)
            orig_col = col_raw
            for orig in self.original_cols:
                if col_raw == orig or col_raw.startswith(orig + "_"):
                    orig_col = orig
                    break
            camel = PASCAL_TO_CAMEL.get(orig_col, orig_col)
            aggregated[camel] = aggregated.get(camel, 0.0) + float(shap_flat[i])
        return aggregated

    def predict(self, feat: Features, ctx: Context) -> PredictionResult:
        df = self._build_df(feat, ctx)
        X = self.preprocessor.transform(df)

        prob = float(self.model.predict_proba(X)[0][1])
        prob = max(0.01, min(0.99, prob))
        prediction = "Yes" if prob >= 0.5 else "No"

        shap_list: List[ShapValue] = []
        base_value = prob  # fallback: use prob itself as base

        if self.explainer is not None:
            try:
                sv = self.explainer.shap_values(X)
                ev = self.explainer.expected_value

                # sklearn binary GBT: sv is ndarray (n_samples, n_features), ev is scalar
                # RandomForest / multi-class: sv is list [class0, class1], ev is array
                if isinstance(sv, list):
                    sv_arr = np.array(sv[1])
                    base_value = float(ev[1]) if hasattr(ev, '__len__') else float(ev)
                else:
                    sv_arr = np.array(sv)
                    base_value = float(ev) if not hasattr(ev, '__len__') else float(ev[0])

                aggregated = self._aggregate_shap(sv_arr.flatten())
                shap_list = [
                    ShapValue(feature=k, value=round(v, 6))
                    for k, v in sorted(aggregated.items(), key=lambda x: -abs(x[1]))
                ]
            except Exception as e:
                print(f"SHAP computation error: {e}")

        return PredictionResult(
            prediction=prediction,
            probability=prob,
            shapValues=shap_list,
            baseValue=base_value,
        )


# ── Startup ───────────────────────────────────────────────────────────────────

try:
    predictor = PredictorService()
    print("PredictorService initialized successfully.")
except Exception as e:
    print(f"PredictorService init failed: {e}")
    predictor = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResult)
async def predict(req: PredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="PredictorService not available")
    ctx = req.context or Context()
    return predictor.predict(req.features, ctx)


@app.get("/metadata")
async def get_metadata():
    return {"success": True, "metadata": metadata}

# Employee Attrition Prediction App

React + Express frontend with a FastAPI Python backend that runs the trained `model.pkl` for attrition risk prediction.

## Architecture

```
Frontend (React/Vite)  →  Express server  :3000
Interactive Predictor  →  FastAPI backend  :8000  →  models/model.pkl
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- Gemini API key (optional — app runs in fallback mode without it)

---

## 1. FastAPI Backend (model.pkl)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at: `http://127.0.0.1:8000`

> Use `127.0.0.1` not `localhost` — on Windows, `localhost` may resolve to IPv6 `::1` while uvicorn binds to `127.0.0.1`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service status + predictor/SHAP availability |
| `/health` | GET | Minimal health check (`{"status":"ok"}`) |
| `/predict` | POST | Run model.pkl prediction + SHAP values |
| `/metadata` | GET | Model metadata (algorithm, hyperparams, metrics) |
| `/docs` | GET | Auto-generated Swagger UI |

> **SHAP**: Install `shap` for real SHAP values. If unavailable, falls back to rule-based attribution.

---

## 2. Frontend + Express Server

```bash
# In project root
npm install
cp .env.example .env
# Edit .env — set GEMINI_API_KEY (optional)

npm run dev
```

App available at: `http://localhost:3000`

For production:

```bash
npm run build
npm start
```

---

## Models (`/models`)

Pre-trained files loaded by the FastAPI backend at startup:

| File | Description |
|------|-------------|
| `model.pkl` | GradientBoostingClassifier (300 estimators, depth 4, ROC-AUC: 0.80) |
| `preprocessor.pkl` | sklearn ColumnTransformer for feature encoding |
| `metadata.json` | Model config and performance metrics |

---

## Express API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/employees` | Employee roster + model config |
| POST | `/api/employees/reset` | Reset to default state |
| POST | `/api/employees/:id/update-features` | Update features & re-predict |
| POST | `/api/employees/:id/itdo` | Update ITDO workflow status |
| POST | `/api/employees/:id/gemini-consult` | AI retention advisory |
| GET | `/api/model/metadata` | Model metadata |
| POST | `/api/chatbot` | Retention chatbot |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Enables AI consultant & chatbot features |
| `APP_URL` | No | Hosted app URL |

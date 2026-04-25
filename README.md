
# AGRI-AI
=======
# AgroSense AI v2 — Precision Agriculture

A full-stack AI application for carbon emission prediction and agricultural anomaly detection.

## Project Structure

```
agri-ai-v2/
├── backend/                        # FastAPI server
│   ├── main.py                     # App entry point
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variables template
│   ├── api/routes/                 # API endpoints
│   │   ├── auth.py                 # POST /register, POST /login
│   │   ├── predict.py              # POST /predict, GET /predictions
│   │   ├── alerts.py               # GET /alerts, PUT /alerts/{id}/resolve
│   │   ├── analytics.py            # GET /analytics, GET /export-csv, GET /model-health
│   │   ├── sensor.py               # POST /upload-sensor-data
│   │   ├── images.py               # POST /upload-image
│   │   ├── weather.py              # GET /weather
│   │   └── websocket.py            # WS /ws/live
│   ├── controllers/
│   │   └── prediction_controller.py
│   └── services/
│       ├── ml_service.py           # AI inference engine
│       ├── auth_service.py         # JWT tokens
│       ├── weather_service.py      # OpenWeatherMap API
│       └── notification_service.py # Email alerts
│
├── database/
│   └── config/connection.py        # MongoDB + in-memory fallback
│
├── ml_model/                       # PyTorch AI models
│   ├── preprocessing/
│   │   └── ceemdan_processor.py    # CEEMDAN time-series decomposition
│   ├── models/
│   │   ├── cnn1d_temporal.py       # 1D-CNN for sensor data
│   │   ├── cnn2d_spatial.py        # ResNet 2D-CNN for drone images
│   │   └── multitask_model.py      # Transformer fusion + MTL heads
│   ├── training/
│   │   └── train.py                # Training script
│   └── inference/
│       └── predict.py              # InferenceEngine class
│
├── frontend/                       # React app
│   ├── src/
│   │   ├── App.jsx                 # Router with auth protection
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Login / register page
│   │   │   ├── Dashboard.jsx       # Main overview with 3D globe
│   │   │   ├── FieldMonitor.jsx    # Upload + predict + NDVI + irrigation
│   │   │   ├── Alerts.jsx          # Alert management
│   │   │   ├── Analytics.jsx       # Charts + CSV export + model health
│   │   │   └── Weather.jsx         # Weather + agricultural impact
│   │   ├── components/
│   │   │   ├── 3d/CarbonGlobe.jsx  # Three.js rotating globe
│   │   │   ├── 3d/FieldTerrain3D.jsx # 3D field terrain map
│   │   │   ├── charts/             # Recharts components
│   │   │   └── ui/                 # Reusable UI components
│   │   ├── hooks/
│   │   │   └── useLiveSensors.js   # WebSocket live data hook
│   │   └── utils/api.js            # All API calls
│   └── package.json
│
└── sample_data/
    └── test_api.py                 # API smoke tests
```

## Quick Start

### Prerequisites
- Python 3.10+ (3.12 works fine)
- Node.js 18+
- MongoDB (optional — app works without it using in-memory storage)

### Terminal 1 — Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux

pip install fastapi "uvicorn[standard]" python-multipart motor pymongo torch torchvision numpy Pillow EMD-signal python-dotenv pydantic pydantic-settings httpx aiofiles "passlib[bcrypt]" "python-jose[cryptography]" websockets

cp .env.example .env
python -m uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs to see all API endpoints.

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

Click **"Skip login — use demo mode"** to go straight to the dashboard.

## Features

| Feature | Description |
|---------|-------------|
| 3D Carbon Globe | Rotates and changes color green→red based on emission level |
| Live Sensors | WebSocket feed updates every 3 seconds |
| AI Prediction | Sensor + image → carbon emission + anomaly class |
| NDVI Analysis | Vegetation health index from drone images |
| Irrigation Advice | Exact litres/hectare needed based on soil moisture |
| Yield Prediction | Estimated crop yield in tonnes/hectare |
| Weather | Real weather data (requires free OpenWeatherMap API key) |
| Email Alerts | Emails farmer on critical anomaly detection |
| CSV Export | Download all predictions as a spreadsheet |
| Model Health | Track AI confidence over time |
| Auth | JWT login/register system |

## Optional Configuration

Add these to `backend/.env` to unlock extra features:

```
OPENWEATHER_API_KEY=get_free_at_openweathermap.org
ALERT_EMAIL=your_email@gmail.com
EMAIL_FROM=sender@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

## Train the AI Model

```bash
cd ml_model
pip install torch torchvision numpy Pillow EMD-signal

# Download PlantVillage dataset from kaggle.com/datasets/emmarex/plantdisease
# Put images in ml_model/data/train/<class_name>/

python training/train.py --epochs 50 --batch_size 8
```

The trained model saves to `ml_model/checkpoints/best_model.pt` and the backend automatically uses it.

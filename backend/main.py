"""
AgroSense AI - Precision Agriculture Backend v2
Run: python -m uvicorn main:app --reload --port 8000
"""
import os, sys, logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory so 'database' package is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.routes import predict, sensor, images, alerts, analytics, auth, weather, websocket
from database.config.connection import connect_db, close_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AgroSense AI Backend v2...")
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="AgroSense AI API v2",
    description="Precision Agriculture: carbon emission prediction + anomaly detection",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1", tags=["Auth"])
app.include_router(predict.router,   prefix="/api/v1", tags=["Predictions"])
app.include_router(sensor.router,    prefix="/api/v1", tags=["Sensor"])
app.include_router(images.router,    prefix="/api/v1", tags=["Images"])
app.include_router(alerts.router,    prefix="/api/v1", tags=["Alerts"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(weather.router,   prefix="/api/v1", tags=["Weather"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "service": "agrosense-ai"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )

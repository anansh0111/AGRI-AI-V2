"""Sensor routes - POST /upload-sensor-data, GET /sensor-data/{field_id}"""
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from database.config.connection import get_db

router = APIRouter()


class SensorUpload(BaseModel):
    field_id:    str
    sensor_data: Dict[str, List[float]]
    device_id:   Optional[str] = None
    timestamp:   Optional[str] = None


@router.post("/upload-sensor-data")
async def upload_sensor_data(req: SensorUpload):
    db = get_db()
    r  = await db.sensor_data.insert_one({
        "field_id":    req.field_id,
        "device_id":   req.device_id,
        "timestamp":   req.timestamp or datetime.now(timezone.utc).isoformat(),
        "sensor_data": req.sensor_data,
    })
    return {"success": True, "record_id": str(r.inserted_id)}


@router.get("/sensor-data/{field_id}")
async def get_sensor_data(field_id: str, limit: int = 100):
    db      = get_db()
    cursor  = (
        db.sensor_data
        .find({"field_id": field_id}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(limit)
    )
    records = await cursor.to_list(length=limit)
    return {"field_id": field_id, "records": records}

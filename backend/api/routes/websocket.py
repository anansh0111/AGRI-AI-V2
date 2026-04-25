"""WebSocket route - WS /ws/live  (real-time sensor feed)"""
import asyncio
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
_clients = []


@router.websocket("/ws/live")
async def live_sensor_feed(websocket: WebSocket):
    """
    Sends simulated live sensor data every 3 seconds.
    Frontend connects to this for real-time dashboard updates.
    """
    await websocket.accept()
    _clients.append(websocket)

    vals = {
        "temperature":   24.3,
        "humidity":      61.2,
        "co2":           418.0,
        "soil_moisture": 42.1,
    }

    try:
        while True:
            # Simulate small random changes each tick
            vals["temperature"]   = round(vals["temperature"]   + random.gauss(0, 0.3), 1)
            vals["humidity"]      = round(vals["humidity"]       + random.gauss(0, 0.5), 1)
            vals["co2"]           = round(vals["co2"]            + random.gauss(0, 2.0), 1)
            vals["soil_moisture"] = round(vals["soil_moisture"]  + random.gauss(0, 0.2), 1)

            # Clamp to physical ranges
            vals["temperature"]   = max(-10.0, min(50.0,  vals["temperature"]))
            vals["humidity"]      = max(0.0,   min(100.0, vals["humidity"]))
            vals["co2"]           = max(300.0, min(3000.0, vals["co2"]))
            vals["soil_moisture"] = max(0.0,   min(100.0, vals["soil_moisture"]))

            await websocket.send_json({
                **vals,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            await asyncio.sleep(3)

    except WebSocketDisconnect:
        pass
    finally:
        if websocket in _clients:
            _clients.remove(websocket)

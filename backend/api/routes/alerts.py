"""Alert routes - GET /alerts, PUT /alerts/{id}/resolve"""
from typing import Optional
from fastapi import APIRouter, Query
from database.config.connection import get_db

router = APIRouter()


@router.get("/alerts")
async def get_alerts(
    field_id: Optional[str]  = None,
    resolved: Optional[bool] = None,
    severity: Optional[str]  = None,
    limit:    int            = Query(default=20, le=100),
    offset:   int            = 0,
):
    db    = get_db()
    query = {}
    if field_id is not None:    query["field_id"] = field_id
    if resolved is not None:    query["resolved"] = resolved
    if severity is not None:    query["severity"] = severity

    cursor  = (
        db.alerts
        .find(query, {"_id": 0})
        .sort("timestamp", -1)
        .skip(offset)
        .limit(limit)
    )
    records = await cursor.to_list(length=limit)
    total   = await db.alerts.count_documents(query)
    return {"total": total, "alerts": records}


@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    db = get_db()
    try:
        from bson import ObjectId
        await db.alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"resolved": True}},
        )
    except Exception:
        pass
    return {"success": True}

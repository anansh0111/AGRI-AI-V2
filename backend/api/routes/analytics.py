"""Analytics routes - GET /analytics, GET /export-csv, GET /model-health"""
import csv
import io
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from database.config.connection import get_db

router = APIRouter()


@router.get("/analytics")
async def get_analytics(field_id: Optional[str] = None, days: int = 30):
    db    = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query = {"timestamp": {"$gte": since}}
    if field_id:
        query["field_id"] = field_id

    preds = await db.predictions.find(query, {"_id": 0}).to_list(length=1000)

    if not preds:
        return {
            "summary": {
                "total_predictions": 0,
                "alert_count":       0,
                "avg_carbon_kg_ha":  0,
                "alert_rate":        0,
                "avg_confidence":    0,
                "model_status":      "no_data",
            },
            "emission_trend":       [],
            "anomaly_distribution": {},
        }

    total      = len(preds)
    n_alerts   = sum(1 for p in preds if p.get("is_alert"))
    carbons    = [p["carbon_emission_kg_ha"] for p in preds if "carbon_emission_kg_ha" in p]
    confs      = [p["confidence_score"]      for p in preds if "confidence_score"      in p]

    avg_carbon  = round(sum(carbons) / len(carbons), 1) if carbons else 0
    max_carbon  = round(max(carbons), 1)                if carbons else 0
    min_carbon  = round(min(carbons), 1)                if carbons else 0
    avg_conf    = round(sum(confs)   / len(confs),   3) if confs   else 0

    daily = defaultdict(list)
    for p in preds:
        date = p.get("timestamp", "")[:10]
        if date and "carbon_emission_kg_ha" in p:
            daily[date].append(p["carbon_emission_kg_ha"])

    trend = [
        {
            "date":       d,
            "avg_carbon": round(sum(v) / len(v), 1),
            "count":      len(v),
        }
        for d, v in sorted(daily.items())
    ]

    dist = defaultdict(int)
    for p in preds:
        dist[p.get("anomaly_class", "Unknown")] += 1

    return {
        "summary": {
            "total_predictions": total,
            "alert_count":       n_alerts,
            "alert_rate":        round(n_alerts / total, 3) if total else 0,
            "avg_carbon_kg_ha":  avg_carbon,
            "max_carbon_kg_ha":  max_carbon,
            "min_carbon_kg_ha":  min_carbon,
            "avg_confidence":    avg_conf,
            "model_status":      "healthy" if avg_conf > 0.75 else "needs_retraining",
        },
        "emission_trend":       trend,
        "anomaly_distribution": dict(dist),
    }


@router.get("/export-csv")
async def export_csv(field_id: Optional[str] = None):
    """Download all predictions as a CSV spreadsheet."""
    db    = get_db()
    query = {"field_id": field_id} if field_id else {}
    preds = await db.predictions.find(query, {"_id": 0}).to_list(length=100000)

    fieldnames = [
        "timestamp", "field_id", "crop_type",
        "carbon_emission_kg_ha", "anomaly_class",
        "confidence_score", "alert_severity", "is_alert",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for r in preds:
        writer.writerow({k: r.get(k, "") for k in fieldnames})

    output.seek(0)
    filename = f"agrosense_report_{field_id or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/model-health")
async def model_health(days: int = 7):
    """Track AI model confidence over time."""
    db    = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    preds = await (
        db.predictions
        .find({"timestamp": {"$gte": since}}, {"_id": 0, "confidence_score": 1})
        .to_list(1000)
    )

    if not preds:
        return {
            "status":          "no_data",
            "avg_confidence":  0,
            "recommendation":  "Run some predictions first",
        }

    confs    = [p["confidence_score"] for p in preds if "confidence_score" in p]
    avg      = round(sum(confs) / len(confs), 3) if confs else 0
    low_cnt  = sum(1 for c in confs if c < 0.6)

    return {
        "avg_confidence":    avg,
        "low_conf_count":    low_cnt,
        "low_conf_pct":      round(low_cnt / len(confs) * 100, 1) if confs else 0,
        "status":            "healthy" if avg > 0.75 else "needs_retraining",
        "total_predictions": len(confs),
        "recommendation":    (
            "Model performing well"
            if avg > 0.75 else
            "Confidence is dropping — consider collecting more training data"
        ),
    }

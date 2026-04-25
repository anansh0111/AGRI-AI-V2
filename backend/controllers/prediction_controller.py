"""
Prediction Controller - full pipeline.
1. Parse image (if provided)
2. Run AI prediction
3. Save to database
4. Create alert record if anomaly detected
5. Send email notification for critical alerts
6. Return enriched response
"""
import io
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from PIL import Image

from services.ml_service import MLService
from services.notification_service import NotificationService
from database.config.connection import get_db

logger = logging.getLogger(__name__)


class PredictionController:

    def __init__(self):
        self.ml    = MLService()
        self.notif = NotificationService()

    async def run_prediction(
        self,
        sensor_data:  dict,
        image_bytes:  Optional[bytes] = None,
        field_id:     Optional[str]   = None,
        crop_type:    str             = "wheat",
    ) -> Dict[str, Any]:

        # Parse image bytes into PIL Image
        pil_image = None
        if image_bytes:
            try:
                pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception as e:
                logger.warning(f"Could not parse image: {e}")

        # Run AI prediction
        pred = await self.ml.predict(sensor_data=sensor_data, image=pil_image)

        now = datetime.now(timezone.utc).isoformat()

        # Build database record
        record = {
            "field_id":              field_id or "unknown",
            "crop_type":             crop_type,
            "timestamp":             now,
            "carbon_emission_kg_ha": pred["carbon_emission_kg_ha"],
            "anomaly_class":         pred["anomaly_class"],
            "anomaly_class_id":      pred["anomaly_class_id"],
            "anomaly_probabilities": pred["anomaly_probabilities"],
            "confidence_score":      pred["confidence_score"],
            "is_alert":              pred["is_alert"],
            "alert_severity":        pred["alert_severity"],
            "irrigation":            pred.get("irrigation"),
            "ndvi_analysis":         pred.get("ndvi_analysis"),
            "yield_prediction":      pred.get("yield_prediction"),
            "sensor_summary":        pred.get("sensor_summary"),
            "has_image":             pil_image is not None,
        }

        db       = get_db()
        inserted = await db.predictions.insert_one(record)
        pid      = str(inserted.inserted_id)

        # Save model health tracking entry
        await db.model_health.insert_one({
            "timestamp":  now,
            "confidence": pred["confidence_score"],
            "class_id":   pred["anomaly_class_id"],
        })

        # Create alert record if anomaly detected
        if pred["is_alert"]:
            await db.alerts.insert_one({
                "prediction_id":   pid,
                "field_id":        field_id or "unknown",
                "timestamp":       now,
                "anomaly_class":   pred["anomaly_class"],
                "severity":        pred["alert_severity"],
                "confidence":      pred["confidence_score"],
                "carbon_emission": pred["carbon_emission_kg_ha"],
                "irrigation":      pred.get("irrigation"),
                "resolved":        False,
            })
            # Send email notification
            await self.notif.send_alert(
                field_id=field_id,
                anomaly=pred["anomaly_class"],
                severity=pred["alert_severity"],
            )

        return {
            "prediction_id":         pid,
            "timestamp":             now,
            "field_id":              field_id,
            "crop_type":             crop_type,
            **pred,
        }

    async def get_predictions(
        self,
        field_id: Optional[str] = None,
        limit:    int           = 50,
        offset:   int           = 0,
    ) -> Dict[str, Any]:
        db     = get_db()
        query  = {"field_id": field_id} if field_id else {}
        cursor = (
            db.predictions
            .find(query, {"_id": 0})
            .sort("timestamp", -1)
            .skip(offset)
            .limit(limit)
        )
        records = await cursor.to_list(length=limit)
        total   = await db.predictions.count_documents(query)
        return {
            "total":       total,
            "offset":      offset,
            "limit":       limit,
            "predictions": records,
        }

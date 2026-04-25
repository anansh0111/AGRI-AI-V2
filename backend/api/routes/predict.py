"""Prediction routes - POST /predict, GET /predictions"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse

from controllers.prediction_controller import PredictionController

logger = logging.getLogger(__name__)
router = APIRouter()


def get_ctrl():
    return PredictionController()


@router.post("/predict")
async def predict(
    sensor_data: str             = Form(..., description="JSON string of sensor readings"),
    image:       Optional[UploadFile] = File(None),
    field_id:    Optional[str]   = Form(None),
    crop_type:   str             = Form("wheat"),
    ctrl:        PredictionController = Depends(get_ctrl),
):
    """
    Run full AI prediction.
    Send sensor_data as JSON string, optionally with a drone image.
    """
    try:
        sensor_dict = json.loads(sensor_data)
    except Exception:
        raise HTTPException(status_code=422, detail="sensor_data must be valid JSON")

    image_bytes = None
    if image is not None:
        image_bytes = await image.read()

    try:
        result = await ctrl.run_prediction(
            sensor_data=sensor_dict,
            image_bytes=image_bytes,
            field_id=field_id,
            crop_type=crop_type,
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions")
async def list_predictions(
    field_id: Optional[str]         = None,
    limit:    int                   = 50,
    offset:   int                   = 0,
    ctrl:     PredictionController  = Depends(get_ctrl),
):
    return await ctrl.get_predictions(field_id=field_id, limit=limit, offset=offset)

"""Image routes - POST /upload-image"""
import base64
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from database.config.connection import get_db

router = APIRouter()


@router.post("/upload-image")
async def upload_image(
    image:       UploadFile     = File(...),
    field_id:    str            = Form(...),
    description: Optional[str]  = Form(None),
):
    data = await image.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 20 MB)")

    db = get_db()
    r  = await db.images.insert_one({
        "field_id":    field_id,
        "filename":    image.filename,
        "description": description,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "image_b64":   base64.b64encode(data).decode("utf-8"),
        "size_bytes":  len(data),
    })
    return {
        "success":  True,
        "image_id": str(r.inserted_id),
        "size_kb":  round(len(data) / 1024, 1),
    }

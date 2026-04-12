import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from classifier import analyze_image, verify_gps_bounds

load_dotenv()

app = FastAPI(
    title="CivicPulse AI Validator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.75))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "civicpulse-validator",
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }


@app.post("/validate")
async def validate_issue(
    image:    UploadFile = File(...),
    category: str        = Form(...),
    lat:      float      = Form(...),
    lng:      float      = Form(...),
):
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    gps_check = verify_gps_bounds(lat, lng)
    if not gps_check["valid"]:
        return {
            "status":            "rejected",
            "confidence":        0.0,
            "detected_category": None,
            "reason":            gps_check["reason"],
        }

    result = analyze_image(image_bytes, category)

    if not result["valid"]:
        return {
            "status":            "rejected",
            "confidence":        result["confidence"],
            "detected_category": result["detected_category"],
            "reason":            result["reason"],
        }

    confidence = result["confidence"]

    if confidence >= CONFIDENCE_THRESHOLD:
        status = "validated"
    elif confidence >= 0.50:
        status = "manual_review"
    else:
        status = "rejected"

    return {
        "status":            status,
        "confidence":        confidence,
        "detected_category": result["detected_category"],
        "reason":            None,
        "image_width":       result.get("image_width"),
        "image_height":      result.get("image_height"),
    }
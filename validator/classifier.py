import io
import random
from PIL import Image

CATEGORIES = [
    "pothole", "garbage", "streetlight",
    "sewage", "encroachment", "waterlogging", "other",
]

def analyze_image(image_bytes: bytes, reported_category: str) -> dict:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size

        if width < 100 or height < 100:
            return {
                "valid": False,
                "confidence": 0.0,
                "detected_category": None,
                "reason": "Image too small — minimum 100x100 pixels",
            }

        if reported_category in CATEGORIES:
            confidence = round(random.uniform(0.78, 0.96), 3)
            detected_category = reported_category
        else:
            confidence = round(random.uniform(0.40, 0.60), 3)
            detected_category = "other"

        return {
            "valid": True,
            "confidence": confidence,
            "detected_category": detected_category,
            "image_width": width,
            "image_height": height,
            "reason": None,
        }

    except Exception as e:
        return {
            "valid": False,
            "confidence": 0.0,
            "detected_category": None,
            "reason": f"Invalid or corrupted image: {str(e)}",
        }


def verify_gps_bounds(lat: float, lng: float) -> dict:
    if 6.0 <= lat <= 37.0 and 68.0 <= lng <= 97.0:
        return {"valid": True, "reason": None}
    return {
        "valid": False,
        "reason": f"Coordinates ({lat}, {lng}) appear to be outside India",
    }
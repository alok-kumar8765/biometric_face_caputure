from .face_utils import decode_base64_image, detect_face, save_image
from .validation import is_bright_enough, is_not_blurry
import json
import logging

logger = logging.getLogger(__name__)

def verify_liveness(image_base64):
    """Main function to validate and save face image."""
    # 1. Decode
    try:
        img = decode_base64_image(image_base64)
        logger.debug("Image decoded successfully")
    except Exception as e:
        logger.warning("Image decode failed: %s", e)
        return {"success": False, "error": f"Invalid image: {e}"}

    # 2. Detect face
    try:
        if not detect_face(img):
            return {"success": False, "error": "No face detected"}

        # 3. Check brightness
        if not is_bright_enough(img):
            return {"success": False, "error": "Image too dark"}

        # 4. Check blur
        if not is_not_blurry(img):
            return {"success": False, "error": "Image too blurry"}

        # 5. Save
        path = save_image(img)
        logger.info("Saved validated face to %s", path)

        return {
            "success": True,
            "path": path,
            "message": "Face validated and saved successfully"
        }
    except Exception as e:
        logger.exception("Error during verification")
        return {"success": False, "error": f"Processing error: {e}"}

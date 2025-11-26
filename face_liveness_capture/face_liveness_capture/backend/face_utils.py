import cv2
import base64
import numpy as np
import os
import uuid

def decode_base64_image(base64_str):
    """Convert base64 string from frontend into an OpenCV image."""
    try:
        if "," in base64_str:
            header, encoded = base64_str.split(",", 1)
        else:
            encoded = base64_str

        img_data = base64.b64decode(encoded)
        np_array = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not decode image (imdecode returned None)")

        return img
    except Exception as exc:
        raise ValueError(f"Invalid image data: {exc}")

def save_image(img, folder="captured_faces"):
    """Save the image and return file path."""
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(folder, filename)
    cv2.imwrite(path, img)
    return path

def detect_face(img):
    """Basic face detection using OpenCV Haar Cascade."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    return len(faces) > 0

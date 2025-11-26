import cv2
import numpy as np

def is_bright_enough(img, threshold=80):
    """Check if image brightness is ok."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = gray.mean()
    return brightness > threshold

def is_not_blurry(img, threshold=120):
    """Detect blur using Laplacian variance."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance > threshold

def face_size_ok(img, face_rect):
    """Face should occupy a reasonable area of the image."""
    (x, y, w, h) = face_rect
    img_area = img.shape[0] * img.shape[1]
    face_area = w * h
    return face_area > img_area * 0.05  # at least 5%

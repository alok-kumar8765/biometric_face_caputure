# FAQ - Frequently Asked Questions

Quick answers to common questions about `face_liveness_capture`.

## Installation & Setup

### Q: How do I install the package?

**A:** Choose one method:

**From PyPI (stable):**
```bash
pip install face_liveness_capture
```

**From GitHub (latest):**
```bash
pip install git+https://github.com/alok-kumar8765/face_liveness_capture.git
```

**Local development:**
```bash
git clone https://github.com/alok-kumar8765/face_liveness_capture.git
cd face_liveness_capture
pip install -e .
```

### Q: Do I need Django to use this package?

**A:** Yes, `face_liveness_capture` is a Django integration package. It requires Django 4.2+. You can use the widget in any Django project.

### Q: What Python versions are supported?

**A:** Python 3.8+. Tested on 3.8, 3.9, 3.10, and 3.11.

### Q: What are the system dependencies?

**A:** Main dependencies are:
- Django 4.2+
- OpenCV (opencv-python)
- MediaPipe
- NumPy

These are installed automatically with `pip install face_liveness_capture`.

### Q: How do I fix "No module named 'mediapipe'"?

**A:** Reinstall the package:
```bash
pip install --force-reinstall face_liveness_capture
```

Or install directly:
```bash
pip install mediapipe
```

## Usage & Integration

### Q: How do I integrate the widget into my existing Django project?

**A:** Follow these steps:

1. Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    'face_liveness_capture.django_integration',
]
```

2. Include URLs:
```python
urlpatterns = [
    path('face-capture/', include('face_liveness_capture.django_integration.urls')),
]
```

3. Add widget to template:
```html
{% load static %}
<div class="widget-container">
    <video id="camera" autoplay playsinline muted></video>
    <canvas id="overlay"></canvas>
    <div id="instructions">Ready</div>
    <button id="start-btn">Start Capture</button>
    <input type="hidden" id="captured-image" name="captured_image">
</div>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
<script src="{% static 'face_liveness_capture/js/widget-improved.js' %}"></script>
```

### Q: Can I customize the widget appearance?

**A:** Yes! Override CSS:

```css
#overlay {
    border: 3px solid #667eea;
    border-radius: 8px;
}

#instructions {
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

#start-btn {
    background: #667eea;
    color: white;
    padding: 12px 30px;
    border-radius: 6px;
    cursor: pointer;
}
```

### Q: How do I disable the debug panel?

**A:** The debug panel is disabled by default. To enable for testing:

Edit `static/face_liveness_capture/js/widget-improved.js`:
```javascript
const ENABLE_DEBUG = true;  // Change to true
```

### Q: Can I change the passport photo dimensions?

**A:** Yes! Edit the constants in `static/face_liveness_capture/js/widget-improved.js`:

```javascript
const PASSPORT_PX_WIDTH = 300;   // Default: 350
const PASSPORT_PX_HEIGHT = 400;  // Default: 450
```

## Liveness Detection

### Q: Why is the blink not detecting?

**A:** Common causes:
- Poor lighting — increase light
- Too close or too far from camera — adjust distance
- EAR threshold too strict — lower `eyeOpenThreshold`

Debug:
```javascript
const ENABLE_DEBUG = true;
```

Watch console for EAR values. Typically 0.15-0.40 when open, <0.10 when closed.

### Q: Why aren't left/right turns detecting?

**A:** Common causes:
- Turn too fast — hold position for 1+ second
- Not enough delta — increase `TURN_DELTA`
- Mirror issue — ensure `visualMirror = true`

Adjust thresholds:
```javascript
const TURN_DELTA = 0.08;  // Increase sensitivity
const MIN_TURN_FRAMES = 4; // Require longer hold
```

### Q: What's the difference between "turn" and "rotation"?

**A:** In this widget:
- **Turn** = head movement (left/right), detected via landmark centerX coordinate
- **Rotation** = head rotation (pitch/roll/yaw), not currently used

## Backend & Verification

### Q: What validation does the backend perform?

**A:** Three checks:
1. **Face Detection** — OpenCV Haar Cascade
2. **Brightness** — ensure adequate light (converts to HSV, checks V channel)
3. **Blur** — Laplacian variance (rejects blurry images)

### Q: Can I customize verification logic?

**A:** Yes! Edit `face_liveness_capture/backend/detection.py`:

```python
def verify_liveness(image_base64):
    img = decode_base64_image(image_base64)
    
    # Your custom checks here
    if is_dark(img):
        return {"success": False, "error": "Too dark"}
    
    if has_multiple_faces(img):
        return {"success": False, "error": "Multiple faces"}
    
    # Standard checks
    if not is_bright_enough(img):
        return {"success": False, "error": "Image too dark"}
    # ... rest of validation
```

### Q: Where are captured images saved?

**A:** Default: `captured_faces/` folder at project root.

Change in `settings.py`:
```python
CAPTURED_FACES_DIR = os.path.join(BASE_DIR, 'media', 'photos')
```

### Q: Can I integrate with AWS S3 for image storage?

**A:** Yes! Install `django-storages`:

```bash
pip install django-storages boto3
```

Configure in `settings.py`:
```python
if not DEBUG:
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
    }
    AWS_STORAGE_BUCKET_NAME = 'your-bucket'
    AWS_S3_REGION_NAME = 'us-east-1'
```

## Deployment

### Q: How do I deploy to production?

**A:** See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides for:
- Docker
- Heroku
- AWS (EB, EC2)
- Nginx configuration
- SSL/HTTPS setup

### Q: Is the package ready for production?

**A:** The package is in **Beta** (v0.1.0). It's suitable for production but:
- Test thoroughly in your environment
- Monitor errors and user feedback
- Prepare rollback plan
- Use HTTPS and secure configuration

### Q: How do I scale to many users?

**A:** 
- Use a production database (PostgreSQL)
- Enable caching (Redis)
- Use load balancer (Nginx, AWS ALB)
- Deploy multiple Django instances
- Store images in S3 or CDN

See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for details.

## Security

### Q: Is user data encrypted?

**A:** 
- Images transmitted over HTTPS (when properly configured)
- Images stored on disk (you should encrypt at rest)
- Widget only uses client-side detection (no server ML processing)

### Q: Can I delete captured images?

**A:** Yes, manually:

```bash
rm -rf captured_faces/*
```

Or programmatically:
```python
import os
import shutil

shutil.rmtree('captured_faces')
os.makedirs('captured_faces', exist_ok=True)
```

### Q: How do I comply with GDPR/privacy laws?

**A:** Recommendations:
1. Get user consent before capture
2. Store images with user reference (ID)
3. Allow users to delete their photos
4. Keep audit logs
5. Encrypt images at rest

```python
# Example: Delete user's photos
from pathlib import Path

def delete_user_photos(user_id):
    photos_dir = Path('captured_faces')
    for photo in photos_dir.glob(f'{user_id}_*'):
        photo.unlink()
```

## Troubleshooting

### Q: Camera permission denied

**A:** 
- Check browser console for errors
- Verify HTTPS (required on most browsers)
- Check browser camera permissions
- Try different browser

### Q: "Face not detected" on server

**A:** 
- Ensure good lighting
- Face should be clearly visible
- Check image quality
- Try closer distance

Enable debug to check client-side:
```javascript
const ENABLE_DEBUG = true;
```

### Q: Image too large (>50 KB)

**A:** The widget automatically downscales. If still large:
```javascript
const PASSPORT_PX_WIDTH = 280;   // Reduce size
const PASSPORT_PX_HEIGHT = 360;
```

### Q: Static files not loading (404)

**A:** Collect static files:
```bash
python manage.py collectstatic --noinput
```

Update `settings.py`:
```python
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
```

### Q: CSRF token errors

**A:** Add CSRF token to forms:
```html
{% csrf_token %}
```

Ensure `MIDDLEWARE` includes:
```python
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',
]
```

### Q: Template not found

**A:** Ensure app is in `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    'face_liveness_capture.django_integration',
]
```

And template path is correct.

## Performance

### Q: How much bandwidth does the widget use?

**A:** 
- Lightweight client code (~50 KB JS)
- MediaPipe WASM (~30 MB cached)
- Each capture ~50 KB
- Total per user: ~50 KB upload

### Q: What's the processing time?

**A:**
- Client-side detection: ~5-30 ms per frame
- Server-side verification: ~100-200 ms
- Total: <1 second end-to-end

### Q: Can I use this on mobile?

**A:** Yes! The widget works on mobile browsers:
- iOS: Safari (requires HTTPS)
- Android: Chrome, Firefox
- iPhone requires iOS 14.3+

## Support & Contributing

### Q: How do I report a bug?

**A:** Open an issue on GitHub: https://github.com/alok-kumar8765/face_liveness_capture/issues

Include:
- OS and browser
- Python/Django versions
- Error message
- Steps to reproduce

### Q: Can I contribute?

**A:** Yes! See [CONTRIBUTING.md](../CONTRIBUTING.md). We welcome PRs for:
- Bug fixes
- Documentation
- Features
- Performance improvements

### Q: Where's the roadmap?

**A:** Future improvements planned:
- TensorFlow.js classifier (optional)
- Multi-language support
- Advanced anti-spoofing
- Integration with more backends

## More Help

- **Docs**: See [docs/](.) directory
- **GitHub Issues**: https://github.com/alok-kumar8765/face_liveness_capture/issues
- **Examples**: See `test_project/` in repository

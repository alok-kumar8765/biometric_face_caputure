# Usage Guide

Complete guide to using `face_liveness_capture` in your Django project.

## Table of Contents
- [Basic Setup](#basic-setup)
- [Template Integration](#template-integration)
- [Configuration](#configuration)
- [Customization](#customization)
- [Frontend Widget](#frontend-widget)
- [Backend Verification](#backend-verification)
- [Examples](#examples)

## Basic Setup

### 1. Add to `INSTALLED_APPS`

In your Django `settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'face_liveness_capture.django_integration',  # Add this
]
```

### 2. Include URLs

In your project `urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('face-capture/', include('face_liveness_capture.django_integration.urls')),
]
```

### 3. Configure Static Files

In `settings.py`, ensure static files are properly configured:

```python
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
```

Then collect static files:

```bash
python manage.py collectstatic --noinput
```

### 4. Run Migrations (if needed)

```bash
python manage.py migrate
```

## Template Integration

### Using the Widget in Your Template

Include the widget in any Django template:

```html
{% load static %}

<!DOCTYPE html>
<html>
<head>
    <title>Face Liveness Capture</title>
</head>
<body>
    <div class="container">
        <h1>Capture Your Face</h1>
        
        <!-- Widget Container -->
        <div class="widget-container">
            <video id="camera" autoplay playsinline muted></video>
            <canvas id="overlay"></canvas>
            <div id="instructions">Ready to capture. Click "Start Capture" to begin.</div>
            <button id="start-btn">Start Capture</button>
            <button id="retry-btn" style="display:none;">Retry</button>
            <div id="result-msg"></div>
            <input type="hidden" id="captured-image" name="captured_image">
        </div>
    </div>

    <!-- Include MediaPipe and widget script -->
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
    <script src="{% static 'face_liveness_capture/js/widget-improved.js' %}"></script>
</body>
</html>
```

### In a Form

For use with Django forms:

```html
{% load static %}

<form method="POST" action="/submit-form/">
    {% csrf_token %}
    
    <label for="name">Full Name:</label>
    <input type="text" id="name" name="name" required>
    
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>
    
    <h3>Capture Face Liveness Photo</h3>
    <div class="widget-container">
        <video id="camera" autoplay playsinline muted></video>
        <canvas id="overlay"></canvas>
        <div id="instructions">Ready to capture. Click "Start Capture" to begin.</div>
        <button type="button" id="start-btn">🎥 Start Capture</button>
        <button type="button" id="retry-btn" style="display:none;">🔄 Retry</button>
        <div id="result-msg"></div>
        <input type="hidden" id="captured-image" name="captured_image">
    </div>
    
    <button type="submit" id="submit-btn" disabled>Submit Form</button>
</form>

<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
<script src="{% static 'face_liveness_capture/js/widget-improved.js' %}"></script>
```

## Configuration

### Widget Configuration (Client-Side)

Edit `static/face_liveness_capture/js/widget-improved.js` to customize:

```javascript
// Enable in-page debug panel (default: false)
const ENABLE_DEBUG = false;

// Selfie-style preview mirroring (default: true)
let visualMirror = true;

// Passport photo dimensions in pixels (default: 350x450)
const PASSPORT_PX_WIDTH = 350;
const PASSPORT_PX_HEIGHT = 450;

// Target compressed size (default: 50 KB)
const TARGET_BYTES = 50 * 1024;

// Blink detection threshold (EAR value)
let eyeOpenThreshold = 0.20;

// Turn detection parameters
const TURN_DELTA = 0.06;
const MIN_TURN_FRAMES = 3;
```

### Server Configuration

In `settings.py`, configure paths for saved images:

```python
# Folder to save captured photos
CAPTURED_FACES_DIR = os.path.join(BASE_DIR, 'captured_faces')
os.makedirs(CAPTURED_FACES_DIR, exist_ok=True)
```

## Customization

### Custom Styling

Override default styles with your own CSS:

```css
.widget-container {
    background: #f0f0f0;
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
}

#overlay {
    border: 2px solid #667eea;
    border-radius: 6px;
}

#instructions {
    font-size: 16px;
    color: #333;
    margin: 15px 0;
}

#start-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
}

#start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}
```

### Custom Result Handling

Handle the upload response with custom JavaScript:

```javascript
// Intercept the fetch before it sends
document.addEventListener('DOMContentLoaded', function() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            if (args[0].includes('/face-capture/upload/')) {
                response.clone().json().then(data => {
                    console.log('Custom handler:', data);
                    // Your custom logic here
                });
            }
            return response;
        });
    };
});
```

## Frontend Widget

### What Happens Step-by-Step

1. **User clicks "Start Capture"**
   - Browser requests camera permission
   - Video stream starts and shows in preview (selfie-mirrored by default)
   - Guide circle and instructions appear

2. **Face Detection**
   - Widget waits for face to be centered in circle
   - Instructions: "Position your face in the circle"

3. **Blink Check**
   - User blinks
   - Eye Aspect Ratio (EAR) detected
   - Instructions: "Turn your head LEFT"

4. **Turn Left Check**
   - User moves head left (relative to baseline centerX)
   - Instructions: "Turn your head RIGHT"

5. **Turn Right Check**
   - User moves head right
   - 3..2..1 countdown overlay
   - Photo auto-captured

6. **Upload**
   - Cropped passport-size photo (PNG/JPEG, ~50 KB)
   - Sent to `/face-capture/upload/` endpoint
   - Server validates and returns result

### Debug Mode

Enable debug logs by setting in the widget:

```javascript
const ENABLE_DEBUG = true;
```

This displays real-time logs showing:
- EAR (Eye Aspect Ratio)
- Face width
- Center X coordinate
- Baseline capture
- Turn detection status

## Backend Verification

### API Endpoint

**POST** `/face-capture/upload/`

Request body (JSON):

```json
{
    "image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

Response on success:

```json
{
    "success": true,
    "path": "captured_faces/abc123.jpg",
    "message": "Face validated and saved successfully"
}
```

Response on failure:

```json
{
    "success": false,
    "error": "Image too dark"
}
```

Possible error messages:
- `"No face detected"` — face detection failed
- `"Image too dark"` — brightness check failed
- `"Image too blurry"` — blur detection failed
- `"Invalid image"` — image decode failed
- `"Processing error"` — server-side exception

### Verification Logic

The backend performs these checks:

1. **Decode** — convert base64 to image
2. **Face Detection** — OpenCV Haar Cascade
3. **Brightness** — ensure adequate lighting
4. **Blur** — reject blurry captures
5. **Save** — store verified image to disk

## Examples

### Example 1: Simple Signup Form

```django
{% load static %}

<!DOCTYPE html>
<html>
<head>
    <title>Sign Up with Face Capture</title>
</head>
<body>
    <h1>Create Account</h1>
    
    <form method="POST" action="/api/signup/">
        {% csrf_token %}
        
        <input type="text" name="username" placeholder="Username" required>
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        
        <h3>Selfie Verification</h3>
        <div class="widget-container">
            <video id="camera" autoplay playsinline muted></video>
            <canvas id="overlay"></canvas>
            <div id="instructions">Start capture</div>
            <button type="button" id="start-btn">Capture Face</button>
            <button type="button" id="retry-btn" style="display:none;">Retry</button>
            <input type="hidden" id="captured-image" name="face_photo">
        </div>
        
        <button type="submit" id="submit-btn" disabled>Create Account</button>
    </form>

    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
    <script src="{% static 'face_liveness_capture/js/widget-improved.js' %}"></script>
</body>
</html>
```

### Example 2: Custom Backend Handler

```python
# views.py
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from face_liveness_capture.backend.detection import verify_liveness

@require_http_methods(["POST"])
def custom_upload_handler(request):
    import json
    data = json.loads(request.body)
    image_data = data.get('image')
    
    result = verify_liveness(image_data)
    
    if result['success']:
        # Custom logic: save to database, send email, etc.
        user_photo_path = result['path']
        # Do something with the photo
        return JsonResponse({'success': True, 'message': 'Photo verified and processed!'})
    else:
        return JsonResponse({'success': False, 'error': result['error']})
```

### Example 3: Using in a Modal

```html
{% load static %}

<button id="openCaptureModal">Capture Photo</button>

<div id="captureModal" style="display:none;">
    <div class="modal-content">
        <span class="close" id="closeModal">&times;</span>
        <h2>Capture Your Face</h2>
        
        <div class="widget-container">
            <video id="camera" autoplay playsinline muted></video>
            <canvas id="overlay"></canvas>
            <div id="instructions">Position your face</div>
            <button type="button" id="start-btn">Start</button>
            <button type="button" id="retry-btn" style="display:none;">Retry</button>
            <input type="hidden" id="captured-image" name="photo">
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
<script src="{% static 'face_liveness_capture/js/widget-improved.js' %}"></script>
<script>
    document.getElementById('openCaptureModal').onclick = function() {
        document.getElementById('captureModal').style.display = 'block';
    };
    document.getElementById('closeModal').onclick = function() {
        document.getElementById('captureModal').style.display = 'none';
    };
</script>
```

## Next Steps

- [API Reference](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [FAQ](FAQ.md)

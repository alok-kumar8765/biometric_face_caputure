# API Reference

Complete API documentation for `face_liveness_capture`.

## Table of Contents
- [Frontend Widget API](#frontend-widget-api)
- [Backend API](#backend-api)
- [Configuration Options](#configuration-options)
- [Data Structures](#data-structures)

## Frontend Widget API

### Widget Initialization

The widget automatically initializes when `widget-improved.js` is loaded. No manual initialization needed.

### Configuration Constants

Located in `static/face_liveness_capture/js/widget-improved.js`:

#### Debug & UI

```javascript
const ENABLE_DEBUG = false;                    // Show on-page debug panel
let visualMirror = true;                       // Selfie-style preview (flipped)
const EAR_LOG_INTERVAL = 10;                   // Log EAR every N frames
```

#### Passport Photo Target

```javascript
const PASSPORT_PX_WIDTH = 350;                 // Crop width in pixels
const PASSPORT_PX_HEIGHT = 450;                // Crop height in pixels
const PASSPORT_ASPECT = 7 / 9;                 // Width/height ratio
const BBOX_EXPAND_X = 1.8;                     // Horizontal expansion for shoulders
const BBOX_EXPAND_Y = 2.2;                     // Vertical expansion for headroom
```

#### Compression & Upload

```javascript
const TARGET_BYTES = 50 * 1024;                // ~50 KB target size
const MIN_WIDTH = 200;                         // Minimum downscale dimension
```

#### Liveness Detection Thresholds

```javascript
let eyeOpenThreshold = 0.20;                   // Eye Aspect Ratio (EAR)
const MIN_CLOSED_FRAMES = 2;                   // Frames eyes must be closed
const MIN_OPEN_FRAMES_AFTER = 2;               // Frames eyes must be open after blink
const MIN_TURN_FRAMES = 3;                     // Frames for turn detection
const TURN_DELTA = 0.06;                       // Centerline delta for turn
const TURN_LEFT_THRESHOLD = 0.48;              // Absolute fallback threshold
const TURN_RIGHT_THRESHOLD = 0.52;             // Absolute fallback threshold
const MISSING_FACE_THRESHOLD = 3;              // Frames before "no face" warning
```

### DOM Elements Expected

The widget expects these elements in your HTML:

```html
<video id="camera" autoplay playsinline muted></video>
<canvas id="overlay"></canvas>
<div id="instructions"></div>
<button id="start-btn"></button>
<button id="retry-btn"></button>
<div id="result-msg"></div>
<div id="no-camera-msg" style="display:none;"></div>
<input type="hidden" id="captured-image" name="captured_image">
```

### Key Functions (Internal)

#### `startCamera()`

Requests user camera permission and starts video stream.

```javascript
await startCamera();  // Called on start-btn click
```

#### `captureImage()`

Performs final verification and sends cropped image to backend.

Internally:
1. Verifies face is centered and size OK
2. Crops to passport dimensions around landmarks
3. Scales to PASSPORT_PX_WIDTH × PASSPORT_PX_HEIGHT
4. Attempts PNG compression (downscale if > 50 KB)
5. Falls back to JPEG quality adjustment
6. Sends to `/face-capture/upload/` endpoint

#### `onResults(results)`

MediaPipe callback on each frame. Processes:
- Landmarks detection
- Liveness stage progression
- Circle and indicator drawing

#### `logDebug(msg)`

Logs to console and on-page debug panel (if ENABLE_DEBUG=true).

```javascript
logDebug('Custom message');
```

## Backend API

### Upload Endpoint

**Endpoint:** `POST /face-capture/upload/`

**Purpose:** Receive and verify liveness-captured image.

#### Request

**Content-Type:** `application/json`

**Body:**

```json
{
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

#### Response (Success)

**Status Code:** `200 OK`

```json
{
    "success": true,
    "path": "captured_faces/550e8400-e29b-41d4-a716-446655440000.jpg",
    "message": "Face validated and saved successfully"
}
```

#### Response (Failure)

**Status Code:** `200 OK` (status in JSON body)

```json
{
    "success": false,
    "error": "Image too dark"
}
```

**Possible Errors:**
- `"No image provided"` — request missing image field
- `"Invalid image"` — base64 decode failed
- `"No face detected"` — face detection failed
- `"Image too dark"` — brightness < threshold
- `"Image too blurry"` — blur score > threshold
- `"Processing error"` — server-side exception

### Core Functions

#### `verify_liveness(image_base64: str) -> dict`

**Location:** `face_liveness_capture/backend/detection.py`

Validates and saves liveness-captured image.

**Parameters:**
- `image_base64` (str) — data URL or base64 string

**Returns:**
```python
{
    "success": bool,
    "path": str | None,           # Path if successful
    "message": str | None,        # Success message
    "error": str | None           # Error message
}
```

**Performs:**
1. Decode base64 → OpenCV image
2. Detect face via Haar Cascade
3. Check brightness (is_bright_enough)
4. Check blur (is_not_blurry)
5. Save to disk
6. Return result

#### `decode_base64_image(base64_str: str) -> np.ndarray`

**Location:** `face_liveness_capture/backend/face_utils.py`

Converts base64 to OpenCV image.

**Parameters:**
- `base64_str` (str) — data URL or plain base64

**Returns:**
- `np.ndarray` — BGR image (OpenCV format)

**Raises:**
- `ValueError` — if decode fails

#### `detect_face(img: np.ndarray) -> bool`

**Location:** `face_liveness_capture/backend/face_utils.py`

Detects face using OpenCV Haar Cascade.

**Parameters:**
- `img` (np.ndarray) — BGR image

**Returns:**
- `bool` — True if face detected

#### `is_bright_enough(img: np.ndarray) -> bool`

**Location:** `face_liveness_capture/backend/validation.py`

Checks if image has adequate brightness.

**Parameters:**
- `img` (np.ndarray) — BGR image

**Returns:**
- `bool` — True if brightness sufficient

#### `is_not_blurry(img: np.ndarray) -> bool`

**Location:** `face_liveness_capture/backend/validation.py`

Detects blur using Laplacian variance.

**Parameters:**
- `img` (np.ndarray) — BGR image

**Returns:**
- `bool` — True if not blurry

#### `save_image(img: np.ndarray, folder: str = "captured_faces") -> str`

**Location:** `face_liveness_capture/backend/face_utils.py`

Saves image to disk with UUID filename.

**Parameters:**
- `img` (np.ndarray) — BGR image
- `folder` (str) — output directory (default: "captured_faces")

**Returns:**
- `str` — path to saved file

## Configuration Options

### Django Settings

Add to `settings.py`:

```python
# Captured faces directory
CAPTURED_FACES_DIR = os.path.join(BASE_DIR, 'captured_faces')

# Static files for widget
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Installed apps
INSTALLED_APPS = [
    # ...
    'face_liveness_capture.django_integration',
]
```

### Widget Customization

To change defaults, edit `static/face_liveness_capture/js/widget-improved.js`:

```javascript
// Example: Reduce passport size to 280x360
const PASSPORT_PX_WIDTH = 280;
const PASSPORT_PX_HEIGHT = 360;

// Example: Enable debug for testing
const ENABLE_DEBUG = true;

// Example: Stricter blink detection
let eyeOpenThreshold = 0.15;
const MIN_CLOSED_FRAMES = 3;
const MIN_OPEN_FRAMES_AFTER = 3;
```

## Data Structures

### Landmarks

MediaPipe provides 468 face landmarks in normalized coordinates (0-1).

Key landmark indices used:

```javascript
landmarks[1]   // Nose (center)
landmarks[33]  // Left eye outer corner
landmarks[160] // Left eye upper eyelid
landmarks[158] // Left eye lower eyelid
landmarks[133] // Left eye inner corner
landmarks[153] // Left eye pupil
landmarks[144] // Left eye lower
landmarks[362] // Right eye outer corner
landmarks[385] // Right eye upper eyelid
landmarks[387] // Right eye lower eyelid
landmarks[263] // Right eye inner corner
landmarks[373] // Right eye pupil
landmarks[380] // Right eye lower
landmarks[123] // Left cheek
landmarks[352] // Right cheek
```

### Capture Result Object

After successful capture, the widget stores data:

```javascript
{
    blinkDetected: true,
    turnLeftDetected: true,
    turnRightDetected: true,
    livenessComplete: true,
    stage: 5,  // completed
    lastLandmarks: [...],  // last detected landmarks
    captured_image: "data:image/png;base64,..."  // hidden input
}
```

## Error Handling

### Frontend Errors

```javascript
try {
    await startCamera();
} catch (err) {
    console.error('Camera error:', err);
    // Handle camera permission denied, device not available, etc.
}
```

### Backend Error Handling

```python
from face_liveness_capture.backend.detection import verify_liveness

result = verify_liveness(image_data)
if not result['success']:
    error = result.get('error', 'Unknown error')
    print(f"Verification failed: {error}")
```

## Performance Notes

- **Widget**: ~30-60 MB memory (MediaPipe WASM), <10 ms per frame processing
- **Backend**: ~100 ms for face detection and validation
- **Capture**: ~50 KB compressed PNG/JPEG, passport-sized crop

## Limits & Constraints

- Max image size: ~50 KB (configurable)
- Min face width in frame: 18% (configurable)
- Max face width in frame: 60% (configurable)
- Blink detection: EAR < 0.20 (tunable)
- Turn detection: ±0.06 delta from baseline (tunable)

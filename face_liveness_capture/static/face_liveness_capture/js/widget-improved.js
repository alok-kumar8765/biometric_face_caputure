const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const instructions = document.getElementById("instructions");
// create or find a debug area to surface logs to the page for easier debugging
// Toggle in-page debug panel. Default false for package consumers.
const ENABLE_DEBUG = false;
let debugEl = null;
if (ENABLE_DEBUG) {
    debugEl = document.getElementById('widget-debug');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'widget-debug';
        debugEl.style.fontFamily = 'monospace';
        debugEl.style.fontSize = '12px';
        debugEl.style.marginTop = '8px';
        debugEl.style.maxHeight = '120px';
        debugEl.style.overflow = 'auto';
        debugEl.style.background = '#f6f8fa';
        debugEl.style.border = '1px solid #e1e4e8';
        debugEl.style.padding = '6px';
        debugEl.style.borderRadius = '4px';
        const container = document.querySelector('.widget-container');
        if (container) container.appendChild(debugEl);
    }
}

function logDebug(msg) {
    try { console.log('[widget] ' + msg); } catch (e) {}
    if (ENABLE_DEBUG && debugEl) {
        const line = document.createElement('div');
        line.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
        debugEl.appendChild(line);
        debugEl.scrollTop = debugEl.scrollHeight;
    }
}

let stage = 0; 
// 0 = face in circle
// 1 = blink check
// 2 = turn left
// 3 = turn right
// 4 = capturing

// Tracking for liveness detection
let blinkDetected = false;
let turnLeftDetected = false;
let turnRightDetected = false;
let eyeOpenThreshold = 0.20; // Eye aspect ratio threshold (tuned)
let EAR_LOG_INTERVAL = 10; // log EAR and face width every N frames for debugging
let eyeClosedFrames = 0;
let eyeOpenFrames = 0;
const MIN_CLOSED_FRAMES = 2; // require eyes closed for N frames
const MIN_OPEN_FRAMES_AFTER = 2; // require reopen after closed to count blink
let livenessComplete = false;
let _frameCounter = 0;
let turnLeftFrames = 0;
let turnRightFrames = 0;
const MIN_TURN_FRAMES = 3; // require sustained turn for detection
const TURN_LEFT_THRESHOLD = 0.48; // fallback absolute normalized center x threshold
const TURN_RIGHT_THRESHOLD = 0.52;
// Adaptive turn detection: require a delta from baseline centerX (set after blink)
let baselineCenterX = null;
const TURN_DELTA = 0.06; // require this delta from baseline to count as a turn
let isMirrored = false;
// Visual preview mirroring for natural selfie UX (flip displayed video/canvas)
let visualMirror = true;
let missingFaceFrames = 0;
const MISSING_FACE_THRESHOLD = 3;
let lastLandmarks = null;
let countdownActive = false;
// Passport photo target (pixels). Aspect ratio 35x45 mm -> 7:9
const PASSPORT_PX_WIDTH = 350;
const PASSPORT_PX_HEIGHT = 450;
const PASSPORT_ASPECT = PASSPORT_PX_WIDTH / PASSPORT_PX_HEIGHT; // 7/9
// How much to expand the face bbox to include shoulders (relative factor)
const BBOX_EXPAND_X = 1.8; // widen box to include shoulders
const BBOX_EXPAND_Y = 2.2; // include some space above head and shoulders

// Hide any extraneous canvas elements that might be added by other libs
function hideExtraCanvases() {
    const all = Array.from(document.querySelectorAll('canvas'));
    all.forEach(c => {
        if (c.id !== 'overlay') {
            try {
                // remove unexpected canvases from DOM to avoid duplicate visuals
                if (c.parentNode) c.parentNode.removeChild(c);
            } catch (e) {
                // fallback: hide if removal fails
                c.style.display = 'none';
                c.setAttribute('data-hidden-by-widget', '1');
            }
        }
    });
    // ensure our overlay exists inside the video wrapper
    const wrapper = document.querySelector('.video-wrapper');
    const overlay = document.getElementById('overlay');
    if (wrapper && overlay && overlay.parentNode !== wrapper) {
        wrapper.appendChild(overlay);
    }
}
hideExtraCanvases();
// Continuously observe DOM for any new canvases and hide them
const canvasObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
            hideExtraCanvases();
        }
    }
});
canvasObserver.observe(document.body, { childList: true, subtree: true });

// Set canvas to fill video
function resizeCanvas() {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
}

// Helper to read cookie (for CSRF)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function startCamera() {
    try {
        logDebug('Requesting camera via getUserMedia');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        logDebug('getUserMedia granted');
        video.srcObject = stream;
        video.style.display = 'block';
        canvas.style.display = 'block';
            // Mirror the preview visually so the user sees a selfie-style preview.
            // We also mirror the overlay so guide elements match the video pixels visually.
            try {
                if (visualMirror) {
                    video.style.transform = 'scaleX(-1)';
                    canvas.style.transform = 'scaleX(-1)';
                    canvas.style.transformOrigin = 'center center';
                } else {
                    video.style.transform = '';
                    canvas.style.transform = '';
                }
            } catch (e) {
                // ignore transform failures
            }
        document.getElementById('no-camera-msg').style.display = 'none';
        
        // Wait for video to load before resizing canvas
        video.onloadedmetadata = () => {
            resizeCanvas();
            logDebug('Video metadata loaded; canvas resized');
        };
    } catch (err) {
        console.error('Camera access denied or error:', err);
        logDebug('getUserMedia error: ' + (err && err.name ? err.name + ' - ' + err.message : String(err)));
        video.style.display = 'none';
        canvas.style.display = 'none';
        document.getElementById('no-camera-msg').style.display = 'block';
        instructions.innerText = '⚠️ Camera access is required. Please enable it in your browser settings.';
    }
}

// Start camera on page load
// Do not start camera automatically on page load; start on user action

document.getElementById('start-btn').addEventListener('click', () => {
    stage = 0;
    blinkDetected = false;
    turnLeftDetected = false;
    turnRightDetected = false;
    document.getElementById('result-msg').className = '';
    document.getElementById('result-msg').innerText = '';
    document.getElementById('result-msg').style.display = 'none';
    document.getElementById('retry-btn').style.display = 'none';
    instructions.innerText = '📍 Position your face in the circle';
    // start camera in response to a user gesture
    logDebug('Start button clicked — starting camera');
    startCamera().catch(err => {
        logDebug('startCamera() promise rejected: ' + err);
    });
});

// Retry button handler
document.getElementById('retry-btn').addEventListener('click', () => {
    stage = 0;
    blinkDetected = false;
    turnLeftDetected = false;
    turnRightDetected = false;
    document.getElementById('result-msg').style.display = 'none';
    document.getElementById('retry-btn').style.display = 'none';
    instructions.innerText = '📍 Position your face in the circle';
});

// Defer FaceMesh creation until the library is available and video started
let faceMesh = null;

function ensureFaceMesh() {
    if (!faceMesh && typeof FaceMesh !== 'undefined') {
        faceMesh = new FaceMesh({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });
        faceMesh.onResults(onResults);
    }
}

// Run model on each frame (will wait until FaceMesh is ready)
async function onVideoFrame() {
    ensureFaceMesh();
    if (faceMesh && video.readyState >= 2) {
        try {
            await faceMesh.send({ image: video });
        } catch (err) {
            console.error('FaceMesh frame error:', err);
        }
    }
    requestAnimationFrame(onVideoFrame);
}
video.onloadeddata = () => onVideoFrame();

function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // initial circle (will be re-drawn after landmarks evaluation)
    drawCircleGuide(livenessComplete);

    if (!results.multiFaceLandmarks.length) {
        missingFaceFrames++;
        if (missingFaceFrames >= MISSING_FACE_THRESHOLD) {
            if (stage < 4) {
                ctx.fillStyle = '#ff6b6b';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('❌ Face not detected', canvas.width / 2, 40);
                instructions.innerText = '⚠️ Face not detected. Please center your face in the circle.';
            }
        }
        return;
    }
    missingFaceFrames = 0;

    const landmarks = results.multiFaceLandmarks[0];
    lastLandmarks = landmarks;

    // effectiveMirrored = XOR(landmark-space mirroring, visual preview mirroring)
    // If true, we need to invert left/right checks so UI prompts match what the user sees.
    const effectiveMirrored = (!!isMirrored) !== (!!visualMirror);

    // debugging: compute avg EAR and face width and log occasionally
    _frameCounter++;
    try {
        const leftEye = calculateEyeAspectRatio(
            landmarks[33], landmarks[160], landmarks[158],
            landmarks[133], landmarks[153], landmarks[144]
        );
        const rightEye = calculateEyeAspectRatio(
            landmarks[362], landmarks[385], landmarks[387],
            landmarks[263], landmarks[373], landmarks[380]
        );
        const avgEAR = (leftEye + rightEye) / 2;
        const xs = landmarks.map(p => p.x);
        const faceWidth = Math.max(...xs) - Math.min(...xs);
        const landmarksCenterX = xs.reduce((a,b)=>a+b,0)/xs.length;
        if (_frameCounter % EAR_LOG_INTERVAL === 0) {
            logDebug(`EAR=${avgEAR.toFixed(3)} faceWidth=${faceWidth.toFixed(3)} centerX=${landmarksCenterX.toFixed(3)}`);
        }
    } catch (e) {
        // ignore per-frame debug errors
    }

    // Draw face detection circle
    drawFaceIndicator(landmarks);

    // Update livenessComplete flag if conditions met
    if (blinkDetected && turnLeftDetected && turnRightDetected && checkFaceInCircle(landmarks) && faceSizeOk(landmarks)) {
        livenessComplete = true;
    }

    // redraw circle to reflect liveness state (progress segments)
    drawCircleGuide(livenessComplete, blinkDetected, turnLeftDetected, turnRightDetected);

    // Stage 0: Wait for face in circle
    if (stage === 0) {
        const inCircle = checkFaceInCircle(landmarks);
        const sizeOk = faceSizeOk(landmarks);
        if (inCircle && sizeOk) {
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('✓ Face detected', canvas.width / 2, 40);
            instructions.innerText = '👁️ Blink your eyes';
            stage = 1;
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            if (!inCircle) {
                ctx.fillText('⚠️ Move face to center', canvas.width / 2, 40);
                instructions.innerText = '📍 Move your face to the center of the circle';
            } else if (!sizeOk) {
                // compute width to decide if too close or too far
                const xs = landmarks.map(p => p.x);
                const bboxWidth = Math.max(...xs) - Math.min(...xs);
                if (bboxWidth < 0.18) {
                    ctx.fillText('⚠️ Move closer', canvas.width / 2, 40);
                    instructions.innerText = '↘️ Move a bit closer to the camera';
                } else {
                    ctx.fillText('⚠️ Move farther', canvas.width / 2, 40);
                    instructions.innerText = '↗️ Move a bit farther from the camera';
                }
            }
        }
    }

    // Stage 1: Detect blink
    if (stage === 1) {
        const isClosed = isEyeClosed(landmarks);
        drawEyeIndicator('Eyes closed: ' + (isClosed ? '✓' : '✗'), isClosed);

        if (isClosed) {
            eyeClosedFrames++;
            eyeOpenFrames = 0;
        } else {
            if (eyeClosedFrames >= MIN_CLOSED_FRAMES) {
                eyeOpenFrames++;
            }
        }

        // Count blink when eyes were closed for enough frames and then reopened
        if (eyeClosedFrames >= MIN_CLOSED_FRAMES && eyeOpenFrames >= MIN_OPEN_FRAMES_AFTER) {
            // only accept blink as baseline if face is centered and size OK
            if (checkFaceInCircle(landmarks) && faceSizeOk(landmarks)) {
                blinkDetected = true;
                document.getElementById('check-blink')?.classList.add('done');
                instructions.innerText = '👈 Turn your head LEFT';
                // set baseline centerX for adaptive turn detection and detect mirroring
                try {
                    const xs_base = landmarks.map(p => p.x);
                    baselineCenterX = xs_base.reduce((a,b)=>a+b,0)/xs_base.length;
                    // detect mirroring by comparing left/right eye landmark x positions
                    const leftEyeX = landmarks[33].x;
                    const rightEyeX = landmarks[263].x;
                    isMirrored = leftEyeX > rightEyeX;
                    logDebug('baselineCenterX set: ' + baselineCenterX.toFixed(3) + ' mirrored=' + isMirrored);
                } catch(e) {
                    baselineCenterX = null;
                    isMirrored = false;
                }
                stage = 2;
            } else {
                instructions.innerText = 'Please center your face in the circle before blinking';
                logDebug('Blink detected but face not centered/size not OK — ignoring');
            }
            // reset counters
            eyeClosedFrames = 0;
            eyeOpenFrames = 0;
        }
    }

    // Stage 2: Detect turn left
    if (stage === 2) {
        // More robust left detection: use landmarks center x and baseline delta
        const xs = landmarks.map(p => p.x);
        const landmarksCenterX = xs.reduce((a,b)=>a+b,0)/xs.length;
        let isTurningLeft = false;
        if (baselineCenterX !== null) {
            const delta = landmarksCenterX - baselineCenterX; // positive => moved right
            isTurningLeft = (!effectiveMirrored) ? (delta < -TURN_DELTA) : (delta > TURN_DELTA);
        } else {
            isTurningLeft = landmarksCenterX < TURN_LEFT_THRESHOLD;
        }
        drawHeadTurnIndicator('Turn LEFT: ' + (isTurningLeft ? '✓' : '✗'), isTurningLeft);
        if (isTurningLeft) {
            turnLeftFrames++;
        } else {
            turnLeftFrames = 0;
        }
        if (turnLeftFrames >= MIN_TURN_FRAMES) {
            turnLeftDetected = true;
            document.getElementById('check-left')?.classList.add('done');
            instructions.innerText = '👉 Turn your head RIGHT';
            stage = 3;
            turnLeftFrames = 0;
        }
    }

    // Stage 3: Detect turn right
    if (stage === 3) {
        const xs = landmarks.map(p => p.x);
        const landmarksCenterX = xs.reduce((a,b)=>a+b,0)/xs.length;
        let isTurningRight = false;
        if (baselineCenterX !== null) {
            const delta = landmarksCenterX - baselineCenterX; // positive => moved right
            isTurningRight = (!effectiveMirrored) ? (delta > TURN_DELTA) : (delta < -TURN_DELTA);
        } else {
            isTurningRight = landmarksCenterX > TURN_RIGHT_THRESHOLD;
        }
        drawHeadTurnIndicator('Turn RIGHT: ' + (isTurningRight ? '✓' : '✗'), isTurningRight);
        if (isTurningRight) {
            turnRightFrames++;
        } else {
            turnRightFrames = 0;
        }
        if (turnRightFrames >= MIN_TURN_FRAMES) {
            turnRightDetected = true;
            document.getElementById('check-right')?.classList.add('done');
            instructions.innerText = '📸 Preparing to capture...';
            stage = 4;
            // mark liveness complete and start countdown before capture
            livenessComplete = true;
            turnRightFrames = 0;
            baselineCenterX = null;
            // start 3..2..1 countdown overlay then capture
            if (!countdownActive) {
                countdownActive = true;
                startCountdown(3).then(() => {
                    countdownActive = false;
                    captureImage();
                }).catch(() => { countdownActive = false; });
            }
        }
    }
}

// -------- Helper Functions --------

function drawCircleGuide(active=false) {
    // draw a 3-segment progress ring: segment0=blink, segment1=left, segment2=right
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 40; // Large circle
    const thickness = 12;

    // background ring
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // helper to draw arc segment
    function drawSegment(index, filled, color) {
        const segments = 3;
        const start = -Math.PI/2 + (index * (2*Math.PI/segments));
        const end = start + (2*Math.PI/segments);
        ctx.beginPath();
        ctx.strokeStyle = filled ? color : '#cfcfcf';
        ctx.lineWidth = thickness;
        ctx.arc(centerX, centerY, radius, start + 0.04, end - 0.04);
        ctx.stroke();
    }

    // Determine segment colors based on active/complete state passed in
    // Fallback if no args provided
    const blinkOk = arguments.length > 1 ? arguments[1] : false;
    const leftOk = arguments.length > 2 ? arguments[2] : false;
    const rightOk = arguments.length > 3 ? arguments[3] : false;

    drawSegment(0, blinkOk, '#28a745');
    drawSegment(1, leftOk, '#28a745');
    drawSegment(2, rightOk, '#28a745');

    // center crosshair
    ctx.strokeStyle = '#667eea66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
}

function drawFaceIndicator(landmarks) {
    const nose = landmarks[1];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 40;
    
    const x = nose.x * canvas.width;
    const y = nose.y * canvas.height;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Draw nose position
    const dotColor = distance < radius * 0.8 ? '#4CAF50' : '#ff9800';
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawEyeIndicator(text, detected) {
    ctx.fillStyle = detected ? '#4CAF50' : '#ff9800';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height - 20);
}

function drawHeadTurnIndicator(text, detected) {
    ctx.fillStyle = detected ? '#4CAF50' : '#ff9800';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height - 20);
}

// Simple countdown overlay: returns a promise that resolves after the countdown
function startCountdown(n) {
    return new Promise((resolve, reject) => {
        let count = n;
        const prev = instructions.innerText;
        const draw = () => {
            // clear a rectangle in center and draw number
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 120px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(String(count), canvas.width/2, canvas.height/2 + 40);
            ctx.restore();
        };

        const tick = () => {
            if (count <= 0) {
                // clear overlay
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                instructions.innerText = prev;
                resolve();
                return;
            }
            draw();
            instructions.innerText = 'Capturing in ' + count + '...';
            count--;
            setTimeout(tick, 1000);
        };
        tick();
    });
}

function checkFaceInCircle(landmarks) {
    const nose = landmarks[1];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const x = nose.x * canvas.width;
    const y = nose.y * canvas.height;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const radius = Math.min(canvas.width, canvas.height) / 2 - 40;
    return distance < radius * 0.8; // Face should be 80% within circle
}

function faceSizeOk(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;
    const xs = landmarks.map(p => p.x);
    const ys = landmarks.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const widthNorm = maxX - minX; // normalized to video width
    // Acceptable normalized face width (empirical): 0.18 - 0.6
    return widthNorm >= 0.18 && widthNorm <= 0.6;
}

function detectBlink(landmarks) {
    // Calculate eye aspect ratio (EAR)
    // Left eye: landmarks 33, 160, 158, 133, 153, 144
    const leftEye = calculateEyeAspectRatio(
        landmarks[33], landmarks[160], landmarks[158],
        landmarks[133], landmarks[153], landmarks[144]
    );
    
    // Right eye: landmarks 362, 385, 387, 263, 373, 380
    const rightEye = calculateEyeAspectRatio(
        landmarks[362], landmarks[385], landmarks[387],
        landmarks[263], landmarks[373], landmarks[380]
    );
    
    const avgEAR = (leftEye + rightEye) / 2;
    return avgEAR < eyeOpenThreshold; // Eye closed when EAR below threshold
}

function isEyeClosed(landmarks) {
    // Safety check
    if (!landmarks || landmarks.length === 0) return false;
    try {
        const leftEye = calculateEyeAspectRatio(
            landmarks[33], landmarks[160], landmarks[158],
            landmarks[133], landmarks[153], landmarks[144]
        );
        const rightEye = calculateEyeAspectRatio(
            landmarks[362], landmarks[385], landmarks[387],
            landmarks[263], landmarks[373], landmarks[380]
        );
        const avgEAR = (leftEye + rightEye) / 2;
        return avgEAR < eyeOpenThreshold;
    } catch (e) {
        return false;
    }
}

function calculateEyeAspectRatio(p1, p2, p3, p4, p5, p6) {
    const dist1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const dist2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const dist3 = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    if (!isFinite(dist1) || !isFinite(dist2) || !isFinite(dist3) || dist3 === 0) return 0;
    const ear = (dist1 + dist2) / (2 * dist3);
    // clamp to reasonable range
    if (!isFinite(ear) || ear > 2) return 0;
    return ear;
}

function detectTurnLeft(landmarks) {
    // Check if nose is on the left side and chin rotation
    const nose = landmarks[1].x;
    const leftCheek = landmarks[123].x; // Left cheek
    const rightCheek = landmarks[352].x; // Right cheek
    
    // Turn left detected when nose moves to the left
    return nose < 0.35 && (leftCheek - rightCheek) > 0.15;
}

function detectTurnRight(landmarks) {
    // Check if nose is on the right side and chin rotation
    const nose = landmarks[1].x;
    const leftCheek = landmarks[123].x; // Left cheek
    const rightCheek = landmarks[352].x; // Right cheek
    
    // Turn right detected when nose moves to the right
    return nose > 0.65 && (rightCheek - leftCheek) > 0.15;
}

function captureImage() {
    // final client-side sanity checks using lastLandmarks
    if (!lastLandmarks || !checkFaceInCircle(lastLandmarks) || !faceSizeOk(lastLandmarks)) {
        const resultDiv = document.getElementById('result-msg');
        if (resultDiv) {
            resultDiv.className = 'error';
            resultDiv.style.display = 'block';
            resultDiv.innerText = '❌ No face detected at capture. Please retry.';
        }
        instructions.innerText = '❌ No face detected. Click Retry.';
        document.getElementById('retry-btn').style.display = 'inline-block';
        stage = 0;
        return;
    }
    // compute passport-style crop from lastLandmarks (normalized coords)
    const vW = video.videoWidth || canvas.width;
    const vH = video.videoHeight || canvas.height;
    // compute bbox of landmarks
    const xs = lastLandmarks.map(p => p.x);
    const ys = lastLandmarks.map(p => p.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    // expand bbox to include shoulders/headroom
    const boxW = (maxX - minX) * BBOX_EXPAND_X;
    const boxH = (maxY - minY) * BBOX_EXPAND_Y;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // convert to pixel coordinates
    let srcW = Math.min(1.0, boxW) * vW;
    let srcH = Math.min(1.0, boxH) * vH;
    // enforce passport aspect ratio (width/height = PASSPORT_ASPECT)
    const currentAspect = srcW / srcH;
    if (currentAspect > PASSPORT_ASPECT) {
        // too wide -> increase height
        srcH = srcW / PASSPORT_ASPECT;
    } else if (currentAspect < PASSPORT_ASPECT) {
        // too tall -> increase width
        srcW = srcH * PASSPORT_ASPECT;
    }

    let srcX = Math.round(centerX * vW - srcW / 2);
    let srcY = Math.round(centerY * vH - srcH / 2);
    // clamp to video bounds
    if (srcX < 0) srcX = 0;
    if (srcY < 0) srcY = 0;
    if (srcX + srcW > vW) srcX = Math.max(0, vW - srcW);
    if (srcY + srcH > vH) srcY = Math.max(0, vH - srcH);

    // We'll draw the cropped region to attempt canvases which scale to passport pixel dims
    const sourceCrop = { x: srcX, y: srcY, w: Math.round(srcW), h: Math.round(srcH) };

    // Try to produce a PNG under target size (50 KB). If unsuccessful after downscaling,
    // fall back to JPEG to meet size constraints.
    const TARGET_BYTES = 50 * 1024; // 50 KB
    const MIN_WIDTH = 200; // don't downscale below this width
    let outputData = null;
    // helper to compute decoded byte length from base64 dataURL
    function dataUrlBytes(dataUrl) {
        try {
            const b64 = dataUrl.split(',')[1] || '';
            return Math.ceil((b64.length * 3) / 4);
        } catch (e) { return Infinity; }
    }

    // Attempt PNG by drawing cropped region and downscaling progressively (start at PASSPORT_PX_WIDTH)
    let attemptWidth = PASSPORT_PX_WIDTH;
    let attemptHeight = PASSPORT_PX_HEIGHT;
    while (attemptWidth >= MIN_WIDTH) {
        const attemptCanvas = document.createElement('canvas');
        attemptCanvas.width = attemptWidth;
        attemptCanvas.height = attemptHeight;
        const actx = attemptCanvas.getContext('2d');
        if (visualMirror) {
            actx.save();
            actx.translate(attemptCanvas.width, 0);
            actx.scale(-1, 1);
        }
        // draw cropped region from video -> scaled to passport pixels
        actx.drawImage(video, sourceCrop.x, sourceCrop.y, sourceCrop.w, sourceCrop.h, 0, 0, attemptCanvas.width, attemptCanvas.height);
        if (visualMirror) actx.restore();
        const pngData = attemptCanvas.toDataURL('image/png');
        const size = dataUrlBytes(pngData);
        if (size <= TARGET_BYTES) {
            outputData = pngData;
            break;
        }
        // reduce width/height and try again
        attemptWidth = Math.floor(attemptWidth * 0.85);
        attemptHeight = Math.round(attemptWidth / PASSPORT_ASPECT);
    }

    // If PNG attempts failed, fall back to JPEG with adjustable quality
    if (!outputData) {
        let q = 0.9;
        while (q >= 0.4) {
            const attemptCanvas = document.createElement('canvas');
            attemptCanvas.width = Math.max(MIN_WIDTH, Math.floor(PASSPORT_PX_WIDTH * 0.9));
            attemptCanvas.height = Math.round(attemptCanvas.width / PASSPORT_ASPECT);
            const actx = attemptCanvas.getContext('2d');
            if (visualMirror) {
                actx.save();
                actx.translate(attemptCanvas.width, 0);
                actx.scale(-1, 1);
            }
            actx.drawImage(video, sourceCrop.x, sourceCrop.y, sourceCrop.w, sourceCrop.h, 0, 0, attemptCanvas.width, attemptCanvas.height);
            if (visualMirror) actx.restore();
            const jpegData = attemptCanvas.toDataURL('image/jpeg', q);
            if (dataUrlBytes(jpegData) <= TARGET_BYTES) {
                outputData = jpegData;
                break;
            }
            q -= 0.1;
        }
    }

    // Final fallback: use original PNG (may exceed target) if nothing else succeeded
    if (!outputData) {
        // draw final passport-size crop to PNG
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = PASSPORT_PX_WIDTH;
        finalCanvas.height = PASSPORT_PX_HEIGHT;
        const fctx = finalCanvas.getContext('2d');
        if (visualMirror) {
            fctx.save();
            fctx.translate(finalCanvas.width, 0);
            fctx.scale(-1, 1);
        }
        fctx.drawImage(video, sourceCrop.x, sourceCrop.y, sourceCrop.w, sourceCrop.h, 0, 0, finalCanvas.width, finalCanvas.height);
        if (visualMirror) fctx.restore();
        outputData = finalCanvas.toDataURL('image/png');
    }

    // Store image in hidden input (for form submission)
    const hiddenInput = document.getElementById('captured-image');
    if (hiddenInput) {
        hiddenInput.value = outputData;
    }

    // Send to backend API (include CSRF token)
    const csrftoken = getCookie('csrftoken');

    fetch('/face-capture/upload/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken || '',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ image: outputData })
    }).then(res => res.json()).then(json => {
        const resultDiv = document.getElementById('result-msg');
        if (resultDiv) {
            if (json.success) {
                resultDiv.className = 'success';
                resultDiv.style.display = 'block';
                resultDiv.innerText = '✅ ' + (json.message || 'Face captured successfully!');
                instructions.innerText = 'Face verified. Photo saved. You can now submit the form.';
                video.style.display = 'none';
                canvas.style.display = 'none';
                document.getElementById('start-btn').style.display = 'none';
                // Enable submit button
                const submitBtn = document.getElementById('submit-btn');
                if (submitBtn) submitBtn.disabled = false;
            } else {
                resultDiv.className = 'error';
                resultDiv.style.display = 'block';
                resultDiv.innerText = '❌ ' + (json.error || 'Capture failed. Please try again.');
                instructions.innerText = 'Liveness check failed. Click Retry.';
                document.getElementById('retry-btn').style.display = 'inline-block';
                stage = 0; // Reset to face detection
            }
        }
        stage = 5; // stop the flow
    }).catch(err => {
        const resultDiv = document.getElementById('result-msg');
        if (resultDiv) {
            resultDiv.className = 'error';
            resultDiv.style.display = 'block';
            resultDiv.innerText = '❌ Network error. Please try again.';
            instructions.innerText = 'Network error.';
            document.getElementById('retry-btn').style.display = 'inline-block';
        }
        console.error(err);
    });
}

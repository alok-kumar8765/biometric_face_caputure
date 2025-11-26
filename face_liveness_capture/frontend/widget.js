const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const instructions = document.getElementById("instructions");

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
let eyeOpenThreshold = 0.02; // Eye aspect ratio threshold

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        video.srcObject = stream;
        video.style.display = 'block';
        canvas.style.display = 'block';
        document.getElementById('no-camera-msg').style.display = 'none';
        
        // Wait for video to load before resizing canvas
        video.onloadedmetadata = () => {
            resizeCanvas();
        };
    } catch (err) {
        console.error('Camera access denied or error:', err);
        video.style.display = 'none';
        canvas.style.display = 'none';
        document.getElementById('no-camera-msg').style.display = 'block';
        instructions.innerText = '⚠️ Camera access is required. Please enable it in your browser settings.';
    }
}

// Start camera on page load
startCamera();

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
    startCamera();
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

// Load FaceMesh
const faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

faceMesh.onResults(onResults);

// Run model on each frame
async function onVideoFrame() {
    await faceMesh.send({ image: video });
    requestAnimationFrame(onVideoFrame);
}
video.onloadeddata = () => onVideoFrame();

function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw circle guide (larger - 220px radius to fit normal face distance)
    drawCircleGuide();

    if (!results.multiFaceLandmarks.length) {
        if (stage < 4) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('❌ Face not detected', canvas.width / 2, 40);
        }
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    // Draw face detection circle
    drawFaceIndicator(landmarks);

    // Stage 0: Wait for face in circle
    if (stage === 0) {
        if (checkFaceInCircle(landmarks)) {
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
            ctx.fillText('⚠️ Move face to center', canvas.width / 2, 40);
        }
    }

    // Stage 1: Detect blink
    if (stage === 1) {
        const isBlinking = detectBlink(landmarks);
        drawEyeIndicator('Blink detected: ' + (isBlinking ? '✓' : '✗'), isBlinking);
        
        if (isBlinking) {
            blinkDetected = true;
            instructions.innerText = '👈 Turn your head LEFT';
            stage = 2;
        }
    }

    // Stage 2: Detect turn left
    if (stage === 2) {
        const isTurningLeft = detectTurnLeft(landmarks);
        drawHeadTurnIndicator('Turn LEFT: ' + (isTurningLeft ? '✓' : '✗'), isTurningLeft);
        
        if (isTurningLeft) {
            turnLeftDetected = true;
            instructions.innerText = '👉 Turn your head RIGHT';
            stage = 3;
        }
    }

    // Stage 3: Detect turn right
    if (stage === 3) {
        const isTurningRight = detectTurnRight(landmarks);
        drawHeadTurnIndicator('Turn RIGHT: ' + (isTurningRight ? '✓' : '✗'), isTurningRight);
        
        if (isTurningRight) {
            turnRightDetected = true;
            instructions.innerText = '📸 Capturing your photo...';
            stage = 4;
            setTimeout(() => captureImage(), 800);
        }
    }
}

// -------- Helper Functions --------

function drawCircleGuide() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 40; // Large circle
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw center crosshair
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
    return avgEAR < eyeOpenThreshold; // Blink detected when eyes closed
}

function calculateEyeAspectRatio(p1, p2, p3, p4, p5, p6) {
    const dist1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const dist2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const dist3 = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
    
    return (dist1 + dist2) / (2 * dist3);
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
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCanvas.getContext("2d").drawImage(video, 0, 0);

    const imageData = tempCanvas.toDataURL("image/jpeg");
    
    // Store image in hidden input (for form submission)
    const hiddenInput = document.getElementById('captured-image');
    if (hiddenInput) {
        hiddenInput.value = imageData;
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
        body: JSON.stringify({ image: imageData })
    }).then(res => res.json()).then(json => {
        const resultDiv = document.getElementById('result-msg');
        if (resultDiv) {
            if (json.success) {
                resultDiv.className = 'success';
                resultDiv.innerText = '✅ ' + (json.message || 'Face captured successfully!');
                instructions.innerText = 'Face verified. Photo saved.';
                document.getElementById('start-btn').style.display = 'none';
            } else {
                resultDiv.className = 'error';
                resultDiv.innerText = '❌ ' + (json.error || 'Capture failed. Please try again.');
                instructions.innerText = 'Retrying...';
                document.getElementById('retry-btn').style.display = 'inline-block';
            }
        }
        stage = 5; // stop the flow
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
            resultDiv.innerText = '❌ Network error. Please try again.';
            instructions.innerText = 'Network error';
            document.getElementById('retry-btn').style.display = 'inline-block';
        }
        console.error(err);
    });
}

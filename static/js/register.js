document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('webcamCanvas');
    const ctx = canvas.getContext('2d');
    const captureBtn = document.getElementById('captureBtn');
    const resetCaptureBtn = document.getElementById('resetCaptureBtn');
    const submitBtn = document.getElementById('submitBtn');
    const registrationForm = document.getElementById('registrationForm');
    const capturePreview = document.getElementById('capturePreview');
    const scannerOverlay = document.getElementById('scannerOverlay');
    const webcamAlert = document.getElementById('webcamAlert');
    const webcamAlertText = document.getElementById('webcamAlertText');
    
    let stream = null;
    let captureBase64 = null;
    let liveDetectionInterval = null;
    let isCaptured = false;

    // 1. Initialize Webcam
    async function initWebcam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });
            video.srcObject = stream;
            
            // Adjust canvas sizing to match video aspect ratio when metadata loads
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                startLiveFaceDetection();
            };
        } catch (err) {
            console.error('Camera access failed:', err);
            updateAlert('Unable to access webcam. Please check camera permissions.', 'danger');
        }
    }

    // Helper to update alert styles
    function updateAlert(text, type = 'info') {
        webcamAlertText.textContent = text;
        webcamAlert.className = `alert alert-${type} mt-4 mb-0 text-start d-flex align-items-center gap-3`;
        const icon = webcamAlert.querySelector('i');
        if (icon) {
            if (type === 'danger') icon.className = 'fa-solid fa-triangle-exclamation fs-4 text-danger flex-shrink-0';
            else if (type === 'success') icon.className = 'fa-solid fa-circle-check fs-4 text-success flex-shrink-0';
            else if (type === 'warning') icon.className = 'fa-solid fa-triangle-exclamation fs-4 text-warning flex-shrink-0';
            else icon.className = 'fa-solid fa-info-circle fs-4 text-info flex-shrink-0';
        }
    }

    // 2. Throttled Live Face Detection Overlay
    function startLiveFaceDetection() {
        if (liveDetectionInterval) clearInterval(liveDetectionInterval);
        
        liveDetectionInterval = setInterval(async () => {
            if (isCaptured || video.paused || video.ended) return;
            
            // Draw current frame to hidden temporary canvas to extract jpeg
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 320; // smaller size for faster detection processing
            tempCanvas.height = 240;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
            const jpegData = tempCanvas.toDataURL('image/jpeg', 0.6);
            
            try {
                const res = await fetch('/api/detect_face_live', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_data: jpegData })
                });
                const data = await res.json();
                
                // Clear overlay canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (data.success && data.faces && data.faces.length > 0) {
                    const scaleX = canvas.width / 320;
                    const scaleY = canvas.height / 240;
                    
                    data.faces.forEach(face => {
                        const top = face.top * scaleY;
                        const right = face.right * scaleX;
                        const bottom = face.bottom * scaleY;
                        const left = face.left * scaleX;
                        const width = right - left;
                        const height = bottom - top;
                        
                        // Draw bounding box
                        ctx.strokeStyle = '#10b981'; // Emerald Green
                        ctx.lineWidth = 3;
                        ctx.strokeRect(left, top, width, height);
                        
                        // Draw corner highlights
                        ctx.fillStyle = '#10b981';
                        ctx.fillRect(left - 2, top - 2, 10, 4);
                        ctx.fillRect(left - 2, top - 2, 4, 10);
                        ctx.fillRect(right - 8, top - 2, 10, 4);
                        ctx.fillRect(right - 2, top - 2, 4, 10);
                        ctx.fillRect(left - 2, bottom - 8, 4, 10);
                        ctx.fillRect(left - 2, bottom - 2, 10, 4);
                        ctx.fillRect(right - 2, bottom - 8, 4, 10);
                        ctx.fillRect(right - 8, bottom - 2, 10, 4);
                    });
                    
                    if (data.faces.length === 1) {
                        updateAlert('Face detected. You can capture photo now.', 'info');
                    } else {
                        updateAlert(`Multiple faces detected (${data.faces.length}). Frame must contain exactly one face.`, 'warning');
                    }
                } else {
                    updateAlert('No face detected. Adjust lighting and face position.', 'warning');
                }
            } catch (err) {
                console.error('Error during live detection:', err);
            }
        }, 800); // Check once every 800ms
    }

    // 3. Capture Action
    captureBtn.addEventListener('click', () => {
        if (!stream) return;
        
        // Render capture on canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        captureBase64 = tempCanvas.toDataURL('image/jpeg', 0.9);
        
        // Show image preview instead of live video
        capturePreview.src = captureBase64;
        capturePreview.classList.remove('d-none');
        video.classList.add('d-none');
        scannerOverlay.classList.add('d-none');
        
        // Toggle buttons
        captureBtn.classList.add('d-none');
        resetCaptureBtn.classList.remove('d-none');
        
        // Enable register button
        submitBtn.removeAttribute('disabled');
        isCaptured = true;
        
        updateAlert('Face image captured. Verify details and complete registration.', 'success');
    });

    // 4. Reset/Retake Action
    resetCaptureBtn.addEventListener('click', () => {
        captureBase64 = null;
        
        // Reset viewports
        capturePreview.classList.add('d-none');
        video.classList.remove('d-none');
        scannerOverlay.classList.remove('d-none');
        
        // Toggle buttons
        captureBtn.classList.remove('d-none');
        resetCaptureBtn.classList.add('d-none');
        
        // Disable register button
        submitBtn.setAttribute('disabled', 'true');
        isCaptured = false;
        
        updateAlert('Look at the camera. Register details on the left, then capture your face.', 'info');
    });

    // 5. Submit Registration AJAX
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!captureBase64) {
            updateAlert('Please capture employee face photo first.', 'danger');
            return;
        }
        
        // Disable submit button and inputs to prevent multiple submissions
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Processing Enrollment...';
        
        const payload = {
            employee_id: document.getElementById('employee_id').value.trim(),
            name: document.getElementById('name').value.trim(),
            department: document.getElementById('department').value,
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            image_data: captureBase64
        };
        
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                updateAlert('Employee registered! Redirecting to confirmation page...', 'success');
                setTimeout(() => {
                    window.location.href = `/success/${data.employee_id}`;
                }, 1000);
            } else {
                updateAlert(data.error || 'Registration failed. Check details.', 'danger');
                submitBtn.removeAttribute('disabled');
                submitBtn.innerHTML = '<i class="fa-solid fa-user-check me-2"></i>Complete Registration';
            }
        } catch (err) {
            console.error('Registration fetch failed:', err);
            updateAlert('Network error occurred. Unable to contact server.', 'danger');
            submitBtn.removeAttribute('disabled');
            submitBtn.innerHTML = '<i class="fa-solid fa-user-check me-2"></i>Complete Registration';
        }
    });

    // Run Initializer
    initWebcam();
});

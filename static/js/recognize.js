document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('recognizeVideo');
    const canvas = document.getElementById('recognizeCanvas');
    const ctx = canvas.getContext('2d');
    const startTerminalBtn = document.getElementById('startTerminalBtn');
    const stopTerminalBtn = document.getElementById('stopTerminalBtn');
    
    // Panel Elements
    const panelPlaceholder = document.getElementById('panelPlaceholder');
    const panelDetails = document.getElementById('panelDetails');
    const infoPhoto = document.getElementById('infoPhoto');
    const infoName = document.getElementById('infoName');
    const infoDept = document.getElementById('infoDept');
    const infoId = document.getElementById('infoId');
    const infoEmail = document.getElementById('infoEmail');
    const infoPhone = document.getElementById('infoPhone');
    const infoJoined = document.getElementById('infoJoined');
    
    // Indicators
    const attendanceSuccessIndicator = document.getElementById('attendanceSuccessIndicator');
    const attendanceSuccessTime = document.getElementById('attendanceSuccessTime');
    const attendanceAlreadyIndicator = document.getElementById('attendanceAlreadyIndicator');
    const recognizeAlert = document.getElementById('recognizeAlert');
    const recognizeAlertText = document.getElementById('recognizeAlertText');

    let stream = null;
    let loopInterval = null;
    let isRunning = false;
    let panelHoldTimeout = null; // keeps the details visible briefly after face leaves view

    // Voice Output Cooldowns for Detected Objects
    const spokenObjects = {}; // stores objectName -> timestamp of last voice announce
    const VOICE_COOLDOWN_MS = 6000; // 6 seconds cooldown per object type

    function speakObject(name) {
        const now = Date.now();
        if (!spokenObjects[name] || (now - spokenObjects[name] > VOICE_COOLDOWN_MS)) {
            spokenObjects[name] = now;
            
            let spokenName = name;
            // Map common YOLO names to cleaner spoken terms
            if (name === 'cell phone') spokenName = 'phone';
            
            const utterance = new SpeechSynthesisUtterance(`This is a ${spokenName}`);
            utterance.rate = 0.95; // natural rate
            window.speechSynthesis.speak(utterance);
        }
    }

    // 1. Initialize Webcam
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });
            video.srcObject = stream;
            isRunning = true;
            
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                startRecognitionLoop();
            };
            
            updateAlert('Scanner is active. Stand in front of camera.', 'success');
            
            stopTerminalBtn.classList.remove('d-none');
            startTerminalBtn.classList.add('d-none');
        } catch (err) {
            console.error('Camera access failed:', err);
            updateAlert('Failed to initialize video capture terminal.', 'danger');
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        if (loopInterval) clearInterval(loopInterval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        isRunning = false;
        stopTerminalBtn.classList.add('d-none');
        startTerminalBtn.classList.remove('d-none');
        updateAlert('Terminal paused. Press Resume to start scanner.', 'secondary');
    }

    // Helper to update alert styles
    function updateAlert(text, type = 'secondary') {
        recognizeAlertText.textContent = text;
        recognizeAlert.className = `alert alert-${type} mt-4 mb-0 text-start d-flex align-items-center gap-3`;
        const icon = recognizeAlert.querySelector('i');
        if (icon) {
            if (type === 'danger') icon.className = 'fa-solid fa-triangle-exclamation fs-4 text-danger flex-shrink-0';
            else if (type === 'success') icon.className = 'fa-solid fa-face-viewfinder fs-4 text-success flex-shrink-0';
            else icon.className = 'fa-solid fa-satellite-dish fs-4 text-secondary flex-shrink-0 animate-pulse';
        }
    }

    // 2. Continuous Recognition Processing Loop
    function startRecognitionLoop() {
        if (loopInterval) clearInterval(loopInterval);
        
        // Poll backend at 3 frames per second for smooth box overlays
        loopInterval = setInterval(async () => {
            if (!isRunning || video.paused || video.ended) return;
            
            // Render current frame to in-memory temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 640;
            tempCanvas.height = 480;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
            
            const jpegData = tempCanvas.toDataURL('image/jpeg', 0.55);
            
            try {
                const res = await fetch('/api/recognize_frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_data: jpegData })
                });
                const data = await res.json();
                
                // Clear active bounding boxes canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (data.success) {
                    // Draw Faces
                    if (data.matches && data.matches.length > 0) {
                        let primaryMatch = null;
                        
                        data.matches.forEach(match => {
                            const box = match.box;
                            const width = box.right - box.left;
                            const height = box.bottom - box.top;
                            
                            // Select colors based on match success
                            const isMatched = match.employee_id !== null && match.employee_id !== 'UNKNOWN';
                            const boxColor = isMatched ? '#10b981' : '#f43f5e'; // Green vs Red/Rose
                            
                            // 1. Draw box rectangle
                            ctx.strokeStyle = boxColor;
                            ctx.lineWidth = 3;
                            ctx.strokeRect(box.left, box.top, width, height);
                            
                            // 2. Draw neat corner accents
                            ctx.fillStyle = boxColor;
                            ctx.fillRect(box.left - 2, box.top - 2, 12, 4);
                            ctx.fillRect(box.left - 2, box.top - 2, 4, 12);
                            ctx.fillRect(box.right - 10, box.top - 2, 12, 4);
                            ctx.fillRect(box.right - 2, box.top - 2, 4, 12);
                            ctx.fillRect(box.left - 2, box.bottom - 10, 4, 12);
                            ctx.fillRect(box.left - 2, box.bottom - 2, 12, 4);
                            ctx.fillRect(box.right - 2, box.bottom - 10, 4, 12);
                            ctx.fillRect(box.right - 10, box.bottom - 2, 12, 4);
                            
                            // 3. Draw text label background
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark Slate semi-transparent
                            ctx.fillRect(box.left - 2, box.top - 38, width + 4, 32);
                            
                            // 4. Write text (Mirrored label layout handled by mirrored canvas CSS)
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 13px sans-serif';
                            const labelText = isMatched ? `This is ${match.name}` : 'unknown person';
                            const confText = `Confidence: ${match.confidence}%`;
                            
                            // Canvas is mirrored, so text drawing requires mirroring matrix tricks or we can use normal alignment
                            // Since CSS scaleX(-1) mirrors everything, normal text gets mirrored.
                            // To write unmirrored text on a mirrored canvas:
                            ctx.save();
                            ctx.translate(box.left + width / 2, box.top - 22);
                            ctx.scale(-1, 1); // unmirror the coordinate space just for text!
                            ctx.textAlign = 'center';
                            ctx.fillText(labelText, 0, -4);
                            ctx.font = '11px sans-serif';
                            ctx.fillStyle = isMatched ? '#34d399' : '#fb7185';
                            ctx.fillText(confText, 0, 8);
                            ctx.restore();
                            
                            // Record the highest confidence matching employee as the primary active display
                            if (isMatched && (!primaryMatch || match.confidence > primaryMatch.confidence)) {
                                primaryMatch = match;
                            }
                        });
                        
                        if (primaryMatch) {
                            hydrateEmployeePanel(primaryMatch);
                        }
                    }

                    // Draw Objects
                    if (data.objects && data.objects.length > 0) {
                        data.objects.forEach(obj => {
                            // Announce the object name via Web Speech Synthesis (with cooldown)
                            speakObject(obj.name);

                            const box = obj.box;
                            const width = box.right - box.left;
                            const height = box.bottom - box.top;
                            
                            const boxColor = '#3b82f6'; // Modern Blue/Indigo for Objects
                            
                            // 1. Draw box rectangle
                            ctx.strokeStyle = boxColor;
                            ctx.lineWidth = 2;
                            ctx.strokeRect(box.left, box.top, width, height);
                            
                            // 2. Draw text label background
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
                            ctx.fillRect(box.left - 2, box.top - 28, width + 4, 24);
                            
                            // 3. Write text (unmirrored coordinate space for readability)
                            ctx.save();
                            ctx.translate(box.left + width / 2, box.top - 16);
                            ctx.scale(-1, 1); // unmirror the coordinate space just for text!
                            ctx.textAlign = 'center';
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '11px sans-serif';
                            ctx.fillText(`${obj.name} (${obj.confidence}%)`, 0, 4);
                            ctx.restore();
                        });
                    }
                }
            } catch (err) {
                console.error('Error polling frame recognition API:', err);
            }
        }, 380); // check 380ms
    }

    // 3. Populate Side Info Panel
    function hydrateEmployeePanel(match) {
        // Clear any fadeout holds
        if (panelHoldTimeout) clearTimeout(panelHoldTimeout);
        
        const emp = match.employee_info;
        
        infoPhoto.src = emp.image_url;
        infoName.textContent = emp.name;
        infoDept.textContent = emp.department;
        infoId.textContent = emp.employee_id;
        infoEmail.textContent = emp.email;
        infoPhone.textContent = emp.phone;
        infoJoined.textContent = emp.registration_date.split(' ')[0]; // YYYY-MM-DD portion
        
        // Hide placeholder and reveal profile card
        panelPlaceholder.classList.add('d-none');
        panelDetails.classList.remove('d-none');
        
        // Display attendance status
        if (match.attendance_marked) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            attendanceSuccessTime.textContent = `Logged today at ${timeStr}`;
            attendanceSuccessIndicator.classList.remove('d-none');
            attendanceAlreadyIndicator.classList.add('d-none');
            
            // Visual green feedback effect on viewport borders
            const viewport = document.getElementById('recognizerViewport');
            viewport.classList.add('scan-match-flash');
            setTimeout(() => viewport.classList.remove('scan-match-flash'), 500);
        } else {
            attendanceSuccessIndicator.classList.add('d-none');
            attendanceAlreadyIndicator.classList.remove('d-none');
        }
        
        // Set hold timeout to revert panel if face vanishes
        panelHoldTimeout = setTimeout(() => {
            clearEmployeePanel();
        }, 3200);
    }

    function clearEmployeePanel() {
        panelDetails.classList.add('d-none');
        attendanceSuccessIndicator.classList.add('d-none');
        attendanceAlreadyIndicator.classList.add('d-none');
        panelPlaceholder.classList.remove('d-none');
    }

    // 4. Attach Event Listeners
    startTerminalBtn.addEventListener('click', startCamera);
    stopTerminalBtn.addEventListener('click', stopCamera);

    // Auto-launch camera on loading the page
    startCamera();
});

import os
import sys
import base64
import cv2
import numpy as np

# Naming conflict bypass: Import the global third-party face_recognition library
original_path = sys.path.copy()
cwd = os.path.abspath(os.getcwd())
# Remove workspace directory from path temporarily
sys.path = [p for p in sys.path if p and os.path.abspath(p) != cwd]
local_fr = sys.modules.pop('face_recognition', None)

import face_recognition as fr_lib

# Restore local package pathing
if local_fr:
    sys.modules['face_recognition'] = local_fr
sys.path = original_path

def base64_to_cv2(base64_str):
    """Convert base64 data URI to OpenCV BGR image."""
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def detect_face_locations(img):
    """Detect all face locations in an OpenCV BGR image."""
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return fr_lib.face_locations(rgb_img)

def process_and_register_face(image_data_uri, employee_id, uploads_dir):
    """
    Process image from registration page, validate face count,
    generate face encoding, and save the image.
    """
    img = base64_to_cv2(image_data_uri)
    if img is None:
        raise ValueError("Invalid image data received.")
        
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = fr_lib.face_locations(rgb_img)
    
    if len(face_locations) == 0:
        raise ValueError("No face detected. Please position your face clearly in front of the camera.")
    elif len(face_locations) > 1:
        raise ValueError(f"Multiple faces detected ({len(face_locations)}). Only one face must be visible.")
        
    face_encodings = fr_lib.face_encodings(rgb_img, face_locations)
    if not face_encodings:
        raise ValueError("Unable to extract face features. Please try again with better lighting.")
        
    # Get the 128-dimensional float list encoding
    encoding = face_encodings[0].tolist()
    
    # Ensure uploads directory exists
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Save the employee registration image
    filename = f"{employee_id}.jpg"
    image_path = os.path.join(uploads_dir, filename)
    cv2.imwrite(image_path, img)
    
    # Return relative web path and encoding list
    web_image_path = f"static/uploads/{filename}"
    return web_image_path, encoding

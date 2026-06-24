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

def recognize_faces_in_frame(frame_data_uri, known_encodings_data):
    """
    Detect and match all faces in the provided frame.
    
    known_encodings_data: List of dicts, e.g. [{"employee_id": "EMP101", "face_encoding": [...]}]
    """
    img = base64_to_cv2(frame_data_uri)
    if img is None:
        return []
        
    # Resize frame to 1/4 size for faster face recognition processing
    small_img = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
    rgb_small_img = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)
    
    # Find all the faces and face encodings in the current frame of video
    face_locations = fr_lib.face_locations(rgb_small_img)
    face_encodings = fr_lib.face_encodings(rgb_small_img, face_locations)
    
    # Prepare lists of known encodings and their corresponding employee IDs
    known_encodings = [np.array(item["face_encoding"]) for item in known_encodings_data]
    known_ids = [item["employee_id"] for item in known_encodings_data]
    
    matches_found = []
    
    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        # Scale back up face locations since the frame we detected in was scaled to 1/4 size
        top_scaled = top * 4
        right_scaled = right * 4
        bottom_scaled = bottom * 4
        left_scaled = left * 4
        
        employee_id = None
        confidence = 0.0
        
        if known_encodings:
            # See if the face is a match for the known face(s)
            matches = fr_lib.compare_faces(known_encodings, face_encoding, tolerance=0.6)
            face_distances = fr_lib.face_distance(known_encodings, face_encoding)
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                distance = face_distances[best_match_index]
                
                # Check tolerance
                if matches[best_match_index]:
                    employee_id = known_ids[best_match_index]
                    
                    # Convert distance to confidence percentage:
                    # distance 0.0 -> 100% confidence
                    # distance 0.6 (threshold) -> 50% confidence
                    # distance >= 1.0 -> 0% confidence
                    if distance <= 0.6:
                        confidence = 100 - (distance / 0.6) * 50
                    else:
                        confidence = max(0, 50 - ((distance - 0.6) / 0.4) * 50)
                else:
                    # Face distance mapping for unknown/unmatched faces
                    confidence = max(0.0, (1.0 - distance) * 100)
                    if confidence > 45.0:
                        confidence = 45.0 # cap unmatched confidence to indicate low certainty
        
        matches_found.append({
            "box": {
                "top": top_scaled,
                "right": right_scaled,
                "bottom": bottom_scaled,
                "left": left_scaled
            },
            "employee_id": employee_id,
            "confidence": round(confidence, 1)
        })
        
    objects_found = detect_objects(img)

    return {
    "faces": matches_found,
    "objects": objects_found
}

import os
from ultralytics import YOLO
import cv2

# Initialize YOLO model once using absolute path from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(project_root, "yolov8n.pt")
model = YOLO(model_path)

def detect_objects(frame):
    """
    Detect objects in the frame using YOLOv8.
    Returns a list of detected objects with name, confidence (0-100%), and bounding box coordinates.
    """
    results = model(frame, verbose=False)
    objects = []

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            objects.append({
                "name": model.names[cls_id],
                "confidence": round(confidence * 100, 1),
                "box": {
                    "left": x1,
                    "top": y1,
                    "right": x2,
                    "bottom": y2
                }
            })

    return objects

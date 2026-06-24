from ultralytics import YOLO
import cv2

# Initialize YOLO model once
model = YOLO("yolov8n.pt")

def detect_objects(frame):
    """
    Detect objects in the frame using YOLOv8.
    Returns a list of detected objects with name, confidence (0-100%), and bounding box coordinates.
    """
    results = model(frame)
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

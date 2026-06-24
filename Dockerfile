FROM python:3.10-slim-bookworm

# Install runtime system dependencies for OpenCV/graphics support
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install python requirements & gunicorn for production web server
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Install face-recognition without dependencies to bypass compilation
RUN pip install --no-cache-dir face-recognition --no-deps

# Copy project files
COPY . .

# Download YOLOv8n weights during build so they are packaged inside the container image
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Expose port
EXPOSE 5000

# Start with Gunicorn WSGI server, respecting PORT environment variable
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"]

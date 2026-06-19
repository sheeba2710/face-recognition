FROM python:3.11-slim-bookworm

# Install system dependencies for C++ compilation (dlib) and graphics libraries (OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    g++ \
    libatlas-base-dev \
    libjpeg-dev \
    liblapack-dev \
    libswscale-dev \
    libsm6 \
    libxext6 \
    libxrender-dev \
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

# Copy project files
COPY . .

# Expose port
EXPOSE 5000

# Start with Gunicorn WSGI server, respecting PORT environment variable
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"]

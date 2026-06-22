import os
from datetime import timedelta

class Config:
    # Flask Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'universal-ai-assistant-secret-key-12938472')
    
    # JWT Security
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-universal-ai-secret-key-92837482')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)  # Generous access duration for usability
    
    # Database configuration
    # Default to SQLite database in local dev instance directory, support Postgres in production env
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DEFAULT_DB_PATH = os.path.join(BASE_DIR, 'instance', 'universal_ai.db')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{DEFAULT_DB_PATH}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Gemini LLM API Config
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    
    # File uploads configuration
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload limit
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
    
    # Rate Limiting limits
    RATELIMIT_DEFAULT = "100 per hour"
    RATELIMIT_STORAGE_URI = "memory://"

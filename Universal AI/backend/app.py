import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from database import db
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.ai import ai_bp

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config.from_object(Config)

    # Initialize CORS for frontend communication
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database
    db.init_app(app)

    # Initialize JWT Authentication Manager
    jwt = JWTManager(app)

    # Initialize API Rate Limiter
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=[app.config['RATELIMIT_DEFAULT']],
        storage_uri=app.config['RATELIMIT_STORAGE_URI']
    )

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chats')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    # Serve uploads statically
    @app.route('/static/uploads/<filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Serve static frontend application
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        # Prevent accessing files inside instance or other system files
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    # Health Check Endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "healthy",
            "message": "Universal AI Assistant backend is online",
            "database": "connected" if db.engine else "disconnected"
        }), 200

    # Ensure database schema is created
    with app.app_context():
        # Ensure instance directory exists
        os.makedirs(os.path.join(app.config['BASE_DIR'], 'instance'), exist_ok=True)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        db.create_all()

    return app

app = create_app()

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)

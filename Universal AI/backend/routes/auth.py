from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database import db
from models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({"error": "Missing required fields: email, password, name"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    try:
        user = User(email=email, name=name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        # In development, auto-verify emails
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "User registered successfully (Email verification completed automatically in dev mode)",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "preferences": user.preferences
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "preferences": user.preferences
        }
    }), 200

@auth_bp.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == 'GET':
        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "preferences": user.preferences
            }
        }), 200

    elif request.method == 'PUT':
        data = request.get_json() or {}
        name = data.get('name')
        preferences = data.get('preferences')
        password = data.get('password')

        if name:
            user.name = name
        if preferences:
            user.preferences = preferences
        if password:
            user.set_password(password)

        try:
            db.session.commit()
            return jsonify({
                "message": "Profile updated successfully",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "preferences": user.preferences
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

@auth_bp.route('/reset-password-request', methods=['POST'])
def reset_password_request():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Prevent email enumeration by returning 200 anyway
        return jsonify({"message": "If this email exists in our system, a password reset link has been generated."}), 200

    # In development, simulate sending email and return the reset path for convenience
    reset_link = f"http://localhost:5173/reset-password?email={email}"
    return jsonify({
        "message": "Password reset instructions generated successfully.",
        "dev_reset_link": reset_link
    }), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email')
    new_password = data.get('new_password')

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        user.set_password(new_password)
        db.session.commit()
        return jsonify({"message": "Password has been reset successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

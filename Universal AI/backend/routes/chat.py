import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database import db
from models import Chat, Message, User
from services.document_service import DocumentService

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('', methods=['GET', 'POST'])
@jwt_required()
def handle_chats():
    user_id = int(get_jwt_identity())

    if request.method == 'GET':
        # Retrieve all conversations of user, ordered by recent updates
        chats = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).all()
        return jsonify({
            "chats": [{
                "id": c.id,
                "title": c.title,
                "is_bookmarked": c.is_bookmarked,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat()
            } for c in chats]
        }), 200

    elif request.method == 'POST':
        # Create a new conversation session
        data = request.get_json() or {}
        title = data.get('title', 'New Conversation')
        
        try:
            chat = Chat(user_id=user_id, title=title)
            db.session.add(chat)
            db.session.commit()
            return jsonify({
                "chat": {
                    "id": chat.id,
                    "title": chat.title,
                    "is_bookmarked": chat.is_bookmarked,
                    "created_at": chat.created_at.isoformat(),
                    "updated_at": chat.updated_at.isoformat()
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

@chat_bp.route('/<int:chat_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def handle_chat_detail(chat_id):
    user_id = int(get_jwt_identity())
    chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    
    if not chat:
        return jsonify({"error": "Conversation not found"}), 404

    if request.method == 'GET':
        # Get all messages in the chat session
        messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).all()
        return jsonify({
            "chat": {
                "id": chat.id,
                "title": chat.title,
                "is_bookmarked": chat.is_bookmarked,
                "messages": [{
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "file_name": m.file_name,
                    "file_type": m.file_type,
                    "created_at": m.created_at.isoformat()
                } for m in messages]
            }
        }), 200

    elif request.method == 'PUT':
        # Update chat parameters (e.g. rename title, bookmark conversation)
        data = request.get_json() or {}
        title = data.get('title')
        is_bookmarked = data.get('is_bookmarked')
        
        if title is not None:
            chat.title = title
        if is_bookmarked is not None:
            chat.is_bookmarked = is_bookmarked
            
        try:
            db.session.commit()
            return jsonify({
                "message": "Conversation updated successfully",
                "chat": {
                    "id": chat.id,
                    "title": chat.title,
                    "is_bookmarked": chat.is_bookmarked
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    elif request.method == 'DELETE':
        # Delete the chat session
        try:
            db.session.delete(chat)
            db.session.commit()
            return jsonify({"message": "Conversation deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

@chat_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    # Verify file existence in request
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    if file and DocumentService.allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
        filename = secure_filename(file.filename)
        # Ensure upload folder exists
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Determine file type
        file_type = file.mimetype
        if filename.lower().endswith('.pdf'):
            file_type = 'application/pdf'
            
        result = {
            "file_name": filename,
            "file_type": file_type,
            "url": f"/static/uploads/{filename}"
        }
        
        # If it's a PDF, extract and return text context for the prompt
        if file_type == 'application/pdf':
            pdf_text = DocumentService.extract_text_from_pdf(file_path)
            result["extracted_text"] = pdf_text
            
        return jsonify(result), 200
        
    return jsonify({"error": "File type not supported. Allowed: PDF, PNG, JPG, JPEG"}), 400

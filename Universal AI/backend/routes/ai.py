import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Chat, Message
from services.ai_service import AIService

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/chat/<int:chat_id>', methods=['POST'])
@jwt_required()
def stream_chat(chat_id):
    user_id = int(get_jwt_identity())
    chat_obj = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat_obj:
        return jsonify({"error": "Conversation not found"}), 404

    data = request.get_json() or {}
    message_content = data.get('message')
    system_instruction = data.get('system_instruction', '')
    custom_api_key = data.get('custom_api_key', '')
    file_name = data.get('file_name')
    file_type = data.get('file_type')
    extracted_text = data.get('extracted_text')

    if not message_content:
        return jsonify({"error": "Message content is required"}), 400

    try:
        # Save User message in DB
        user_msg = Message(
            chat_id=chat_id,
            role='user',
            content=message_content,
            file_name=file_name,
            file_type=file_type
        )
        db.session.add(user_msg)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database write failed: {str(e)}"}), 500

    # Retrieve prior chat message logs for context
    try:
        history_messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).all()
        # Form history excluding the newly saved user prompt
        history_data = [{"role": m.role, "content": m.content} for m in history_messages[:-1]]
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve history: {str(e)}"}), 500

    # Prepare file context
    file_data = None
    if file_name:
        if file_type and file_type.startswith('image/'):
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_name)
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'rb') as f:
                        file_data = {
                            'type': file_type,
                            'bytes': f.read()
                        }
                except Exception as e:
                    return jsonify({"error": f"Failed to read uploaded image: {str(e)}"}), 500
        elif file_type == 'application/pdf' and extracted_text:
            file_data = {
                'type': file_type,
                'text': extracted_text
            }

    # Generator function for streaming response
    def generate():
        # Keep context active in async generator
        with current_app.app_context():
            accumulated_response = []
            try:
                # Fetch generator from AI service
                stream = AIService.generate_response_stream(
                    query=message_content,
                    chat_history=history_data,
                    system_instruction=system_instruction,
                    file_data=file_data,
                    user_key=custom_api_key
                )
                for chunk in stream:
                    accumulated_response.append(chunk)
                    yield chunk
            except Exception as e:
                yield f"Error during streaming output: {str(e)}"
                
            # Once stream completes, save assistant response and rename chat if default
            full_response = "".join(accumulated_response)
            if full_response:
                try:
                    assistant_msg = Message(
                        chat_id=chat_id,
                        role='assistant',
                        content=full_response
                    )
                    db.session.add(assistant_msg)
                    
                    # Update Chat Title if it's the default text or first query
                    db_chat = Chat.query.get(chat_id)
                    if db_chat:
                        if db_chat.title == 'New Conversation' or len(history_messages) <= 2:
                            # Extract first 40 chars of user query as title
                            title_text = message_content.strip()
                            new_title = title_text[:35] + ('...' if len(title_text) > 35 else '')
                            db_chat.title = new_title
                        db_chat.updated_at = datetime.utcnow()
                    db.session.commit()
                except Exception:
                    db.session.rollback()

    return Response(generate(), mimetype='text/plain')

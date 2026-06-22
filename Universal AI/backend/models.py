from datetime import datetime
import json
import bcrypt
from database import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    preferences_json = db.Column(db.Text, default='{"theme": "dark", "language": "Auto-detect"}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to chats
    chats = db.relationship('Chat', backref='user', lazy=True, cascade="all, delete-orphan")
    
    @property
    def preferences(self):
        try:
            return json.loads(self.preferences_json)
        except Exception:
            return {"theme": "dark", "language": "Auto-detect"}
            
    @preferences.setter
    def preferences(self, value):
        self.preferences_json = json.dumps(value)
        
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
    def check_password(self, password):
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception:
            return False

class Chat(db.Model):
    __tablename__ = 'chats'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    is_bookmarked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to messages
    messages = db.relationship('Message', backref='chat', lazy=True, cascade="all, delete-orphan")

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chats.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    file_name = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(50), nullable=True)  # 'pdf', 'image/png', etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

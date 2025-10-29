from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Create SQLite database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat_history.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, default="default_user")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship with chats
    chats = relationship("Chat", back_populates="user")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)  # Auto-generated title from first message
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationship with user and messages
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Additional fields for stock data
    price = Column(String, nullable=True)  # JSON string for price data
    change_percent = Column(String, nullable=True)  # JSON string for change data
    monthly_data = Column(Text, nullable=True)  # JSON string for chart data
    comparison_data = Column(Text, nullable=True)  # JSON string for comparison chart data

    # Foreign key to chat
    chat_id = Column(Integer, ForeignKey("chats.id"))

    # Relationship with chat
    chat = relationship("Chat", back_populates="messages")

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def get_or_create_default_user(db):
    """Get or create the default user"""
    user = db.query(User).filter(User.username == "default_user").first()
    if not user:
        user = User(username="default_user")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def create_chat(db, title=None):
    """Create a new chat session"""
    user = get_or_create_default_user(db)
    chat = Chat(user_id=user.id, title=title)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

def get_chat_history(db, chat_id):
    """Get all messages for a chat"""
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()

def get_all_chats(db):
    """Get all chats for the default user"""
    user = get_or_create_default_user(db)
    return db.query(Chat).filter(Chat.user_id == user.id).order_by(Chat.updated_at.desc()).all()

def add_message_to_chat(db, chat_id, role, content, price=None, change_percent=None, monthly_data=None, comparison_data=None):
    """Add a message to a chat"""
    message = Message(
        chat_id=chat_id,
        role=role,
        content=content,
        price=price,
        change_percent=change_percent,
        monthly_data=monthly_data,
        comparison_data=comparison_data
    )
    db.add(message)

    # Update chat's updated_at timestamp
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat:
        chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)
    return message

def update_chat_title(db, chat_id, title):
    """Update chat title"""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat:
        chat.title = title
        db.commit()
    return chat


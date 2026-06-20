import os
import uuid
from datetime import datetime
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_DB_URL = os.getenv("MONGO_DB_URL")
DB_NAME = "rag_chatbot"

def get_db():
    if not MONGO_DB_URL:
        return None
    try:
        # short timeout (2000ms) to prevent freezing when MongoDB is unreachable
        client = MongoClient(MONGO_DB_URL, serverSelectionTimeoutMS=2000)
        # ping to trigger server selection and check connection
        client.admin.command('ping')
        return client[DB_NAME]
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return None

# --- EVALUATION ANALYTICS ---

def save_evaluation_records(records):
    db = get_db()
    if db is None:
        return False
    try:
        cleaned_records = []
        for r in records:
            cleaned = {}
            for k, v in r.items():
                # Sanitize NaN/None values for MongoDB
                if pd.isna(v):
                    cleaned[k] = ""
                else:
                    cleaned[k] = v
            cleaned["timestamp"] = datetime.utcnow()
            cleaned_records.append(cleaned)
        
        if cleaned_records:
            db.analytics.insert_many(cleaned_records)
        return True
    except Exception as e:
        print(f"Error saving to MongoDB: {e}")
        return False

def get_evaluation_records():
    db = get_db()
    if db is None:
        return None
    try:
        records = list(db.analytics.find({}, {"_id": 0}).sort("timestamp", 1))
        # Remove timestamp before returning to match CSV format if needed, 
        # or leave it if UI doesn't mind. The UI expects keys: model, answer, latency, etc.
        for r in records:
            if "timestamp" in r:
                del r["timestamp"]
        return records
    except Exception as e:
        print(f"Error reading from MongoDB: {e}")
        return None

def sync_csv_to_mongodb():
    db = get_db()
    if db is None:
        return
    try:
        # Only sync if the collection is empty
        if db.analytics.count_documents({}) == 0:
            csv_path = "analytics.csv"
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                # If dataframe is empty or doesn't match standard cols, ignore or handle
                if not df.empty:
                    records = df.to_dict(orient="records")
                    save_evaluation_records(records)
                    print(f"Successfully synced {len(records)} records from analytics.csv to MongoDB.")
    except Exception as e:
        print(f"Error syncing CSV to MongoDB: {e}")

# --- CHATBOT SESSIONS & HISTORY ---

def get_chat_sessions():
    db = get_db()
    if db is None:
        return []
    try:
        sessions = list(db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1))
        return sessions
    except Exception as e:
        print(f"Error fetching chat sessions: {e}")
        return []

def create_chat_session(title=None):
    db = get_db()
    if db is None:
        # Fallback to local representation if MongoDB is offline
        return uuid.uuid4().hex
    try:
        session_id = uuid.uuid4().hex
        session_doc = {
            "session_id": session_id,
            "title": title or "New Chat",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        db.chat_sessions.insert_one(session_doc)
        return session_id
    except Exception as e:
        print(f"Error creating chat session: {e}")
        return uuid.uuid4().hex

def save_chat_message(session_id, sender, text, image=None, model=None, embedModel=None, score=0, latency=0, sources=None):
    db = get_db()
    if db is None:
        return False
    try:
        # Create message document
        msg_doc = {
            "message_id": uuid.uuid4().hex,
            "session_id": session_id,
            "sender": sender, # "user" or "assistant"
            "text": text,
            "image": image, # base64 string or URL
            "model": model,
            "embedModel": embedModel,
            "score": score,
            "latency": latency,
            "sources": sources or [],
            "timestamp": datetime.utcnow()
        }
        
        # Ensure session exists or create it
        session = db.chat_sessions.find_one({"session_id": session_id})
        now = datetime.utcnow()
        if not session:
            # First message, auto-title from user query
            title = text[:30] + "..." if len(text) > 30 else text
            db.chat_sessions.insert_one({
                "session_id": session_id,
                "title": title,
                "created_at": now,
                "updated_at": now
            })
        else:
            # If session is named "New Chat" and this is a user message, update title
            if session.get("title") == "New Chat" and sender == "user":
                title = text[:30] + "..." if len(text) > 30 else text
                db.chat_sessions.update_one(
                    {"session_id": session_id},
                    {"$set": {"title": title, "updated_at": now}}
                )
            else:
                db.chat_sessions.update_one(
                    {"session_id": session_id},
                    {"$set": {"updated_at": now}}
                )
                
        db.chat_messages.insert_one(msg_doc)
        return True
    except Exception as e:
        print(f"Error saving chat message: {e}")
        return False

def get_chat_messages(session_id):
    db = get_db()
    if db is None:
        return []
    try:
        messages = list(db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1))
        # Format datetimes/UUIDs for JSON compatibility
        for msg in messages:
            if "timestamp" in msg:
                msg["timestamp"] = msg["timestamp"].isoformat()
        return messages
    except Exception as e:
        print(f"Error retrieving chat messages: {e}")
        return []

def delete_chat_session(session_id):
    db = get_db()
    if db is None:
        return False
    try:
        db.chat_sessions.delete_one({"session_id": session_id})
        db.chat_messages.delete_many({"session_id": session_id})
        return True
    except Exception as e:
        print(f"Error deleting chat session: {e}")
        return False

# --- UPLOADED ASSETS ---

def save_asset(asset_dict):
    db = get_db()
    if db is None:
        return None
    try:
        asset_id = uuid.uuid4().hex
        asset_doc = {
            "asset_id": asset_id,
            "filename": asset_dict.get("filename"),
            "file_type": asset_dict.get("file_type"), # "document", "audio", "video", "image"
            "file_path": asset_dict.get("file_path"),
            "file_size": asset_dict.get("file_size"),
            "text_content": asset_dict.get("text_content", ""),
            "chroma_ids": asset_dict.get("chroma_ids", []),
            "upload_time": datetime.utcnow()
        }
        db.uploaded_assets.insert_one(asset_doc)
        return asset_id
    except Exception as e:
        print(f"Error saving asset metadata: {e}")
        return None

def get_assets():
    db = get_db()
    if db is None:
        return []
    try:
        assets = list(db.uploaded_assets.find({}, {"_id": 0}).sort("upload_time", -1))
        for asset in assets:
            if "upload_time" in asset:
                asset["upload_time"] = asset["upload_time"].isoformat()
        return assets
    except Exception as e:
        print(f"Error retrieving uploaded assets: {e}")
        return []

def get_asset(asset_id):
    db = get_db()
    if db is None:
        return None
    try:
        asset = db.uploaded_assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if asset and "upload_time" in asset:
            asset["upload_time"] = asset["upload_time"].isoformat()
        return asset
    except Exception as e:
        print(f"Error retrieving asset: {e}")
        return None

def update_asset(asset_id, filename, text_content, chroma_ids):
    db = get_db()
    if db is None:
        return False
    try:
        db.uploaded_assets.update_one(
            {"asset_id": asset_id},
            {
                "$set": {
                    "filename": filename,
                    "text_content": text_content,
                    "chroma_ids": chroma_ids
                }
            }
        )
        return True
    except Exception as e:
        print(f"Error updating asset metadata: {e}")
        return False

def delete_asset_record(asset_id):
    db = get_db()
    if db is None:
        return None
    try:
        asset = db.uploaded_assets.find_one({"asset_id": asset_id})
        if asset:
            db.uploaded_assets.delete_one({"asset_id": asset_id})
            return {
                "file_path": asset.get("file_path"),
                "chroma_ids": asset.get("chroma_ids", [])
            }
        return None
    except Exception as e:
        print(f"Error deleting asset record: {e}")
        return None

# DFD 1.0-9.0 - System Configuration & Environment Settings
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "civic-connect-super-secret-key-2026")
    JWT_SECRET = os.getenv("JWT_SECRET", "jwt-token-signing-key-civic-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # SQLite default, PostgreSQL ready via DATABASE_URL
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'civicconnect.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Image storage config
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max request payload
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
    MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024  # 5 MB per image
    
    # SLA & Escalation Settings
    SLA_CHECK_INTERVAL_SECONDS = int(os.getenv("SLA_CHECK_INTERVAL_SECONDS", "60"))
    
    # Mail Config (Local console fallback if not configured)
    MAIL_SERVER = os.getenv("MAIL_SERVER", "localhost")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "25"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "false").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", None)
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", None)
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "notifications@civicconnect.org")

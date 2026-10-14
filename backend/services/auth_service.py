# DFD 1.0 - Authentication & Role-Based Access Control Service
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from database import db
from models import User

def generate_token(user):
    """Generate JWT access token for user."""
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "department_id": user.department_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")

def decode_token(token):
    """Decode and validate JWT access token."""
    try:
        return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
    except Exception as e:
        print(f"[JWT DECODE ERROR]: {type(e).__name__} - {e}")
        return None

def token_required(f):
    """Decorator to enforce authenticated JWT on protected endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token required"}), 401
        
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired authorization token"}), 401
        
        user_id = int(payload.get("sub"))
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return jsonify({"error": "User account inactive or not found"}), 401
            
        return f(current_user=user, *args, **kwargs)
    return decorated

def optional_token(f):
    """Decorator to inject current_user if valid JWT provided, else None."""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if payload and payload.get("sub"):
                current_user = db.session.get(User, int(payload.get("sub")))
        return f(current_user=current_user, *args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    """Decorator to restrict access by role (e.g., 'officer', 'admin')."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if not current_user or current_user.role not in allowed_roles:
                return jsonify({
                    "error": f"Permission denied. Required role: {', '.join(allowed_roles)}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

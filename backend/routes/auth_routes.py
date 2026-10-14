# DFD 1.0 - Authentication & User Session Routes
from flask import Blueprint, request, jsonify
from database import db
from models import User, Department
from services.auth_service import generate_token, token_required

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register new citizen or authority user."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "citizen").strip().lower()
    department_id = data.get("department_id")

    if not email or not password or not full_name:
        return jsonify({"error": "Full name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    if role not in ["citizen", "officer", "admin"]:
        role = "citizen"

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        role=role,
        department_id=department_id if role == "officer" else None
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user)
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": user.to_dict()
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user credentials and issue JWT token."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "This account has been deactivated"}), 403

    token = generate_token(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile(current_user):
    """Retrieve profile of authenticated user."""
    return jsonify({
        "user": current_user.to_dict()
    }), 200

from flask import Blueprint, request, jsonify, session, current_app, send_from_directory
from flask_jwt_extended import create_access_token, set_access_cookies, unset_jwt_cookies
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from database import db, User
from services.auth import login_required, get_current_user_id
from sqlalchemy import or_
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import uuid

auth_bp = Blueprint("auth", __name__)
ALLOWED_AVATAR_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _normalize_phone(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit() or ch == "+").strip()


def _allowed_avatar(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in ALLOWED_AVATAR_EXTENSIONS


def _issue_auth_response(user, status_code=200):
    token = create_access_token(identity=str(user.id))
    session["user_id"] = user.id
    session["role"] = user.role
    session.permanent = True
    response = jsonify({"token": token, "user": user.to_dict()})
    set_access_cookies(response, token)
    return response, status_code


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Name, email, and password are required"}), 400

    email = str(data["email"]).strip().lower()
    phone = _normalize_phone(data.get("phone", ""))
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    if phone and User.query.filter_by(phone=phone).first():
        return jsonify({"error": "Mobile number already registered"}), 409

    user = User(
        name=data["name"],
        email=email,
        password_hash=generate_password_hash(data["password"]),
        role="user",
        phone=phone,
        address=data.get("address", ""),
    )
    db.session.add(user)
    db.session.commit()
    return _issue_auth_response(user, status_code=201)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = str(data.get("identifier") or data.get("email") or "").strip()
    password = str(data.get("password") or "")
    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required"}), 400

    normalized_phone = _normalize_phone(identifier)
    user = User.query.filter(
        or_(User.email == identifier.lower(), User.phone == normalized_phone)
    ).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email/mobile or password"}), 401
    if not bool(getattr(user, "is_active", True)):
        return jsonify({"error": "Account is deactivated. Please contact support."}), 403

    return _issue_auth_response(user)


@auth_bp.route("/google", methods=["POST"])
def login_with_google():
    data = request.get_json() or {}
    credential = data.get("credential")
    if not credential:
        return jsonify({"error": "Google credential is required"}), 400

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        return jsonify({"error": "Google sign-in is not configured on server"}), 500

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except Exception:
        return jsonify({"error": "Invalid Google credential"}), 401

    email = str(payload.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Google account email not available"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        fallback_name = str(payload.get("name") or email.split("@")[0]).strip() or "Google User"
        user = User(
            name=fallback_name,
            email=email,
            password_hash=generate_password_hash(os.urandom(24).hex()),
            role="user",
        )
        db.session.add(user)
        db.session.commit()
    elif not bool(getattr(user, "is_active", True)):
        return jsonify({"error": "Account is deactivated. Please contact support."}), 403

    return _issue_auth_response(user)


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route("/me", methods=["PUT"])
@login_required
def update_me():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    is_multipart = request.content_type and "multipart/form-data" in request.content_type
    data = request.form if is_multipart else (request.get_json() or {})

    if "name" in data:
        next_name = str(data.get("name") or "").strip()
        if not next_name:
            return jsonify({"error": "Username is required"}), 400
        user.name = next_name

    if "phone" in data:
        next_phone = _normalize_phone(data.get("phone"))
        if next_phone:
            duplicate_phone = User.query.filter(User.phone == next_phone, User.id != user.id).first()
            if duplicate_phone:
                return jsonify({"error": "Mobile number already registered"}), 409
        user.phone = next_phone

    if "address" in data:
        user.address = str(data.get("address") or "").strip()

    if "email" in data:
        next_email = str(data.get("email") or "").strip().lower()
        if not next_email:
            return jsonify({"error": "Email is required"}), 400
        duplicate_email = User.query.filter(User.email == next_email, User.id != user.id).first()
        if duplicate_email:
            return jsonify({"error": "Email already registered"}), 409
        user.email = next_email

    new_password = str(data.get("new_password") or "")
    if new_password:
        current_password = str(data.get("current_password") or "")
        if not current_password:
            return jsonify({"error": "Current password is required"}), 400
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({"error": "Current password is incorrect"}), 401
        if len(new_password) < 8:
            return jsonify({"error": "New password must be at least 8 characters"}), 400
        user.password_hash = generate_password_hash(new_password)

    avatar_file = request.files.get("avatar") if is_multipart else None
    if avatar_file and avatar_file.filename:
        if not _allowed_avatar(avatar_file.filename):
            return jsonify({"error": "Invalid image format. Use PNG, JPG, JPEG, or WEBP."}), 400
        safe_name = secure_filename(avatar_file.filename)
        ext = safe_name.rsplit(".", 1)[-1].lower()
        stored_name = f"avatar_{user.id}_{uuid.uuid4().hex[:12]}.{ext}"
        save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], stored_name)
        avatar_file.save(save_path)
        user.avatar = stored_name

    db.session.commit()
    return jsonify(user.to_dict()), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    response = jsonify({"message": "Logged out"})
    unset_jwt_cookies(response)
    return response, 200


@auth_bp.route("/validate", methods=["GET"])
@login_required
def validate_session():
    return jsonify({"valid": True}), 200


@auth_bp.route("/avatar/<path:filename>", methods=["GET"])
def serve_avatar(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

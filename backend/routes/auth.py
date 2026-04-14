from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import create_access_token, set_access_cookies, unset_jwt_cookies
from werkzeug.security import generate_password_hash, check_password_hash
from database import db, User
from services.auth import login_required, get_current_user_id
from sqlalchemy import or_
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

auth_bp = Blueprint("auth", __name__)


def _normalize_phone(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit() or ch == "+").strip()


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
    data = request.get_json()
    user.name = data.get("name", user.name)
    user.phone = data.get("phone", user.phone)
    user.address = data.get("address", user.address)
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

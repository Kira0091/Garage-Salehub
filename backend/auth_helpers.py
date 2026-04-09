from functools import wraps
from flask import jsonify, session
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request


def get_current_user_id(optional=False):
    user_id = session.get("user_id")
    if user_id is not None:
        return int(user_id)

    try:
        verify_jwt_in_request(optional=optional)
    except Exception:
        if optional:
            return None
        return None

    identity = get_jwt_identity()
    if identity is None:
        return None if optional else None
    return int(identity)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_current_user_id(optional=True)
        if user_id is None:
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)

    return wrapper

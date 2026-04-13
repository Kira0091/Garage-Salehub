from flask import Blueprint, jsonify, request
from database import db, LoyaltyLog
from services.auth import login_required, get_current_user_id
from utils.loyalty import get_or_create_loyalty_wallet, redeem_loyalty_points


loyalty_bp = Blueprint("loyalty", __name__)


@loyalty_bp.route("/", methods=["GET"])
@login_required
def get_loyalty():
    user_id = get_current_user_id()
    wallet = get_or_create_loyalty_wallet(user_id)
    logs = LoyaltyLog.query.filter_by(user_id=user_id).order_by(LoyaltyLog.created_at.desc()).all()
    return jsonify({
        "points": wallet.points or 0,
        "total_earned": wallet.total_earned or 0,
        "log": [entry.to_dict() for entry in logs],
    }), 200


@loyalty_bp.route("/redeem", methods=["POST"])
@login_required
def redeem_points():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    points = int(data.get("points", 0))
    try:
        wallet = redeem_loyalty_points(user_id, points)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db.session.commit()
    return jsonify({
        "discount": float(points),
        "remaining_points": wallet.points or 0,
    }), 200

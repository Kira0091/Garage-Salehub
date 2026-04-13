from flask import Blueprint, jsonify
from database import db, Notification
from services.auth import login_required, get_current_user_id

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@login_required
def get_notifications():
    user_id = get_current_user_id()
    notes = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notes]), 200


@notifications_bp.route("/<int:note_id>/read", methods=["PUT"])
@login_required
def mark_read(note_id):
    user_id = get_current_user_id()
    note = Notification.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Not found"}), 404
    note.is_read = True
    db.session.commit()
    return jsonify(note.to_dict()), 200


@notifications_bp.route("/read-all", methods=["PUT"])
@login_required
def mark_all_read():
    user_id = get_current_user_id()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200

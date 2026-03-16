from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    notes = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notes]), 200


@notifications_bp.route("/<int:note_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(note_id):
    user_id = int(get_jwt_identity())
    note = Notification.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Not found"}), 404
    note.is_read = True
    db.session.commit()
    return jsonify(note.to_dict()), 200


@notifications_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200

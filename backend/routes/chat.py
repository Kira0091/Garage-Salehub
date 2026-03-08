from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Message, User

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/", methods=["POST"])
@jwt_required()
def send_message():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    msg = Message(
        sender_id=user_id,
        receiver_id=data["receiver_id"],
        product_id=data.get("product_id"),
        content=data["content"],
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201


@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())
    sent = db.session.query(Message.receiver_id).filter_by(sender_id=user_id).distinct()
    received = db.session.query(Message.sender_id).filter_by(receiver_id=user_id).distinct()
    partner_ids = set([r[0] for r in sent] + [r[0] for r in received])

    conversations = []
    for pid in partner_ids:
        partner = User.query.get(pid)
        last_msg = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == pid)) |
            ((Message.sender_id == pid) & (Message.receiver_id == user_id))
        ).order_by(Message.created_at.desc()).first()
        unread = Message.query.filter_by(sender_id=pid, receiver_id=user_id, is_read=False).count()
        conversations.append({
            "partner": partner.to_dict() if partner else None,
            "last_message": last_msg.to_dict() if last_msg else None,
            "unread_count": unread,
        })

    conversations.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else "", reverse=True)
    return jsonify(conversations), 200


@chat_bp.route("/<int:partner_id>", methods=["GET"])
@jwt_required()
def get_messages(partner_id):
    user_id = int(get_jwt_identity())
    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == partner_id)) |
        ((Message.sender_id == partner_id) & (Message.receiver_id == user_id))
    ).order_by(Message.created_at.asc()).all()

    # Mark as read
    Message.query.filter_by(sender_id=partner_id, receiver_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()

    return jsonify([m.to_dict() for m in messages]), 200

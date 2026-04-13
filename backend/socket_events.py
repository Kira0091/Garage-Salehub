from flask_socketio import join_room
from database import db, Message, Notification, User


def _room_name(user_id):
    return f"user_{int(user_id)}"


def _is_allowed_chat(sender_id, receiver_id):
    sender = User.query.get(sender_id)
    receiver = User.query.get(receiver_id)
    if not sender or not receiver:
        return False
    sender_admin = str(sender.role).strip().lower() == "admin"
    receiver_admin = str(receiver.role).strip().lower() == "admin"
    return sender_admin != receiver_admin


def _unread_count(user_id):
    return Message.query.filter_by(receiver_id=user_id, is_read=False).count()


def register_socket_handlers(socketio):
    @socketio.on("join")
    def handle_join(data):
        user_id = int((data or {}).get("user_id") or 0)
        if user_id <= 0:
            return
        join_room(_room_name(user_id))
        socketio.emit("unread_update", {"user_id": user_id, "count": _unread_count(user_id)}, room=_room_name(user_id))

    @socketio.on("send_message")
    def handle_send_message(data):
        payload = data or {}
        sender_id = int(payload.get("from_user_id") or 0)
        receiver_id = int(payload.get("to_user_id") or 0)
        content = str(payload.get("content") or "").strip()
        if sender_id <= 0 or receiver_id <= 0 or not content:
            return
        if not _is_allowed_chat(sender_id, receiver_id):
            return

        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type="chat",
            is_read=False,
        )
        db.session.add(message)
        db.session.add(
            Notification(
                user_id=receiver_id,
                type="message",
                title="New Message",
                body="You received a new message.",
                link="/chat",
            )
        )
        db.session.commit()

        serialized = message.to_dict()
        socketio.emit("new_message", serialized, room=_room_name(sender_id))
        socketio.emit("new_message", serialized, room=_room_name(receiver_id))
        socketio.emit("unread_update", {"user_id": receiver_id, "count": _unread_count(receiver_id)}, room=_room_name(receiver_id))

    @socketio.on("mark_read")
    def handle_mark_read(data):
        payload = data or {}
        reader_id = int(payload.get("reader_id") or 0)
        partner_id = int(payload.get("partner_id") or 0)
        if reader_id <= 0 or partner_id <= 0:
            return
        Message.query.filter_by(sender_id=partner_id, receiver_id=reader_id, is_read=False).update({"is_read": True})
        db.session.commit()
        socketio.emit("unread_update", {"user_id": reader_id, "count": _unread_count(reader_id)}, room=_room_name(reader_id))

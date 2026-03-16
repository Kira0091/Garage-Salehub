from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database import db, Message, User, Product
import os, uuid

chat_bp = Blueprint("chat", __name__)

ALLOWED = {"png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "avi", "webm"}

def allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED

def get_admin():
    return User.query.filter_by(role="admin").first()

def get_receiver(sender, data):
    if sender.role == "admin":
        rid = data.get("receiver_id")
        if not rid:
            return None, "receiver_id required"
        r = User.query.get(rid)
        if not r or r.role == "admin":
            return None, "Receiver must be a seller"
        return r, None
    else:
        admin = get_admin()
        if not admin:
            return None, "No admin available"
        return admin, None


@chat_bp.route("/", methods=["POST"])
@jwt_required()
def send_message():
    user_id = int(get_jwt_identity())
    sender = User.query.get(user_id)

    # Support both multipart (with files) and JSON
    is_multipart = request.content_type and "multipart" in request.content_type
    data = request.form if is_multipart else (request.get_json() or {})

    receiver, err = get_receiver(sender, data)
    if err:
        return jsonify({"error": err}), 400

    msg_type = data.get("message_type", "chat")  # chat | item_submission | price_* | photo_request (admin asks for video/photo proof)
    proposed_price = data.get("proposed_price")
    product_id = data.get("product_id")
    content = data.get("content", "")

    # Handle file uploads (photos/videos)
    attachments = []
    if is_multipart:
        files = request.files.getlist("files")
        for f in files:
            if f and allowed(f.filename):
                ext = f.filename.rsplit(".", 1)[1].lower()
                fname = f"{uuid.uuid4().hex}.{ext}"
                f.save(os.path.join(current_app.config["UPLOAD_FOLDER"], fname))
                attachments.append(fname)

    # Handle item_submission type â€” create a pending Product draft
    if msg_type == "item_submission":
        import json
        item_data = json.loads(data.get("item_data", "{}"))
        product = Product(
            title=item_data.get("title", "Untitled"),
            description=item_data.get("description", ""),
            condition=item_data.get("condition", "Good"),
            price=float(item_data.get("price", 0)),
            quantity=int(item_data.get("quantity", 1)),
            stock=int(item_data.get("quantity", 1)),
            category_id=int(item_data["category_id"]) if item_data.get("category_id") else None,
            images=",".join(attachments),
            seller_id=user_id,
            status="pending",
        )
        db.session.add(product)
        db.session.flush()
        product_id = product.id
        content = content or f"New item submitted for review: {product.title}"

    # price_accepted â†’ lock negotiated price
    if msg_type == "price_accepted" and product_id:
        product = Product.query.get(int(product_id))
        if product and product.seller_id == user_id:
            last = Message.query.filter_by(
                product_id=int(product_id), message_type="price_proposal", receiver_id=user_id
            ).order_by(Message.created_at.desc()).first()
            if last and last.proposed_price:
                product.negotiated_price = last.proposed_price
                db.session.flush()

    # price_proposal â†’ save proposed price on product
    if msg_type == "price_proposal" and proposed_price and product_id:
        product = Product.query.get(int(product_id))
        if product:
            product.negotiated_price = float(proposed_price)
            db.session.flush()

    # seller counter proposal
    if msg_type == "price_counter" and proposed_price and product_id:
        product = Product.query.get(int(product_id))
        if product and product.seller_id == user_id:
            product.negotiated_price = float(proposed_price)
            db.session.flush()

    msg = Message(
        sender_id=user_id,
        receiver_id=receiver.id,
        product_id=int(product_id) if product_id else None,
        content=content,
        message_type=msg_type,
        proposed_price=float(proposed_price) if proposed_price else None,
        attachments=",".join(attachments),
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201


@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role == "admin":
        sent_to = db.session.query(Message.receiver_id).filter_by(sender_id=user_id).distinct()
        received_from = db.session.query(Message.sender_id).filter_by(receiver_id=user_id).distinct()
        ids = set([r[0] for r in sent_to] + [r[0] for r in received_from])
        ids = {i for i in ids if User.query.get(i) and User.query.get(i).role != "admin"}
        convs = []
        for sid in ids:
            seller = User.query.get(sid)
            last = Message.query.filter(
                ((Message.sender_id == user_id) & (Message.receiver_id == sid)) |
                ((Message.sender_id == sid) & (Message.receiver_id == user_id))
            ).order_by(Message.created_at.desc()).first()
            unread = Message.query.filter_by(sender_id=sid, receiver_id=user_id, is_read=False).count()
            convs.append({"partner": seller.to_dict(), "last_message": last.to_dict() if last else None, "unread_count": unread})
        convs.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else "", reverse=True)
        return jsonify(convs), 200
    else:
        admin = get_admin()
        if not admin:
            return jsonify([]), 200
        last = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == admin.id)) |
            ((Message.sender_id == admin.id) & (Message.receiver_id == user_id))
        ).order_by(Message.created_at.desc()).first()
        unread = Message.query.filter_by(sender_id=admin.id, receiver_id=user_id, is_read=False).count()
        return jsonify([{"partner": admin.to_dict(), "last_message": last.to_dict() if last else None, "unread_count": unread}]), 200


@chat_bp.route("/<int:partner_id>", methods=["GET"])
@jwt_required()
def get_messages(partner_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != "admin":
        admin = get_admin()
        if not admin or partner_id != admin.id:
            return jsonify({"error": "You can only chat with admin"}), 403
    msgs = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == partner_id)) |
        ((Message.sender_id == partner_id) & (Message.receiver_id == user_id))
    ).order_by(Message.created_at.asc()).all()
    Message.query.filter_by(sender_id=partner_id, receiver_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify([m.to_dict() for m in msgs]), 200


@chat_bp.route("/admin-id", methods=["GET"])
@jwt_required()
def get_admin_id():
    admin = get_admin()
    if not admin:
        return jsonify({"error": "No admin found"}), 404
    return jsonify({"admin_id": admin.id, "admin_name": admin.name}), 200


@chat_bp.route("/attachments/<filename>")
def serve_attachment(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

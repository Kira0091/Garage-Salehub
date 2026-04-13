from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="user")  # user | admin
    avatar = db.Column(db.String(200), default="")
    address = db.Column(db.String(300), default="")
    phone = db.Column(db.String(30), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    products = db.relationship("Product", backref="seller", lazy=True)
    orders = db.relationship("Order", backref="buyer", lazy=True)
    messages_sent = db.relationship("Message", foreign_keys="Message.sender_id", backref="sender", lazy=True)
    reviews_received = db.relationship("Review", foreign_keys="Review.seller_id", backref="seller", lazy=True)
    reviews_given = db.relationship("Review", foreign_keys="Review.buyer_id", backref="buyer", lazy=True)
    wishlists = db.relationship("Wishlist", backref="user", lazy=True)
    notifications = db.relationship("Notification", backref="user", lazy=True)
    reports = db.relationship("Report", backref="user", lazy=True)
    product_comments = db.relationship("ProductComment", backref="user", lazy=True)

    def to_dict(self):
        rating_count = len(self.reviews_received)
        avg_rating = (
            sum([r.rating for r in self.reviews_received]) / rating_count if rating_count > 0 else None
        )
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "avatar": self.avatar,
            "address": self.address,
            "phone": self.phone,
            "created_at": self.created_at.isoformat(),
            "product_count": len(self.products),
            "rating_avg": round(avg_rating, 2) if avg_rating is not None else None,
            "rating_count": rating_count,
        }


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(50), default="📦")
    products = db.relationship("Product", backref="category", lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "icon": self.icon}


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    condition = db.Column(db.String(50), default="Good")  # Like New | Good | Fair
    price = db.Column(db.Float, nullable=False)
    negotiated_price = db.Column(db.Float, nullable=True)
    quantity = db.Column(db.Integer, default=1)
    stock = db.Column(db.Integer, default=1)
    images = db.Column(db.Text, default="")  # comma-separated filenames
    status = db.Column(db.String(30), default="pending")  # pending | approved | rejected | sold | inventory
    verification_status = db.Column(db.String(30), default="pending_verification")  # pending_verification | approved | rejected
    rejection_reason = db.Column(db.String(300), default="")
    location = db.Column(db.String(200), default="")
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.String(250), default="")
    city = db.Column(db.String(120), default="")
    country = db.Column(db.String(120), default="")
    view_count = db.Column(db.Integer, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    order_items = db.relationship("OrderItem", backref="product", lazy=True)
    reviews = db.relationship("Review", backref="product", lazy=True)
    wishlists = db.relationship("Wishlist", backref="product", lazy=True)
    verification_media = db.relationship(
        "ProductVerificationMedia",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan",
    )
    comments = db.relationship("ProductComment", backref="product", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        photo_media = [m.file_url for m in self.verification_media if m.media_type == "photo"]
        video_media = [m.file_url for m in self.verification_media if m.media_type == "video"]
        location_parts = [part for part in [self.address, self.city, self.country] if part]
        display_location = self.location or ", ".join(location_parts)
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "condition": self.condition,
            "price": self.price,
            "negotiated_price": self.negotiated_price,
            "quantity": self.quantity,
            "stock": self.stock,
            "images": self.images.split(",") if self.images else [],
            "status": self.status,
            "verification_status": self.verification_status,
            "rejection_reason": self.rejection_reason,
            "location": display_location,
            "location_meta": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "address": self.address,
                "city": self.city,
                "country": self.country,
            },
            "view_count": self.view_count,
            "category": self.category.to_dict() if self.category else None,
            "seller": {
                "id": self.seller.id,
                "name": self.seller.name,
                "rating_avg": self.seller.to_dict().get("rating_avg"),
                "rating_count": self.seller.to_dict().get("rating_count"),
            },
            "created_at": self.created_at.isoformat(),
            "verification_media": {
                "photos": photo_media,
                "video": video_media[0] if video_media else None,
            },
        }


class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default="pending")  # pending | processing | shipped | delivered | cancelled
    payment_method = db.Column(db.String(50), default="cod")
    payment_status = db.Column(db.String(30), default="pending")  # pending | paid | refunded
    delivery_address = db.Column(db.String(300), default="")
    tracking_number = db.Column(db.String(100), default="")
    notes = db.Column(db.Text, default="")
    voucher_code = db.Column(db.String(50), nullable=True)
    discount_amount = db.Column(db.Float, default=0.0)
    points_used = db.Column(db.Integer, default=0)
    points_earned = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = db.relationship("OrderItem", backref="order", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "buyer": {"id": self.buyer.id, "name": self.buyer.name},
            "total_amount": self.total_amount,
            "status": self.status,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "delivery_address": self.delivery_address,
            "tracking_number": self.tracking_number,
            "notes": self.notes,
            "voucher_code": self.voucher_code,
            "discount_amount": self.discount_amount or 0,
            "points_used": self.points_used or 0,
            "points_earned": self.points_earned or 0,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat(),
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "product": self.product.to_dict() if self.product else None,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": self.quantity * self.unit_price,
        }


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    # message_type: chat | item_submission | price_proposal | price_counter | price_accepted | price_rejected | photo_request
    message_type = db.Column(db.String(30), default="chat")
    proposed_price = db.Column(db.Float, nullable=True)
    attachments = db.Column(db.Text, default="")  # comma-separated filenames (images/videos)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.name,
            "sender_role": self.sender.role,
            "receiver_id": self.receiver_id,
            "product_id": self.product_id,
            "content": self.content,
            "message_type": self.message_type,
            "proposed_price": self.proposed_price,
            "attachments": self.attachments.split(",") if self.attachments else [],
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }


class Review(db.Model):
    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
            "buyer_name": self.buyer.name if self.buyer else None,
        }


class ProductComment(db.Model):
    __tablename__ = "product_comments"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "text": self.text,
            "created_at": self.created_at.isoformat(),
            "username": self.user.name if self.user else "User",
        }


class Wishlist(db.Model):
    __tablename__ = "wishlists"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    target_price = db.Column(db.Float, nullable=True)
    last_seen_price = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product": self.product.to_dict() if self.product else None,
            "target_price": self.target_price,
            "last_seen_price": self.last_seen_price,
            "created_at": self.created_at.isoformat(),
        }


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(50), default="info")
    title = db.Column(db.String(150), default="")
    body = db.Column(db.Text, default="")
    link = db.Column(db.String(200), default="")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "link": self.link,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }


class ProductVerificationMedia(db.Model):
    __tablename__ = "product_verification_media"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    media_type = db.Column(db.String(20), nullable=False)  # photo | video
    file_url = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "media_type": self.media_type,
            "file_url": self.file_url,
            "uploaded_at": self.uploaded_at.isoformat(),
        }


class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, default="")
    type = db.Column(db.String(30), default="other")  # bug | feature_request | other
    screenshot = db.Column(db.String(500), default="")
    status = db.Column(db.String(30), default="pending")  # pending | resolved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "User",
            "title": self.title,
            "description": self.description,
            "type": self.type,
            "screenshot": self.screenshot,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Voucher(db.Model):
    __tablename__ = "vouchers"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # percent | fixed
    value = db.Column(db.Float, nullable=False)
    min_order = db.Column(db.Float, default=0.0)
    max_uses = db.Column(db.Integer, default=1)
    used_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        now = datetime.utcnow()
        expired = bool(self.expires_at and self.expires_at < now)
        depleted = (self.used_count or 0) >= (self.max_uses or 0)
        status = "active"
        if not self.is_active:
            status = "inactive"
        elif expired:
            status = "expired"
        elif depleted:
            status = "depleted"
        return {
            "id": self.id,
            "code": self.code,
            "type": self.type,
            "value": self.value,
            "min_order": self.min_order or 0,
            "max_uses": self.max_uses or 0,
            "used_count": self.used_count or 0,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": bool(self.is_active),
            "status": status,
            "created_at": self.created_at.isoformat(),
        }


class VoucherUsage(db.Model):
    __tablename__ = "voucher_usage"
    id = db.Column(db.Integer, primary_key=True)
    voucher_id = db.Column(db.Integer, db.ForeignKey("vouchers.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    used_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "voucher_id": self.voucher_id,
            "user_id": self.user_id,
            "order_id": self.order_id,
            "used_at": self.used_at.isoformat(),
        }


class LoyaltyPoints(db.Model):
    __tablename__ = "loyalty_points"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    points = db.Column(db.Integer, default=0)
    total_earned = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "points": self.points or 0,
            "total_earned": self.total_earned or 0,
            "updated_at": self.updated_at.isoformat(),
        }


class LoyaltyLog(db.Model):
    __tablename__ = "loyalty_log"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    points = db.Column(db.Integer, nullable=False)  # positive earned, negative spent
    reason = db.Column(db.String(100), nullable=False)  # purchase | review | referral | redeemed
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "points": self.points,
            "reason": self.reason,
            "order_id": self.order_id,
            "created_at": self.created_at.isoformat(),
        }

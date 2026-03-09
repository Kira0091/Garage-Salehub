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

    def to_dict(self):
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
    status = db.Column(db.String(30), default="pending")  # pending | approved | rejected | sold
    rejection_reason = db.Column(db.String(300), default="")
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    order_items = db.relationship("OrderItem", backref="product", lazy=True)

    def to_dict(self):
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
            "rejection_reason": self.rejection_reason,
            "category": self.category.to_dict() if self.category else None,
            "seller": {"id": self.seller.id, "name": self.seller.name},
            "created_at": self.created_at.isoformat(),
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

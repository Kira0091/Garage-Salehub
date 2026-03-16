from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Order, OrderItem, Product, User, Notification
import random, string

orders_bp = Blueprint("orders", __name__)

def generate_tracking():
    return "GSH-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


@orders_bp.route("/", methods=["POST"])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    items_data = data.get("items", [])
    if not items_data:
        return jsonify({"error": "No items provided"}), 400

    total = 0
    order_items = []
    for item in items_data:
        product = Product.query.get(item["product_id"])
        if not product or product.status != "approved":
            return jsonify({"error": f"Product {item['product_id']} not available"}), 400
        if product.stock < item["quantity"]:
            return jsonify({"error": f"Insufficient stock for {product.title}"}), 400
        price = product.negotiated_price or product.price
        total += price * item["quantity"]
        order_items.append({"product": product, "quantity": item["quantity"], "price": price})

    order = Order(
        buyer_id=user_id,
        total_amount=total,
        payment_method=data.get("payment_method", "cod"),
        delivery_address=data.get("delivery_address", ""),
        notes=data.get("notes", ""),
        status="pending",
        payment_status="pending",
        tracking_number=generate_tracking(),
    )
    db.session.add(order)
    db.session.flush()

    for item in order_items:
        oi = OrderItem(
            order_id=order.id,
            product_id=item["product"].id,
            quantity=item["quantity"],
            unit_price=item["price"],
        )
        item["product"].stock -= item["quantity"]
        if item["product"].stock == 0:
            item["product"].status = "sold"
        db.session.add(oi)

    db.session.commit()
    # Notifications
    db.session.add(Notification(
        user_id=user_id,
        type="order",
        title="Order Placed",
        body=f"Your order #{order.id} has been placed.",
        link=f"/orders",
    ))
    seller_ids = {item["product"].seller_id for item in order_items}
    for sid in seller_ids:
        db.session.add(Notification(
            user_id=sid,
            type="order",
            title="New Order",
            body="You received a new order.",
            link="/orders",
        ))
    db.session.commit()
    return jsonify(order.to_dict()), 201


@orders_bp.route("/", methods=["GET"])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == "admin":
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(buyer_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200


@orders_bp.route("/<int:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)
    user = User.query.get(user_id)
    if order.buyer_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(order.to_dict()), 200


@orders_bp.route("/<int:order_id>/pay", methods=["POST"])
@jwt_required()
def simulate_payment(order_id):
    """Simulate payment processing"""
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    payment_method = data.get("payment_method", order.payment_method)

    # Simulate payment processing
    order.payment_status = "paid"
    order.payment_method = payment_method
    order.status = "processing"
    db.session.commit()

    return jsonify({
        "message": "Payment successful (simulated)",
        "transaction_id": "TXN-" + "".join(random.choices(string.digits, k=12)),
        "order": order.to_dict(),
    }), 200


@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_order_status(order_id):
    """Admin updates delivery status"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != "admin":
        return jsonify({"error": "Admin only"}), 403

    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    new_status = data.get("status")

    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    order.status = new_status
    if new_status == "cancelled":
        # Restore stock
        for item in order.items:
            item.product.stock += item.quantity
            if item.product.status == "sold":
                item.product.status = "approved"
        order.payment_status = "refunded" if order.payment_status == "paid" else "pending"

    db.session.commit()
    db.session.add(Notification(
        user_id=order.buyer_id,
        type="order_status",
        title="Order Status Update",
        body=f"Your order #{order.id} is now {order.status}.",
        link="/orders",
    ))
    db.session.commit()
    return jsonify(order.to_dict()), 200


@orders_bp.route("/<int:order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    if order.status not in ["pending", "processing"]:
        return jsonify({"error": "Cannot cancel order at this stage"}), 400

    order.status = "cancelled"
    order.payment_status = "refunded" if order.payment_status == "paid" else "pending"
    for item in order.items:
        item.product.stock += item.quantity
        if item.product.status == "sold":
            item.product.status = "approved"
    db.session.commit()
    db.session.add(Notification(
        user_id=order.buyer_id,
        type="order",
        title="Order Cancelled",
        body=f"Your order #{order.id} has been cancelled.",
        link="/orders",
    ))
    db.session.commit()
    return jsonify(order.to_dict()), 200

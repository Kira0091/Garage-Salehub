from flask import Blueprint, request, jsonify
from sqlalchemy import and_
from database import db, Order, OrderItem, Product, User, VoucherUsage, Voucher, LoyaltyLog
from services.auth import login_required, get_current_user_id
from routes.vouchers import validate_voucher_logic
from utils.notifications import create_notification
from utils.loyalty import add_loyalty_points, get_or_create_loyalty_wallet
from utils.retention import check_retention_triggers, apply_first_purchase_bonus_if_needed
import random
import string

orders_bp = Blueprint("orders", __name__)


def generate_tracking():
    return "GSH-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


@orders_bp.route("/", methods=["POST"])
@login_required
def create_order():
    user_id = get_current_user_id()
    data = request.get_json() or {}

    items_data = data.get("items", [])
    if not items_data:
        return jsonify({"error": "No items provided"}), 400

    subtotal = 0.0
    order_items = []
    for item in items_data:
        product = Product.query.get(item["product_id"])
        if not product or product.status != "approved":
            return jsonify({"error": f"Product {item['product_id']} not available"}), 400
        if product.stock < item["quantity"]:
            return jsonify({"error": f"Insufficient stock for {product.title}"}), 400
        price = float(product.negotiated_price or product.price)
        subtotal += price * int(item["quantity"])
        order_items.append({"product": product, "quantity": int(item["quantity"]), "price": price})

    voucher_code = (data.get("voucher_code") or "").strip().upper() or None
    requested_points_used = int(data.get("points_used", 0) or 0)

    voucher = None
    voucher_discount = 0.0
    if voucher_code:
        valid, error, voucher, discount = validate_voucher_logic(voucher_code, subtotal, user_id)
        if not valid:
            return jsonify({"error": error}), 400
        voucher_discount = float(discount)

    total_after_voucher = max(0.0, round(subtotal - voucher_discount, 2))
    wallet = get_or_create_loyalty_wallet(user_id)
    points_to_use = max(0, requested_points_used)
    if points_to_use > (wallet.points or 0):
        return jsonify({"error": "Insufficient loyalty points"}), 400
    points_discount = min(float(points_to_use), total_after_voucher)
    final_total = max(0.0, round(total_after_voucher - points_discount, 2))

    order = Order(
        buyer_id=user_id,
        total_amount=final_total,
        payment_method=data.get("payment_method", "cod"),
        delivery_address=data.get("delivery_address", ""),
        notes=data.get("notes", ""),
        status="pending",
        payment_status="pending",
        tracking_number=generate_tracking(),
        voucher_code=voucher.code if voucher else None,
        discount_amount=round(voucher_discount + points_discount, 2),
        points_used=int(points_to_use),
        points_earned=0,
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

    if voucher:
        voucher.used_count = (voucher.used_count or 0) + 1
        db.session.add(
            VoucherUsage(
                voucher_id=voucher.id,
                user_id=user_id,
                order_id=order.id,
            )
        )
        create_notification(
            user_id,
            "voucher",
            "Voucher Applied",
            f"Voucher applied! You saved PHP {voucher_discount:,.2f}.",
            "/orders",
        )

    if points_to_use > 0:
        wallet.points = (wallet.points or 0) - int(points_to_use)
        db.session.add(wallet)
        from database import LoyaltyLog
        db.session.add(
            LoyaltyLog(
                user_id=user_id,
                points=-int(points_to_use),
                reason="redeemed",
                order_id=order.id,
            )
        )

    create_notification(
        user_id,
        "order",
        "Order Placed",
        f"Your order #{order.id} has been placed.",
        "/orders",
    )

    seller_ids = {item["product"].seller_id for item in order_items}
    for seller_id in seller_ids:
        create_notification(
            seller_id,
            "order",
            "New Order",
            "You received a new order.",
            "/orders",
        )

    db.session.commit()
    return jsonify(order.to_dict()), 201


@orders_bp.route("/", methods=["GET"])
@login_required
def get_orders():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if user.role == "admin":
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(buyer_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders]), 200


@orders_bp.route("/<int:order_id>", methods=["GET"])
@login_required
def get_order(order_id):
    user_id = get_current_user_id()
    order = Order.query.get_or_404(order_id)
    user = User.query.get(user_id)
    if order.buyer_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(order.to_dict()), 200


@orders_bp.route("/<int:order_id>/pay", methods=["POST"])
@login_required
def simulate_payment(order_id):
    user_id = get_current_user_id()
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    order.payment_status = "paid"
    order.payment_method = data.get("payment_method", order.payment_method)
    order.status = "processing"
    db.session.commit()

    return jsonify({
        "message": "Payment successful (simulated)",
        "transaction_id": "TXN-" + "".join(random.choices(string.digits, k=12)),
        "order": order.to_dict(),
    }), 200


@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@login_required
def update_order_status(order_id):
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if user.role != "admin":
        return jsonify({"error": "Admin only"}), 403

    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    new_status = data.get("status")
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    order.status = new_status
    message_body = f"Your order #{order.id} status is now {new_status}."
    if new_status == "processing":
        message_body = "Your order is being prepared."
    elif new_status == "shipped":
        message_body = "Your order is on its way!"
    elif new_status == "delivered":
        message_body = "Your order has been delivered. Leave a review!"
        # +1 point per PHP10 spent (floor)
        earned = int((order.total_amount or 0) // 10)
        already_awarded = LoyaltyLog.query.filter_by(
            user_id=order.buyer_id,
            reason="purchase",
            order_id=order.id,
        ).first()
        if earned > 0 and not already_awarded:
            add_loyalty_points(
                order.buyer_id,
                earned,
                reason="purchase",
                order_id=order.id,
                notify_title="Points Earned",
                notify_body=f"You earned {earned} points from your delivered order.",
            )
            order.points_earned = earned
        apply_first_purchase_bonus_if_needed(order.buyer_id, order.id)
        check_retention_triggers(order.buyer_id)
    elif new_status == "cancelled":
        message_body = "Your order has been cancelled."
        for item in order.items:
            item.product.stock += item.quantity
            if item.product.status == "sold":
                item.product.status = "approved"
        order.payment_status = "refunded" if order.payment_status == "paid" else "pending"

    create_notification(
        order.buyer_id,
        "order_status",
        "Order Status Update",
        message_body,
        "/orders",
    )
    db.session.commit()
    return jsonify(order.to_dict()), 200


@orders_bp.route("/<int:order_id>/cancel", methods=["POST"])
@login_required
def cancel_order(order_id):
    user_id = get_current_user_id()
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
    create_notification(
        user_id,
        "order",
        "Order Cancelled",
        f"Your order #{order.id} has been cancelled.",
        "/orders",
    )
    db.session.commit()
    return jsonify(order.to_dict()), 200

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Product, User, Order, Category

admin_bp = Blueprint("admin", __name__)

def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or str(user.role).strip().lower() != "admin":
        return None, jsonify({"error": "Admin access required"}), 403
    return user, None, None


@admin_bp.route("/products/pending", methods=["GET"])
@jwt_required()
def pending_products():
    _, err, status = require_admin()
    if err:
        return err, status
    products = Product.query.filter_by(status="pending").order_by(Product.created_at.asc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@admin_bp.route("/products/<int:product_id>/approve", methods=["POST"])
@jwt_required()
def approve_product(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    product.status = "approved"
    product.negotiated_price = data.get("negotiated_price", product.negotiated_price)
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/products/<int:product_id>/reject", methods=["POST"])
@jwt_required()
def reject_product(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    product.status = "rejected"
    product.rejection_reason = data.get("reason", "Item did not meet quality standards")
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    _, err, status = require_admin()
    if err:
        return err, status

    total_users = User.query.filter_by(role="user").count()
    total_products = Product.query.count()
    pending_products = Product.query.filter_by(status="pending").count()
    approved_products = Product.query.filter_by(status="approved").count()
    total_orders = Order.query.count()
    total_revenue = db.session.query(db.func.sum(Order.total_amount)).filter(
        Order.payment_status == "paid"
    ).scalar() or 0

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    recent_products = Product.query.filter_by(status="pending").order_by(Product.created_at.asc()).limit(5).all()

    return jsonify({
        "stats": {
            "total_users": total_users,
            "total_products": total_products,
            "pending_products": pending_products,
            "approved_products": approved_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
        },
        "recent_orders": [o.to_dict() for o in recent_orders],
        "pending_products": [p.to_dict() for p in recent_products],
    }), 200


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    _, err, status = require_admin()
    if err:
        return err, status
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

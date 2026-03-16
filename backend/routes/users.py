from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, User, Product, OrderItem, Order, Wishlist
from sqlalchemy import func

users_bp = Blueprint("users", __name__)


@users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200


@users_bp.route("/me/analytics", methods=["GET"])
@jwt_required()
def my_analytics():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Seller analytics
    total_listings = Product.query.filter_by(seller_id=user_id).count()
    pending = Product.query.filter_by(seller_id=user_id, status="pending").count()
    approved = Product.query.filter_by(seller_id=user_id, status="approved").count()
    sold = Product.query.filter_by(seller_id=user_id, status="sold").count()
    total_views = db.session.query(func.sum(Product.view_count)).filter_by(seller_id=user_id).scalar() or 0

    # Revenue from delivered or paid orders
    revenue = db.session.query(func.sum(OrderItem.unit_price * OrderItem.quantity)).join(Order).join(Product).filter(
        Product.seller_id == user_id,
        Order.payment_status == "paid"
    ).scalar() or 0

    orders_count = db.session.query(func.count(OrderItem.id)).join(Product).filter(
        Product.seller_id == user_id
    ).scalar() or 0

    avg_price = db.session.query(func.avg(OrderItem.unit_price)).join(Product).filter(
        Product.seller_id == user_id
    ).scalar()

    wishlist_count = db.session.query(func.count(Wishlist.id)).join(Product).filter(
        Product.seller_id == user_id
    ).scalar() or 0

    return jsonify({
        "stats": {
            "total_listings": total_listings,
            "pending": pending,
            "approved": approved,
            "sold": sold,
            "total_views": int(total_views),
            "wishlist_count": wishlist_count,
            "orders_count": int(orders_count),
            "total_revenue": float(revenue),
            "avg_selling_price": float(avg_price) if avg_price is not None else 0,
            "rating_avg": user.to_dict().get("rating_avg"),
            "rating_count": user.to_dict().get("rating_count"),
        }
    }), 200

from flask import Blueprint, request, jsonify
from database import db, Review, Order, Product, User
from services.auth import login_required, get_current_user_id
from utils.notifications import create_notification
from utils.loyalty import add_loyalty_points

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/", methods=["POST"])
@login_required
def create_review():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    order_id = data.get("order_id")
    product_id = data.get("product_id")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not order_id or not product_id or rating is None:
        return jsonify({"error": "order_id, product_id, and rating are required"}), 400

    order = Order.query.get(order_id)
    if not order or order.buyer_id != user_id:
        return jsonify({"error": "Invalid order"}), 400
    if order.status != "delivered":
        return jsonify({"error": "Order must be delivered before reviewing"}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Ensure product is in the order
    product_ids = [item.product_id for item in order.items]
    if product_id not in product_ids:
        return jsonify({"error": "Product not part of this order"}), 400

    # Only one review per order/product
    existing = Review.query.filter_by(order_id=order_id, product_id=product_id, buyer_id=user_id).first()
    if existing:
        return jsonify({"error": "Review already submitted"}), 409

    rating_val = int(rating)
    if rating_val < 1 or rating_val > 5:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    review = Review(
        order_id=order_id,
        product_id=product_id,
        seller_id=product.seller_id,
        buyer_id=user_id,
        rating=rating_val,
        comment=comment.strip(),
    )
    db.session.add(review)
    db.session.commit()

    create_notification(
        product.seller_id,
        "review",
        "New Review Received",
        f"You received a {review.rating}-star review for {product.title}.",
        f"/product/{product.id}",
    )
    add_loyalty_points(
        user_id,
        10,
        reason="review",
        order_id=order_id,
        notify_title="Points Earned",
        notify_body="Thanks for leaving a review! You earned 10 points.",
    )
    db.session.commit()

    return jsonify(review.to_dict()), 201


@reviews_bp.route("/seller/<int:seller_id>", methods=["GET"])
def get_seller_reviews(seller_id):
    reviews = Review.query.filter_by(seller_id=seller_id).order_by(Review.created_at.desc()).all()
    if not reviews:
        return jsonify({"reviews": [], "avg_rating": None, "count": 0}), 200
    avg = sum([r.rating for r in reviews]) / len(reviews)
    return jsonify({
        "reviews": [r.to_dict() for r in reviews],
        "avg_rating": round(avg, 2),
        "count": len(reviews),
    }), 200


@reviews_bp.route("/<int:product_id>", methods=["GET"])
def get_product_reviews(product_id):
    product = Product.query.get_or_404(product_id)
    reviews = Review.query.filter_by(product_id=product.id).order_by(Review.created_at.desc()).all()
    return jsonify({
        "reviews": [r.to_dict() for r in reviews],
        "count": len(reviews),
    }), 200


@reviews_bp.route("/me", methods=["GET"])
@login_required
def get_my_reviews():
    user_id = get_current_user_id()
    reviews = Review.query.filter_by(seller_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200

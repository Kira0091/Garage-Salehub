from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Review, Order, Product, User, Notification

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/", methods=["POST"])
@jwt_required()
def create_review():
    user_id = int(get_jwt_identity())
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

    db.session.add(Notification(
        user_id=product.seller_id,
        type="review",
        title="New Review Received",
        body=f"You received a {review.rating}-star review for {product.title}.",
        link=f"/product/{product.id}",
    ))
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


@reviews_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_reviews():
    user_id = int(get_jwt_identity())
    reviews = Review.query.filter_by(seller_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200

from flask import Blueprint, request, jsonify
from database import db, Wishlist, Product, Notification
from services.auth import login_required, get_current_user_id

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.route("/", methods=["GET"])
@login_required
def get_wishlist():
    user_id = get_current_user_id()
    items = Wishlist.query.filter_by(user_id=user_id).order_by(Wishlist.created_at.desc()).all()
    return jsonify([w.to_dict() for w in items]), 200


@wishlist_bp.route("/", methods=["POST"])
@login_required
def add_to_wishlist():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    product_id = data.get("product_id")
    target_price = data.get("target_price")
    if not product_id:
        return jsonify({"error": "product_id required"}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    existing = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({"error": "Already in wishlist"}), 409

    w = Wishlist(
        user_id=user_id,
        product_id=product_id,
        target_price=float(target_price) if target_price is not None else None,
        last_seen_price=product.negotiated_price or product.price,
    )
    db.session.add(w)
    db.session.commit()

    db.session.add(Notification(
        user_id=user_id,
        type="wishlist",
        title="Saved to Wishlist",
        body=f"{product.title} has been added to your wishlist.",
        link=f"/product/{product.id}",
    ))
    db.session.commit()

    return jsonify(w.to_dict()), 201


@wishlist_bp.route("/<int:product_id>", methods=["DELETE"])
@login_required
def remove_from_wishlist(product_id):
    user_id = get_current_user_id()
    item = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if not item:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Removed from wishlist"}), 200

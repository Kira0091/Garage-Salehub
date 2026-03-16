from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db, Wishlist, Product, Notification

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.route("/", methods=["GET"])
@jwt_required()
def get_wishlist():
    user_id = int(get_jwt_identity())
    items = Wishlist.query.filter_by(user_id=user_id).order_by(Wishlist.created_at.desc()).all()
    return jsonify([w.to_dict() for w in items]), 200


@wishlist_bp.route("/", methods=["POST"])
@jwt_required()
def add_to_wishlist():
    user_id = int(get_jwt_identity())
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
@jwt_required()
def remove_from_wishlist(product_id):
    user_id = int(get_jwt_identity())
    item = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if not item:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Removed from wishlist"}), 200

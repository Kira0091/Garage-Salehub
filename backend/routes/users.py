from flask import Blueprint, request, jsonify
from database import db, User, Product, OrderItem, Order, Wishlist, UserAddress
from sqlalchemy import func
from services.auth import login_required, get_current_user_id

users_bp = Blueprint("users", __name__)


def _compose_address(payload):
    street = str(payload.get("street_line") or "").strip()
    barangay = str(payload.get("barangay_name") or "").strip()
    municipality = str(payload.get("municipality_name") or "").strip()
    region = str(payload.get("region_name") or "").strip()
    postal = str(payload.get("postal_code") or "").strip()
    left = ", ".join([p for p in [street, barangay, municipality, region, "Philippines"] if p])
    return f"{left} {postal}".strip() if postal else left


def _set_default_address(user_id, address_id):
    UserAddress.query.filter_by(user_id=user_id).update({"is_default": False})
    address = UserAddress.query.filter_by(user_id=user_id, id=address_id).first()
    if address:
        address.is_default = True
        user = User.query.get(user_id)
        if user:
            user.address = address.full_address or _compose_address(address.to_dict())
    return address


@users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200


@users_bp.route("/me/analytics", methods=["GET"])
@login_required
def my_analytics():
    user_id = get_current_user_id()
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


@users_bp.route("/seller-dashboard", methods=["GET"])
@login_required
def seller_dashboard():
    user_id = get_current_user_id()
    total_products = Product.query.filter_by(seller_id=user_id).count()
    approved = Product.query.filter_by(seller_id=user_id, status="approved").count()
    rejected = Product.query.filter_by(seller_id=user_id, status="rejected").count()
    pending = Product.query.filter_by(seller_id=user_id, status="pending").count()
    total_views = db.session.query(func.sum(Product.view_count)).filter_by(seller_id=user_id).scalar() or 0

    earnings = db.session.query(func.sum(OrderItem.unit_price * OrderItem.quantity)).join(Order).join(Product).filter(
        Product.seller_id == user_id,
        Order.status.in_(["processing", "shipped", "delivered"]),
    ).scalar() or 0

    recent_products = Product.query.filter_by(seller_id=user_id).order_by(Product.created_at.desc()).limit(8).all()
    return jsonify({
        "total_products": int(total_products),
        "approved": int(approved),
        "rejected": int(rejected),
        "pending": int(pending),
        "total_views": int(total_views),
        "simulated_earnings": round(float(earnings), 2),
        "recent_products": [p.to_dict() for p in recent_products],
    }), 200


@users_bp.route("/addresses", methods=["GET"])
@login_required
def list_addresses():
    user_id = get_current_user_id()
    rows = UserAddress.query.filter_by(user_id=user_id).order_by(UserAddress.is_default.desc(), UserAddress.created_at.desc()).all()
    return jsonify([row.to_dict() for row in rows]), 200


@users_bp.route("/addresses", methods=["POST"])
@login_required
def create_address():
    user_id = get_current_user_id()
    data = request.get_json() or {}

    required = ["region_code", "region_name", "municipality_code", "municipality_name", "barangay_code", "barangay_name", "street_line"]
    if any(not str(data.get(field) or "").strip() for field in required):
        return jsonify({"error": "Please complete the address fields"}), 400

    full_address = str(data.get("full_address") or "").strip() or _compose_address(data)
    if not full_address:
        return jsonify({"error": "Invalid address"}), 400

    existing_count = UserAddress.query.filter_by(user_id=user_id).count()
    wants_default = bool(data.get("is_default")) or existing_count == 0
    if wants_default:
        UserAddress.query.filter_by(user_id=user_id).update({"is_default": False})

    address = UserAddress(
        user_id=user_id,
        label=str(data.get("label") or "Address").strip() or "Address",
        region_code=str(data.get("region_code") or "").strip(),
        region_name=str(data.get("region_name") or "").strip(),
        municipality_code=str(data.get("municipality_code") or "").strip(),
        municipality_name=str(data.get("municipality_name") or "").strip(),
        barangay_code=str(data.get("barangay_code") or "").strip(),
        barangay_name=str(data.get("barangay_name") or "").strip(),
        postal_code=str(data.get("postal_code") or "").strip(),
        street_line=str(data.get("street_line") or "").strip(),
        full_address=full_address,
        is_default=wants_default,
    )
    db.session.add(address)

    if wants_default:
        user = User.query.get(user_id)
        if user:
            user.address = full_address

    db.session.commit()
    return jsonify(address.to_dict()), 201


@users_bp.route("/addresses/<int:address_id>", methods=["PUT"])
@login_required
def update_address(address_id):
    user_id = get_current_user_id()
    data = request.get_json() or {}
    address = UserAddress.query.filter_by(user_id=user_id, id=address_id).first()
    if not address:
        return jsonify({"error": "Address not found"}), 404

    for field in [
        "label",
        "region_code",
        "region_name",
        "municipality_code",
        "municipality_name",
        "barangay_code",
        "barangay_name",
        "postal_code",
        "street_line",
    ]:
        if field in data:
            setattr(address, field, str(data.get(field) or "").strip())

    address.full_address = str(data.get("full_address") or "").strip() or _compose_address(address.to_dict())
    if not address.full_address:
        return jsonify({"error": "Invalid address"}), 400

    if bool(data.get("is_default")):
        _set_default_address(user_id, address.id)
    elif address.is_default:
        user = User.query.get(user_id)
        if user:
            user.address = address.full_address

    db.session.commit()
    return jsonify(address.to_dict()), 200


@users_bp.route("/addresses/<int:address_id>/use", methods=["PUT"])
@login_required
def use_address(address_id):
    user_id = get_current_user_id()
    address = _set_default_address(user_id, address_id)
    if not address:
        return jsonify({"error": "Address not found"}), 404
    db.session.commit()
    return jsonify(address.to_dict()), 200


@users_bp.route("/addresses/<int:address_id>", methods=["DELETE"])
@login_required
def delete_address(address_id):
    user_id = get_current_user_id()
    address = UserAddress.query.filter_by(user_id=user_id, id=address_id).first()
    if not address:
        return jsonify({"error": "Address not found"}), 404

    deleted_was_default = bool(address.is_default)
    db.session.delete(address)
    db.session.flush()

    if deleted_was_default:
        replacement = UserAddress.query.filter_by(user_id=user_id).order_by(UserAddress.created_at.desc()).first()
        user = User.query.get(user_id)
        if replacement:
            replacement.is_default = True
            if user:
                user.address = replacement.full_address
        elif user:
            user.address = ""

    db.session.commit()
    return jsonify({"message": "Address deleted"}), 200

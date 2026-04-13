from flask import Blueprint, request, jsonify
from database import db, Product, User, Order, Category, Notification, Wishlist, ProductVerificationMedia
from services.auth import login_required, get_current_user_id
from sqlalchemy import or_
from utils.notifications import create_notification
from utils.loyalty import add_loyalty_points
from utils.retention import check_seller_milestone

admin_bp = Blueprint("admin", __name__)

def require_admin():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if not user or str(user.role).strip().lower() != "admin":
        return None, jsonify({"error": "Admin access required"}), 403
    return user, None, None


def _verification_media_payload(product):
    photos = []
    video = None
    media_rows = ProductVerificationMedia.query.filter_by(product_id=product.id).order_by(ProductVerificationMedia.uploaded_at.asc()).all()
    for media in media_rows:
        item = {
            "id": media.id,
            "filename": media.file_url,
            "url": f"/api/products/verification-media/{media.file_url}",
            "uploaded_at": media.uploaded_at.isoformat(),
        }
        if media.media_type == "photo":
            photos.append(item)
        elif media.media_type == "video" and video is None:
            video = item
    return {"photos": photos, "video": video}


def _serialize_pending_verification(product):
    data = product.to_dict()
    data["verification_media"] = _verification_media_payload(product)
    return data


@admin_bp.route("/products/pending", methods=["GET"])
@login_required
def pending_products():
    _, err, status = require_admin()
    if err:
        return err, status
    products = Product.query.filter(
        or_(Product.status == "pending", Product.verification_status == "pending_verification")
    ).order_by(Product.created_at.asc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@admin_bp.route("/pending-verifications", methods=["GET"])
@login_required
def pending_verifications():
    """
    Required endpoint:
    GET /api/admin/pending-verifications
    - Returns all products waiting for verification review.
    - Includes submitted verification photos and video URLs.
    """
    _, err, status = require_admin()
    if err:
        return err, status

    products = (
        Product.query.filter_by(verification_status="pending_verification")
        .order_by(Product.created_at.asc())
        .all()
    )
    return jsonify([_serialize_pending_verification(p) for p in products]), 200


@admin_bp.route("/products/inventory", methods=["GET"])
@login_required
def inventory_products():
    _, err, status = require_admin()
    if err:
        return err, status
    products = Product.query.filter_by(status="inventory").order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@admin_bp.route("/products/<int:product_id>/approve", methods=["POST"])
@login_required
def approve_product(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    product.status = "approved"
    product.verification_status = "approved"
    product.rejection_reason = ""
    product.negotiated_price = data.get("negotiated_price", product.negotiated_price)
    db.session.commit()
    if product.negotiated_price:
        wishers = Wishlist.query.filter_by(product_id=product.id).all()
        for w in wishers:
            last_seen = w.last_seen_price if w.last_seen_price is not None else product.price
            if product.negotiated_price < last_seen and (w.target_price is None or product.negotiated_price <= w.target_price):
                db.session.add(Notification(
                    user_id=w.user_id,
                    type="price_drop",
                    title="Price Drop Alert",
                    body=f"{product.title} dropped to ₱{product.negotiated_price:,.2f}",
                    link=f"/product/{product.id}",
                ))
            w.last_seen_price = product.negotiated_price
        db.session.commit()
    create_notification(
        product.seller_id,
        "approval",
        "Item Approved",
        f"Your item '{product.title}' has been approved.",
        f"/product/{product.id}",
    )
    add_loyalty_points(
        product.seller_id,
        5,
        reason="seller_approval",
        order_id=None,
        notify_title="Points Earned",
        notify_body="Your approved listing earned 5 points.",
    )
    check_seller_milestone(product.seller_id)
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/products/<int:product_id>/release", methods=["POST"])
@login_required
def release_product(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    product.status = "approved"
    db.session.commit()

    create_notification(
        product.seller_id,
        "release",
        "Item Released",
        f"Your item '{product.title}' has been released to the marketplace.",
        f"/product/{product.id}",
    )
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/products/<int:product_id>/to-inventory", methods=["POST"])
@login_required
def move_to_inventory(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    product.status = "inventory"
    db.session.commit()

    create_notification(
        product.seller_id,
        "inventory",
        "Item Moved to Inventory",
        f"Your item '{product.title}' has been moved back to inventory.",
        "/my-products",
    )
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/products/<int:product_id>/reject", methods=["POST"])
@login_required
def reject_product(product_id):
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    product.status = "rejected"
    product.verification_status = "rejected"
    product.rejection_reason = data.get("reason", "Item did not meet quality standards")
    db.session.commit()
    create_notification(
        product.seller_id,
        "rejection",
        "Item Rejected",
        f"Your item '{product.title}' was rejected: {product.rejection_reason}",
        "/my-products",
    )
    db.session.commit()
    return jsonify(product.to_dict()), 200


@admin_bp.route("/verify-product/<int:product_id>", methods=["POST"])
@login_required
def verify_product(product_id):
    """
    Required endpoint:
    POST /api/admin/verify-product/:id
    body: { action: "approve" | "reject", reason?: string }
    - Approve: product becomes visible in marketplace.
    - Reject: product hidden, seller receives rejection reason.
    """
    _, err, status = require_admin()
    if err:
        return err, status

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()
    reason = (data.get("reason") or "").strip()

    if action not in {"approve", "reject"}:
        return jsonify({"error": "Invalid action. Use 'approve' or 'reject'."}), 400

    if action == "approve":
        product.status = "approved"
        product.verification_status = "approved"
        product.rejection_reason = ""
        notice_title = "Verification Approved"
        notice_body = f"Your item '{product.title}' passed verification and is now active."
        notice_type = "approval"
    else:
        product.status = "rejected"
        product.verification_status = "rejected"
        product.rejection_reason = reason or "Verification media did not meet requirements."
        notice_title = "Verification Rejected"
        notice_body = f"Your item '{product.title}' was rejected: {product.rejection_reason}"
        notice_type = "rejection"

    db.session.commit()

    create_notification(product.seller_id, notice_type, notice_title, notice_body, "/my-products")
    if action == "approve":
        add_loyalty_points(
            product.seller_id,
            5,
            reason="seller_approval",
            order_id=None,
            notify_title="Points Earned",
            notify_body="Your approved listing earned 5 points.",
        )
        check_seller_milestone(product.seller_id)
    db.session.commit()

    return jsonify(_serialize_pending_verification(product)), 200


@admin_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    _, err, status = require_admin()
    if err:
        return err, status

    total_users = User.query.filter_by(role="user").count()
    total_products = Product.query.count()
    pending_products = Product.query.filter_by(verification_status="pending_verification").count()
    inventory_products = Product.query.filter_by(status="inventory").count()
    approved_products = Product.query.filter_by(status="approved").count()
    total_orders = Order.query.count()
    total_revenue = db.session.query(db.func.sum(Order.total_amount)).filter(
        Order.payment_status == "paid"
    ).scalar() or 0

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    recent_products = (
        Product.query.filter_by(verification_status="pending_verification")
        .order_by(Product.created_at.asc())
        .limit(5)
        .all()
    )

    return jsonify({
        "stats": {
            "total_users": total_users,
            "total_products": total_products,
            "pending_products": pending_products,
            "inventory_products": inventory_products,
            "approved_products": approved_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
        },
        "recent_orders": [o.to_dict() for o in recent_orders],
        "pending_products": [p.to_dict() for p in recent_products],
    }), 200


@admin_bp.route("/users", methods=["GET"])
@login_required
def get_users():
    _, err, status = require_admin()
    if err:
        return err, status
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

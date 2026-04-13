from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from sqlalchemy import and_
from sqlalchemy.orm import joinedload
from database import (
    db,
    Product,
    Category,
    User,
    Wishlist,
    Notification,
    ProductVerificationMedia,
    ProductComment,
)
from services.auth import login_required, get_current_user_id
import math
import os
import uuid


products_bp = Blueprint("products", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
ALLOWED_VERIFICATION_VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "webm", "mkv"}


def _is_allowed(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def _save_upload(file_obj, prefix=""):
    ext = file_obj.filename.rsplit(".", 1)[1].lower()
    filename = f"{prefix}{uuid.uuid4().hex}_{secure_filename(file_obj.filename)}"
    if not filename.lower().endswith(f".{ext}"):
        filename = f"{filename}.{ext}"
    file_obj.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
    return filename


def _verification_payload(product):
    photos = []
    video = None
    for media in product.verification_media:
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


def _haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def _optional_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


@products_bp.route("/", methods=["GET"])
def get_products():
    status = request.args.get("status", "approved")
    category_id = request.args.get("category_id")
    search = request.args.get("search", "")
    condition = request.args.get("condition")
    location = request.args.get("location")
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")
    sort = request.args.get("sort", "newest")
    deals = str(request.args.get("deals", "")).strip().lower() in {"1", "true", "yes"}
    near_lat = request.args.get("near_lat")
    near_lng = request.args.get("near_lng")
    radius_km = request.args.get("radius_km", "15")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 12))

    # Only admins can query non-approved statuses.
    if status != "approved":
        try:
            user_id = get_current_user_id(optional=True)
            user = User.query.get(int(user_id)) if user_id else None
            if not user or user.role != "admin":
                status = "approved"
        except Exception:
            status = "approved"

    query = Product.query.filter_by(status=status)
    if deals:
        query = query.filter(
            and_(
                Product.negotiated_price.isnot(None),
                Product.negotiated_price < Product.price,
            )
        )
    if category_id:
        query = query.filter_by(category_id=int(category_id))
    if search:
        query = query.filter(Product.title.ilike(f"%{search}%"))
    if condition:
        query = query.filter(Product.condition == condition)
    if location:
        query = query.filter(Product.location.ilike(f"%{location}%"))
    if min_price:
        try:
            query = query.filter(Product.price >= float(min_price))
        except ValueError:
            pass
    if max_price:
        try:
            query = query.filter(Product.price <= float(max_price))
        except ValueError:
            pass

    if near_lat and near_lng:
        try:
            lat = float(near_lat)
            lng = float(near_lng)
            radius = max(0.5, float(radius_km))
            rough_lat_delta = radius / 111.0
            rough_lng_delta = radius / max(0.1, (111.0 * math.cos(math.radians(lat))))
            query = query.filter(
                Product.latitude.isnot(None),
                Product.longitude.isnot(None),
                Product.latitude >= (lat - rough_lat_delta),
                Product.latitude <= (lat + rough_lat_delta),
                Product.longitude >= (lng - rough_lng_delta),
                Product.longitude <= (lng + rough_lng_delta),
            )
        except ValueError:
            pass

    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "views_desc":
        query = query.order_by(Product.view_count.desc())
    elif sort == "discount_desc":
        query = query.order_by((Product.price - Product.negotiated_price).desc())
    else:
        query = query.order_by(Product.created_at.desc())

    items = query.all()
    if near_lat and near_lng:
        try:
            lat = float(near_lat)
            lng = float(near_lng)
            radius = max(0.5, float(radius_km))
            filtered = []
            for product in items:
                if product.latitude is None or product.longitude is None:
                    continue
                dist = _haversine_km(lat, lng, product.latitude, product.longitude)
                if dist <= radius:
                    filtered.append((product, dist))
            filtered.sort(key=lambda pair: pair[1])
            items = [pair[0] for pair in filtered]
        except ValueError:
            pass

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = items[start:end]
    pages = math.ceil(total / per_page) if per_page else 1
    return jsonify(
        {
            "products": [p.to_dict() for p in page_items],
            "total": total,
            "pages": pages,
            "page": page,
        }
    ), 200


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.view_count = (product.view_count or 0) + 1
    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.route("/", methods=["POST"])
@login_required
def create_product():
    user_id = get_current_user_id()
    data = request.form

    images = []
    files = request.files.getlist("images")
    for file_obj in files:
        if file_obj and _is_allowed(file_obj.filename, ALLOWED_IMAGE_EXTENSIONS):
            images.append(_save_upload(file_obj))

    product = Product(
        title=data.get("title"),
        description=data.get("description", ""),
        condition=data.get("condition", "Good"),
        price=float(data.get("price", 0)),
        quantity=int(data.get("quantity", 1)),
        stock=int(data.get("quantity", 1)),
        images=",".join(images),
        category_id=int(data["category_id"]) if data.get("category_id") else None,
        seller_id=user_id,
        location=data.get("location", ""),
        latitude=_optional_float(data.get("latitude")),
        longitude=_optional_float(data.get("longitude")),
        address=data.get("address", ""),
        city=data.get("city", ""),
        country=data.get("country", ""),
        status="pending",
        verification_status="pending_verification",
        rejection_reason="",
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@login_required
def update_product(product_id):
    user_id = get_current_user_id()
    product = Product.query.get_or_404(product_id)
    user = User.query.get(user_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    old_price = product.price
    product.title = data.get("title", product.title)
    product.description = data.get("description", product.description)
    product.condition = data.get("condition", product.condition)
    product.price = float(data.get("price", product.price))
    product.quantity = int(data.get("quantity", product.quantity))
    product.location = data.get("location", product.location)
    if "latitude" in data:
        product.latitude = _optional_float(data.get("latitude"))
    if "longitude" in data:
        product.longitude = _optional_float(data.get("longitude"))
    product.address = data.get("address", product.address)
    product.city = data.get("city", product.city)
    product.country = data.get("country", product.country)
    product.category_id = int(data["category_id"]) if data.get("category_id") else product.category_id
    product.stock = product.quantity

    # Seller edits require re-verification before re-listing.
    if user.role != "admin":
        product.status = "pending"
        product.verification_status = "pending_verification"
        product.rejection_reason = ""

    db.session.flush()

    # Price drop alerts for wishlisted items.
    if product.price < old_price:
        wishers = Wishlist.query.filter_by(product_id=product.id).all()
        for wisher in wishers:
            last_seen = wisher.last_seen_price if wisher.last_seen_price is not None else old_price
            if product.price < last_seen and (
                wisher.target_price is None or product.price <= wisher.target_price
            ):
                note = Notification(
                    user_id=wisher.user_id,
                    type="price_drop",
                    title="Price Drop Alert",
                    body=f"{product.title} dropped to PHP {product.price:,.2f}",
                    link=f"/product/{product.id}",
                )
                db.session.add(note)
            wisher.last_seen_price = product.price
    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.route("/<int:product_id>/verification-media", methods=["POST"])
@login_required
def upload_verification_media(product_id):
    """
    Required endpoint:
    POST /api/products/:id/verification-media
    - Accepts at least 3 photos + 1 video from seller.
    - Saves files to storage (local uploads folder here; can be swapped to S3/Cloudinary).
    - Stores media records in product_verification_media table.
    - Resets product to pending_verification for admin review.
    """
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    product = Product.query.get_or_404(product_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    photos = request.files.getlist("verification_photos")
    video = request.files.get("verification_video")

    if len(photos) < 3:
        return jsonify({"error": "At least 3 verification photos are required"}), 400
    if not video:
        return jsonify({"error": "A verification video is required"}), 400

    for file_obj in photos:
        if not file_obj or not _is_allowed(file_obj.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({"error": "Only image files are allowed for verification photos"}), 400
    if not _is_allowed(video.filename, ALLOWED_VERIFICATION_VIDEO_EXTENSIONS):
        return jsonify({"error": "Unsupported verification video format"}), 400

    old_media = ProductVerificationMedia.query.filter_by(product_id=product.id).all()
    for media in old_media:
        db.session.delete(media)
    db.session.flush()

    saved_records = []
    for photo in photos:
        filename = _save_upload(photo, prefix="verification_photo_")
        saved_records.append(
            ProductVerificationMedia(product_id=product.id, media_type="photo", file_url=filename)
        )

    video_filename = _save_upload(video, prefix="verification_video_")
    saved_records.append(
        ProductVerificationMedia(product_id=product.id, media_type="video", file_url=video_filename)
    )

    for record in saved_records:
        db.session.add(record)

    product.verification_status = "pending_verification"
    product.status = "pending"
    product.rejection_reason = ""
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Verification media uploaded successfully",
                "product_id": product.id,
                "verification_status": product.verification_status,
                "media": _verification_payload(product),
            }
        ),
        200,
    )


@products_bp.route("/<int:product_id>/verification-status", methods=["GET"])
@login_required
def get_verification_status(product_id):
    """
    Required endpoint:
    GET /api/products/:id/verification-status
    - Returns verification status.
    - Includes rejection reason when rejected.
    """
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    product = Product.query.get_or_404(product_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    return (
        jsonify(
            {
                "product_id": product.id,
                "verification_status": product.verification_status,
                "rejection_reason": product.rejection_reason or None,
                "media": _verification_payload(product),
            }
        ),
        200,
    )


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@login_required
def delete_product(product_id):
    user_id = get_current_user_id()
    product = Product.query.get_or_404(product_id)
    user = User.query.get(user_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"}), 200


@products_bp.route("/my", methods=["GET"])
@login_required
def my_products():
    user_id = get_current_user_id()
    products = (
        Product.query.filter_by(seller_id=user_id)
        .order_by(Product.created_at.desc())
        .all()
    )
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories]), 200


@products_bp.route("/categories", methods=["POST"])
@login_required
def create_category():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if user.role != "admin":
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json() or {}
    category = Category(name=data["name"], icon=data.get("icon", "box"))
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@products_bp.route("/images/<filename>")
def serve_image(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


@products_bp.route("/verification-media/<filename>")
def serve_verification_media(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


@products_bp.route("/<int:product_id>/comments", methods=["GET"])
def get_product_comments(product_id):
    Product.query.get_or_404(product_id)
    comments = (
        ProductComment.query.options(joinedload(ProductComment.user))
        .filter_by(product_id=product_id)
        .order_by(ProductComment.created_at.desc())
        .all()
    )
    return jsonify([comment.to_dict() for comment in comments]), 200


@products_bp.route("/<int:product_id>/comments", methods=["POST"])
@login_required
def create_product_comment(product_id):
    user_id = get_current_user_id()
    Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Comment text is required"}), 400
    comment = ProductComment(user_id=user_id, product_id=product_id, text=text)
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@products_bp.route("/recommendations", methods=["GET"])
@login_required
def recommended_products():
    user_id = get_current_user_id()
    recent_comments = (
        ProductComment.query.filter_by(user_id=user_id)
        .order_by(ProductComment.created_at.desc())
        .limit(20)
        .all()
    )
    if not recent_comments:
        latest_products = (
            Product.query.filter_by(status="approved")
            .order_by(Product.created_at.desc())
            .limit(8)
            .all()
        )
        return jsonify({"because_of": None, "products": [product.to_dict() for product in latest_products]}), 200

    last_comment = recent_comments[0]
    anchor_product = Product.query.get(last_comment.product_id)
    if not anchor_product:
        return jsonify({"because_of": None, "products": []}), 200

    commented_product_ids = {comment.product_id for comment in recent_comments}
    recommended = []
    if anchor_product.category_id:
        recommended = (
            Product.query.filter(
                Product.status == "approved",
                Product.category_id == anchor_product.category_id,
                Product.id != anchor_product.id,
                Product.id.notin_(commented_product_ids),
            )
            .order_by(Product.created_at.desc())
            .limit(8)
            .all()
        )

    if not recommended:
        recommended = (
            Product.query.filter(
                Product.status == "approved",
                Product.id != anchor_product.id,
            )
            .order_by(Product.view_count.desc(), Product.created_at.desc())
            .limit(8)
            .all()
        )
    return jsonify(
        {
            "because_of": {
                "product_id": anchor_product.id,
                "product_title": anchor_product.title,
                "category": anchor_product.category.name if anchor_product.category else None,
            },
            "products": [product.to_dict() for product in recommended],
        }
    ), 200

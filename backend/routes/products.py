from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
from database import db, Product, Category, User, Wishlist, Notification
import os, uuid
 

products_bp = Blueprint("products", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 12))

    # Only admins can query non-approved statuses
    if status != "approved":
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user or user.role != "admin":
                status = "approved"
        except Exception:
            status = "approved"

    query = Product.query.filter_by(status=status)
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

    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "views_desc":
        query = query.order_by(Product.view_count.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "products": [p.to_dict() for p in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    }), 200


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.view_count = (product.view_count or 0) + 1
    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.route("/", methods=["POST"])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    data = request.form

    images = []
    files = request.files.getlist("images")
    for f in files:
        if f and allowed_file(f.filename):
            filename = f"{uuid.uuid4().hex}_{secure_filename(f.filename)}"
            f.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
            images.append(filename)

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
        status="pending",
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    user = User.query.get(user_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    old_price = product.price
    product.title = data.get("title", product.title)
    product.description = data.get("description", product.description)
    product.condition = data.get("condition", product.condition)
    product.price = float(data.get("price", product.price))
    product.quantity = int(data.get("quantity", product.quantity))
    product.location = data.get("location", product.location)
    db.session.flush()

    # Price drop alerts for wishlisted items
    if product.price < old_price:
        wishers = Wishlist.query.filter_by(product_id=product.id).all()
        for w in wishers:
            last_seen = w.last_seen_price if w.last_seen_price is not None else old_price
            if product.price < last_seen and (w.target_price is None or product.price <= w.target_price):
                note = Notification(
                    user_id=w.user_id,
                    type="price_drop",
                    title="Price Drop Alert",
                    body=f"{product.title} dropped to ₱{product.price:,.2f}",
                    link=f"/product/{product.id}",
                )
                db.session.add(note)
            w.last_seen_price = product.price
    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    user = User.query.get(user_id)

    if product.seller_id != user_id and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"}), 200


@products_bp.route("/my", methods=["GET"])
@jwt_required()
def my_products():
    user_id = int(get_jwt_identity())
    products = Product.query.filter_by(seller_id=user_id).order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.route("/categories", methods=["GET"])
def get_categories():
    cats = Category.query.all()
    return jsonify([c.to_dict() for c in cats]), 200


@products_bp.route("/categories", methods=["POST"])
@jwt_required()
def create_category():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != "admin":
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json()
    cat = Category(name=data["name"], icon=data.get("icon", "📦"))
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@products_bp.route("/images/<filename>")
def serve_image(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)

"""
Run this once to seed the database with sample data:
  python seed.py
"""
from app import app
from database import db, User, Category, Product, Order, OrderItem, Review
from werkzeug.security import generate_password_hash
import random
from datetime import datetime, timedelta

with app.app_context():
    db.create_all()

    # Admin user
    if not User.query.filter_by(email="admin@garagesalehub.com").first():
        admin = User(
            name="Admin",
            email="admin@garagesalehub.com",
            password_hash=generate_password_hash("admin123"),
            role="admin",
        )
        db.session.add(admin)

    # Sample user
    def get_or_create_user(name, email, role="user", address="", phone=""):
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(
                name=name,
                email=email,
                password_hash=generate_password_hash("user123" if role == "user" else "admin123"),
                role=role,
                address=address,
                phone=phone,
            )
            db.session.add(u)
        return u

    user = get_or_create_user(
        "Juan Dela Cruz",
        "user@garagesalehub.com",
        role="user",
        address="123 Rizal St, Quezon City",
        phone="09171234567",
    )

    seller1 = get_or_create_user(
        "Maria Santos",
        "maria@garagesalehub.com",
        role="user",
        address="Makati City",
        phone="09181234567",
    )

    seller2 = get_or_create_user(
        "Paolo Reyes",
        "paolo@garagesalehub.com",
        role="user",
        address="Cebu City",
        phone="09221234567",
    )

    # Categories
    categories = [
        ("Furniture", "🛋️"),
        ("Electronics", "📱"),
        ("Clothing", "👕"),
        ("Books", "📚"),
        ("Kitchen", "🍳"),
        ("Toys & Games", "🎮"),
        ("Sports", "⚽"),
        ("Tools", "🔧"),
    ]
    for name, icon in categories:
        if not Category.query.filter_by(name=name).first():
            db.session.add(Category(name=name, icon=icon))

    db.session.commit()

    # Dummy products
    cat_map = {c.name: c for c in Category.query.all()}
    sample_products = [
        ("Wooden Study Desk", "Furniture", "Good", 2500, "Quezon City"),
        ("Samsung 40\" TV", "Electronics", "Good", 7500, "Makati City"),
        ("Mountain Bike", "Sports", "Fair", 4800, "Taguig City"),
        ("Air Fryer 5L", "Kitchen", "Like New", 2200, "Pasig City"),
        ("Cordless Drill Set", "Tools", "Good", 1800, "Cebu City"),
        ("Children's Story Set", "Books", "Good", 600, "Davao City"),
        ("PS4 Console", "Electronics", "Fair", 8500, "Quezon City"),
        ("Office Chair", "Furniture", "Good", 1500, "Makati City"),
        ("Basketball Shoes", "Sports", "Like New", 2100, "Cavite"),
        ("Vintage Camera", "Electronics", "Good", 5200, "Manila"),
        ("Kitchen Mixer", "Kitchen", "Good", 1900, "Pasig City"),
        ("Kids Toy Set", "Toys & Games", "Like New", 900, "Laguna"),
    ]

    existing_titles = {p.title for p in Product.query.all()}
    for i, (title, cat, condition, price, location) in enumerate(sample_products):
        if title in existing_titles:
            continue
        seller = seller1 if i % 2 == 0 else seller2
        qty = random.randint(1, 3)
        p = Product(
            title=title,
            description=f"{title} in {condition} condition. Complete and ready to use.",
            condition=condition,
            price=price,
            quantity=qty,
            stock=qty,
            images="",
            category_id=cat_map[cat].id if cat in cat_map else None,
            seller_id=seller.id,
            status="approved",
            location=location,
            view_count=random.randint(10, 150),
        )
        db.session.add(p)

    db.session.commit()

    # Dummy orders and reviews
    products = Product.query.filter_by(status="approved").limit(6).all()
    for p in products:
        order = Order(
            buyer_id=user.id,
            total_amount=p.price,
            status="delivered",
            payment_method="cod",
            payment_status="paid",
            delivery_address=user.address,
            tracking_number=f"GSH-SEED-{random.randint(1000,9999)}",
        )
        db.session.add(order)
        db.session.flush()
        oi = OrderItem(order_id=order.id, product_id=p.id, quantity=1, unit_price=p.price)
        db.session.add(oi)
        p.status = "sold"
        p.stock = 0
        db.session.flush()

        if not Review.query.filter_by(order_id=order.id, product_id=p.id, buyer_id=user.id).first():
            r = Review(
                order_id=order.id,
                product_id=p.id,
                seller_id=p.seller_id,
                buyer_id=user.id,
                rating=random.randint(4, 5),
                comment="Great item! Smooth transaction.",
            )
            db.session.add(r)

    db.session.commit()
    print("✅ Seed completed!")
    print("Admin: admin@garagesalehub.com / admin123")
    print("User:  user@garagesalehub.com / user123")

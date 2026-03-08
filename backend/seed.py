"""
Run this once to seed the database with sample data:
  python seed.py
"""
from app import app
from database import db, User, Category, Product
from werkzeug.security import generate_password_hash

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
    if not User.query.filter_by(email="user@garagesalehub.com").first():
        user = User(
            name="Juan Dela Cruz",
            email="user@garagesalehub.com",
            password_hash=generate_password_hash("user123"),
            role="user",
            address="123 Rizal St, Quezon City",
            phone="09171234567",
        )
        db.session.add(user)

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
    print("✅ Seed completed!")
    print("Admin: admin@garagesalehub.com / admin123")
    print("User:  user@garagesalehub.com / user123")

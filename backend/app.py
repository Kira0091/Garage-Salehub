from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from database import db
from routes.auth import auth_bp
from routes.products import products_bp
from routes.orders import orders_bp
from routes.chat import chat_bp
from routes.admin import admin_bp
from routes.users import users_bp
import os

app = Flask(__name__)

# Config
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///garagesalehub.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "garagesalehub-secret-key-2026"
app.config["UPLOAD_FOLDER"] = "uploads"

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

CORS(app, origins=["http://localhost:3000"])
JWTManager(app)
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(products_bp, url_prefix="/api/products")
app.register_blueprint(orders_bp, url_prefix="/api/orders")
app.register_blueprint(chat_bp, url_prefix="/api/chat")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(users_bp, url_prefix="/api/users")

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

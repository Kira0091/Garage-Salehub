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
import sqlite3
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

def _build_db_uri():
    # Default to MySQL; fallback to SQLite if explicitly requested.
    db_type = os.getenv("DB_TYPE", "mysql").lower().strip()
    if db_type == "sqlite":
        return "sqlite:///garagesalehub.db"

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    name = os.getenv("DB_NAME", "garage_salehub")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

app = Flask(__name__)

# Config
app.config["SQLALCHEMY_DATABASE_URI"] = _build_db_uri()
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


def ensure_message_columns():
    """Lightweight SQLite migration for older DBs."""
    if not app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///"):
        return

    db_path = os.path.join(app.instance_path, "garagesalehub.db")
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(messages)")
        cols = {row[1] for row in cur.fetchall()}
        if not cols:
            return

        migrations = [
            ("message_type", "TEXT", "'chat'"),
            ("proposed_price", "REAL", None),
            ("attachments", "TEXT", "''"),
            ("is_read", "INTEGER", "0"),
        ]
        for name, col_type, default in migrations:
            if name not in cols:
                if default is None:
                    cur.execute(f"ALTER TABLE messages ADD COLUMN {name} {col_type}")
                else:
                    cur.execute(f"ALTER TABLE messages ADD COLUMN {name} {col_type} DEFAULT {default}")
        conn.commit()
    finally:
        conn.close()

with app.app_context():
    db.create_all()
    ensure_message_columns()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

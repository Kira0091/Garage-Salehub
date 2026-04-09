from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from database import db
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
from routes.auth import auth_bp
from routes.products import products_bp
from routes.orders import orders_bp
from routes.chat import chat_bp
from routes.admin import admin_bp
from routes.users import users_bp
from routes.wishlist import wishlist_bp
from routes.notifications import notifications_bp
from routes.reviews import reviews_bp
import os
import sqlite3
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

if load_dotenv:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def _build_db_uri():
    # Default to MySQL; fallback to SQLite if explicitly requested.
    db_type = os.getenv("DB_TYPE", "mysql").lower().strip()
    if db_type == "sqlite":
        return "sqlite:///garagesalehub.db"

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "root123")
    name = os.getenv("DB_NAME", "garage_salehub")
    return URL.create(
        drivername="mysql+pymysql",
        username=user,
        password=password,
        host=host,
        port=int(port),
        database=name,
    ).render_as_string(hide_password=False)

app = Flask(__name__)

# Config
app.config["SQLALCHEMY_DATABASE_URI"] = _build_db_uri()
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY",
    "garage-salehub-jwt-secret-key-2026-minimum-32bytes",
)
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
app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(reviews_bp, url_prefix="/api/reviews")


def _sqlite_db_path():
    instance_path = os.path.join(app.instance_path, "garagesalehub.db")
    if os.path.exists(instance_path):
        return instance_path
    cwd_path = os.path.join(os.getcwd(), "garagesalehub.db")
    if os.path.exists(cwd_path):
        return cwd_path
    return None


def ensure_message_columns():
    """Lightweight migration for older DBs."""
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        mysql_migrations = [
            ("message_type", "VARCHAR(30) DEFAULT 'chat'"),
            ("proposed_price", "FLOAT NULL"),
            ("attachments", "TEXT"),
            ("is_read", "TINYINT(1) DEFAULT 0"),
        ]
        for name, column_def in mysql_migrations:
            exists = db.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'messages'
                      AND COLUMN_NAME = :column_name
                    """
                ),
                {"column_name": name},
            ).scalar() or 0
            if not exists:
                db.session.execute(text(f"ALTER TABLE messages ADD COLUMN {name} {column_def}"))
        db.session.commit()
        return

    if dialect != "sqlite":
        return

    db_path = _sqlite_db_path()
    if not db_path:
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


def ensure_product_columns():
    """Migration for new product fields."""
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        mysql_migrations = [
            ("location", "VARCHAR(200) DEFAULT ''"),
            ("view_count", "INT DEFAULT 0"),
        ]
        for name, column_def in mysql_migrations:
            exists = db.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'products'
                      AND COLUMN_NAME = :column_name
                    """
                ),
                {"column_name": name},
            ).scalar() or 0
            if not exists:
                db.session.execute(text(f"ALTER TABLE products ADD COLUMN {name} {column_def}"))
        db.session.commit()
        return

    if dialect != "sqlite":
        return

    db_path = _sqlite_db_path()
    if not db_path:
        return

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(products)")
        cols = {row[1] for row in cur.fetchall()}
        if not cols:
            return

        migrations = [
            ("location", "TEXT", "''"),
            ("view_count", "INTEGER", "0"),
        ]
        for name, col_type, default in migrations:
            if name not in cols:
                cur.execute(f"ALTER TABLE products ADD COLUMN {name} {col_type} DEFAULT {default}")
        conn.commit()
    finally:
        conn.close()

with app.app_context():
    try:
        db.create_all()
        ensure_message_columns()
        ensure_product_columns()
    except OperationalError as exc:
        raise RuntimeError(
            "Database connection failed. Check backend/.env values for "
            "DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME."
        ) from exc

if __name__ == "__main__":
    app.run(debug=True, port=5000)

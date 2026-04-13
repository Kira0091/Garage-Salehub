from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
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
from routes.vouchers import vouchers_bp
from routes.loyalty import loyalty_bp
from routes.retention import retention_bp
from routes.reports import reports_bp
from socket_events import register_socket_handlers
import os
import sqlite3
from datetime import timedelta
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
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "garage-salehub-session-secret-key-2026-minimum-32bytes",
)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

CORS(app, origins=["http://localhost:3000", "http://localhost:5173"], supports_credentials=True)
JWTManager(app)
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://localhost:5173"], async_mode="threading")
register_socket_handlers(socketio)

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
app.register_blueprint(vouchers_bp, url_prefix="/api/vouchers")
app.register_blueprint(loyalty_bp, url_prefix="/api/loyalty")
app.register_blueprint(retention_bp, url_prefix="/api/retention")
app.register_blueprint(reports_bp, url_prefix="/api/reports")


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
            ("verification_status", "VARCHAR(30) DEFAULT 'pending_verification'"),
            ("latitude", "DOUBLE NULL"),
            ("longitude", "DOUBLE NULL"),
            ("address", "VARCHAR(250) DEFAULT ''"),
            ("city", "VARCHAR(120) DEFAULT ''"),
            ("country", "VARCHAR(120) DEFAULT ''"),
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
        db.session.execute(
            text(
                """
                UPDATE products
                SET verification_status = CASE
                    WHEN status = 'rejected' THEN 'rejected'
                    WHEN status IN ('approved', 'sold', 'inventory') THEN 'approved'
                    ELSE verification_status
                END
                WHERE verification_status IS NULL
                   OR verification_status = 'pending_verification'
                """
            )
        )
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
            ("verification_status", "TEXT", "'pending_verification'"),
            ("latitude", "REAL", None),
            ("longitude", "REAL", None),
            ("address", "TEXT", "''"),
            ("city", "TEXT", "''"),
            ("country", "TEXT", "''"),
        ]
        for name, col_type, default in migrations:
            if name not in cols:
                if default is None:
                    cur.execute(f"ALTER TABLE products ADD COLUMN {name} {col_type}")
                else:
                    cur.execute(f"ALTER TABLE products ADD COLUMN {name} {col_type} DEFAULT {default}")
        cur.execute(
            """
            UPDATE products
            SET verification_status = CASE
                WHEN status = 'rejected' THEN 'rejected'
                WHEN status IN ('approved', 'sold', 'inventory') THEN 'approved'
                ELSE COALESCE(verification_status, 'pending_verification')
            END
            """
        )
        conn.commit()
    finally:
        conn.close()


def ensure_product_verification_media_table():
    """Create verification media table if it doesn't exist yet."""
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS product_verification_media (
                    id INT NOT NULL AUTO_INCREMENT,
                    product_id INT NOT NULL,
                    media_type VARCHAR(20) NOT NULL,
                    file_url VARCHAR(500) NOT NULL,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX ix_product_verification_media_product_id (product_id),
                    CONSTRAINT fk_product_verification_media_product
                      FOREIGN KEY (product_id) REFERENCES products(id)
                      ON DELETE CASCADE
                )
                """
            )
        )
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
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS product_verification_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                media_type TEXT NOT NULL,
                file_url TEXT NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def ensure_order_crm_columns():
    """Migration for order CRM fields (voucher + points)."""
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        mysql_migrations = [
            ("voucher_code", "VARCHAR(50) NULL"),
            ("discount_amount", "FLOAT DEFAULT 0"),
            ("points_used", "INT DEFAULT 0"),
            ("points_earned", "INT DEFAULT 0"),
        ]
        for name, column_def in mysql_migrations:
            exists = db.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'orders'
                      AND COLUMN_NAME = :column_name
                    """
                ),
                {"column_name": name},
            ).scalar() or 0
            if not exists:
                db.session.execute(text(f"ALTER TABLE orders ADD COLUMN {name} {column_def}"))
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
        cur.execute("PRAGMA table_info(orders)")
        cols = {row[1] for row in cur.fetchall()}
        if not cols:
            return

        migrations = [
            ("voucher_code", "TEXT", None),
            ("discount_amount", "REAL", "0"),
            ("points_used", "INTEGER", "0"),
            ("points_earned", "INTEGER", "0"),
        ]
        for name, col_type, default in migrations:
            if name not in cols:
                if default is None:
                    cur.execute(f"ALTER TABLE orders ADD COLUMN {name} {col_type}")
                else:
                    cur.execute(f"ALTER TABLE orders ADD COLUMN {name} {col_type} DEFAULT {default}")
        conn.commit()
    finally:
        conn.close()


def ensure_voucher_loyalty_tables():
    """Create vouchers and loyalty tables when absent."""
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS vouchers (
                    id INT NOT NULL AUTO_INCREMENT,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    type VARCHAR(20) NOT NULL,
                    value FLOAT NOT NULL,
                    min_order FLOAT DEFAULT 0,
                    max_uses INT DEFAULT 1,
                    used_count INT DEFAULT 0,
                    expires_at DATETIME NULL,
                    is_active TINYINT(1) DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                )
                """
            )
        )
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS voucher_usage (
                    id INT NOT NULL AUTO_INCREMENT,
                    voucher_id INT NOT NULL,
                    user_id INT NOT NULL,
                    order_id INT NOT NULL,
                    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX ix_voucher_usage_voucher (voucher_id),
                    INDEX ix_voucher_usage_user (user_id),
                    CONSTRAINT fk_voucher_usage_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
                    CONSTRAINT fk_voucher_usage_user FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT fk_voucher_usage_order FOREIGN KEY (order_id) REFERENCES orders(id)
                )
                """
            )
        )
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS loyalty_points (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL UNIQUE,
                    points INT DEFAULT 0,
                    total_earned INT DEFAULT 0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    CONSTRAINT fk_loyalty_points_user FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
        )
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS loyalty_log (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    points INT NOT NULL,
                    reason VARCHAR(100) NOT NULL,
                    order_id INT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX ix_loyalty_log_user (user_id),
                    CONSTRAINT fk_loyalty_log_user FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT fk_loyalty_log_order FOREIGN KEY (order_id) REFERENCES orders(id)
                )
                """
            )
        )
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
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS vouchers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                value REAL NOT NULL,
                min_order REAL DEFAULT 0,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                expires_at DATETIME NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS voucher_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                order_id INTEGER NOT NULL,
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(voucher_id) REFERENCES vouchers(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS loyalty_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                points INTEGER DEFAULT 0,
                total_earned INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS loyalty_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                points INTEGER NOT NULL,
                reason TEXT NOT NULL,
                order_id INTEGER NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def ensure_reports_comments_tables():
    dialect = db.engine.dialect.name

    if dialect == "mysql":
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    title VARCHAR(180) NOT NULL,
                    description TEXT,
                    type VARCHAR(30) DEFAULT 'other',
                    screenshot VARCHAR(500) DEFAULT '',
                    status VARCHAR(30) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX ix_reports_user_id (user_id),
                    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
        )
        db.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS product_comments (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    product_id INT NOT NULL,
                    text TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX ix_product_comments_product_id (product_id),
                    INDEX ix_product_comments_user_id (user_id),
                    CONSTRAINT fk_product_comments_user FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT fk_product_comments_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
                """
            )
        )
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
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'other',
                screenshot TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS product_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()
    finally:
        conn.close()

with app.app_context():
    try:
        db.create_all()
        ensure_message_columns()
        ensure_product_columns()
        ensure_product_verification_media_table()
        ensure_order_crm_columns()
        ensure_voucher_loyalty_tables()
        ensure_reports_comments_tables()
    except OperationalError as exc:
        raise RuntimeError(
            "Database connection failed. Check backend/.env values for "
            "DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME."
        ) from exc

if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000)

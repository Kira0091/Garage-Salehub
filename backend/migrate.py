"""
Lightweight migration helper for new marketplace features.
Run: python migrate.py
"""
from sqlalchemy import text
from app import app, db


def column_exists(table, column):
    sql = text(
        """
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :t
          AND COLUMN_NAME = :c
        """
    )
    return (db.session.execute(sql, {"t": table, "c": column}).scalar() or 0) > 0


def table_exists(table):
    sql = text(
        """
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :t
        """
    )
    return (db.session.execute(sql, {"t": table}).scalar() or 0) > 0


def add_column(table, column_def):
    db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_def}"))


def create_tables():
    if not table_exists("reviews"):
        db.session.execute(text("""
            CREATE TABLE reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                seller_id INT NOT NULL,
                buyer_id INT NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                created_at DATETIME
            )
        """))

    if not table_exists("wishlists"):
        db.session.execute(text("""
            CREATE TABLE wishlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                target_price FLOAT NULL,
                last_seen_price FLOAT NULL,
                created_at DATETIME
            )
        """))

    if not table_exists("notifications"):
        db.session.execute(text("""
            CREATE TABLE notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                title VARCHAR(150) DEFAULT '',
                body TEXT,
                link VARCHAR(200) DEFAULT '',
                is_read TINYINT(1) DEFAULT 0,
                created_at DATETIME
            )
        """))


def migrate_products():
    if not column_exists("products", "location"):
        add_column("products", "location VARCHAR(200) DEFAULT ''")
    if not column_exists("products", "view_count"):
        add_column("products", "view_count INT DEFAULT 0")


def main():
    with app.app_context():
        if db.engine.dialect.name != "mysql":
            print("This migration helper is for MySQL. Skipping.")
            return
        create_tables()
        migrate_products()
        db.session.commit()
        print("✅ Migration completed.")


if __name__ == "__main__":
    main()

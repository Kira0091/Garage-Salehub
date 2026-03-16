import os
import sqlite3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SQLITE_DB = os.path.join(ROOT, "backend", "instance", "garagesalehub.db")
DUMP_PATH = os.path.join(ROOT, "garasalehub dump.sql")

TABLE_ORDER = [
    "users",
    "categories",
    "products",
    "orders",
    "order_items",
    "messages",
]


def _escape(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8", errors="replace")
    if isinstance(value, bool):
        return "1" if value else "0"
    s = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{s}'"


def _table_exists(cur, table):
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cur.fetchone() is not None


def dump():
    if not os.path.exists(SQLITE_DB):
        raise FileNotFoundError(f"SQLite database not found: {SQLITE_DB}")

    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    lines = []
    lines.append("-- GarageSaleHub data dump (INSERT statements only)")
    lines.append("-- Tables must already exist in MySQL before import")
    lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS=0;")
    lines.append("")

    for table in TABLE_ORDER:
        if not _table_exists(cur, table):
            continue
        cur.execute(f"PRAGMA table_info({table})")
        cols = [row[1] for row in cur.fetchall()]
        if not cols:
            continue

        cur.execute(f"SELECT * FROM {table}")
        rows = cur.fetchall()
        if not rows:
            continue

        col_list = ", ".join([f"`{c}`" for c in cols])
        for row in rows:
            values = ", ".join(_escape(row[c]) for c in cols)
            lines.append(f"INSERT INTO `{table}` ({col_list}) VALUES ({values});")
        lines.append("")

    lines.append("SET FOREIGN_KEY_CHECKS=1;")
    lines.append("")

    with open(DUMP_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    conn.close()


if __name__ == "__main__":
    dump()
    print(f"Dump written to: {DUMP_PATH}")

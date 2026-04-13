from datetime import datetime
from flask import Blueprint, jsonify, request
from database import db, Voucher, VoucherUsage, User
from services.auth import login_required, get_current_user_id
from utils.notifications import create_notification


vouchers_bp = Blueprint("vouchers", __name__)


def _require_admin():
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if not user or str(user.role).strip().lower() != "admin":
        return None, (jsonify({"error": "Admin only"}), 403)
    return user, None


def _parse_expiry(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def validate_voucher_logic(code, order_total, user_id):
    normalized = (code or "").strip().upper()
    voucher = Voucher.query.filter_by(code=normalized).first()
    if not voucher:
        return False, "Voucher not found", None, 0.0
    if not voucher.is_active:
        return False, "Voucher is inactive", voucher, 0.0
    if voucher.expires_at and voucher.expires_at < datetime.utcnow():
        return False, "Voucher has expired", voucher, 0.0
    if (voucher.used_count or 0) >= (voucher.max_uses or 0):
        return False, "Voucher usage limit reached", voucher, 0.0
    if float(order_total or 0) < float(voucher.min_order or 0):
        return False, "Order total does not meet minimum requirement", voucher, 0.0

    used_by_user = VoucherUsage.query.filter_by(voucher_id=voucher.id, user_id=user_id).first()
    if used_by_user:
        return False, "You already used this voucher", voucher, 0.0

    if voucher.type == "percent":
        discount = float(order_total) * (float(voucher.value) / 100.0)
    else:
        discount = float(voucher.value)
    discount = max(0.0, round(discount, 2))
    if discount > float(order_total):
        discount = float(order_total)
    return True, "", voucher, discount


@vouchers_bp.route("/", methods=["POST"])
@login_required
def create_voucher():
    _, err = _require_admin()
    if err:
        return err
    admin_id = get_current_user_id()
    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    vtype = (data.get("type") or "").strip().lower()
    if not code or vtype not in {"percent", "fixed"}:
        return jsonify({"error": "code and valid type are required"}), 400
    if Voucher.query.filter_by(code=code).first():
        return jsonify({"error": "Voucher code already exists"}), 409

    expires_at = _parse_expiry(data.get("expires_at"))
    voucher = Voucher(
        code=code,
        type=vtype,
        value=float(data.get("value", 0)),
        min_order=float(data.get("min_order", 0)),
        max_uses=int(data.get("max_uses", 1)),
        used_count=0,
        expires_at=expires_at,
        is_active=True,
    )
    db.session.add(voucher)
    create_notification(
        admin_id,
        "voucher",
        "Voucher Created",
        f"Voucher {code} has been issued successfully.",
        "/admin?tab=vouchers",
    )
    db.session.commit()
    return jsonify(voucher.to_dict()), 201


@vouchers_bp.route("/", methods=["GET"])
@login_required
def list_vouchers():
    _, err = _require_admin()
    if err:
        return err
    rows = Voucher.query.order_by(Voucher.created_at.desc()).all()
    return jsonify([v.to_dict() for v in rows]), 200


@vouchers_bp.route("/<int:voucher_id>", methods=["DELETE"])
@login_required
def deactivate_voucher(voucher_id):
    _, err = _require_admin()
    if err:
        return err
    voucher = Voucher.query.get_or_404(voucher_id)
    voucher.is_active = False
    db.session.commit()
    return jsonify(voucher.to_dict()), 200


@vouchers_bp.route("/validate", methods=["POST"])
@login_required
def validate_voucher():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    code = data.get("code")
    order_total = float(data.get("order_total", 0))
    valid, error, voucher, discount = validate_voucher_logic(code, order_total, user_id)
    if not valid:
        return jsonify({"valid": False, "error": error}), 400
    return jsonify({
        "valid": True,
        "code": voucher.code,
        "type": voucher.type,
        "value": voucher.value,
        "discount": round(discount, 2),
    }), 200

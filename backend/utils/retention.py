from datetime import datetime, timedelta
import random
import string
from database import db, Order, Voucher, VoucherUsage, LoyaltyPoints, LoyaltyLog, Wishlist, Product, Notification
from utils.notifications import create_notification
from utils.loyalty import add_loyalty_points, get_or_create_loyalty_wallet


def _random4():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=4))


def _issue_voucher(code, vtype, value, min_order, max_uses, expires_at):
    existing = Voucher.query.filter_by(code=code).first()
    if existing:
        return existing
    voucher = Voucher(
        code=code.upper(),
        type=vtype,
        value=float(value),
        min_order=float(min_order),
        max_uses=int(max_uses),
        used_count=0,
        expires_at=expires_at,
        is_active=True,
    )
    db.session.add(voucher)
    db.session.flush()
    return voucher


def _wishlist_reminders(user_id):
    threshold = datetime.utcnow() - timedelta(days=14)
    items = Wishlist.query.filter(Wishlist.user_id == user_id, Wishlist.created_at <= threshold).all()
    for item in items:
        product = Product.query.get(item.product_id)
        if not product or product.status == "sold":
            continue
        already = Notification.query.filter_by(
            user_id=user_id,
            type="wishlist_reminder",
            link=f"/product/{product.id}",
        ).first()
        if already:
            continue
        create_notification(
            user_id,
            "wishlist_reminder",
            "Wishlist Reminder",
            f"Still interested in {product.title}? It's still available!",
            f"/product/{product.id}",
        )


def check_retention_triggers(user_id):
    """
    Call after every completed order.
    Trigger A/B/C/D for buyer-side retention; idempotent safe.
    """
    now = datetime.utcnow()
    last_30 = now - timedelta(days=30)

    # Trigger A: win-back inactive users (once per 30 days window).
    recent_orders = Order.query.filter(
        Order.buyer_id == user_id,
        Order.created_at >= last_30,
    ).count()
    has_recent_winback = Voucher.query.filter(
        Voucher.code.like(f"WINBACK-{user_id}-%"),
        Voucher.created_at >= last_30,
    ).first()
    if recent_orders == 0 and not has_recent_winback:
        code = f"WINBACK-{user_id}-{_random4()}"
        _issue_voucher(code, "percent", 15, 0, 1, now + timedelta(days=7))
        create_notification(
            user_id,
            "voucher",
            "We miss you!",
            f"Here's 15% off your next order. Code: {code}",
            "/shop",
        )

    # Trigger B: VIP threshold crossed.
    wallet = get_or_create_loyalty_wallet(user_id)
    if (wallet.total_earned or 0) >= 500:
        vip_code = f"VIP100-{user_id}"
        existing = Voucher.query.filter_by(code=vip_code).first()
        if not existing:
            _issue_voucher(vip_code, "fixed", 100, 0, 1, now + timedelta(days=30))
            create_notification(
                user_id,
                "voucher",
                "VIP Status Unlocked",
                "You've reached VIP status! Enjoy PHP 100 off your next order.",
                "/shop",
            )

    # Trigger C: wishlist re-engagement.
    _wishlist_reminders(user_id)


def apply_first_purchase_bonus_if_needed(user_id, order_id):
    delivered_count = Order.query.filter_by(buyer_id=user_id, status="delivered").count()
    if delivered_count != 1:
        return
    existing = LoyaltyLog.query.filter_by(
        user_id=user_id,
        reason="first_purchase",
        order_id=order_id,
    ).first()
    if existing:
        return
    add_loyalty_points(
        user_id,
        25,
        reason="first_purchase",
        order_id=order_id,
        notify_title="First Purchase Bonus",
        notify_body="Thanks for your first purchase! You earned 25 bonus points.",
    )


def check_seller_milestone(seller_id):
    approved_count = Product.query.filter_by(seller_id=seller_id, status="approved").count()
    if approved_count not in {5, 10, 20}:
        return
    link = "/seller-dashboard"
    existing = Notification.query.filter_by(
        user_id=seller_id,
        type="seller_milestone",
        link=link,
    ).filter(Notification.body.ilike(f"%{approved_count}%")).first()
    if existing:
        return
    create_notification(
        seller_id,
        "seller_milestone",
        "Seller Milestone",
        f"Milestone! You now have {approved_count} approved listings on GarageSale Hub.",
        link,
    )

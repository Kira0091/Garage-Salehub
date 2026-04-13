from datetime import datetime
from database import db, LoyaltyPoints, LoyaltyLog
from utils.notifications import create_notification


def get_or_create_loyalty_wallet(user_id):
    wallet = LoyaltyPoints.query.filter_by(user_id=user_id).first()
    if not wallet:
        wallet = LoyaltyPoints(user_id=user_id, points=0, total_earned=0, updated_at=datetime.utcnow())
        db.session.add(wallet)
        db.session.flush()
    return wallet


def add_loyalty_points(user_id, points, reason, order_id=None, notify_title=None, notify_body=None):
    if not points:
        return get_or_create_loyalty_wallet(user_id)
    wallet = get_or_create_loyalty_wallet(user_id)
    wallet.points = (wallet.points or 0) + int(points)
    if int(points) > 0:
        wallet.total_earned = (wallet.total_earned or 0) + int(points)
    wallet.updated_at = datetime.utcnow()

    db.session.add(
        LoyaltyLog(
            user_id=user_id,
            points=int(points),
            reason=reason,
            order_id=order_id,
        )
    )
    if notify_title and notify_body:
        create_notification(user_id, "loyalty", notify_title, notify_body, "/loyalty")
    return wallet


def redeem_loyalty_points(user_id, points):
    wallet = get_or_create_loyalty_wallet(user_id)
    points = int(points or 0)
    if points <= 0:
        raise ValueError("Points must be greater than zero")
    if wallet.points < points:
        raise ValueError("Insufficient points")

    wallet.points -= points
    wallet.updated_at = datetime.utcnow()
    db.session.add(
        LoyaltyLog(
            user_id=user_id,
            points=-points,
            reason="redeemed",
            order_id=None,
        )
    )
    return wallet

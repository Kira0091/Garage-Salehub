from database import db, Notification


def create_notification(user_id, type, title, body, link=""):
    note = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link or "",
    )
    db.session.add(note)
    return note

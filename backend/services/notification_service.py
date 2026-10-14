# DFD 7.0 - In-App Notification Bell & Email Dispatcher Service
import logging
from database import db
from models import Notification, User

logger = logging.getLogger(__name__)

def create_in_app_notification(user_id, title, message, issue_id=None, notification_type="status_change"):
    """Creates persistent in-app notification bell record."""
    if not user_id:
        return None
        
    notification = Notification(
        user_id=user_id,
        issue_id=issue_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )
    db.session.add(notification)
    db.session.commit()
    
    # Also attempt dispatching email / SMS stub
    dispatch_external_alert(user_id, title, message)
    return notification

def dispatch_external_alert(user_id, title, message):
    """
    Sends email alert via SMTP and SMS alert via SMS gateway stub (with graceful fallback).
    """
    user = User.query.get(user_id)
    if not user:
        return

    # Email Channel (Flask-Mail / SMTP)
    if user.email:
        logger.info(f"[EMAIL DISPATCH] To: {user.email} ({user.role}) | Subject: {title} | Body: {message}")
        print(f"[EMAIL NOTIFICATION TO {user.email}] {title}: {message}")

    # SMS Channel (Twilio / National SMS gateway stub)
    if user.phone:
        logger.info(f"[SMS DISPATCH] To: {user.phone} | Body: CivicConnect: {title} - {message}")
        print(f"[SMS NOTIFICATION TO {user.phone}] CivicConnect: {title} - {message}")


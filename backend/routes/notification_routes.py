# DFD 7.0 - In-App Notification Bell & Alert Endpoints
from flask import Blueprint, request, jsonify
from database import db
from models import Notification
from services.auth_service import token_required

notification_bp = Blueprint("notification_bp", __name__, url_prefix="/api/notifications")

@notification_bp.route("", methods=["GET"])
@token_required
def get_user_notifications(current_user):
    """
    DFD 7.0 - Retrieve notifications for authenticated citizen, officer, or admin.
    Supports query parameters: unread_only (bool), limit (int).
    """
    unread_only = request.args.get("unread_only", "false").lower() == "true"
    limit = min(int(request.args.get("limit", 30)), 100)

    query = Notification.query.filter_by(user_id=current_user.id)
    if unread_only:
        query = query.filter_by(is_read=False)

    total_unread = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    return jsonify({
        "total_unread": total_unread,
        "count": len(notifications),
        "notifications": [n.to_dict() for n in notifications]
    }), 200

@notification_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@token_required
def mark_notification_read(current_user, notification_id):
    """Mark a single notification as read."""
    notification = db.session.get(Notification, notification_id)
    if not notification:
        return jsonify({"error": "Notification not found"}), 404

    if notification.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    notification.is_read = True
    db.session.commit()

    return jsonify({
        "message": "Notification marked as read",
        "notification": notification.to_dict()
    }), 200

@notification_bp.route("/mark-all-read", methods=["POST"])
@token_required
def mark_all_notifications_read(current_user):
    """Mark all unread notifications for current user as read."""
    updated_count = Notification.query.filter_by(
        user_id=current_user.id, 
        is_read=False
    ).update({"is_read": True})
    db.session.commit()

    return jsonify({
        "message": f"All {updated_count} notifications marked as read",
        "updated_count": updated_count
    }), 200

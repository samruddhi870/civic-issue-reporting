# DFD 2.0, 3.0, 4.0, 5.0, 8.0 - Issue Lifecycle, Reporting & Status Management Routes
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from database import db
from models import Issue, IssuePhoto, StatusLog, Comment, Upvote, User, Feedback
from services.auth_service import token_required, optional_token
from services.image_service import process_and_save_image
from services.routing_service import generate_ticket_number, route_issue_to_department, auto_assign_officer
from services.sla_service import calculate_priority_score, find_spatial_duplicates
from services.notification_service import create_in_app_notification

issue_bp = Blueprint("issue_bp", __name__, url_prefix="/api/issues")

@issue_bp.route("/duplicates", methods=["GET"])
def check_duplicates():
    """DFD 2.0 - Check if an identical category issue exists within 50 meters."""
    category = request.args.get("category", "").strip()
    try:
        lat = float(request.args.get("latitude", 0))
        lng = float(request.args.get("longitude", 0))
        radius = float(request.args.get("radius_meters", 50))
    except ValueError:
        return jsonify({"error": "Valid latitude and longitude are required"}), 400

    if not category or not lat or not lng:
        return jsonify({"duplicates": []}), 200

    duplicates = find_spatial_duplicates(category, lat, lng, radius_meters=radius)
    return jsonify({"duplicates": duplicates}), 200

@issue_bp.route("", methods=["POST"])
@optional_token
def report_issue(current_user):
    """
    DFD 2.0 & 3.0 - Report a civic issue with photos, GPS, category, 
    auto-department routing and officer auto-assignment.
    """
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    category = request.form.get("category", "").strip()
    severity = request.form.get("severity", "medium").strip().lower()
    address = request.form.get("address", "").strip()
    ward_area = request.form.get("ward_area", "").strip()
    is_anonymous = request.form.get("is_anonymous", "false").lower() == "true"

    try:
        latitude = float(request.form.get("latitude", 0))
        longitude = float(request.form.get("longitude", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Valid latitude and longitude are required"}), 400

    if not title or not description or not category:
        return jsonify({"error": "Title, description, and category are required"}), 400

    # Rate limiting & spam check: max 5 reports per user/IP within last 10 minutes
    now = datetime.now(timezone.utc)
    ten_mins_ago = now - timedelta(minutes=10)
    if current_user:
        recent_count = Issue.query.filter(
            Issue.citizen_id == current_user.id,
            Issue.created_at >= ten_mins_ago
        ).count()
        if recent_count >= 5:
            return jsonify({"error": "Rate limit exceeded. Please wait a few minutes before submitting another report."}), 429

    # Generate sequential unique ticket ID e.g. CC-2026-00001
    ticket_number = generate_ticket_number()

    # Auto-Route to department & calculate SLA deadline
    department_id, sla_hours = route_issue_to_department(category)
    assigned_officer_id = auto_assign_officer(department_id)
    sla_deadline = now + timedelta(hours=sla_hours)

    issue = Issue(
        ticket_number=ticket_number,
        citizen_id=current_user.id if current_user and not is_anonymous else (current_user.id if current_user else None),
        is_anonymous=is_anonymous,
        title=title,
        description=description,
        category=category,
        severity=severity if severity in ["low", "medium", "high", "emergency"] else "medium",
        department_id=department_id,
        assigned_officer_id=assigned_officer_id,
        latitude=latitude,
        longitude=longitude,
        address=address or f"Coordinates: {latitude:.4f}, {longitude:.4f}",
        ward_area=ward_area or "Municipal Ward",
        status="Submitted",
        sla_hours=sla_hours,
        sla_deadline=sla_deadline,
        created_at=now,
        upvote_count=0,
        reopened_count=0,
        priority_score=15.0
    )
    
    # Calculate initial priority score
    issue.priority_score = calculate_priority_score(issue)

    db.session.add(issue)
    db.session.flush()  # Obtain issue.id

    # Handle file uploads (up to 3 photos) with EXIF stripping
    uploaded_files = request.files.getlist("photos") or request.files.getlist("photo")
    saved_photos = 0
    for file_storage in uploaded_files:
        if file_storage and file_storage.filename and saved_photos < 3:
            photo_data, error = process_and_save_image(file_storage, folder="uploads")
            if photo_data:
                photo = IssuePhoto(
                    issue_id=issue.id,
                    photo_type="before",
                    image_url=photo_data["image_url"],
                    file_size=photo_data["file_size"],
                    mime_type=photo_data["mime_type"]
                )
                db.session.add(photo)
                saved_photos += 1

    # Add audit log for creation
    log = StatusLog(
        issue_id=issue.id,
        from_status=None,
        to_status="Submitted",
        changed_by_user_id=current_user.id if current_user else None,
        remarks=f"Issue logged. Auto-routed to department ({sla_hours}h SLA). Assigned to officer."
    )
    db.session.add(log)
    db.session.commit()

    # DFD 7.0 - Dispatch notifications
    if current_user and not is_anonymous:
        create_in_app_notification(
            user_id=current_user.id,
            title="Grievance Registered",
            message=f"Your ticket {issue.ticket_number} has been logged with a {sla_hours}-hour resolution deadline.",
            issue_id=issue.id,
            notification_type="created"
        )
    
    if assigned_officer_id:
        create_in_app_notification(
            user_id=assigned_officer_id,
            title="New Grievance Assigned",
            message=f"Ticket {issue.ticket_number} ({issue.category}) has been assigned to you. SLA: {sla_hours} hrs.",
            issue_id=issue.id,
            notification_type="assigned"
        )

    return jsonify({
        "message": "Grievance reported successfully",
        "issue": issue.to_dict(include_details=True)
    }), 201

@issue_bp.route("", methods=["GET"])
@optional_token
def get_issues(current_user):
    """
    DFD 2.0 & 4.0 - List issues with filtering, pagination and sorting.
    """
    category = request.args.get("category")
    status = request.args.get("status")
    department_id = request.args.get("department_id")
    is_overdue = request.args.get("is_overdue")
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort_by", "priority")  # priority, sla, created
    
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 100))
    except ValueError:
        page, limit = 1, 100

    query = Issue.query

    if category:
        query = query.filter_by(category=category)
    if status:
        query = query.filter_by(status=status)
    if department_id:
        query = query.filter_by(department_id=department_id)
    if is_overdue and is_overdue.lower() == "true":
        now = datetime.now(timezone.utc)
        query = query.filter(
            Issue.sla_deadline < now,
            Issue.status.notin_(["Resolved", "Closed"])
        )
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Issue.title.ilike(search_pattern)) | 
            (Issue.description.ilike(search_pattern)) | 
            (Issue.ticket_number.ilike(search_pattern)) |
            (Issue.address.ilike(search_pattern))
        )

    if sort_by == "sla":
        query = query.order_by(Issue.sla_deadline.asc())
    elif sort_by == "created":
        query = query.order_by(Issue.created_at.desc())
    else:  # priority default
        query = query.order_by(Issue.priority_score.desc(), Issue.created_at.desc())

    total = query.count()
    issues = query.offset((page - 1) * limit).limit(limit).all()

    user_upvoted_issue_ids = set()
    if current_user:
        upvotes = Upvote.query.filter_by(user_id=current_user.id).all()
        user_upvoted_issue_ids = {u.issue_id for u in upvotes}

    issue_dicts = []
    for issue in issues:
        d = issue.to_dict()
        d["has_upvoted"] = issue.id in user_upvoted_issue_ids
        issue_dicts.append(d)

    return jsonify({
        "total": total,
        "page": page,
        "limit": limit,
        "issues": issue_dicts
    }), 200

@issue_bp.route("/my-reports", methods=["GET"])
@token_required
def get_my_reports(current_user):
    """DFD 2.0 - Retrieve all reports submitted by the authenticated citizen."""
    issues = Issue.query.filter_by(citizen_id=current_user.id)\
                        .order_by(Issue.created_at.desc()).all()
    return jsonify({
        "issues": [issue.to_dict() for issue in issues]
    }), 200

@issue_bp.route("/<int:issue_id>", methods=["GET"])
@optional_token
def get_issue_by_id(current_user, issue_id):
    """DFD 2.0 & 4.0 - Retrieve full issue details including photos, logs, comments."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    data = issue.to_dict(include_details=True)
    if current_user:
        has_upvoted = Upvote.query.filter_by(issue_id=issue.id, user_id=current_user.id).first() is not None
        data["has_upvoted"] = has_upvoted
    else:
        data["has_upvoted"] = False
    return jsonify({
        "issue": data
    }), 200

@issue_bp.route("/ticket/<string:ticket_number>", methods=["GET"])
@optional_token
def get_issue_by_ticket(current_user, ticket_number):
    """Lookup issue by ticket number e.g. CC-2026-00001."""
    issue = Issue.query.filter_by(ticket_number=ticket_number).first()
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    data = issue.to_dict(include_details=True)
    if current_user:
        has_upvoted = Upvote.query.filter_by(issue_id=issue.id, user_id=current_user.id).first() is not None
        data["has_upvoted"] = has_upvoted
    else:
        data["has_upvoted"] = False
    return jsonify({
        "issue": data
    }), 200


@issue_bp.route("/<int:issue_id>/upvote", methods=["POST"])
@token_required
def toggle_upvote(current_user, issue_id):
    """DFD 4.0 - Upvote an issue ('Me Too') to raise its priority score."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    existing_upvote = Upvote.query.filter_by(issue_id=issue.id, user_id=current_user.id).first()
    if existing_upvote:
        db.session.delete(existing_upvote)
        issue.upvote_count = max(0, issue.upvote_count - 1)
        upvoted = False
    else:
        new_upvote = Upvote(issue_id=issue.id, user_id=current_user.id)
        db.session.add(new_upvote)
        issue.upvote_count += 1
        upvoted = True

    issue.priority_score = calculate_priority_score(issue)
    db.session.commit()

    return jsonify({
        "upvoted": upvoted,
        "upvote_count": issue.upvote_count,
        "priority_score": issue.priority_score
    }), 200

@issue_bp.route("/<int:issue_id>/comments", methods=["GET"])
def get_comments(issue_id):
    """Get comments for an issue."""
    comments = Comment.query.filter_by(issue_id=issue_id).order_by(Comment.created_at.asc()).all()
    return jsonify({"comments": [c.to_dict() for c in comments]}), 200

@issue_bp.route("/<int:issue_id>/comments", methods=["POST"])
@token_required
def add_comment(current_user, issue_id):
    """Add a comment (citizen or official officer comment)."""
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Comment content cannot be empty"}), 400

    is_official = current_user.role in ["officer", "admin"]
    comment = Comment(
        issue_id=issue.id,
        user_id=current_user.id,
        is_official=is_official,
        content=content
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify({"comment": comment.to_dict()}), 201

@issue_bp.route("/assigned", methods=["GET"])
@token_required
def get_assigned_issues(current_user):
    """
    DFD 3.0 & 5.0 - Retrieve issues assigned to the authenticated officer or department.
    """
    if current_user.role not in ["officer", "admin"]:
        return jsonify({"error": "Only authority officers and admins can access assigned queues"}), 403

    status_filter = request.args.get("status")
    department_view = request.args.get("department_view", "false").lower() == "true"

    query = Issue.query

    if current_user.role == "officer":
        if department_view and current_user.department_id:
            query = query.filter_by(department_id=current_user.department_id)
        else:
            query = query.filter_by(assigned_officer_id=current_user.id)
    elif current_user.role == "admin" and request.args.get("department_id"):
        query = query.filter_by(department_id=int(request.args.get("department_id")))

    if status_filter:
        query = query.filter_by(status=status_filter)

    # Sort primarily by SLA urgency (closest deadline first)
    issues = query.order_by(Issue.sla_deadline.asc()).all()

    return jsonify({
        "total": len(issues),
        "issues": [issue.to_dict() for issue in issues]
    }), 200

@issue_bp.route("/<int:issue_id>/status", methods=["PATCH"])
@token_required
def update_issue_status(current_user, issue_id):
    """
    DFD 5.0 - Authority Officer Status Update Workflow
    Transitions: Submitted -> Acknowledged -> In Progress -> Resolved
    """
    if current_user.role not in ["officer", "admin"]:
        return jsonify({"error": "Permission denied. Officer role required."}), 403

    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    # Enforce departmental guard for officers
    if current_user.role == "officer" and current_user.department_id != issue.department_id and current_user.id != issue.assigned_officer_id:
        return jsonify({"error": "Unauthorized: Issue belongs to another department"}), 403

    # Handle JSON or multipart form
    if request.is_json:
        data = request.get_json() or {}
        new_status = data.get("status")
        remarks = data.get("remarks", "").strip()
    else:
        new_status = request.form.get("status")
        remarks = request.form.get("remarks", "").strip()

    valid_statuses = ["Acknowledged", "In Progress", "Resolved", "Closed"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Allowed: {', '.join(valid_statuses)}"}), 400

    from_status = issue.status
    if from_status == new_status:
        return jsonify({"message": "Status unchanged", "issue": issue.to_dict(include_details=True)}), 200

    # Handle resolution photo upload if provided
    now = datetime.now(timezone.utc)
    resolution_photo = request.files.get("resolution_photo") or request.files.get("photo")

    # DFD 5.0 - Mandatory Resolution Proof: Cannot mark Resolved without "after" photo
    if new_status == "Resolved" and not resolution_photo and not issue.resolution_proof_url:
        return jsonify({
            "error": "Mandatory resolution proof photo ('after' photo) is required to mark an issue as Resolved"
        }), 400

    if resolution_photo:
        photo_data, err = process_and_save_image(resolution_photo, folder="uploads")
        if err:
            return jsonify({"error": f"Resolution photo processing failed: {err}"}), 400
        if photo_data:
            issue.resolution_proof_url = photo_data["image_url"]
            after_photo = IssuePhoto(
                issue_id=issue.id,
                photo_type="after",
                image_url=photo_data["image_url"],
                file_size=photo_data["file_size"],
                mime_type=photo_data["mime_type"],
                created_at=now
            )
            db.session.add(after_photo)

    # If transitioning to Resolved
    if new_status == "Resolved":
        issue.resolved_at = now
        issue.resolution_remarks = remarks or "Resolution completed by department officer."
    elif new_status == "Closed":
        issue.closed_at = now

    issue.status = new_status
    issue.updated_at = now

    # Append Audit Log
    status_log = StatusLog(
        issue_id=issue.id,
        from_status=from_status,
        to_status=new_status,
        changed_by_user_id=current_user.id,
        remarks=remarks or f"Officer transitioned status to {new_status}.",
        created_at=now
    )
    db.session.add(status_log)
    db.session.commit()

    # DFD 7.0 - Dispatch notification to reporting citizen
    if issue.citizen_id:
        create_in_app_notification(
            user_id=issue.citizen_id,
            title=f"Grievance {issue.ticket_number} Updated",
            message=f"Status changed from {from_status} to {new_status}. Remarks: {remarks or 'None'}",
            issue_id=issue.id,
            notification_type="status_change"
        )

    return jsonify({
        "message": f"Status updated to {new_status} successfully",
        "issue": issue.to_dict(include_details=True)
    }), 200

@issue_bp.route("/<int:issue_id>/confirm", methods=["POST"])
@token_required
def confirm_issue_resolution(current_user, issue_id):
    """
    DFD 8.0 - Citizen confirms resolution, closes ticket, and submits 1-5 star feedback.
    """
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    # Permission check: reporting citizen or admin
    if current_user.role != "admin" and issue.citizen_id and issue.citizen_id != current_user.id:
        return jsonify({"error": "Unauthorized: Only the reporting citizen can confirm resolution"}), 403

    if issue.status != "Resolved":
        return jsonify({"error": f"Cannot confirm ticket in status '{issue.status}'. Must be 'Resolved'."}), 400

    data = request.get_json() or {}
    try:
        rating = int(data.get("rating", 5))
        if not (1 <= rating <= 5):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    comments = data.get("comments", "").strip()
    is_satisfied = bool(data.get("is_satisfied", rating >= 3))
    now = datetime.now(timezone.utc)

    # Transition to Closed
    issue.status = "Closed"
    issue.closed_at = now
    issue.updated_at = now

    # Upsert Feedback
    if issue.feedback:
        issue.feedback.rating = rating
        issue.feedback.comments = comments
        issue.feedback.is_satisfied = is_satisfied
        issue.feedback.created_at = now
    else:
        fb = Feedback(
            issue_id=issue.id,
            citizen_id=current_user.id,
            rating=rating,
            comments=comments,
            is_satisfied=is_satisfied,
            created_at=now
        )
        db.session.add(fb)

    # Append Audit Log
    status_log = StatusLog(
        issue_id=issue.id,
        from_status="Resolved",
        to_status="Closed",
        changed_by_user_id=current_user.id,
        remarks=f"Citizen confirmed resolution. Rated {rating}/5 stars. '{comments or 'No remarks'}'",
        created_at=now
    )
    db.session.add(status_log)
    db.session.commit()

    # Alert Assigned Officer of successful closure and rating
    if issue.assigned_officer_id:
        create_in_app_notification(
            user_id=issue.assigned_officer_id,
            title=f"Resolution Confirmed: {issue.ticket_number}",
            message=f"Citizen confirmed resolution for '{issue.title}' and gave a {rating}/5 star rating.",
            issue_id=issue.id,
            notification_type="resolution_confirmed"
        )

    return jsonify({
        "message": "Resolution confirmed and ticket successfully closed. Thank you for your feedback!",
        "issue": issue.to_dict(include_details=True)
    }), 200

@issue_bp.route("/<int:issue_id>/reopen", methods=["POST"])
@token_required
def reopen_issue(current_user, issue_id):
    """
    DFD 8.0 - Citizen rejects resolution proof and reopens grievance within 72-hour window.
    """
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404

    # Permission check: reporting citizen or admin
    if current_user.role != "admin" and issue.citizen_id and issue.citizen_id != current_user.id:
        return jsonify({"error": "Unauthorized: Only the reporting citizen can reopen this grievance"}), 403

    if issue.status not in ["Resolved", "Closed"]:
        return jsonify({"error": f"Cannot reopen ticket in status '{issue.status}'. Must be 'Resolved' or recently 'Closed'."}), 400

    now = datetime.now(timezone.utc)
    if issue.resolved_at:
        res_utc = issue.resolved_at.replace(tzinfo=timezone.utc) if issue.resolved_at.tzinfo is None else issue.resolved_at
        elapsed_seconds = (now - res_utc).total_seconds()
        if elapsed_seconds > 72 * 3600:
            return jsonify({"error": "The 72-hour citizen review window has expired. Please report a new issue if needed."}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason or len(reason) < 5:
        return jsonify({"error": "A specific reason (minimum 5 characters) is required to reopen this grievance"}), 400

    from_status = issue.status
    issue.status = "Reopened"
    issue.reopened_count += 1
    issue.updated_at = now
    issue.priority_score = calculate_priority_score(issue)

    # Append Audit Log
    status_log = StatusLog(
        issue_id=issue.id,
        from_status=from_status,
        to_status="Reopened",
        changed_by_user_id=current_user.id,
        remarks=f"Citizen rejected resolution and reopened grievance: {reason}",
        created_at=now
    )
    db.session.add(status_log)
    db.session.commit()

    # Alert Assigned Officer & Department Head of reopened issue
    if issue.assigned_officer_id:
        create_in_app_notification(
            user_id=issue.assigned_officer_id,
            title=f"GRIEVANCE REOPENED: {issue.ticket_number}",
            message=f"Citizen rejected resolution proof for '{issue.title}'. Reason: {reason}. Urgency increased.",
            issue_id=issue.id,
            notification_type="issue_reopened"
        )

    if issue.department and issue.department.head_user_id:
        create_in_app_notification(
            user_id=issue.department.head_user_id,
            title=f"Grievance Reopened: {issue.ticket_number}",
            message=f"Ticket '{issue.title}' was reopened by citizen following resolution rejection.",
            issue_id=issue.id,
            notification_type="issue_reopened"
        )

    return jsonify({
        "message": "Grievance has been reopened and prioritized for departmental rework.",
        "issue": issue.to_dict(include_details=True)
    }), 200



# DFD 9.0 - Municipal Analytics, Performance Gauges & CSV Export Routes
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response
from database import db
from models import Issue, Department, User, Feedback, SlaRule
from services.auth_service import token_required, role_required
from services.export_service import generate_issues_csv

analytics_bp = Blueprint("analytics_bp", __name__, url_prefix="/api/analytics")

@analytics_bp.route("/summary", methods=["GET"])
def get_analytics_summary():
    """
    DFD 9.0 - Overall Municipal KPI summary:
    - SLA Compliance Rate (%)
    - Average Resolution Time (ART) in hours
    - Total Issues breakdown
    - Average Citizen Satisfaction Rating
    """
    all_issues = Issue.query.all()
    total_count = len(all_issues)
    if total_count == 0:
        return jsonify({
            "total_issues": 0,
            "active_issues": 0,
            "resolved_issues": 0,
            "closed_issues": 0,
            "overdue_issues": 0,
            "sla_compliance_rate": 100.0,
            "avg_resolution_hours": 0.0,
            "avg_citizen_rating": 5.0,
            "total_feedback_count": 0
        }), 200

    now = datetime.now(timezone.utc)
    active_count = 0
    resolved_count = 0
    closed_count = 0
    overdue_count = 0
    
    on_time_resolved_count = 0
    total_resolved_time_seconds = 0
    completed_with_time_count = 0

    for issue in all_issues:
        dead_utc = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline
        created_utc = issue.created_at.replace(tzinfo=timezone.utc) if issue.created_at.tzinfo is None else issue.created_at

        if issue.status in ["Resolved", "Closed"]:
            if issue.status == "Resolved":
                resolved_count += 1
            else:
                closed_count += 1

            if issue.resolved_at:
                res_utc = issue.resolved_at.replace(tzinfo=timezone.utc) if issue.resolved_at.tzinfo is None else issue.resolved_at
                diff_sec = (res_utc - created_utc).total_seconds()
                total_resolved_time_seconds += max(0, diff_sec)
                completed_with_time_count += 1

                if res_utc <= dead_utc:
                    on_time_resolved_count += 1
            else:
                on_time_resolved_count += 1
        else:
            active_count += 1
            if now > dead_utc:
                overdue_count += 1

    total_completed = resolved_count + closed_count
    sla_compliance_rate = round((on_time_resolved_count / total_completed * 100.0), 1) if total_completed > 0 else 100.0
    avg_resolution_hours = round((total_resolved_time_seconds / completed_with_time_count / 3600.0), 1) if completed_with_time_count > 0 else 0.0

    # Citizen Ratings
    feedbacks = Feedback.query.all()
    avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 5.0

    return jsonify({
        "total_issues": total_count,
        "active_issues": active_count,
        "resolved_issues": resolved_count,
        "closed_issues": closed_count,
        "overdue_issues": overdue_count,
        "sla_compliance_rate": sla_compliance_rate,
        "avg_resolution_hours": avg_resolution_hours,
        "avg_citizen_rating": avg_rating,
        "total_feedback_count": len(feedbacks)
    }), 200

@analytics_bp.route("/by-department", methods=["GET"])
def get_department_analytics():
    """DFD 9.0 - Performance metrics per department."""
    departments = Department.query.all()
    dept_stats = []
    now = datetime.now(timezone.utc)

    for dept in departments:
        issues = Issue.query.filter_by(department_id=dept.id).all()
        total = len(issues)
        resolved = sum(1 for i in issues if i.status in ["Resolved", "Closed"])
        active = total - resolved
        overdue = 0
        on_time = 0

        for i in issues:
            dead_utc = i.sla_deadline.replace(tzinfo=timezone.utc) if i.sla_deadline.tzinfo is None else i.sla_deadline
            if i.status in ["Resolved", "Closed"]:
                if i.resolved_at:
                    res_utc = i.resolved_at.replace(tzinfo=timezone.utc) if i.resolved_at.tzinfo is None else i.resolved_at
                    if res_utc <= dead_utc:
                        on_time += 1
                else:
                    on_time += 1
            elif now > dead_utc:
                overdue += 1

        compliance = round((on_time / resolved * 100.0), 1) if resolved > 0 else 100.0

        dept_stats.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "total_issues": total,
            "active_issues": active,
            "resolved_issues": resolved,
            "overdue_issues": overdue,
            "sla_compliance_rate": compliance
        })

    return jsonify({"departments": dept_stats}), 200

@analytics_bp.route("/by-category", methods=["GET"])
def get_category_analytics():
    """Distribution of issues by category."""
    all_issues = Issue.query.all()
    cat_counts = {}
    for i in all_issues:
        cat = i.category or "Other"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    return jsonify({"categories": cat_counts}), 200

@analytics_bp.route("/leaderboard", methods=["GET"])
def get_officer_leaderboard():
    """DFD 9.0 - Officer performance velocity and citizen satisfaction ranking."""
    officers = User.query.filter_by(role="officer").all()
    leaderboard = []

    for off in officers:
        assigned = Issue.query.filter_by(assigned_officer_id=off.id).all()
        total_assigned = len(assigned)
        resolved_issues = [i for i in assigned if i.status in ["Resolved", "Closed"]]
        resolved_count = len(resolved_issues)

        on_time_count = 0
        total_hours = 0.0
        counted_hours = 0
        ratings = []

        for r in resolved_issues:
            dead_utc = r.sla_deadline.replace(tzinfo=timezone.utc) if r.sla_deadline.tzinfo is None else r.sla_deadline
            created_utc = r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at

            if r.resolved_at:
                res_utc = r.resolved_at.replace(tzinfo=timezone.utc) if r.resolved_at.tzinfo is None else r.resolved_at
                diff = (res_utc - created_utc).total_seconds() / 3600.0
                total_hours += max(0, diff)
                counted_hours += 1
                if res_utc <= dead_utc:
                    on_time_count += 1
            else:
                on_time_count += 1

            if r.feedback:
                ratings.append(r.feedback.rating)

        on_time_pct = round((on_time_count / resolved_count * 100.0), 1) if resolved_count > 0 else 100.0
        avg_hours = round((total_hours / counted_hours), 1) if counted_hours > 0 else 0.0
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 5.0

        leaderboard.append({
            "officer_id": off.id,
            "officer_name": off.full_name,
            "department_name": off.department.name if off.department else "Unassigned",
            "total_assigned": total_assigned,
            "resolved_count": resolved_count,
            "on_time_pct": on_time_pct,
            "avg_resolution_hours": avg_hours,
            "avg_citizen_rating": avg_rating
        })

    leaderboard.sort(key=lambda x: (x["resolved_count"], x["on_time_pct"], x["avg_citizen_rating"]), reverse=True)
    return jsonify({"leaderboard": leaderboard}), 200

@analytics_bp.route("/heatmap", methods=["GET"])
def get_heatmap_points():
    """Latitude, longitude and intensity points for spatial heatmap rendering."""
    issues = Issue.query.filter(Issue.status.notin_(["Closed"])).all()
    points = []
    now = datetime.now(timezone.utc)

    for i in issues:
        if i.latitude and i.longitude:
            dead_utc = i.sla_deadline.replace(tzinfo=timezone.utc) if i.sla_deadline.tzinfo is None else i.sla_deadline
            intensity = 0.5
            if now > dead_utc or i.is_critical_overdue:
                intensity = 1.0
            elif i.severity in ["emergency", "high"]:
                intensity = 0.8
            elif i.upvote_count > 2:
                intensity = 0.7

            points.append({
                "latitude": i.latitude,
                "longitude": i.longitude,
                "intensity": intensity,
                "ticket_number": i.ticket_number,
                "category": i.category
            })

    return jsonify({"points": points}), 200

@analytics_bp.route("/export/csv", methods=["GET"])
def export_csv():
    """DFD 9.0 - Download RFC 4180 CSV report."""
    csv_data = generate_issues_csv()
    filename = f"civicconnect_issues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@analytics_bp.route("/export/pdf", methods=["GET"])
def export_pdf():
    """DFD 9.0 - Download Executive PDF Audit report."""
    from services.export_service import generate_issues_pdf
    pdf_bytes = generate_issues_pdf()
    filename = f"civicconnect_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


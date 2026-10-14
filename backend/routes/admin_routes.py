# DFD 3.0 & 9.0 - Department Management & Administrative Operations
from flask import Blueprint, request, jsonify
from database import db
from models import Department, User, SlaRule, Issue
from services.auth_service import token_required, role_required

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api")

@admin_bp.route("/departments", methods=["GET"])
def get_departments():
    """DFD 3.0 - Retrieve all municipal departments with head officers and SLA rules."""
    departments = Department.query.all()
    result = []
    for dept in departments:
        head_user = db.session.get(User, dept.head_user_id) if dept.head_user_id else None
        officers = User.query.filter_by(department_id=dept.id, role="officer").all()
        sla_rules = SlaRule.query.filter_by(department_id=dept.id).all()
        
        dept_dict = dept.to_dict()
        dept_dict["head_officer_name"] = head_user.full_name if head_user else "Not Assigned"
        dept_dict["officers"] = [off.to_dict() for off in officers]
        dept_dict["sla_rules"] = [rule.to_dict() for rule in sla_rules]
        result.append(dept_dict)

    return jsonify({"departments": result}), 200

@admin_bp.route("/departments/<int:dept_id>/issues", methods=["GET"])
@token_required
def get_department_issues(current_user, dept_id):
    """DFD 3.0 - Get all grievances under a specific department."""
    dept = db.session.get(Department, dept_id)
    if not dept:
        return jsonify({"error": "Department not found"}), 404

    # Authorization: Officers can view their own dept, Admins can view any dept
    if current_user.role == "officer" and current_user.department_id != dept.id:
        return jsonify({"error": "Unauthorized to view other department queues"}), 403

    issues = Issue.query.filter_by(department_id=dept.id).order_by(Issue.sla_deadline.asc()).all()
    return jsonify({
        "department": dept.to_dict(),
        "issues": [issue.to_dict() for issue in issues]
    }), 200

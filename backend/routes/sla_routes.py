# DFD 4.0 & 6.0 - SLA Matrix & Manual Trigger Routes
from flask import Blueprint, request, jsonify
from database import db
from models import SlaRule
from services.auth_service import token_required
from services.escalation_service import check_sla_and_escalate

sla_bp = Blueprint("sla_bp", __name__, url_prefix="/api/sla")

@sla_bp.route("/matrix", methods=["GET"])
def get_sla_matrix():
    """
    DFD 4.0 - Returns SLA resolution timelines and escalation thresholds by category.
    """
    rules = SlaRule.query.all()
    return jsonify({
        "rules": [rule.to_dict() for rule in rules]
    }), 200

@sla_bp.route("/trigger-check", methods=["POST"])
@token_required
def trigger_sla_check(current_user):
    """
    DFD 6.0 - Manually executes SLA checks & escalation evaluations.
    Restricted to Authority Officers and Admins.
    """
    if current_user.role not in ["officer", "admin"]:
        return jsonify({"error": "Permission denied. Officer or Admin role required."}), 403

    summary = check_sla_and_escalate()
    return jsonify({
        "message": "SLA & Escalation check completed successfully",
        "summary": summary
    }), 200

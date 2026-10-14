# DFD 3.0 - Department Auto-Routing & Officer Assignment Service
from datetime import datetime, timezone, timedelta
from database import db
from models import Department, SlaRule, User, Issue

CATEGORY_DEPT_CODE_MAP = {
    "Water leakage": "WATER",
    "Open manhole": "WATER",
    "Garbage / Waste": "SANITATION",
    "Streetlight / Electricity": "LIGHTING",
    "Pothole / Road damage": "ROADS",
    "Other": "GENERAL"
}

DEFAULT_SLA_HOURS = {
    "Water leakage": 24,
    "Open manhole": 24,
    "Garbage / Waste": 48,
    "Streetlight / Electricity": 48,
    "Pothole / Road damage": 120,
    "Other": 168
}

def generate_ticket_number():
    """Generates sequential unique ticket ID e.g. CC-2026-00001."""
    year = datetime.now(timezone.utc).year
    # Count issues created in current year
    prefix = f"CC-{year}-"
    last_issue = Issue.query.filter(Issue.ticket_number.like(f"{prefix}%"))\
                            .order_by(Issue.id.desc()).first()
    
    if last_issue and last_issue.ticket_number:
        try:
            last_seq = int(last_issue.ticket_number.split("-")[-1])
            seq = last_seq + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    
    return f"CC-{year}-{seq:05d}"

def route_issue_to_department(category):
    """
    Finds matching Department and SLA duration for a category.
    Returns: (department_id, sla_hours)
    """
    # Check if a custom SLA rule exists in DB
    rule = SlaRule.query.filter_by(category=category).first()
    if rule:
        return rule.department_id, rule.sla_hours

    # Fallback to category code mapping
    dept_code = CATEGORY_DEPT_CODE_MAP.get(category, "GENERAL")
    department = Department.query.filter_by(code=dept_code).first()
    
    if not department:
        # Fallback to first available department
        department = Department.query.first()
        if not department:
            # Create default General department if empty
            department = Department(name="General Administration", code="GENERAL", description="Default department")
            db.session.add(department)
            db.session.commit()

    sla_hours = DEFAULT_SLA_HOURS.get(category, 168)
    return department.id, sla_hours

def auto_assign_officer(department_id):
    """
    Selects officer in department with the lowest active caseload.
    Active statuses: Submitted, Acknowledged, In Progress.
    """
    officers = User.query.filter_by(department_id=department_id, role="officer", is_active=True).all()
    if not officers:
        return None

    # Load-balanced assignment: find officer with fewest active issues
    officer_caseloads = []
    for off in officers:
        active_count = Issue.query.filter(
            Issue.assigned_officer_id == off.id,
            Issue.status.in_(["Submitted", "Acknowledged", "In Progress"])
        ).count()
        officer_caseloads.append((active_count, off))

    officer_caseloads.sort(key=lambda x: x[0])
    selected_officer = officer_caseloads[0][1]
    return selected_officer.id

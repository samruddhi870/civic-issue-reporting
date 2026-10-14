# DFD 4.0 - SLA Timer, Priority Scoring & Spatial Duplicate Calculation
import math
from datetime import datetime, timezone, timedelta
from models import Issue

SEVERITY_WEIGHTS = {
    "emergency": 40.0,
    "high": 25.0,
    "medium": 15.0,
    "low": 5.0
}

def calculate_priority_score(issue):
    """
    Computes dynamic priority score:
    Score = Severity Weight + (1.5 * Upvotes) + (2.0 * Days Overdue) + (1.0 * Reopened Count)
    """
    base_weight = SEVERITY_WEIGHTS.get(issue.severity.lower() if issue.severity else "medium", 15.0)
    upvote_contribution = 1.5 * float(issue.upvote_count or 0)
    
    # Check days overdue
    now = datetime.now(timezone.utc)
    deadline_utc = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline
    
    if issue.status not in ["Resolved", "Closed"] and now > deadline_utc:
        overdue_days = (now - deadline_utc).total_seconds() / 86400.0
    else:
        overdue_days = 0.0
        
    overdue_contribution = 2.0 * max(0.0, overdue_days)
    reopen_contribution = 1.0 * float(issue.reopened_count or 0)
    
    return round(base_weight + upvote_contribution + overdue_contribution + reopen_contribution, 2)

def haversine_distance_meters(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c

def find_spatial_duplicates(category, lat, lng, radius_meters=50.0):
    """
    Searches active issues in the same category within radius_meters.
    Returns list of matching existing issues.
    """
    active_issues = Issue.query.filter(
        Issue.category == category,
        Issue.status.notin_(["Closed"])
    ).all()

    duplicates = []
    for issue in active_issues:
        distance = haversine_distance_meters(lat, lng, issue.latitude, issue.longitude)
        if distance <= radius_meters:
            duplicates.append({
                "issue": issue.to_dict(),
                "distance_meters": round(distance, 1)
            })

    duplicates.sort(key=lambda x: x["distance_meters"])
    return duplicates

# DFD 1.0-9.0 - Unified Database Schema Models
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database import db

class User(db.Model):
    # DFD 1.0 - Register / Login User Store
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(20), nullable=False, default="citizen")  # citizen, officer, admin
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = db.relationship("Department", back_populates="officers", foreign_keys=[department_id])
    reported_issues = db.relationship("Issue", back_populates="citizen", foreign_keys="Issue.citizen_id")
    assigned_issues = db.relationship("Issue", back_populates="assigned_officer", foreign_keys="Issue.assigned_officer_id")
    status_logs = db.relationship("StatusLog", back_populates="changed_by")
    comments = db.relationship("Comment", back_populates="user")
    upvotes = db.relationship("Upvote", back_populates="user")
    feedback = db.relationship("Feedback", back_populates="citizen")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone,
            "role": self.role,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Department(db.Model):
    # DFD 3.0 - Department Auto-Routing & Organization
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)  # WATER, ROADS, SANITATION, LIGHTING, GENERAL
    description = db.Column(db.String(255), nullable=True)
    head_user_id = db.Column(db.Integer, db.ForeignKey("users.id", use_alter=True, name="fk_departments_head_user_id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    officers = db.relationship("User", back_populates="department", foreign_keys=[User.department_id])
    issues = db.relationship("Issue", back_populates="department")
    sla_rules = db.relationship("SlaRule", back_populates="department")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "head_user_id": self.head_user_id,
            "officer_count": len(self.officers) if self.officers else 0
        }


class SlaRule(db.Model):
    # DFD 4.0 & 6.0 - SLA Timelines and Threshold Matrix
    __tablename__ = "sla_rules"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), unique=True, nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    sla_hours = db.Column(db.Integer, nullable=False)  # 24, 48, 120, 168
    reminder_pct = db.Column(db.Integer, default=75)
    breach_pct = db.Column(db.Integer, default=100)
    critical_pct = db.Column(db.Integer, default=200)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    department = db.relationship("Department", back_populates="sla_rules")

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "sla_hours": self.sla_hours,
            "reminder_pct": self.reminder_pct,
            "breach_pct": self.breach_pct,
            "critical_pct": self.critical_pct
        }


class Issue(db.Model):
    # DFD 2.0, 3.0, 4.0, 5.0, 6.0 - Central Grievance Ticket Record
    __tablename__ = "issues"

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_anonymous = db.Column(db.Boolean, default=False)
    
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False, index=True)
    severity = db.Column(db.String(20), default="medium")  # low, medium, high, emergency
    
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    assigned_officer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    ward_area = db.Column(db.String(100), nullable=True)
    
    # Status flow: Submitted -> Acknowledged -> In Progress -> Resolved -> Closed (or Reopened)
    status = db.Column(db.String(30), default="Submitted", index=True)
    
    sla_deadline = db.Column(db.DateTime, nullable=False)
    sla_hours = db.Column(db.Integer, nullable=False)
    reminder_sent = db.Column(db.Boolean, default=False)
    escalation_level = db.Column(db.Integer, default=0)  # 0: None, 1: Officer Reminder, 2: Dept Head, 3: Admin Critical
    is_critical_overdue = db.Column(db.Boolean, default=False)
    
    resolution_proof_url = db.Column(db.String(255), nullable=True)
    resolution_remarks = db.Column(db.Text, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    reopened_count = db.Column(db.Integer, default=0)
    
    upvote_count = db.Column(db.Integer, default=0)
    priority_score = db.Column(db.Float, default=15.0)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    citizen = db.relationship("User", back_populates="reported_issues", foreign_keys=[citizen_id])
    assigned_officer = db.relationship("User", back_populates="assigned_issues", foreign_keys=[assigned_officer_id])
    department = db.relationship("Department", back_populates="issues")
    photos = db.relationship("IssuePhoto", back_populates="issue", cascade="all, delete-orphan")
    status_logs = db.relationship("StatusLog", back_populates="issue", order_by="StatusLog.created_at.asc()", cascade="all, delete-orphan")
    escalations = db.relationship("Escalation", back_populates="issue", cascade="all, delete-orphan")
    comments = db.relationship("Comment", back_populates="issue", order_by="Comment.created_at.asc()", cascade="all, delete-orphan")
    upvotes = db.relationship("Upvote", back_populates="issue", cascade="all, delete-orphan")
    feedback = db.relationship("Feedback", back_populates="issue", uselist=False, cascade="all, delete-orphan")

    def to_dict(self, include_details=False):
        now = datetime.now(timezone.utc)
        
        # Calculate dynamic SLA status
        is_closed = self.status in ["Resolved", "Closed"]
        deadline_utc = self.sla_deadline.replace(tzinfo=timezone.utc) if self.sla_deadline.tzinfo is None else self.sla_deadline
        created_utc = self.created_at.replace(tzinfo=timezone.utc) if self.created_at.tzinfo is None else self.created_at
        
        total_seconds = (deadline_utc - created_utc).total_seconds()
        if is_closed and self.resolved_at:
            resolved_utc = self.resolved_at.replace(tzinfo=timezone.utc) if self.resolved_at.tzinfo is None else self.resolved_at
            elapsed_seconds = (resolved_utc - created_utc).total_seconds()
            remaining_seconds = (deadline_utc - resolved_utc).total_seconds()
        else:
            elapsed_seconds = (now - created_utc).total_seconds()
            remaining_seconds = (deadline_utc - now).total_seconds()

        pct_elapsed = max(0, min(1000, round((elapsed_seconds / total_seconds) * 100, 1))) if total_seconds > 0 else 100
        is_overdue = False if is_closed else (remaining_seconds < 0)

        data = {
            "id": self.id,
            "ticket_number": self.ticket_number,
            "citizen_id": None if self.is_anonymous else self.citizen_id,
            "citizen_name": "Anonymous Citizen" if self.is_anonymous else (self.citizen.full_name if self.citizen else "Citizen"),
            "is_anonymous": self.is_anonymous,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "severity": self.severity,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "assigned_officer_id": self.assigned_officer_id,
            "assigned_officer_name": self.assigned_officer.full_name if self.assigned_officer else "Unassigned",
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "ward_area": self.ward_area,
            "status": self.status,
            "sla_deadline": self.sla_deadline.isoformat() if self.sla_deadline else None,
            "sla_hours": self.sla_hours,
            "remaining_seconds": int(remaining_seconds),
            "pct_elapsed": pct_elapsed,
            "is_overdue": is_overdue,
            "escalation_level": self.escalation_level,
            "is_critical_overdue": self.is_critical_overdue,
            "resolution_proof_url": self.resolution_proof_url,
            "resolution_remarks": self.resolution_remarks,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "reopened_count": self.reopened_count,
            "upvote_count": self.upvote_count,
            "priority_score": round(self.priority_score, 1),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "photos": [p.to_dict() for p in self.photos]
        }

        if include_details:
            data["status_logs"] = [log.to_dict() for log in self.status_logs]
            data["comments"] = [c.to_dict() for c in self.comments]
            data["feedback"] = self.feedback.to_dict() if self.feedback else None

        return data


class IssuePhoto(db.Model):
    # DFD 2.0 & 5.0 - Issue Photos (Before and After Resolution)
    __tablename__ = "issue_photos"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)
    photo_type = db.Column(db.String(20), default="before")  # before, after
    image_url = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    issue = db.relationship("Issue", back_populates="photos")

    def to_dict(self):
        return {
            "id": self.id,
            "photo_type": self.photo_type,
            "image_url": self.image_url,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class StatusLog(db.Model):
    # DFD 5.0 - Audit Log of Every Status Transition
    __tablename__ = "status_logs"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)
    from_status = db.Column(db.String(30), nullable=True)
    to_status = db.Column(db.String(30), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    issue = db.relationship("Issue", back_populates="status_logs")
    changed_by = db.relationship("User", back_populates="status_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "changed_by_user_id": self.changed_by_user_id,
            "changed_by_name": self.changed_by.full_name if self.changed_by else "System Engine",
            "remarks": self.remarks,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Escalation(db.Model):
    # DFD 6.0 - SLA Escalation Events
    __tablename__ = "escalations"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)
    escalation_level = db.Column(db.Integer, nullable=False)  # 1: Reminder, 2: Dept Head, 3: Admin
    reason = db.Column(db.String(255), nullable=False)
    notified_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    triggered_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    acknowledged_at = db.Column(db.DateTime, nullable=True)

    issue = db.relationship("Issue", back_populates="escalations")

    def to_dict(self):
        return {
            "id": self.id,
            "issue_id": self.issue_id,
            "escalation_level": self.escalation_level,
            "reason": self.reason,
            "notified_user_id": self.notified_user_id,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None
        }


class Comment(db.Model):
    # DFD 2.0 & 5.0 - Public and Official Issue Discussion
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    is_official = db.Column(db.Boolean, default=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    issue = db.relationship("Issue", back_populates="comments")
    user = db.relationship("User", back_populates="comments")

    def to_dict(self):
        return {
            "id": self.id,
            "issue_id": self.issue_id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "User",
            "user_role": self.user.role if self.user else "citizen",
            "is_official": self.is_official,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Upvote(db.Model):
    # DFD 4.0 - Me Too / Upvote Support
    __tablename__ = "upvotes"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("issue_id", "user_id", name="uq_issue_user_upvote"),)

    issue = db.relationship("Issue", back_populates="upvotes")
    user = db.relationship("User", back_populates="upvotes")


class Feedback(db.Model):
    # DFD 8.0 - Citizen Feedback on Resolution
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), unique=True, nullable=False)
    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    comments = db.Column(db.Text, nullable=True)
    is_satisfied = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    issue = db.relationship("Issue", back_populates="feedback")
    citizen = db.relationship("User", back_populates="feedback")

    def to_dict(self):
        return {
            "id": self.id,
            "issue_id": self.issue_id,
            "rating": self.rating,
            "comments": self.comments,
            "is_satisfied": self.is_satisfied,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    # DFD 7.0 - In-App Notification Bell Store
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default="status_change")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "issue_id": self.issue_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

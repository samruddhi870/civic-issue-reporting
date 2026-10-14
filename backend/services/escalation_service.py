# DFD 4.0 & 6.0 - APScheduler SLA Escalation & Alert Trigger Service
import atexit
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import db
from models import Issue, User, Department, Escalation, StatusLog, Notification, Feedback
from services.notification_service import create_in_app_notification, dispatch_external_alert
from services.sla_service import calculate_priority_score

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler = None

def check_sla_and_escalate(app=None):
    """
    DFD 6.0 - Core SLA & Escalation Engine.
    Evaluates all active, unresolved grievances and triggers:
      - Level 1 (75% SLA elapsed): Warning reminder to assigned officer
      - Level 2 (100% SLA elapsed / Breached): Auto-escalate to Department Head & notify citizen
      - Level 3 (200% SLA elapsed / Critical Overdue): Escalate to Municipal Admin & priority boost
    """
    def _execute():
        now = datetime.now(timezone.utc)
        active_issues = Issue.query.filter(
            Issue.status.notin_(["Resolved", "Closed"])
        ).all()

        summary = {
            "evaluated": len(active_issues),
            "level1_reminders": 0,
            "level2_escalations": 0,
            "level3_critical": 0
        }

        for issue in active_issues:
            created_utc = issue.created_at.replace(tzinfo=timezone.utc) if issue.created_at.tzinfo is None else issue.created_at
            deadline_utc = issue.sla_deadline.replace(tzinfo=timezone.utc) if issue.sla_deadline.tzinfo is None else issue.sla_deadline
            
            total_duration = (deadline_utc - created_utc).total_seconds()
            elapsed_seconds = (now - created_utc).total_seconds()
            pct_elapsed = (elapsed_seconds / total_duration) * 100.0 if total_duration > 0 else 100.0

            # Level 3: Critical Overdue (>= 200% of SLA elapsed)
            if pct_elapsed >= 200.0 and issue.escalation_level < 3:
                issue.escalation_level = 3
                issue.is_critical_overdue = True
                summary["level3_critical"] += 1

                # Find all Municipal Admins
                admins = User.query.filter_by(role="admin", is_active=True).all()
                admin_ids = [a.id for a in admins]
                primary_admin_id = admin_ids[0] if admin_ids else None

                # Log Escalation event
                escalation = Escalation(
                    issue_id=issue.id,
                    escalation_level=3,
                    reason=f"CRITICAL SLA BREACH: 200% elapsed ({round(pct_elapsed, 1)}%). Auto-escalated to Municipal Commissioner / Admin.",
                    notified_user_id=primary_admin_id,
                    triggered_at=now
                )
                db.session.add(escalation)

                # Append StatusLog
                log_entry = StatusLog(
                    issue_id=issue.id,
                    from_status=issue.status,
                    to_status=issue.status,
                    changed_by_user_id=None,
                    remarks=f"[SYSTEM ESCALATION LEVEL 3] 200% SLA elapsed. Escalated to Municipal Admin.",
                    created_at=now
                )
                db.session.add(log_entry)

                # Push notifications to all Admins
                for admin in admins:
                    create_in_app_notification(
                        user_id=admin.id,
                        title=f"CRITICAL OVERDUE: {issue.ticket_number}",
                        message=f"Grievance '{issue.title}' has exceeded 200% SLA ({round(pct_elapsed, 1)}% elapsed). Immediate municipal intervention required.",
                        issue_id=issue.id,
                        notification_type="critical_overdue"
                    )

                # Also alert assigned officer
                if issue.assigned_officer_id:
                    create_in_app_notification(
                        user_id=issue.assigned_officer_id,
                        title=f"Level 3 Escalation: {issue.ticket_number}",
                        message=f"Your ticket has breached 200% SLA and has been escalated directly to Municipal Administration.",
                        issue_id=issue.id,
                        notification_type="escalation_level_3"
                    )

            # Level 2: SLA Breached (>= 100% of SLA elapsed)
            elif pct_elapsed >= 100.0 and issue.escalation_level < 2:
                issue.escalation_level = 2
                summary["level2_escalations"] += 1

                # Locate Department Head
                dept = issue.department
                head_user_id = dept.head_user_id if dept else None

                # Log Escalation event
                escalation = Escalation(
                    issue_id=issue.id,
                    escalation_level=2,
                    reason=f"SLA DEADLINE BREACHED: 100% elapsed ({round(pct_elapsed, 1)}%). Escalated to Department Head.",
                    notified_user_id=head_user_id,
                    triggered_at=now
                )
                db.session.add(escalation)

                # Append StatusLog
                log_entry = StatusLog(
                    issue_id=issue.id,
                    from_status=issue.status,
                    to_status=issue.status,
                    changed_by_user_id=None,
                    remarks=f"[SYSTEM ESCALATION LEVEL 2] SLA deadline passed. Escalated to Department Head.",
                    created_at=now
                )
                db.session.add(log_entry)

                # Alert Department Head
                if head_user_id:
                    create_in_app_notification(
                        user_id=head_user_id,
                        title=f"SLA Breached: {issue.ticket_number}",
                        message=f"Ticket '{issue.title}' ({issue.category}) missed its {issue.sla_hours}h SLA. Escalated to your departmental review.",
                        issue_id=issue.id,
                        notification_type="sla_breach"
                    )

                # Alert Assigned Officer
                if issue.assigned_officer_id:
                    create_in_app_notification(
                        user_id=issue.assigned_officer_id,
                        title=f"SLA Breached: {issue.ticket_number}",
                        message=f"Ticket '{issue.title}' resolution deadline has passed and was escalated to Department Head.",
                        issue_id=issue.id,
                        notification_type="sla_breach"
                    )

                # Notify Citizen that SLA was missed and escalated
                if issue.citizen_id:
                    create_in_app_notification(
                        user_id=issue.citizen_id,
                        title=f"Grievance Escalated: {issue.ticket_number}",
                        message=f"The standard SLA of {issue.sla_hours}h has passed. Your grievance has been automatically escalated to the Department Head for urgent resolution.",
                        issue_id=issue.id,
                        notification_type="citizen_escalation"
                    )

            # Level 1: SLA Warning / Reminder (>= 75% of SLA elapsed)
            elif pct_elapsed >= 75.0 and not issue.reminder_sent and issue.escalation_level < 1:
                issue.reminder_sent = True
                issue.escalation_level = 1
                summary["level1_reminders"] += 1

                # Log Escalation event
                escalation = Escalation(
                    issue_id=issue.id,
                    escalation_level=1,
                    reason=f"SLA WARNING REMINDER: 75% elapsed ({round(pct_elapsed, 1)}%). Warning sent to assigned officer.",
                    notified_user_id=issue.assigned_officer_id,
                    triggered_at=now
                )
                db.session.add(escalation)

                # Append StatusLog
                log_entry = StatusLog(
                    issue_id=issue.id,
                    from_status=issue.status,
                    to_status=issue.status,
                    changed_by_user_id=None,
                    remarks=f"[SYSTEM ESCALATION LEVEL 1] 75% SLA elapsed. Urgent reminder sent to assigned officer.",
                    created_at=now
                )
                db.session.add(log_entry)

                # Notify Assigned Officer
                if issue.assigned_officer_id:
                    hours_remaining = max(0, round((total_duration - elapsed_seconds) / 3600.0, 1))
                    create_in_app_notification(
                        user_id=issue.assigned_officer_id,
                        title=f"SLA Urgency Alert: {issue.ticket_number}",
                        message=f"Ticket '{issue.title}' has reached 75% SLA. Approximately {hours_remaining} hours remaining before departmental escalation.",
                        issue_id=issue.id,
                        notification_type="sla_reminder"
                    )

            # Re-compute priority score with any overdue days added
            issue.priority_score = calculate_priority_score(issue)

        # DFD 8.0 - Check 72-hour citizen review window for Resolved issues
        resolved_issues = Issue.query.filter_by(status="Resolved").all()
        summary["auto_closed_72h"] = 0
        for r_issue in resolved_issues:
            if r_issue.resolved_at:
                res_utc = r_issue.resolved_at.replace(tzinfo=timezone.utc) if r_issue.resolved_at.tzinfo is None else r_issue.resolved_at
                if (now - res_utc).total_seconds() >= (72 * 3600):
                    r_issue.status = "Closed"
                    r_issue.closed_at = now
                    summary["auto_closed_72h"] += 1

                    # Append audit log
                    log_entry = StatusLog(
                        issue_id=r_issue.id,
                        from_status="Resolved",
                        to_status="Closed",
                        changed_by_user_id=None,
                        remarks="[SYSTEM AUTO-CLOSE] 72-hour citizen review window expired without contest. Grievance finalized.",
                        created_at=now
                    )
                    db.session.add(log_entry)

                    # Default positive feedback if none submitted
                    if not r_issue.feedback and r_issue.citizen_id:
                        fb = Feedback(
                            issue_id=r_issue.id,
                            citizen_id=r_issue.citizen_id,
                            rating=5,
                            comments="Auto-confirmed resolution after 72-hour review window.",
                            is_satisfied=True,
                            created_at=now
                        )
                        db.session.add(fb)

                    if r_issue.citizen_id:
                        create_in_app_notification(
                            user_id=r_issue.citizen_id,
                            title=f"Ticket Closed: {r_issue.ticket_number}",
                            message=f"Grievance '{r_issue.title}' has been finalized and closed following the 72-hour review period.",
                            issue_id=r_issue.id,
                            notification_type="auto_closed"
                        )

        db.session.commit()
        return summary

    if app:
        with app.app_context():
            return _execute()
    else:
        return _execute()

def init_scheduler(app):
    """
    Initializes APScheduler background job to run SLA checks periodically.
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    interval = app.config.get("SLA_CHECK_INTERVAL_SECONDS", 60)
    _scheduler = BackgroundScheduler(daemon=True)
    
    # Schedule job with app context
    _scheduler.add_job(
        func=lambda: check_sla_and_escalate(app),
        trigger="interval",
        seconds=interval,
        id="sla_escalation_checker",
        name="CivicConnect SLA & Escalation Engine",
        replace_existing=True
    )

    _scheduler.start()
    logger.info(f"[APScheduler] Started SLA Escalation Checker (interval: {interval}s)")
    print(f"[SCHEDULER] APScheduler started. Checking SLA deadlines every {interval} seconds.")

    # Clean shutdown on exit
    atexit.register(lambda: _scheduler.shutdown(wait=False) if _scheduler and _scheduler.running else None)
    return _scheduler

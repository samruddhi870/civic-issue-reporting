# DFD 4.0, 6.0 & 7.0 - Automated Test Suite for Phase 3 SLA Engine, Escalations & Notifications
from datetime import datetime, timezone, timedelta
from app import create_app
from database import db
from models import User, Issue, Department, Escalation, StatusLog, Notification
from services.escalation_service import check_sla_and_escalate

def test_phase3_flow():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    print("\n--- RUNNING PHASE 3 TEST SUITE ---")

    with app.app_context():
        # 1. Test SLA Matrix Route (DFD 4.0)
        res = client.get("/api/sla/matrix")
        assert res.status_code == 200, f"SLA Matrix failed: {res.get_json()}"
        rules = res.get_json()["rules"]
        assert len(rules) >= 4, "Expected at least 4 SLA rules"
        print(f"[OK] [PASS] SLA Matrix retrieved ({len(rules)} category rules configured)")

        # 2. Authenticate Users (Admin, Officer, Citizen)
        admin_login = client.post("/api/auth/login", json={
            "email": "admin@civicconnect.org",
            "password": "AdminPassword123!"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.get_json()["token"]
        admin_user = admin_login.get_json()["user"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        water_officer = User.query.filter_by(email="officer.water@civicconnect.org").first()
        assert water_officer is not None

        officer_login = client.post("/api/auth/login", json={
            "email": "officer.water@civicconnect.org",
            "password": "OfficerPassword123!"
        })
        officer_token = officer_login.get_json()["token"]
        officer_headers = {"Authorization": f"Bearer {officer_token}"}

        citizen = User.query.filter_by(role="citizen").first()
        citizen_login = client.post("/api/auth/login", json={
            "email": citizen.email,
            "password": "CitizenPassword123!"
        })
        citizen_token = citizen_login.get_json()["token"]
        citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
        print("[OK] [PASS] Authenticated Admin, Officer, and Citizen personas")

        # 3. Create a dedicated test issue for threshold testing
        now = datetime.now(timezone.utc)
        test_issue = Issue(
            ticket_number=f"CC-TEST-P3-{int(now.timestamp())}",
            citizen_id=citizen.id,
            title="Phase 3 SLA Test Pipeline Leak",
            description="Simulated pipeline leakage to verify 75%, 100%, and 200% escalation triggers.",
            category="Water leakage",
            severity="high",
            department_id=water_officer.department_id,
            assigned_officer_id=water_officer.id,
            latitude=18.5204,
            longitude=73.8567,
            status="In Progress",
            sla_hours=24,
            created_at=now - timedelta(hours=19),  # 19 hours elapsed out of 24h = ~79.1% elapsed
            sla_deadline=now + timedelta(hours=5),
            escalation_level=0,
            reminder_sent=False,
            is_critical_overdue=False
        )
        db.session.add(test_issue)
        db.session.commit()
        test_issue_id = test_issue.id
        print(f"[OK] [PASS] Created test issue {test_issue.ticket_number} (simulated 79.1% SLA elapsed)")

        # 4. Test Level 1 Escalation: 75% SLA Elapsed Reminder (DFD 6.0)
        summary = check_sla_and_escalate()
        assert summary["level1_reminders"] >= 1, f"Expected Level 1 reminder: {summary}"

        db.session.refresh(test_issue)
        assert test_issue.reminder_sent is True
        assert test_issue.escalation_level == 1

        # Verify Escalation table entry
        esc_l1 = Escalation.query.filter_by(issue_id=test_issue_id, escalation_level=1).first()
        assert esc_l1 is not None
        assert esc_l1.notified_user_id == water_officer.id
        print(f"[OK] [PASS] Level 1 (75%) Escalation triggered: Reminder recorded for Officer {water_officer.full_name}")

        # 5. Test Level 2 Escalation: 100% SLA Breached (Deadline Passed) (DFD 6.0)
        # Fast-forward issue timestamps so it is 26 hours old (108% elapsed)
        test_issue.created_at = now - timedelta(hours=26)
        test_issue.sla_deadline = now - timedelta(hours=2)
        db.session.commit()

        summary2 = check_sla_and_escalate()
        assert summary2["level2_escalations"] >= 1, f"Expected Level 2 escalation: {summary2}"

        db.session.refresh(test_issue)
        assert test_issue.escalation_level == 2

        # Verify Escalation table entry & Citizen Notification
        esc_l2 = Escalation.query.filter_by(issue_id=test_issue_id, escalation_level=2).first()
        assert esc_l2 is not None

        citizen_notif = Notification.query.filter_by(
            user_id=citizen.id, 
            issue_id=test_issue_id,
            notification_type="citizen_escalation"
        ).first()
        assert citizen_notif is not None
        print(f"[OK] [PASS] Level 2 (100% Breach) Escalation triggered: Department Head & Citizen notified")

        # 6. Test Level 3 Escalation: 200% Critical Overdue (DFD 6.0)
        # Fast-forward issue timestamps so it is 52 hours old (216% elapsed)
        test_issue.created_at = now - timedelta(hours=52)
        test_issue.sla_deadline = now - timedelta(hours=28)
        db.session.commit()

        summary3 = check_sla_and_escalate()
        assert summary3["level3_critical"] >= 1, f"Expected Level 3 critical escalation: {summary3}"

        db.session.refresh(test_issue)
        assert test_issue.escalation_level == 3
        assert test_issue.is_critical_overdue is True

        esc_l3 = Escalation.query.filter_by(issue_id=test_issue_id, escalation_level=3).first()
        assert esc_l3 is not None

        admin_notif = Notification.query.filter_by(
            user_id=admin_user["id"],
            issue_id=test_issue_id,
            notification_type="critical_overdue"
        ).first()
        assert admin_notif is not None
        print(f"[OK] [PASS] Level 3 (200% Critical) Escalation triggered: Municipal Admin intervention alert dispatched")

        # 7. Test In-App Notification Bell Endpoints (DFD 7.0)
        # Fetch Officer notifications
        notif_res = client.get("/api/notifications", headers=officer_headers)
        assert notif_res.status_code == 200
        notif_data = notif_res.get_json()
        assert notif_data["total_unread"] > 0
        assert len(notif_data["notifications"]) > 0
        first_notif = notif_data["notifications"][0]
        first_notif_id = first_notif["id"]
        print(f"[OK] [PASS] Retrieved in-app notifications ({notif_data['total_unread']} unread for Officer)")

        # Mark single notification as read
        read_res = client.patch(f"/api/notifications/{first_notif_id}/read", headers=officer_headers)
        assert read_res.status_code == 200
        assert read_res.get_json()["notification"]["is_read"] is True
        print(f"[OK] [PASS] Single notification {first_notif_id} marked as read")

        # Mark all notifications as read
        all_read_res = client.post("/api/notifications/mark-all-read", headers=officer_headers)
        assert all_read_res.status_code == 200
        
        # Verify 0 unread remain
        verify_res = client.get("/api/notifications?unread_only=true", headers=officer_headers)
        assert verify_res.get_json()["total_unread"] == 0
        print("[OK] [PASS] All notifications marked as read (Unread count is now 0)")

        # 8. Test Manual SLA Trigger Endpoint (DFD 6.0)
        manual_res = client.post("/api/sla/trigger-check", headers=admin_headers)
        assert manual_res.status_code == 200
        assert "summary" in manual_res.get_json()

        # Citizen cannot trigger manual SLA check (RBAC check)
        unauth_trigger = client.post("/api/sla/trigger-check", headers=citizen_headers)
        assert unauth_trigger.status_code == 403
        print("[OK] [PASS] Manual SLA Trigger endpoint operational & RBAC-guarded (Admin/Officer only, Citizen 403)")

    print("\n>>> ALL PHASE 3 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_phase3_flow()

# DFD 5.0 & 8.0 - Automated Test Suite for Phase 4 Resolution Proof, Citizen Confirm / Reopen & 72h Auto-Close
import io
from datetime import datetime, timezone, timedelta
from app import create_app
from database import db
from models import User, Issue, IssuePhoto, Feedback, Notification, StatusLog
from services.escalation_service import check_sla_and_escalate

def generate_dummy_image_stream():
    """Generates a small valid JPEG stream in-memory."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (120, 120), color=(34, 139, 34))  # Green resolution fix
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_phase4_flow():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    print("\n--- RUNNING PHASE 4 TEST SUITE ---")

    with app.app_context():
        # 1. Authenticate Personas (Roads Officer and Citizen)
        officer = User.query.filter_by(email="officer.roads@civicconnect.org").first()
        assert officer is not None
        officer_login = client.post("/api/auth/login", json={
            "email": "officer.roads@civicconnect.org",
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
        print("[OK] [PASS] Authenticated Roads Officer and Citizen personas")

        # 2. Create a dedicated test issue for resolution testing
        now = datetime.now(timezone.utc)
        issue = Issue(
            ticket_number=f"CC-TEST-P4-{int(now.timestamp())}",
            citizen_id=citizen.id,
            title="Hazardous Pothole on Karve Road",
            description="Deep crater damaging two-wheelers near bus stop.",
            category="Pothole / Road damage",
            severity="high",
            department_id=officer.department_id,
            assigned_officer_id=officer.id,
            latitude=18.5089,
            longitude=73.8341,
            address="Karve Road, Pune",
            status="In Progress",
            sla_hours=120,
            created_at=now - timedelta(hours=48),
            sla_deadline=now + timedelta(hours=72)
        )
        db.session.add(issue)
        db.session.commit()
        issue_id = issue.id
        print(f"[OK] [PASS] Created active test grievance {issue.ticket_number}")

        # 3. Test Mandatory Resolution Proof Photo Enforcement (DFD 5.0)
        # Attempt to mark 'Resolved' WITHOUT an 'after' photo (should be strictly rejected with HTTP 400)
        unresolved_res = client.patch(
            f"/api/issues/{issue_id}/status",
            headers=officer_headers,
            data={"status": "Resolved", "remarks": "Road patched without photo"}
        )
        assert unresolved_res.status_code == 400, f"Expected 400, got: {unresolved_res.status_code}"
        assert "Mandatory resolution proof photo" in unresolved_res.get_json()["error"]
        print("[OK] [PASS] Mandatory Resolution Proof enforced: Backend rejected 'Resolved' status without 'after' photo (HTTP 400)")

        # 4. Successfully resolve issue WITH mandatory 'after' photo (DFD 5.0)
        proof_img = generate_dummy_image_stream()
        resolve_res = client.patch(
            f"/api/issues/{issue_id}/status",
            headers=officer_headers,
            data={
                "status": "Resolved",
                "remarks": "Asphalt cold-mix applied, steamrolled, and cured.",
                "resolution_photo": (proof_img, "road_fixed.jpg")
            },
            content_type="multipart/form-data"
        )
        assert resolve_res.status_code == 200, f"Resolution failed: {resolve_res.get_json()}"
        resolved_data = resolve_res.get_json()["issue"]
        assert resolved_data["status"] == "Resolved"
        assert resolved_data["resolution_proof_url"] is not None
        assert resolved_data["resolved_at"] is not None
        print(f"[OK] [PASS] Grievance marked 'Resolved' with verified 'after' photo: {resolved_data['resolution_proof_url']}")

        # 5. Test Citizen Confirmation & 5-Star Feedback (DFD 8.0)
        confirm_res = client.post(
            f"/api/issues/{issue_id}/confirm",
            headers=citizen_headers,
            json={
                "rating": 5,
                "comments": "Pothole was filled within 48 hours! Smooth road surface now. Excellent work by Roads division.",
                "is_satisfied": True
            }
        )
        assert confirm_res.status_code == 200, f"Confirm failed: {confirm_res.get_json()}"
        closed_data = confirm_res.get_json()["issue"]
        assert closed_data["status"] == "Closed"
        assert closed_data["closed_at"] is not None

        # Verify Feedback in database
        fb = Feedback.query.filter_by(issue_id=issue_id).first()
        assert fb is not None
        assert fb.rating == 5
        assert fb.is_satisfied is True
        print(f"[OK] [PASS] Citizen confirmed resolution: Status transitioned to 'Closed' and 5-star feedback recorded")

        # 6. Test Citizen Reopening with Reason (DFD 8.0)
        # Create second issue, resolve it with proof, then test citizen reopen
        issue2 = Issue(
            ticket_number=f"CC-TEST-REOPEN-{int(now.timestamp())}",
            citizen_id=citizen.id,
            title="Broken Streetlight on Senapati Bapat Road",
            description="Dark zone creating safety hazard at night.",
            category="Streetlight / Electricity",
            severity="medium",
            department_id=officer.department_id,
            assigned_officer_id=officer.id,
            latitude=18.5314,
            longitude=73.8285,
            status="In Progress",
            sla_hours=48,
            created_at=now - timedelta(hours=20),
            sla_deadline=now + timedelta(hours=28)
        )
        db.session.add(issue2)
        db.session.commit()
        issue2_id = issue2.id

        # Mark Resolved with proof
        proof_img2 = generate_dummy_image_stream()
        client.patch(
            f"/api/issues/{issue2_id}/status",
            headers=officer_headers,
            data={
                "status": "Resolved",
                "remarks": "Replaced bulb fixture.",
                "resolution_photo": (proof_img2, "light_fixed.jpg")
            },
            content_type="multipart/form-data"
        )

        initial_priority = issue2.priority_score

        # Citizen rejects resolution proof and reopens grievance
        reopen_res = client.post(
            f"/api/issues/{issue2_id}/reopen",
            headers=citizen_headers,
            json={
                "reason": "Light is still flickering erratically and turns off after 10 minutes. Cable fault remains."
            }
        )
        assert reopen_res.status_code == 200, f"Reopen failed: {reopen_res.get_json()}"
        reopened_data = reopen_res.get_json()["issue"]
        assert reopened_data["status"] == "Reopened"
        assert reopened_data["reopened_count"] == 1
        assert reopened_data["priority_score"] > initial_priority
        print(f"[OK] [PASS] Citizen reopened grievance within 72h: Status transitioned to 'Reopened', priority score boosted ({initial_priority} -> {reopened_data['priority_score']})")

        # 7. Test 72-Hour Auto-Closure by Escalation Scheduler (DFD 8.0)
        # Create third issue, mark Resolved, backdate resolved_at to 73 hours ago
        issue3 = Issue(
            ticket_number=f"CC-TEST-AUTOCLOSE-{int(now.timestamp())}",
            citizen_id=citizen.id,
            title="Garbage Pile Near Market Yard",
            description="Waste overflowing onto pavement.",
            category="Garbage / Waste",
            severity="medium",
            department_id=officer.department_id,
            assigned_officer_id=officer.id,
            latitude=18.4900,
            longitude=73.8650,
            status="Resolved",
            sla_hours=48,
            created_at=now - timedelta(hours=100),
            sla_deadline=now - timedelta(hours=52),
            resolved_at=now - timedelta(hours=73),  # 73 hours since resolution
            resolution_proof_url="/uploads/garbage_cleared.jpg"
        )
        db.session.add(issue3)
        db.session.commit()
        issue3_id = issue3.id

        # Execute scheduler sweep
        summary = check_sla_and_escalate()
        assert summary.get("auto_closed_72h", 0) >= 1

        db.session.refresh(issue3)
        assert issue3.status == "Closed"
        assert issue3.closed_at is not None

        # Verify auto-closure audit log
        close_log = StatusLog.query.filter_by(issue_id=issue3_id, to_status="Closed").first()
        assert close_log is not None
        assert "SYSTEM AUTO-CLOSE" in close_log.remarks
        print(f"[OK] [PASS] 72-Hour Auto-Closure verified: Grievance automatically finalized and closed after 72h review window")

    print("\n>>> ALL PHASE 4 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_phase4_flow()

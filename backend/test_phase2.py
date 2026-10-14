# DFD 3.0 & 5.0 - Automated Test Suite for Phase 2 Department Routing & Officer Workflow
from app import create_app
from database import db
from models import User, Issue, Department, StatusLog

def test_phase2_flow():
    app = create_app()
    client = app.test_client()

    print("\n--- RUNNING PHASE 2 TEST SUITE ---")

    # 1. Test Department Listing (DFD 3.0)
    res = client.get("/api/departments")
    assert res.status_code == 200, f"Get departments failed: {res.get_json()}"
    depts = res.get_json()["departments"]
    assert len(depts) >= 4
    water_dept = next(d for d in depts if d["code"] == "WATER")
    print(f"[OK] [PASS] Departments listed: {len(depts)} departments found. Water Dept ID: {water_dept['id']}")

    # 2. Test Officer Login (Water Officer Rajesh Sharma)
    login_payload = {
        "email": "officer.water@civicconnect.org",
        "password": "OfficerPassword123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Officer login failed: {res.get_json()}"
    officer_token = res.get_json()["token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}
    print("[OK] [PASS] Water Officer authenticated successfully")

    # 3. Test Officer Assigned Queue (DFD 3.0 & 5.0)
    res = client.get("/api/issues/assigned", headers=officer_headers)
    assert res.status_code == 200, f"Assigned queue failed: {res.get_json()}"
    assigned_issues = res.get_json()["issues"]
    assert len(assigned_issues) > 0, "Expected officer to have seeded issues assigned"
    target_issue = assigned_issues[0]
    target_issue_id = target_issue["id"]
    print(f"[OK] [PASS] Officer assigned queue retrieved: {len(assigned_issues)} issues assigned. Testing issue {target_issue['ticket_number']}")

    # 4. Test Status Update: Submitted -> Acknowledged (DFD 5.0)
    ack_res = client.patch(
        f"/api/issues/{target_issue_id}/status",
        headers=officer_headers,
        json={"status": "Acknowledged", "remarks": "Issue verified by water field division"}
    )
    assert ack_res.status_code == 200, f"Acknowledge status failed: {ack_res.get_json()}"
    updated_issue = ack_res.get_json()["issue"]
    assert updated_issue["status"] == "Acknowledged"
    print(f"[OK] [PASS] Status transitioned to 'Acknowledged' on {updated_issue['ticket_number']}")

    # 5. Test Status Update: Acknowledged -> In Progress (DFD 5.0)
    prog_res = client.patch(
        f"/api/issues/{target_issue_id}/status",
        headers=officer_headers,
        json={"status": "In Progress", "remarks": "Excavation and pipe weld team deployed"}
    )
    assert prog_res.status_code == 200, f"In Progress status failed: {prog_res.get_json()}"
    assert prog_res.get_json()["issue"]["status"] == "In Progress"
    print(f"[OK] [PASS] Status transitioned to 'In Progress' with field remarks")

    # 6. Verify StatusLog Audit Trail (DFD 5.0)
    res = client.get(f"/api/issues/{target_issue_id}")
    assert res.status_code == 200
    issue_detail = res.get_json()["issue"]
    logs = issue_detail["status_logs"]
    assert len(logs) >= 2
    latest_log = logs[-1]
    assert latest_log["to_status"] == "In Progress"
    assert "Rajesh Sharma" in latest_log["changed_by_name"]
    print(f"[OK] [PASS] Audit Log verified: {latest_log['changed_by_name']} transitioned to {latest_log['to_status']} ('{latest_log['remarks']}')")

    # 7. Test Departmental Security Guard
    # Roads Officer should NOT be able to modify Water Dept issue
    roads_login = client.post("/api/auth/login", json={
        "email": "officer.roads@civicconnect.org",
        "password": "OfficerPassword123!"
    })
    roads_token = roads_login.get_json()["token"]
    unauth_res = client.patch(
        f"/api/issues/{target_issue_id}/status",
        headers={"Authorization": f"Bearer {roads_token}"},
        json={"status": "Resolved", "remarks": "Should fail"}
    )
    assert unauth_res.status_code == 403, f"Expected 403 Forbidden for cross-department update, got {unauth_res.status_code}"
    print("[OK] [PASS] Departmental security guard strictly prevented cross-department unauthorized updates (HTTP 403)")

    print("\n>>> ALL PHASE 2 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_phase2_flow()

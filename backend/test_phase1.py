# DFD 1.0 & 2.0 - Automated Test Suite for Phase 1 Authentication & Grievance Reporting
import io
from app import create_app
from database import db
from models import User, Issue

def test_phase1_flow():
    app = create_app()
    client = app.test_client()

    print("\n--- RUNNING PHASE 1 TEST SUITE ---")

    import time
    ts = int(time.time())
    test_email = f"test_citizen_{ts}@civicconnect.org"

    # 1. Test Citizen Registration
    reg_payload = {
        "email": test_email,
        "password": "Password123!",
        "full_name": "Test Citizen Sharma",
        "phone": "+919876543210",
        "role": "citizen"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.get_json()}"
    reg_data = res.get_json()
    token = reg_data["token"]
    print("[OK] [PASS] Citizen Registration & JWT Token generation")

    # 2. Test Login
    login_payload = {
        "email": test_email,
        "password": "Password123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.get_json()}"
    print("[OK] [PASS] Citizen Login with credentials")

    # 3. Test Auth /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"/api/auth/me failed with status {res.status_code}: {res.get_json()}"
    user_data = res.get_json()["user"]
    assert user_data["email"] == test_email
    print("[OK] [PASS] Authenticated user profile retrieval (/api/auth/me)")

    # 4. Test Spatial Duplicate Check (< 50m)
    # Coordinates of FC Road issue (CC-2026-00001) in seed: 18.5204, 73.8567
    res = client.get("/api/issues/duplicates?category=Water+leakage&latitude=18.52041&longitude=73.85671")
    assert res.status_code == 200
    dupes = res.get_json()["duplicates"]
    assert len(dupes) > 0, "Expected duplicate within 50m of FC Road water leak"
    print(f"[OK] [PASS] Spatial Duplicate Detection found existing issue at {dupes[0]['distance_meters']}m")

    # 5. Test Grievance Submission with Image (DFD 2.0 & 3.0)
    # Create fake in-memory image
    from PIL import Image as PILImage
    img_byte_arr = io.BytesIO()
    test_img = PILImage.new("RGB", (300, 300), color="blue")
    test_img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    report_data = {
        "title": "Severe road cavity near bus stop",
        "description": "Deep hole on the road damaging two-wheelers.",
        "category": "Pothole / Road damage",
        "severity": "high",
        "latitude": "18.5250",
        "longitude": "73.8550",
        "address": "JM Road corner, Pune",
        "ward_area": "Ward 12",
        "is_anonymous": "false"
    }
    data_with_photo = {
        **report_data,
        "photos": (img_byte_arr, "pothole_evidence.jpg")
    }

    res = client.post(
        "/api/issues",
        data=data_with_photo,
        headers=headers,
        content_type="multipart/form-data"
    )
    assert res.status_code == 201, f"Report failed: {res.get_json()}"
    created_issue = res.get_json()["issue"]
    ticket_num = created_issue["ticket_number"]
    assert ticket_num.startswith("CC-2026-")
    assert created_issue["sla_hours"] == 120  # Pothole SLA is 5 days (120 hrs)
    assert len(created_issue["photos"]) == 1
    print(f"[OK] [PASS] Grievance Reported! Ticket: {ticket_num}, SLA: {created_issue['sla_hours']}h, Photo Saved: {created_issue['photos'][0]['image_url']}")

    # 6. Test Citizen 'My Reports'
    res = client.get("/api/issues/my-reports", headers=headers)
    assert res.status_code == 200
    my_reports = res.get_json()["issues"]
    assert any(iss["ticket_number"] == ticket_num for iss in my_reports)
    print(f"[OK] [PASS] Citizen 'My Reports' list retrieved ({len(my_reports)} report(s))")

    # 7. Test Public Issues Feed
    res = client.get("/api/issues")
    assert res.status_code == 200
    all_issues = res.get_json()["issues"]
    assert len(all_issues) >= 11
    print(f"[OK] [PASS] Public Feed retrieved ({len(all_issues)} issues listed)")

    print("\n>>> ALL PHASE 1 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_phase1_flow()

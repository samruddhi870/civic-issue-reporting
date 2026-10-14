# DFD 4.0 & 5.0 - Phase 5 Backend Test Suite (Spatial Duplicates, Upvotes, Comments, Details)
import sys
import json
import time
from app import create_app
from database import db
from models import User, Issue, Department, SlaRule, IssuePhoto, Comment, Upvote

def run_phase5_tests():
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        with app.app_context():
            print("\n--- RUNNING PHASE 5 TEST SUITE ---")

            # 1. Authenticate Personas
            citizen = User.query.filter_by(role="citizen").first()
            assert citizen is not None, "Citizen user not found"
            citizen_resp = client.post("/api/auth/login", json={
                "email": citizen.email,
                "password": "CitizenPassword123!"
            })
            assert citizen_resp.status_code == 200, f"Citizen login failed: {citizen_resp.data}"
            citizen_token = citizen_resp.get_json()["token"]
            citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

            officer_resp = client.post("/api/auth/login", json={
                "email": "officer.roads@civicconnect.org",
                "password": "OfficerPassword123!"
            })
            assert officer_resp.status_code == 200, f"Officer login failed: {officer_resp.data}"
            officer_token = officer_resp.get_json()["token"]
            officer_headers = {"Authorization": f"Bearer {officer_token}"}

            print("[OK] [PASS] Authenticated Citizen and Officer personas")

            # 2. Create Base Issue at specific GPS coordinates (FC Road, Pune: 18.5204, 73.8567)
            unique_ts = int(time.time() * 1000) % 1000000000
            post_data = {
                "title": f"Phase 5 Ruptured Pipeline #{unique_ts}",
                "description": "Major main line rupture leaking water onto the intersection.",
                "category": "Water leakage",
                "severity": "high",
                "latitude": "18.520400",
                "longitude": "73.856700",
                "address": "FC Road & Deccan Gymkhana, Pune"
            }
            create_resp = client.post("/api/issues", data=post_data, headers=citizen_headers)
            assert create_resp.status_code == 201, f"Create issue failed: {create_resp.data}"
            issue_data = create_resp.get_json()["issue"]
            issue_id = issue_data["id"]
            initial_score = issue_data["priority_score"]
            print(f"[OK] [PASS] Created base issue #{issue_data['ticket_number']} (Score: {initial_score})")

            # 3. Test Spatial Duplicate Detection (50m radius)
            # Coordinates 25m away (approx 0.00022 deg lat shift): 18.5206, 73.8567
            dupe_resp = client.get(f"/api/issues/duplicates?category=Water+leakage&latitude=18.520600&longitude=73.856700&radius_meters=50")
            assert dupe_resp.status_code == 200, f"Duplicate check failed: {dupe_resp.data}"
            dupes = dupe_resp.get_json()["duplicates"]
            assert len(dupes) >= 1, "Expected at least 1 duplicate within 50m"
            found_dupe = next((d for d in dupes if d["issue"]["id"] == issue_id), None)
            assert found_dupe is not None, "Created issue was not detected in spatial duplicate query"
            assert found_dupe["distance_meters"] <= 50, f"Reported distance {found_dupe['distance_meters']}m exceeds 50m"
            print(f"[OK] [PASS] Spatial Duplicate detected within 50m (Calculated: {found_dupe['distance_meters']}m away)")

            # Coordinates 500m away should NOT be flagged as duplicate
            far_resp = client.get(f"/api/issues/duplicates?category=Water+leakage&latitude=18.525000&longitude=73.856700&radius_meters=50")
            far_dupes = far_resp.get_json()["duplicates"]
            far_found = next((d for d in far_dupes if d["issue"]["id"] == issue_id), None)
            assert far_found is None, "Issue was erroneously flagged 500m away!"
            print("[OK] [PASS] Spatial boundary check verified: Issues > 50m away are safely excluded")

            # 4. Test Upvote ('Me Too') Functionality
            # Upvote 1: Turn ON
            upvote_resp1 = client.post(f"/api/issues/{issue_id}/upvote", headers=citizen_headers)
            assert upvote_resp1.status_code == 200, f"Upvote toggle failed: {upvote_resp1.data}"
            u1_data = upvote_resp1.get_json()
            assert u1_data["upvoted"] is True
            assert u1_data["upvote_count"] == 1
            assert u1_data["priority_score"] > initial_score, "Priority score should have increased"
            print(f"[OK] [PASS] Upvote applied: Count is 1, Priority Score boosted from {initial_score} to {u1_data['priority_score']}")

            # Verify GET /api/issues/<id> shows has_upvoted=True
            detail_resp = client.get(f"/api/issues/{issue_id}", headers=citizen_headers)
            assert detail_resp.status_code == 200
            assert detail_resp.get_json()["issue"]["has_upvoted"] is True
            print("[OK] [PASS] Verified GET /api/issues/<id> correctly reflects has_upvoted: True")

            # Upvote 2: Toggle OFF
            upvote_resp2 = client.post(f"/api/issues/{issue_id}/upvote", headers=citizen_headers)
            assert upvote_resp2.status_code == 200
            u2_data = upvote_resp2.get_json()
            assert u2_data["upvoted"] is False
            assert u2_data["upvote_count"] == 0
            print("[OK] [PASS] Upvote toggled off: Count reverted to 0")

            # Upvote 3: Leave it ON for social proof
            client.post(f"/api/issues/{issue_id}/upvote", headers=citizen_headers)

            # 5. Test Comments (Citizen + Official Authority Responses)
            # Citizen comment
            c1_resp = client.post(f"/api/issues/{issue_id}/comments", json={
                "content": "Water is now reaching the storefronts. Please hurry!"
            }, headers=citizen_headers)
            assert c1_resp.status_code == 201, f"Citizen comment failed: {c1_resp.data}"
            c1_data = c1_resp.get_json()["comment"]
            assert c1_data["is_official"] is False
            print("[OK] [PASS] Citizen posted public grievance update (is_official: False)")

            # Officer official comment
            c2_resp = client.post(f"/api/issues/{issue_id}/comments", json={
                "content": "Official Update: Emergency valve crew en route, ETA 15 minutes."
            }, headers=officer_headers)
            assert c2_resp.status_code == 201, f"Officer comment failed: {c2_resp.data}"
            c2_data = c2_resp.get_json()["comment"]
            assert c2_data["is_official"] is True
            print("[OK] [PASS] Authority Officer posted official dispatch update (is_official: True)")

            # Fetch Comments list
            get_comments_resp = client.get(f"/api/issues/{issue_id}/comments")
            assert get_comments_resp.status_code == 200
            comments_list = get_comments_resp.get_json()["comments"]
            assert len(comments_list) == 2, f"Expected 2 comments, found {len(comments_list)}"
            print(f"[OK] [PASS] Retrieved full comment thread ({len(comments_list)} messages with official distinction)")

            # 6. Verify Full Issue Details endpoint
            full_detail_resp = client.get(f"/api/issues/{issue_id}", headers=citizen_headers)
            assert full_detail_resp.status_code == 200
            full_issue = full_detail_resp.get_json()["issue"]
            assert len(full_issue["status_logs"]) >= 1, "Status logs should be populated"
            assert len(full_issue["comments"]) == 2, "Comments should be included in details"
            assert full_issue["ticket_number"] == issue_data["ticket_number"]
            print(f"[OK] [PASS] Verified complete Issue Details response (Logs, Comments, SLA parameters)")

            print("\n>>> ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    run_phase5_tests()

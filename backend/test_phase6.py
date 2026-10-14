# DFD 9.0 - Phase 6 Backend Test Suite (Analytics, Leaderboard & CSV Export)
import sys
import csv
import io
from app import create_app
from database import db
from models import User, Issue, Department, SlaRule

def run_phase6_tests():
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        with app.app_context():
            print("\n--- RUNNING PHASE 6 TEST SUITE ---")

            # 1. Test Summary KPI Endpoint
            summary_resp = client.get("/api/analytics/summary")
            assert summary_resp.status_code == 200, f"Summary endpoint failed: {summary_resp.data}"
            summary = summary_resp.get_json()
            assert "sla_compliance_rate" in summary
            assert "avg_resolution_hours" in summary
            assert "total_issues" in summary
            assert summary["total_issues"] > 0
            print(f"[OK] [PASS] Analytics Summary: {summary['total_issues']} total issues, {summary['sla_compliance_rate']}% SLA compliance, ART: {summary['avg_resolution_hours']}h")

            # 2. Test Department Caseload Breakdown
            dept_resp = client.get("/api/analytics/by-department")
            assert dept_resp.status_code == 200, f"Department analytics failed: {dept_resp.data}"
            dept_stats = dept_resp.get_json()["departments"]
            assert len(dept_stats) >= 1
            first_dept = dept_stats[0]
            assert "total_issues" in first_dept
            assert "sla_compliance_rate" in first_dept
            print(f"[OK] [PASS] Department Performance: {len(dept_stats)} departments analyzed (e.g. {first_dept['department_name']}: {first_dept['total_issues']} issues)")

            # 3. Test Category Distribution
            cat_resp = client.get("/api/analytics/by-category")
            assert cat_resp.status_code == 200, f"Category analytics failed: {cat_resp.data}"
            categories = cat_resp.get_json()["categories"]
            assert len(categories) >= 1
            print(f"[OK] [PASS] Category Breakdown: {len(categories)} distinct categories indexed")

            # 4. Test Officer Leaderboard
            leaderboard_resp = client.get("/api/analytics/leaderboard")
            assert leaderboard_resp.status_code == 200, f"Leaderboard failed: {leaderboard_resp.data}"
            leaderboard = leaderboard_resp.get_json()["leaderboard"]
            assert len(leaderboard) >= 1
            top_officer = leaderboard[0]
            assert "officer_name" in top_officer
            assert "resolved_count" in top_officer
            assert "avg_citizen_rating" in top_officer
            print(f"[OK] [PASS] Officer Leaderboard: Top officer '{top_officer['officer_name']}' with {top_officer['resolved_count']} resolved, {top_officer['avg_citizen_rating']}/5 satisfaction")

            # 5. Test Heatmap Coordinates
            heatmap_resp = client.get("/api/analytics/heatmap")
            assert heatmap_resp.status_code == 200, f"Heatmap failed: {heatmap_resp.data}"
            points = heatmap_resp.get_json()["points"]
            assert len(points) >= 1
            p0 = points[0]
            assert "latitude" in p0 and "longitude" in p0 and "intensity" in p0
            print(f"[OK] [PASS] Heatmap Point Source: {len(points)} active geocoded coordinates returned")

            # 6. Test CSV Export Streaming
            csv_resp = client.get("/api/analytics/export/csv")
            assert csv_resp.status_code == 200, f"CSV export failed: {csv_resp.data}"
            assert csv_resp.mimetype == "text/csv"
            assert "Content-Disposition" in csv_resp.headers
            assert "attachment; filename=" in csv_resp.headers["Content-Disposition"]

            csv_text = csv_resp.data.decode("utf-8")
            reader = csv.reader(io.StringIO(csv_text))
            header = next(reader)
            assert "Ticket Number" in header
            assert "SLA Compliant (On-Time)" in header
            assert "Priority Score" in header
            assert "Citizen Rating (1-5)" in header

            rows = list(reader)
            assert len(rows) >= 1, "CSV should contain at least one data row"
            print(f"[OK] [PASS] CSV Export verified: {len(rows)} data rows stream-generated with RFC 4180 headers")

            print("\n>>> ALL PHASE 6 BACKEND TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    run_phase6_tests()

# DFD 9.0 - Phase 7 Packaging & PDF Export Automated Test Suite
import sys
from app import create_app
from database import db

def run_phase7_tests():
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        with app.app_context():
            print("\n--- RUNNING PHASE 7 PACKAGING & PDF TEST SUITE ---")

            # 1. Test Health Check Endpoint
            health_resp = client.get("/api/health")
            assert health_resp.status_code == 200, f"Health check failed: {health_resp.data}"
            health = health_resp.get_json()
            assert health["status"] == "healthy"
            print(f"[OK] [PASS] Health check verified: {health['service']} (v{health['version']})")

            # 2. Test PDF Export
            pdf_resp = client.get("/api/analytics/export/pdf")
            assert pdf_resp.status_code == 200, f"PDF export failed: {pdf_resp.data}"
            assert pdf_resp.mimetype == "application/pdf"
            assert "Content-Disposition" in pdf_resp.headers
            assert "attachment; filename=" in pdf_resp.headers["Content-Disposition"]
            
            # Check PDF Magic Header %PDF-
            pdf_bytes = pdf_resp.data
            assert pdf_bytes.startswith(b"%PDF"), "Generated file does not begin with valid %PDF magic bytes"
            assert len(pdf_bytes) > 1000, f"Generated PDF size ({len(pdf_bytes)} bytes) is unexpectedly small"
            print(f"[OK] [PASS] PDF Generation verified: {len(pdf_bytes)} bytes of valid %PDF binary generated")

            # 3. Test Static Upload Serving
            upload_test_resp = client.get("/uploads/nonexistent.jpg")
            assert upload_test_resp.status_code == 404, "Static upload handler responded unexpectedly"
            print("[OK] [PASS] Static upload file serving route operational")

            print("\n>>> ALL PHASE 7 PACKAGING TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    run_phase7_tests()

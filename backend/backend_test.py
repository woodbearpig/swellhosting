"""
Backend API tests for swell design + media
Tests admin credentials change and dynamic inquiry form builder features.
"""
import requests
import sys
import time
from datetime import datetime

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@swelldesignla.com"
ADMIN_PASSWORD = "swell2025"

class TestRunner:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.failures = []

    def test(self, name, fn):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n{'='*60}")
        print(f"🔍 Test {self.tests_run}: {name}")
        print('='*60)
        try:
            fn()
            self.tests_passed += 1
            print(f"✅ PASSED")
        except AssertionError as e:
            print(f"❌ FAILED: {e}")
            self.failures.append(f"{name}: {e}")
        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.failures.append(f"{name}: {e}")

    def login(self, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
        """Login and get token"""
        print(f"  → Logging in as {email}...")
        r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data, "No token in response"
        self.token = data["token"]
        print(f"  ✓ Logged in, token: {self.token[:20]}...")
        return self.token

    def headers(self):
        """Return auth headers"""
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print('='*60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        if self.failures:
            print(f"\n❌ FAILURES:")
            for f in self.failures:
                print(f"  - {f}")
        return 0 if self.tests_passed == self.tests_run else 1


def main():
    runner = TestRunner()

    # =========================================================
    # ADMIN AUTH: Change Credentials Tests
    # =========================================================
    
    def test_change_credentials_no_jwt():
        """POST /api/admin/auth/change-credentials without JWT returns 401"""
        r = requests.post(f"{BASE_URL}/admin/auth/change-credentials", json={"current_password": "test"})
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_change_credentials_wrong_password():
        """With JWT + wrong current_password returns 401"""
        runner.login()
        r = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": "wrongpassword123"},
            headers=runner.headers()
        )
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_change_credentials_update_name():
        """With correct current_password + new_name returns updated user"""
        runner.login()
        r = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": ADMIN_PASSWORD, "new_name": "Test Admin Updated"},
            headers=runner.headers()
        )
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["ok"] == True, "ok should be True"
        assert data["changed"] == True, "changed should be True"
        assert data["user"]["name"] == "Test Admin Updated", f"Name not updated: {data['user']['name']}"

    def test_change_credentials_short_password():
        """With correct + new_password shorter than 8 returns 400"""
        runner.login()
        r = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": ADMIN_PASSWORD, "new_password": "short"},
            headers=runner.headers()
        )
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_change_credentials_valid_password():
        """With correct + valid new_password returns {ok, changed:true, token}"""
        runner.login()
        new_password = "newpassword123"
        r = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": ADMIN_PASSWORD, "new_password": new_password},
            headers=runner.headers()
        )
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["ok"] == True, "ok should be True"
        assert data["changed"] == True, "changed should be True"
        assert "token" in data, "New token should be returned"
        
        # Store new token and verify it works
        new_token = data["token"]
        print(f"  ✓ New token received: {new_token[:20]}...")
        
        # Test new token on /auth/me
        r2 = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        print(f"  → Testing new token on /auth/me: {r2.status_code}")
        assert r2.status_code == 200, f"New token should work, got {r2.status_code}"
        
        # Test login with new password
        print(f"  → Testing login with new password...")
        r3 = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": new_password})
        print(f"  → Login status: {r3.status_code}")
        assert r3.status_code == 200, f"Login with new password failed: {r3.status_code}"
        
        # Change back to original password
        print(f"  → Changing password back to original...")
        runner.token = new_token
        r4 = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": new_password, "new_password": ADMIN_PASSWORD},
            headers=runner.headers()
        )
        print(f"  → Reset status: {r4.status_code}")
        assert r4.status_code == 200, f"Failed to reset password: {r4.status_code}"
        print(f"  ✓ Password reset to original")

    def test_change_credentials_duplicate_email():
        """Changing email to one already in use by another admin returns 409"""
        # This test assumes only one admin exists, so we can't test duplicate email collision
        # But we can test changing to the same email (no-op)
        runner.login()
        r = requests.post(
            f"{BASE_URL}/admin/auth/change-credentials",
            json={"current_password": ADMIN_PASSWORD, "new_email": ADMIN_EMAIL},
            headers=runner.headers()
        )
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        # Either changed:false (no-op) OR changed:true with no email change is acceptable
        print(f"  ✓ Same email change: changed={data.get('changed')}")

    # =========================================================
    # INQUIRY FORM: Schema Tests
    # =========================================================

    def test_inquiry_form_get_default():
        """GET /api/inquiry-form returns the 8-step default template"""
        r = requests.get(f"{BASE_URL}/inquiry-form")
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        print(f"  → Schema version: {data.get('version')}")
        print(f"  → Steps count: {len(data.get('steps', []))}")
        assert "steps" in data, "Schema should have steps"
        assert len(data["steps"]) == 8, f"Expected 8 steps, got {len(data['steps'])}"
        
        # Check for standard fields
        all_field_ids = []
        for step in data["steps"]:
            for field in step.get("fields", []):
                all_field_ids.append(field["id"])
        
        print(f"  → All field IDs: {all_field_ids}")
        required_fields = ["event_type", "client_name", "client_email", "client_phone", 
                          "event_date", "color_palette", "services_needed", "budget_range", 
                          "inspiration_links"]
        for fid in required_fields:
            assert fid in all_field_ids, f"Missing required field: {fid}"
        print(f"  ✓ All required fields present")

    def test_inquiry_form_update():
        """PUT /api/admin/inquiry-form with modified schema persists"""
        runner.login()
        
        # Get current schema
        r = requests.get(f"{BASE_URL}/inquiry-form")
        schema = r.json()
        
        # Add a new step with a text field
        new_step = {
            "id": "step-test-custom",
            "title": "Test Custom Step",
            "description": "This is a test step",
            "fields": [
                {
                    "id": "test_custom_field",
                    "type": "text",
                    "label": "Test Field",
                    "help": "This is a test",
                    "placeholder": "Enter test value",
                    "required": False
                }
            ]
        }
        schema["steps"].append(new_step)
        
        # Update schema
        r2 = requests.put(f"{BASE_URL}/admin/inquiry-form", json=schema, headers=runner.headers())
        print(f"  → Update status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        
        # Verify it persisted
        r3 = requests.get(f"{BASE_URL}/inquiry-form")
        updated = r3.json()
        print(f"  → Updated steps count: {len(updated['steps'])}")
        assert len(updated["steps"]) == 9, f"Expected 9 steps, got {len(updated['steps'])}"
        
        # Check the new step exists
        last_step = updated["steps"][-1]
        assert last_step["id"] == "step-test-custom", f"New step not found"
        assert len(last_step["fields"]) == 1, "New step should have 1 field"
        assert last_step["fields"][0]["id"] == "test_custom_field", "New field not found"
        print(f"  ✓ Custom step persisted")

    def test_inquiry_form_invalid_payload():
        """PUT /api/admin/inquiry-form with invalid payload returns 400"""
        runner.login()
        
        # Test non-object payload
        r = requests.put(f"{BASE_URL}/admin/inquiry-form", json="invalid", headers=runner.headers())
        print(f"  → Non-object payload status: {r.status_code}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        
        # Test non-list steps
        r2 = requests.put(f"{BASE_URL}/admin/inquiry-form", json={"steps": "invalid"}, headers=runner.headers())
        print(f"  → Non-list steps status: {r2.status_code}")
        assert r2.status_code == 400, f"Expected 400, got {r2.status_code}"

    def test_inquiry_form_missing_field_attrs():
        """Missing type/id in a field → field is silently dropped"""
        runner.login()
        
        schema = {
            "version": 1,
            "steps": [
                {
                    "id": "step-test",
                    "title": "Test",
                    "description": "Test",
                    "fields": [
                        {"id": "valid_field", "type": "text", "label": "Valid"},
                        {"type": "text", "label": "Missing ID"},  # Missing id
                        {"id": "missing_type", "label": "Missing Type"},  # Missing type
                    ]
                }
            ]
        }
        
        r = requests.put(f"{BASE_URL}/admin/inquiry-form", json=schema, headers=runner.headers())
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify only valid field remains
        r2 = requests.get(f"{BASE_URL}/inquiry-form")
        updated = r2.json()
        fields = updated["steps"][0]["fields"]
        print(f"  → Fields count: {len(fields)}")
        assert len(fields) == 1, f"Expected 1 field (invalid ones dropped), got {len(fields)}"
        assert fields[0]["id"] == "valid_field", "Only valid field should remain"
        print(f"  ✓ Invalid fields silently dropped")

    def test_inquiry_form_reset():
        """POST /api/admin/inquiry-form/reset restores default 8-step schema"""
        runner.login()
        
        r = requests.post(f"{BASE_URL}/admin/inquiry-form/reset", headers=runner.headers())
        print(f"  → Reset status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify it's back to 8 steps
        r2 = requests.get(f"{BASE_URL}/inquiry-form")
        schema = r2.json()
        print(f"  → Steps count after reset: {len(schema['steps'])}")
        assert len(schema["steps"]) == 8, f"Expected 8 steps after reset, got {len(schema['steps'])}"
        print(f"  ✓ Schema reset to default")

    # =========================================================
    # INQUIRIES: Custom Fields Tests
    # =========================================================

    def test_inquiry_with_custom_fields():
        """POST /api/inquiries with standard + custom fields persists correctly"""
        # Create inquiry with mix of standard and custom fields
        payload = {
            "client_name": "Test Client",
            "client_email": "test@example.com",
            "client_phone": "(310) 555-1234",
            "event_type": "wedding",
            "event_date": "2025-12-15",
            "color_palette": ["blush", "sage"],
            "services_needed": ["balloon_garland", "florals"],
            "budget_range": "$2,500 – $5,000",
            # Custom fields (not in STANDARD_FIELD_IDS)
            "favorite_color": "blush",
            "how_did_you_hear": "instagram",
            "custom_notes": "This is a custom field"
        }
        
        r = requests.post(f"{BASE_URL}/inquiries", json=payload)
        print(f"  → Create inquiry status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        inquiry_id = r.json()["id"]
        print(f"  ✓ Inquiry created: {inquiry_id}")
        
        # Retrieve inquiry via admin endpoint
        runner.login()
        r2 = requests.get(f"{BASE_URL}/admin/inquiries/{inquiry_id}", headers=runner.headers())
        print(f"  → Get inquiry status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        
        inquiry = r2.json()
        print(f"  → Inquiry data keys: {list(inquiry.keys())}")
        
        # Check standard fields at top-level
        assert inquiry["client_name"] == "Test Client", "client_name should be at top-level"
        assert inquiry["client_email"] == "test@example.com", "client_email should be at top-level"
        assert inquiry["event_type"] == "wedding", "event_type should be at top-level"
        print(f"  ✓ Standard fields at top-level")
        
        # Check custom fields in extra
        assert "extra" in inquiry, "extra field should exist"
        extra = inquiry["extra"]
        print(f"  → Extra fields: {extra}")
        assert extra.get("favorite_color") == "blush", "favorite_color should be in extra"
        assert extra.get("how_did_you_hear") == "instagram", "how_did_you_hear should be in extra"
        assert extra.get("custom_notes") == "This is a custom field", "custom_notes should be in extra"
        print(f"  ✓ Custom fields in extra")
        
        # Clean up: delete test inquiry
        r3 = requests.delete(f"{BASE_URL}/admin/inquiries/{inquiry_id}", headers=runner.headers())
        print(f"  → Delete inquiry status: {r3.status_code}")
        print(f"  ✓ Test inquiry deleted")

    # =========================================================
    # Run all tests
    # =========================================================
    
    runner.test("Change credentials without JWT returns 401", test_change_credentials_no_jwt)
    runner.test("Change credentials with wrong password returns 401", test_change_credentials_wrong_password)
    runner.test("Change credentials updates name", test_change_credentials_update_name)
    runner.test("Change credentials rejects short password", test_change_credentials_short_password)
    runner.test("Change credentials with valid password works", test_change_credentials_valid_password)
    runner.test("Change credentials with same email", test_change_credentials_duplicate_email)
    
    runner.test("GET inquiry form returns default 8-step template", test_inquiry_form_get_default)
    runner.test("PUT inquiry form persists changes", test_inquiry_form_update)
    runner.test("PUT inquiry form rejects invalid payload", test_inquiry_form_invalid_payload)
    runner.test("PUT inquiry form drops fields with missing type/id", test_inquiry_form_missing_field_attrs)
    runner.test("POST inquiry form reset restores default", test_inquiry_form_reset)
    
    runner.test("POST inquiry with custom fields persists correctly", test_inquiry_with_custom_fields)
    
    return runner.summary()


if __name__ == "__main__":
    sys.exit(main())

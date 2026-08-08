"""
Backend API tests for swell design + media
Tests Features H (Google Calendar Polish), I (Consults Merged), J (Media Library)
"""
import requests
import sys
import time
from datetime import datetime, date, timedelta
import io

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@swelldesignla.com"
ADMIN_PASSWORD = "Testing9!"

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
    # FEATURE H: Google Calendar Polish
    # =========================================================
    
    def test_gcal_status_env_configured():
        """GET /api/admin/integrations/google/status returns env_configured field"""
        runner.login()
        r = requests.get(f"{BASE_URL}/admin/integrations/google/status", headers=runner.headers())
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        print(f"  → Response keys: {list(data.keys())}")
        print(f"  → env_configured: {data.get('env_configured')}")
        print(f"  → connected: {data.get('connected')}")
        
        assert "env_configured" in data, "env_configured field missing"
        assert "connected" in data, "connected field missing"
        
        # In test env, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are NOT set
        # So env_configured should be False
        assert data["env_configured"] == False, f"Expected env_configured=False (env vars not set), got {data['env_configured']}"
        print(f"  ✓ env_configured correctly returns False when env vars not set")

    # =========================================================
    # FEATURE I: Consults Merged into Inquiries
    # =========================================================
    
    def test_inquiry_with_consult():
        """POST /api/inquiries with consult_date+time creates inquiry + consultation"""
        # Pick a valid date ~14 days out, non-Sunday
        today = date.today()
        target_date = today + timedelta(days=14)
        # Ensure not Sunday
        while target_date.weekday() == 6:
            target_date += timedelta(days=1)
        
        date_str = target_date.strftime("%Y-%m-%d")
        time_str = "10:00"
        
        payload = {
            "client_name": "Test Consult Client",
            "client_email": "testconsult@example.com",
            "client_phone": "(310) 555-9999",
            "event_type": "wedding",
            "consult_date": date_str,
            "consult_time": time_str
        }
        
        print(f"  → Creating inquiry with consult: {date_str} {time_str}")
        r = requests.post(f"{BASE_URL}/inquiries", json=payload)
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["ok"] == True, "ok should be True"
        assert data["consult_scheduled"] == True, "consult_scheduled should be True"
        assert "id" in data, "Should return inquiry id"
        
        inquiry_id = data["id"]
        print(f"  ✓ Inquiry created: {inquiry_id}")
        
        # Verify inquiry in DB
        runner.login()
        r2 = requests.get(f"{BASE_URL}/admin/inquiries/{inquiry_id}", headers=runner.headers())
        assert r2.status_code == 200, f"Failed to get inquiry: {r2.status_code}"
        
        inquiry = r2.json()
        print(f"  → Inquiry status: {inquiry.get('status')}")
        print(f"  → Inquiry consult_date: {inquiry.get('consult_date')}")
        print(f"  → Inquiry consult_time: {inquiry.get('consult_time')}")
        print(f"  → Inquiry consult_status: {inquiry.get('consult_status')}")
        
        assert inquiry["consult_date"] == date_str, f"consult_date mismatch"
        assert inquiry["consult_time"] == time_str, f"consult_time mismatch"
        assert inquiry["consult_status"] == "scheduled", f"consult_status should be 'scheduled'"
        assert inquiry["status"] == "consult_scheduled", f"status should be 'consult_scheduled'"
        print(f"  ✓ Inquiry has correct consult fields")
        
        # Verify consultation row exists
        r3 = requests.get(f"{BASE_URL}/admin/consultations", headers=runner.headers())
        assert r3.status_code == 200, f"Failed to get consultations: {r3.status_code}"
        
        consultations = r3.json()
        matching = [c for c in consultations if c.get("inquiry_id") == inquiry_id]
        print(f"  → Found {len(matching)} consultations for inquiry {inquiry_id}")
        assert len(matching) == 1, f"Expected 1 consultation, found {len(matching)}"
        
        consult = matching[0]
        print(f"  → Consultation date: {consult.get('date')}")
        print(f"  → Consultation time: {consult.get('time')}")
        print(f"  → Consultation status: {consult.get('status')}")
        
        assert consult["date"] == date_str, "Consultation date mismatch"
        assert consult["time"] == time_str, "Consultation time mismatch"
        assert consult["status"] == "scheduled", "Consultation status should be 'scheduled'"
        print(f"  ✓ Consultation row created correctly")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/inquiries/{inquiry_id}", headers=runner.headers())
        requests.delete(f"{BASE_URL}/admin/consultations/{consult['id']}", headers=runner.headers())
        print(f"  ✓ Cleaned up test data")

    def test_inquiry_without_consult():
        """POST /api/inquiries without consult_date/time does NOT create consultation"""
        payload = {
            "client_name": "Test No Consult Client",
            "client_email": "testnoconsult@example.com",
            "client_phone": "(310) 555-8888",
            "event_type": "birthday"
        }
        
        print(f"  → Creating inquiry WITHOUT consult")
        r = requests.post(f"{BASE_URL}/inquiries", json=payload)
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["ok"] == True, "ok should be True"
        assert data["consult_scheduled"] == False, "consult_scheduled should be False"
        
        inquiry_id = data["id"]
        print(f"  ✓ Inquiry created: {inquiry_id}")
        
        # Verify no consultation row
        runner.login()
        r2 = requests.get(f"{BASE_URL}/admin/consultations", headers=runner.headers())
        consultations = r2.json()
        matching = [c for c in consultations if c.get("inquiry_id") == inquiry_id]
        print(f"  → Found {len(matching)} consultations for inquiry {inquiry_id}")
        assert len(matching) == 0, f"Expected 0 consultations, found {len(matching)}"
        print(f"  ✓ No consultation row created")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/inquiries/{inquiry_id}", headers=runner.headers())
        print(f"  ✓ Cleaned up test data")

    def test_availability_rules():
        """GET /api/availability returns new booking rule fields"""
        r = requests.get(f"{BASE_URL}/availability")
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        print(f"  → Response keys: {list(data.keys())}")
        
        required_fields = [
            "advance_booking_days",
            "minimum_lead_hours",
            "daily_max_consults",
            "consult_duration_minutes",
            "block_sundays"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            print(f"  → {field}: {data[field]}")
        
        # Check defaults
        assert data["advance_booking_days"] == 60, "Default advance_booking_days should be 60"
        assert data["minimum_lead_hours"] == 2, "Default minimum_lead_hours should be 2"
        assert data["daily_max_consults"] == 6, "Default daily_max_consults should be 6"
        assert data["consult_duration_minutes"] == 30, "Default consult_duration_minutes should be 30"
        assert data["block_sundays"] == True, "Default block_sundays should be True"
        
        print(f"  ✓ All booking rule fields present with correct defaults")

    def test_availability_rules_update():
        """PUT /api/admin/availability persists booking rule changes"""
        runner.login()
        
        # Update rules
        payload = {
            "advance_booking_days": 90,
            "minimum_lead_hours": 12,
            "daily_max_consults": 4,
            "consult_duration_minutes": 45,
            "block_sundays": False
        }
        
        print(f"  → Updating availability rules")
        r = requests.put(f"{BASE_URL}/admin/availability", json=payload, headers=runner.headers())
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify changes persisted
        r2 = requests.get(f"{BASE_URL}/availability")
        data = r2.json()
        
        assert data["advance_booking_days"] == 90, "advance_booking_days not updated"
        assert data["minimum_lead_hours"] == 12, "minimum_lead_hours not updated"
        assert data["daily_max_consults"] == 4, "daily_max_consults not updated"
        assert data["consult_duration_minutes"] == 45, "consult_duration_minutes not updated"
        assert data["block_sundays"] == False, "block_sundays not updated"
        
        print(f"  ✓ Booking rules updated successfully")
        
        # Reset to defaults
        reset_payload = {
            "advance_booking_days": 60,
            "minimum_lead_hours": 2,
            "daily_max_consults": 6,
            "consult_duration_minutes": 30,
            "block_sundays": True
        }
        requests.put(f"{BASE_URL}/admin/availability", json=reset_payload, headers=runner.headers())
        print(f"  ✓ Reset to defaults")

    def test_availability_slots_block_sundays():
        """GET /api/availability/slots?date=YYYY-MM-DD (Sunday) returns empty when block_sundays=true"""
        # Find next Sunday
        today = date.today()
        days_ahead = 6 - today.weekday()  # Sunday is 6
        if days_ahead <= 0:
            days_ahead += 7
        next_sunday = today + timedelta(days=days_ahead)
        date_str = next_sunday.strftime("%Y-%m-%d")
        
        print(f"  → Testing Sunday blocking: {date_str}")
        r = requests.get(f"{BASE_URL}/availability/slots", params={"date": date_str})
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        print(f"  → Slots: {data.get('slots')}")
        assert data["slots"] == [], f"Expected empty slots for Sunday, got {data['slots']}"
        print(f"  ✓ Sunday correctly blocked")

    def test_availability_slots_past_date():
        """GET /api/availability/slots?date=YYYY-MM-DD (past) returns empty"""
        past_date = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        print(f"  → Testing past date: {past_date}")
        r = requests.get(f"{BASE_URL}/availability/slots", params={"date": past_date})
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        print(f"  → Slots: {data.get('slots')}")
        assert data["slots"] == [], f"Expected empty slots for past date, got {data['slots']}"
        print(f"  ✓ Past date correctly blocked")

    def test_availability_slots_too_far():
        """GET /api/availability/slots?date=YYYY-MM-DD (> advance_booking_days) returns empty"""
        far_date = (date.today() + timedelta(days=100)).strftime("%Y-%m-%d")
        
        print(f"  → Testing date too far out: {far_date}")
        r = requests.get(f"{BASE_URL}/availability/slots", params={"date": far_date})
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        print(f"  → Slots: {data.get('slots')}")
        assert data["slots"] == [], f"Expected empty slots for date too far out, got {data['slots']}"
        print(f"  ✓ Date beyond advance_booking_days correctly blocked")

    # =========================================================
    # FEATURE J: Media Library
    # =========================================================
    
    def test_media_upload():
        """POST /api/uploads creates media_library record"""
        # Create a small test image (1x1 PNG)
        import base64
        # 1x1 red PNG
        png_data = base64.b64decode(
            b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        )
        
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        
        print(f"  → Uploading test image")
        r = requests.post(f"{BASE_URL}/uploads", files=files)
        print(f"  → Status: {r.status_code}")
        print(f"  → Response: {r.json()}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "url" in data, "Should return url"
        assert "filename" in data, "Should return filename"
        assert "width" in data, "Should return width"
        assert "height" in data, "Should return height"
        
        url = data["url"]
        print(f"  ✓ Image uploaded: {url}")
        
        # Verify it's in media library
        runner.login()
        r2 = requests.get(f"{BASE_URL}/admin/media", headers=runner.headers())
        assert r2.status_code == 200, f"Failed to get media: {r2.status_code}"
        
        media = r2.json()
        matching = [m for m in media if m["url"] == url]
        print(f"  → Found {len(matching)} media records for {url}")
        assert len(matching) == 1, f"Expected 1 media record, found {len(matching)}"
        
        media_id = matching[0]["id"]
        print(f"  ✓ Media library record created: {media_id}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/media/{media_id}", headers=runner.headers())
        print(f"  ✓ Cleaned up test media")

    def test_media_crud():
        """GET/PATCH/DELETE /api/admin/media work correctly"""
        runner.login()
        
        # Upload test image first
        import base64
        png_data = base64.b64decode(
            b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        )
        files = {'file': ('test-crud.png', io.BytesIO(png_data), 'image/png')}
        r = requests.post(f"{BASE_URL}/uploads", files=files)
        url = r.json()["url"]
        
        # Get media list
        r2 = requests.get(f"{BASE_URL}/admin/media", headers=runner.headers())
        media = r2.json()
        matching = [m for m in media if m["url"] == url]
        media_id = matching[0]["id"]
        
        print(f"  → Testing PATCH /api/admin/media/{media_id}")
        # Update alt_text and tags
        patch = {"alt_text": "Test alt text", "tags": ["test", "crud"]}
        r3 = requests.patch(f"{BASE_URL}/admin/media/{media_id}", json=patch, headers=runner.headers())
        print(f"  → PATCH status: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        
        updated = r3.json()
        print(f"  → Updated alt_text: {updated.get('alt_text')}")
        print(f"  → Updated tags: {updated.get('tags')}")
        assert updated["alt_text"] == "Test alt text", "alt_text not updated"
        assert updated["tags"] == ["test", "crud"], "tags not updated"
        print(f"  ✓ PATCH works")
        
        # Test DELETE
        print(f"  → Testing DELETE /api/admin/media/{media_id}")
        r4 = requests.delete(f"{BASE_URL}/admin/media/{media_id}", headers=runner.headers())
        print(f"  → DELETE status: {r4.status_code}")
        assert r4.status_code == 200, f"Expected 200, got {r4.status_code}"
        
        # Verify deleted
        r5 = requests.get(f"{BASE_URL}/admin/media", headers=runner.headers())
        media = r5.json()
        matching = [m for m in media if m["id"] == media_id]
        assert len(matching) == 0, "Media should be deleted"
        print(f"  ✓ DELETE works")

    def test_media_search():
        """GET /api/admin/media?q=... filters by filename/alt_text"""
        runner.login()
        
        # Upload test image with specific filename
        import base64
        png_data = base64.b64decode(
            b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        )
        files = {'file': ('searchable-test-image.png', io.BytesIO(png_data), 'image/png')}
        r = requests.post(f"{BASE_URL}/uploads", files=files)
        url = r.json()["url"]
        
        # Get media ID
        r2 = requests.get(f"{BASE_URL}/admin/media", headers=runner.headers())
        media = r2.json()
        matching = [m for m in media if m["url"] == url]
        media_id = matching[0]["id"]
        
        # Search by filename
        print(f"  → Searching for 'searchable'")
        r3 = requests.get(f"{BASE_URL}/admin/media", params={"q": "searchable"}, headers=runner.headers())
        print(f"  → Status: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        
        results = r3.json()
        print(f"  → Found {len(results)} results")
        assert len(results) >= 1, "Should find at least 1 result"
        assert any(m["id"] == media_id for m in results), "Should find our test image"
        print(f"  ✓ Search by filename works")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/media/{media_id}", headers=runner.headers())
        print(f"  ✓ Cleaned up test media")

    def test_media_tag_filter():
        """GET /api/admin/media?tag=... filters by tag"""
        runner.login()
        
        # Upload and tag an image
        import base64
        png_data = base64.b64decode(
            b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        )
        files = {'file': ('tagged-test.png', io.BytesIO(png_data), 'image/png')}
        r = requests.post(f"{BASE_URL}/uploads", files=files)
        url = r.json()["url"]
        
        # Get media ID and add tag
        r2 = requests.get(f"{BASE_URL}/admin/media", headers=runner.headers())
        media = r2.json()
        matching = [m for m in media if m["url"] == url]
        media_id = matching[0]["id"]
        
        # Add unique tag
        unique_tag = f"test-tag-{int(time.time())}"
        patch = {"tags": [unique_tag]}
        requests.patch(f"{BASE_URL}/admin/media/{media_id}", json=patch, headers=runner.headers())
        
        # Filter by tag
        print(f"  → Filtering by tag: {unique_tag}")
        r3 = requests.get(f"{BASE_URL}/admin/media", params={"tag": unique_tag}, headers=runner.headers())
        print(f"  → Status: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        
        results = r3.json()
        print(f"  → Found {len(results)} results")
        assert len(results) == 1, f"Should find exactly 1 result, found {len(results)}"
        assert results[0]["id"] == media_id, "Should find our test image"
        print(f"  ✓ Tag filter works")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/media/{media_id}", headers=runner.headers())
        print(f"  ✓ Cleaned up test media")

    # =========================================================
    # NO REGRESSIONS
    # =========================================================
    
    def test_no_regressions():
        """Verify previously working endpoints still function"""
        runner.login()
        
        # Test /api/palettes
        r1 = requests.get(f"{BASE_URL}/palettes")
        print(f"  → GET /api/palettes: {r1.status_code}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        palettes = r1.json()
        assert "palettes" in palettes, "Should have palettes key"
        palette_count = len(palettes['palettes'])
        print(f"  ✓ /api/palettes working ({palette_count} palettes)")
        assert palette_count >= 22, f"Expected at least 22 palettes, got {palette_count}"
        
        # Test /api/site-content
        r2 = requests.get(f"{BASE_URL}/site-content")
        print(f"  → GET /api/site-content: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        site = r2.json()
        required_fields = ["business_name", "hero_headline", "active_palette_id", 
                          "font_serif_id", "hero_badges"]
        for field in required_fields:
            assert field in site, f"Missing field: {field}"
        print(f"  ✓ /api/site-content working")
        
        # Test /api/inquiry-form
        r3 = requests.get(f"{BASE_URL}/inquiry-form")
        print(f"  → GET /api/inquiry-form: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        form = r3.json()
        assert "steps" in form, "Should have steps key"
        assert len(form["steps"]) == 8, f"Expected 8 steps, got {len(form['steps'])}"
        print(f"  ✓ /api/inquiry-form working (8 steps)")
        
        # Test login
        r4 = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        print(f"  → POST /api/auth/login: {r4.status_code}")
        assert r4.status_code == 200, f"Expected 200, got {r4.status_code}"
        print(f"  ✓ /api/auth/login working")

    # =========================================================
    # NEW FEATURES: Reply Templates, Backdrops kind field, Hero Colors
    # =========================================================
    
    def test_reply_templates_crud():
        """Reply templates CRUD endpoints work correctly"""
        runner.login()
        
        # GET - list templates (should have 4 seeded)
        print(f"  → GET /api/admin/reply-templates")
        r = requests.get(f"{BASE_URL}/admin/reply-templates", headers=runner.headers())
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        templates = r.json()
        print(f"  → Found {len(templates)} templates")
        assert len(templates) >= 4, f"Expected at least 4 seeded templates, got {len(templates)}"
        print(f"  ✓ GET reply-templates works, seed data present")
        
        # POST - create new template
        new_template = {
            "name": "Test Template",
            "subject": "Test Subject {first_name}",
            "body": "Hi {client_name}, this is a test template for {event_type}."
        }
        print(f"  → POST /api/admin/reply-templates")
        r2 = requests.post(f"{BASE_URL}/admin/reply-templates", json=new_template, headers=runner.headers())
        print(f"  → Status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        
        created = r2.json()
        assert "id" in created, "Should return id"
        assert created["name"] == "Test Template", "Name mismatch"
        template_id = created["id"]
        print(f"  ✓ POST reply-templates works, created: {template_id}")
        
        # PUT - update template
        update = {"name": "Updated Test Template", "subject": "Updated Subject"}
        print(f"  → PUT /api/admin/reply-templates/{template_id}")
        r3 = requests.put(f"{BASE_URL}/admin/reply-templates/{template_id}", json=update, headers=runner.headers())
        print(f"  → Status: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        
        updated = r3.json()
        assert updated["name"] == "Updated Test Template", "Name not updated"
        print(f"  ✓ PUT reply-templates works")
        
        # DELETE - remove template
        print(f"  → DELETE /api/admin/reply-templates/{template_id}")
        r4 = requests.delete(f"{BASE_URL}/admin/reply-templates/{template_id}", headers=runner.headers())
        print(f"  → Status: {r4.status_code}")
        assert r4.status_code == 200, f"Expected 200, got {r4.status_code}"
        print(f"  ✓ DELETE reply-templates works")
        
        # Verify deleted
        r5 = requests.get(f"{BASE_URL}/admin/reply-templates", headers=runner.headers())
        templates = r5.json()
        assert not any(t["id"] == template_id for t in templates), "Template should be deleted"
        print(f"  ✓ Template successfully deleted")
    
    def test_reply_templates_reorder():
        """Reply templates reorder endpoint works"""
        runner.login()
        
        # Get current templates
        r = requests.get(f"{BASE_URL}/admin/reply-templates", headers=runner.headers())
        templates = r.json()
        
        if len(templates) < 2:
            print(f"  ⚠ Skipping reorder test (need at least 2 templates)")
            return
        
        # Reverse order
        ids = [t["id"] for t in templates]
        reversed_ids = list(reversed(ids))
        
        print(f"  → POST /api/admin/reply-templates/reorder")
        r2 = requests.post(f"{BASE_URL}/admin/reply-templates/reorder", 
                          json={"order": reversed_ids}, headers=runner.headers())
        print(f"  → Status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        print(f"  ✓ Reorder endpoint works")
    
    def test_backdrops_kind_field():
        """Backdrops support kind field (backdrop/design)"""
        runner.login()
        
        # Create backdrop
        backdrop = {
            "name": "Test Backdrop",
            "kind": "backdrop",
            "active": True
        }
        print(f"  → POST /api/admin/backdrops (kind=backdrop)")
        r = requests.post(f"{BASE_URL}/admin/backdrops", json=backdrop, headers=runner.headers())
        print(f"  → Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        created_backdrop = r.json()
        assert created_backdrop["kind"] == "backdrop", "Kind should be 'backdrop'"
        backdrop_id = created_backdrop["id"]
        print(f"  ✓ Created backdrop with kind='backdrop': {backdrop_id}")
        
        # Create design
        design = {
            "name": "Test Design",
            "kind": "design",
            "active": True
        }
        print(f"  → POST /api/admin/backdrops (kind=design)")
        r2 = requests.post(f"{BASE_URL}/admin/backdrops", json=design, headers=runner.headers())
        print(f"  → Status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        
        created_design = r2.json()
        assert created_design["kind"] == "design", "Kind should be 'design'"
        design_id = created_design["id"]
        print(f"  ✓ Created backdrop with kind='design': {design_id}")
        
        # Test public filter by kind
        print(f"  → GET /api/backdrops?kind=design")
        r3 = requests.get(f"{BASE_URL}/backdrops", params={"kind": "design"})
        print(f"  → Status: {r3.status_code}")
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        
        designs = r3.json()
        print(f"  → Found {len(designs)} designs")
        assert any(d["id"] == design_id for d in designs), "Should find our test design"
        assert all(d.get("kind", "backdrop") == "design" for d in designs), "All should be designs"
        print(f"  ✓ Public filter by kind=design works")
        
        # Test filter by kind=backdrop
        print(f"  → GET /api/backdrops?kind=backdrop")
        r4 = requests.get(f"{BASE_URL}/backdrops", params={"kind": "backdrop"})
        backdrops = r4.json()
        print(f"  → Found {len(backdrops)} backdrops")
        assert any(b["id"] == backdrop_id for b in backdrops), "Should find our test backdrop"
        print(f"  ✓ Public filter by kind=backdrop works")
        
        # Clean up
        requests.delete(f"{BASE_URL}/admin/backdrops/{backdrop_id}", headers=runner.headers())
        requests.delete(f"{BASE_URL}/admin/backdrops/{design_id}", headers=runner.headers())
        print(f"  ✓ Cleaned up test data")
    
    def test_hero_color_fields():
        """Site content accepts and persists 7 new hero color fields"""
        runner.login()
        
        # Get current site content
        r = requests.get(f"{BASE_URL}/site-content")
        site = r.json()
        
        # Verify all 7 hero color fields exist and default to empty string
        color_fields = [
            "hero_headline_color",
            "hero_subhead_color",
            "hero_eyebrow_color",
            "hero_primary_btn_bg",
            "hero_primary_btn_text",
            "hero_secondary_btn_bg",
            "hero_secondary_btn_text"
        ]
        
        print(f"  → Checking hero color fields in site-content")
        for field in color_fields:
            assert field in site, f"Missing field: {field}"
            print(f"  → {field}: '{site[field]}'")
        print(f"  ✓ All 7 hero color fields present")
        
        # Update with test colors
        test_colors = {
            "hero_headline_color": "#FFF3E0",
            "hero_subhead_color": "#E0F2F1",
            "hero_eyebrow_color": "#FCE4EC",
            "hero_primary_btn_bg": "#4CAF50",
            "hero_primary_btn_text": "#FFFFFF",
            "hero_secondary_btn_bg": "#FF9800",
            "hero_secondary_btn_text": "#000000"
        }
        
        print(f"  → PUT /api/admin/site-content with hero colors")
        r2 = requests.put(f"{BASE_URL}/admin/site-content", json=test_colors, headers=runner.headers())
        print(f"  → Status: {r2.status_code}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        
        # Verify colors persisted
        r3 = requests.get(f"{BASE_URL}/site-content")
        updated_site = r3.json()
        
        for field, expected_value in test_colors.items():
            actual_value = updated_site.get(field)
            assert actual_value == expected_value, f"{field}: expected {expected_value}, got {actual_value}"
            print(f"  → {field}: {actual_value} ✓")
        
        print(f"  ✓ All hero color fields persisted correctly")
        
        # Reset to empty strings
        reset_colors = {field: "" for field in color_fields}
        requests.put(f"{BASE_URL}/admin/site-content", json=reset_colors, headers=runner.headers())
        print(f"  ✓ Reset hero colors to defaults")

    # =========================================================
    # Run all tests
    # =========================================================
    
    print("\n" + "="*60)
    print("NEW FEATURES: Reply Templates, Backdrops Kind, Hero Colors")
    print("="*60)
    runner.test("Reply templates CRUD endpoints work", test_reply_templates_crud)
    runner.test("Reply templates reorder works", test_reply_templates_reorder)
    runner.test("Backdrops support kind field (backdrop/design)", test_backdrops_kind_field)
    runner.test("Hero color fields in site-content", test_hero_color_fields)
    
    print("\n" + "="*60)
    print("FEATURE H: Google Calendar Polish")
    print("="*60)
    runner.test("Google Calendar status returns env_configured field", test_gcal_status_env_configured)
    
    print("\n" + "="*60)
    print("FEATURE I: Consults Merged into Inquiries")
    print("="*60)
    runner.test("Inquiry with consult creates inquiry + consultation", test_inquiry_with_consult)
    runner.test("Inquiry without consult does NOT create consultation", test_inquiry_without_consult)
    runner.test("Availability returns new booking rule fields", test_availability_rules)
    runner.test("Availability rules can be updated", test_availability_rules_update)
    runner.test("Availability slots blocks Sundays when block_sundays=true", test_availability_slots_block_sundays)
    runner.test("Availability slots blocks past dates", test_availability_slots_past_date)
    runner.test("Availability slots blocks dates beyond advance_booking_days", test_availability_slots_too_far)
    
    print("\n" + "="*60)
    print("FEATURE J: Media Library")
    print("="*60)
    runner.test("Upload creates media_library record", test_media_upload)
    runner.test("Media CRUD operations work", test_media_crud)
    runner.test("Media search by filename/alt_text works", test_media_search)
    runner.test("Media tag filter works", test_media_tag_filter)
    
    print("\n" + "="*60)
    print("NO REGRESSIONS")
    print("="*60)
    runner.test("No regressions in core endpoints", test_no_regressions)
    
    return runner.summary()


if __name__ == "__main__":
    sys.exit(main())

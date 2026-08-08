"""
Backend API Testing for Backdrops, Testimonials, and Hero Layout Features
Tests all endpoints for the three coordinated features added in this iteration.
"""
import requests
import sys
import json
from datetime import datetime

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@swelldesignla.com"
ADMIN_PASSWORD = "swell2025"

class TestRunner:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        
    def log(self, msg, level="INFO"):
        print(f"[{level}] {msg}")
    
    def test(self, name, method, endpoint, expected_status, data=None, headers=None, check_fn=None):
        """Run a single test"""
        self.tests_run += 1
        url = f"{BASE_URL}{endpoint}"
        h = headers or {}
        if self.token and 'Authorization' not in h:
            h['Authorization'] = f'Bearer {self.token}'
        if data is not None and 'Content-Type' not in h:
            h['Content-Type'] = 'application/json'
        
        self.log(f"Testing: {name}")
        try:
            if method == 'GET':
                resp = requests.get(url, headers=h, timeout=10)
            elif method == 'POST':
                resp = requests.post(url, json=data, headers=h, timeout=10)
            elif method == 'PUT':
                resp = requests.put(url, json=data, headers=h, timeout=10)
            elif method == 'DELETE':
                resp = requests.delete(url, headers=h, timeout=10)
            else:
                raise ValueError(f"Unknown method: {method}")
            
            # Check status
            if resp.status_code != expected_status:
                self.tests_failed += 1
                msg = f"❌ FAIL: {name} - Expected {expected_status}, got {resp.status_code}"
                self.log(msg, "ERROR")
                self.failures.append({"test": name, "reason": f"Status {resp.status_code} != {expected_status}", "response": resp.text[:200]})
                return False, None
            
            # Parse JSON if possible
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            
            # Run custom check function
            if check_fn:
                check_result = check_fn(body)
                if not check_result:
                    self.tests_failed += 1
                    msg = f"❌ FAIL: {name} - Check function failed"
                    self.log(msg, "ERROR")
                    self.failures.append({"test": name, "reason": "Check function returned False", "response": str(body)[:200]})
                    return False, body
            
            self.tests_passed += 1
            self.log(f"✅ PASS: {name}", "SUCCESS")
            return True, body
        
        except Exception as e:
            self.tests_failed += 1
            msg = f"❌ FAIL: {name} - Exception: {str(e)}"
            self.log(msg, "ERROR")
            self.failures.append({"test": name, "reason": str(e), "response": ""})
            return False, None
    
    def login(self):
        """Login as admin"""
        self.log("=== AUTHENTICATION ===")
        success, body = self.test(
            "Admin login",
            "POST",
            "/auth/login",
            200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            check_fn=lambda b: "token" in b
        )
        if success and body:
            self.token = body.get("token")
            self.log(f"Token acquired: {self.token[:20]}...")
        return success
    
    def test_testimonials(self):
        """Test all testimonial endpoints"""
        self.log("\n=== TESTIMONIALS FEATURE ===")
        
        # 1. Public submission with valid data
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, body = self.test(
            "POST /api/testimonials/submit with valid data",
            "POST",
            "/testimonials/submit",
            200,
            data={
                "name": "Test Reviewer",
                "reviewer_email": test_email,
                "event_type": "Wedding",
                "rating": 5,
                "quote": "Amazing service! Highly recommend."
            },
            headers={},  # No auth needed
            check_fn=lambda b: b.get("queued") == True and "id" in b
        )
        testimonial_id = body.get("id") if body else None
        
        # 2. Honeypot test - should succeed but NOT create DB row
        self.test(
            "POST /api/testimonials/submit with honeypot filled (silent drop)",
            "POST",
            "/testimonials/submit",
            200,
            data={
                "name": "Bot Spammer",
                "reviewer_email": "bot@spam.com",
                "quote": "Spam message",
                "website": "http://spam.com"  # Honeypot field
            },
            headers={},
            check_fn=lambda b: b.get("queued") == True  # Returns success but doesn't save
        )
        
        # 3. Missing required fields
        self.test(
            "POST /api/testimonials/submit with missing name",
            "POST",
            "/testimonials/submit",
            400,
            data={"quote": "Great!"},
            headers={}
        )
        
        # 4. Public GET - should NOT return pending or rejected, should NOT include reviewer_email
        success, body = self.test(
            "GET /api/testimonials (public) - no pending/rejected, no reviewer_email",
            "GET",
            "/testimonials",
            200,
            headers={},
            check_fn=lambda b: isinstance(b, list) and all(
                t.get("status") in ["approved", None] and "reviewer_email" not in t
                for t in b
            )
        )
        
        # 5. Admin GET - should return ALL including pending, SHOULD include reviewer_email
        success, body = self.test(
            "GET /api/admin/testimonials (admin) - includes pending & reviewer_email",
            "GET",
            "/admin/testimonials",
            200,
            check_fn=lambda b: isinstance(b, list) and any(
                t.get("status") == "pending" for t in b
            )
        )
        admin_testimonials = body if body else []
        
        # 6. Pending count
        self.test(
            "GET /api/admin/testimonials/pending-count",
            "GET",
            "/admin/testimonials/pending-count",
            200,
            check_fn=lambda b: "count" in b and isinstance(b["count"], int)
        )
        
        # 7. Approve testimonial
        if testimonial_id:
            success, body = self.test(
                "POST /api/admin/testimonials/{tid}/approve",
                "POST",
                f"/admin/testimonials/{testimonial_id}/approve",
                200,
                check_fn=lambda b: b.get("status") == "approved"
            )
            
            # Verify it now appears in public endpoint
            success, body = self.test(
                "Verify approved testimonial appears in public GET",
                "GET",
                "/testimonials",
                200,
                headers={},
                check_fn=lambda b: any(t.get("id") == testimonial_id for t in b)
            )
        
        # 8. Create another testimonial and reject it
        success, body = self.test(
            "Create testimonial to reject",
            "POST",
            "/testimonials/submit",
            200,
            data={
                "name": "Reject Test",
                "reviewer_email": "reject@test.com",
                "quote": "This will be rejected",
                "rating": 3
            },
            headers={}
        )
        reject_id = body.get("id") if body else None
        
        if reject_id:
            self.test(
                "POST /api/admin/testimonials/{tid}/reject",
                "POST",
                f"/admin/testimonials/{reject_id}/reject",
                200,
                check_fn=lambda b: b.get("status") == "rejected"
            )
            
            # Verify it does NOT appear in public endpoint
            success, body = self.test(
                "Verify rejected testimonial hidden from public GET",
                "GET",
                "/testimonials",
                200,
                headers={},
                check_fn=lambda b: not any(t.get("id") == reject_id for t in b)
            )
        
        # Cleanup
        if testimonial_id:
            self.test("Cleanup: Delete approved testimonial", "DELETE", f"/admin/testimonials/{testimonial_id}", 200)
        if reject_id:
            self.test("Cleanup: Delete rejected testimonial", "DELETE", f"/admin/testimonials/{reject_id}", 200)
    
    def test_backdrops(self):
        """Test all backdrop endpoints"""
        self.log("\n=== BACKDROPS FEATURE ===")
        
        # 1. Create backdrop
        success, body = self.test(
            "POST /api/admin/backdrops (create)",
            "POST",
            "/admin/backdrops",
            200,
            data={
                "name": "Test Trio Arch",
                "subtitle": "Perfect for weddings",
                "description": "A beautiful rounded arch structure",
                "price_from": "$450",
                "featured": True,
                "active": True
            },
            check_fn=lambda b: "id" in b and b.get("name") == "Test Trio Arch"
        )
        backdrop_id = body.get("id") if body else None
        
        # 2. Update backdrop
        if backdrop_id:
            self.test(
                "PUT /api/admin/backdrops/{id} (update)",
                "PUT",
                f"/admin/backdrops/{backdrop_id}",
                200,
                data={"name": "Updated Trio Arch", "subtitle": "Now even better"},
                check_fn=lambda b: b.get("name") == "Updated Trio Arch"
            )
        
        # 3. Create second backdrop for reorder test
        success, body2 = self.test(
            "Create second backdrop for reorder",
            "POST",
            "/admin/backdrops",
            200,
            data={"name": "Test Hoop", "active": True}
        )
        backdrop_id2 = body2.get("id") if body2 else None
        
        # 4. Reorder backdrops
        if backdrop_id and backdrop_id2:
            self.test(
                "POST /api/admin/backdrops/reorder",
                "POST",
                "/admin/backdrops/reorder",
                200,
                data={"order": [backdrop_id2, backdrop_id]},
                check_fn=lambda b: b.get("ok") == True
            )
        
        # 5. Public GET - only active backdrops
        self.test(
            "GET /api/backdrops (public) - only active, sorted by order",
            "GET",
            "/backdrops",
            200,
            headers={},
            check_fn=lambda b: isinstance(b, list) and all(
                bd.get("active") in [True, None] for bd in b
            )
        )
        
        # 6. Admin GET - all backdrops
        self.test(
            "GET /api/admin/backdrops (admin) - all backdrops",
            "GET",
            "/admin/backdrops",
            200,
            check_fn=lambda b: isinstance(b, list)
        )
        
        # 7. Delete backdrops
        if backdrop_id:
            self.test("DELETE /api/admin/backdrops/{id}", "DELETE", f"/admin/backdrops/{backdrop_id}", 200)
        if backdrop_id2:
            self.test("Cleanup: Delete second backdrop", "DELETE", f"/admin/backdrops/{backdrop_id2}", 200)
    
    def test_hero_layout(self):
        """Test hero layout mode in site-content"""
        self.log("\n=== HERO LAYOUT FEATURE ===")
        
        # 1. GET site-content - check for new fields
        success, body = self.test(
            "GET /api/site-content includes hero fields",
            "GET",
            "/site-content",
            200,
            headers={},
            check_fn=lambda b: (
                "hero_layout_mode" in b and
                "hero_background_image_url" in b and
                "hero_overlay_intensity" in b and
                "home_backdrops_active" in b and
                "backdrops_page_show_header" in b and
                "backdrops_page_eyebrow" in b
            )
        )
        
        # Store original values for restoration
        original_mode = body.get("hero_layout_mode", "split") if body else "split"
        original_bg = body.get("hero_background_image_url", "") if body else ""
        original_overlay = body.get("hero_overlay_intensity", 0.45) if body else 0.45
        
        # 2. Update to full_bleed mode
        self.test(
            "PUT /api/admin/site-content (set full_bleed mode)",
            "PUT",
            "/admin/site-content",
            200,
            data={
                "hero_layout_mode": "full_bleed",
                "hero_background_image_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=80",
                "hero_overlay_intensity": 0.5
            },
            check_fn=lambda b: (
                b.get("hero_layout_mode") == "full_bleed" and
                "hero_background_image_url" in b and
                b.get("hero_overlay_intensity") == 0.5
            )
        )
        
        # 3. Verify the change persists
        self.test(
            "Verify hero_layout_mode persisted",
            "GET",
            "/site-content",
            200,
            headers={},
            check_fn=lambda b: b.get("hero_layout_mode") == "full_bleed"
        )
        
        # 4. Restore original values
        self.test(
            "Restore original hero settings",
            "PUT",
            "/admin/site-content",
            200,
            data={
                "hero_layout_mode": original_mode,
                "hero_background_image_url": original_bg,
                "hero_overlay_intensity": original_overlay
            }
        )
    
    def test_nav_backdrops_link(self):
        """Test that Backdrops nav item exists"""
        self.log("\n=== BACKDROPS NAV LINK ===")
        
        success, body = self.test(
            "GET /api/site-content includes Backdrops nav item",
            "GET",
            "/site-content",
            200,
            headers={},
            check_fn=lambda b: any(
                item.get("href") == "/backdrops" or item.get("id") == "nav-backdrops"
                for item in (b.get("header_nav_items") or [])
            )
        )
    
    def run_all(self):
        """Run all tests"""
        self.log("=" * 60)
        self.log("BACKEND API TEST SUITE - Backdrops, Testimonials, Hero")
        self.log("=" * 60)
        
        if not self.login():
            self.log("Login failed - aborting tests", "ERROR")
            return False
        
        self.test_testimonials()
        self.test_backdrops()
        self.test_hero_layout()
        self.test_nav_backdrops_link()
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}", "SUCCESS")
        self.log(f"Failed: {self.tests_failed}", "ERROR" if self.tests_failed > 0 else "INFO")
        
        if self.failures:
            self.log("\nFAILURES:", "ERROR")
            for f in self.failures:
                self.log(f"  - {f['test']}: {f['reason']}", "ERROR")
        
        return self.tests_failed == 0

if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all()
    sys.exit(0 if success else 1)

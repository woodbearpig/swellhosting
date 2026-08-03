"""Backend API tests for NEW FEATURES - swell design + media
Tests for:
1. FOUC fix (site-content loading)
2. Hide element toggles (per-page visibility)
3. Custom nav bar (header_nav_items)
4. Season auto-switch (palette_schedules)
5. Palette from photo (custom_palettes)
"""
import requests
import sys
from datetime import datetime, date

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@swelldesignla.com"
ADMIN_PASSWORD = "swell2025"

class NewFeaturesTester:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        self.test_custom_palette_id = None
        self.original_site_content = None

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        h = {'Content-Type': 'application/json'}
        if self.token:
            h['Authorization'] = f'Bearer {self.token}'
        if headers:
            h.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=h, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=h, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASS - Status: {response.status_code}")
                try:
                    return True, response.json()
                except Exception:
                    return True, {}
            else:
                self.tests_failed += 1
                self.failed_tests.append({
                    'name': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'got': response.status_code,
                    'response': response.text[:300]
                })
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            print(f"❌ FAIL - Error: {str(e)}")
            return False, {}

    def login(self):
        """Login and get token"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATION")
        print("="*60)
        success, response = self.test(
            "Admin login",
            "POST",
            "/auth/login",
            200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        print("❌ Login failed - cannot proceed")
        return False

    def test_site_content_new_fields(self):
        """Test that site-content returns all new fields"""
        print("\n" + "="*60)
        print("📄 SITE CONTENT - NEW FIELDS")
        print("="*60)
        
        # Get current site content
        success, data = self.test(
            "GET /api/site-content",
            "GET",
            "/site-content",
            200
        )
        
        if not success:
            return False
        
        # Store original for cleanup
        self.original_site_content = data
        
        # Check for new header fields
        new_fields = [
            'header_show_logo',
            'header_show_theme_toggle',
            'header_show_inquire_cta',
            'header_nav_items',
            'about_show_image',
            'about_show_designer',
            'about_show_ctas',
            'services_page_show_header',
            'services_page_show_grid',
            'gallery_page_show_header',
            'gallery_page_show_filters',
            'gallery_page_show_grid',
            'contact_page_show_header',
            'contact_page_show_info_block',
            'contact_page_show_form',
            'palette_schedules'
        ]
        
        missing = [f for f in new_fields if f not in data]
        if missing:
            print(f"❌ Missing fields: {missing}")
            self.tests_failed += 1
            self.failed_tests.append({
                'name': 'Site content has all new fields',
                'error': f'Missing fields: {missing}'
            })
            return False
        else:
            print(f"✅ All {len(new_fields)} new fields present in site-content")
            self.tests_passed += 1
            self.tests_run += 1
        
        return True

    def test_site_content_persistence(self):
        """Test that PUT /api/admin/site-content persists new fields"""
        print("\n" + "="*60)
        print("💾 SITE CONTENT - PERSISTENCE")
        print("="*60)
        
        # Create test data with new fields
        test_nav_items = [
            {"id": "test-1", "label": "Test Link", "href": "https://example.com", "visible": True, "new_tab": True},
            {"id": "test-2", "label": "Gallery", "href": "/gallery", "visible": True, "new_tab": False}
        ]
        
        test_data = {
            "header_show_logo": False,
            "header_show_theme_toggle": False,
            "header_show_inquire_cta": False,
            "header_nav_items": test_nav_items,
            "about_show_image": False,
            "about_show_designer": False,
            "about_show_ctas": False,
            "services_page_show_header": False,
            "services_page_show_grid": True,
            "gallery_page_show_header": True,
            "gallery_page_show_filters": False,
            "gallery_page_show_grid": True,
            "contact_page_show_header": False,
            "contact_page_show_info_block": True,
            "contact_page_show_form": False,
            "palette_schedules": []
        }
        
        # Update site content
        success, response = self.test(
            "PUT /api/admin/site-content with new fields",
            "PUT",
            "/admin/site-content",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        # Verify the data was saved
        success, data = self.test(
            "GET /api/site-content to verify persistence",
            "GET",
            "/site-content",
            200
        )
        
        if not success:
            return False
        
        # Check each field
        all_match = True
        for key, expected_value in test_data.items():
            actual_value = data.get(key)
            if actual_value != expected_value:
                print(f"❌ Field mismatch: {key}")
                print(f"   Expected: {expected_value}")
                print(f"   Got: {actual_value}")
                all_match = False
        
        if all_match:
            print("✅ All new fields persisted correctly")
            self.tests_passed += 1
            self.tests_run += 1
        else:
            self.tests_failed += 1
            self.tests_run += 1
            self.failed_tests.append({
                'name': 'Site content persistence verification',
                'error': 'Some fields did not persist correctly'
            })
        
        return all_match

    def test_custom_palettes(self):
        """Test custom palette CRUD operations"""
        print("\n" + "="*60)
        print("🎨 CUSTOM PALETTES")
        print("="*60)
        
        # Test GET /api/palettes returns merged list
        success, data = self.test(
            "GET /api/palettes (preset + custom merged)",
            "GET",
            "/palettes",
            200
        )
        
        if not success:
            return False
        
        if 'palettes' not in data or 'categories' not in data:
            print("❌ Response missing 'palettes' or 'categories'")
            self.tests_failed += 1
            self.tests_run += 1
            return False
        
        initial_count = len(data['palettes'])
        print(f"✅ Found {initial_count} palettes (preset + custom)")
        
        # Test POST /api/admin/palettes/custom - create
        test_colors = {
            "cream": "#FBF6EF",
            "surface-2": "#F6EFE6",
            "border": "#E7D9CC",
            "text": "#1F1E1C",
            "text-muted": "#5E5A55",
            "sage": "#8FAE97",
            "sage-deep": "#6F8F7A",
            "sage-tint": "#E6F0EA",
            "rose": "#C98F9B",
            "coral": "#D98A7A",
            "peach": "#E9B39A",
            "blush-tint": "#F7E3DD",
            "gold": "#C9A46A"
        }
        
        success, response = self.test(
            "POST /api/admin/palettes/custom (create)",
            "POST",
            "/admin/palettes/custom",
            200,
            data={
                "name": "Test Palette from API",
                "mood": "Testing mood",
                "colors": test_colors
            }
        )
        
        if not success:
            return False
        
        if 'id' not in response:
            print("❌ Response missing 'id'")
            self.tests_failed += 1
            self.tests_run += 1
            return False
        
        self.test_custom_palette_id = response['id']
        print(f"✅ Created custom palette with id: {self.test_custom_palette_id}")
        
        # Verify it appears in GET /api/palettes
        success, data = self.test(
            "GET /api/palettes (verify custom palette appears)",
            "GET",
            "/palettes",
            200
        )
        
        if success:
            new_count = len(data['palettes'])
            if new_count == initial_count + 1:
                print(f"✅ Palette count increased from {initial_count} to {new_count}")
                self.tests_passed += 1
                self.tests_run += 1
            else:
                print(f"❌ Expected {initial_count + 1} palettes, got {new_count}")
                self.tests_failed += 1
                self.tests_run += 1
        
        # Test POST with missing name (should return 400)
        success, _ = self.test(
            "POST /api/admin/palettes/custom (missing name - expect 400)",
            "POST",
            "/admin/palettes/custom",
            400,
            data={"colors": test_colors}
        )
        
        # Test POST with missing colors (should return 400)
        success, _ = self.test(
            "POST /api/admin/palettes/custom (missing colors - expect 400)",
            "POST",
            "/admin/palettes/custom",
            400,
            data={"name": "Test"}
        )
        
        return True

    def test_custom_palette_activation(self):
        """Test activating a custom palette"""
        print("\n" + "="*60)
        print("🎨 CUSTOM PALETTE ACTIVATION")
        print("="*60)
        
        if not self.test_custom_palette_id:
            print("⚠️  No custom palette to test - skipping")
            return True
        
        # Test PUT /api/admin/palettes/active with custom palette
        success, response = self.test(
            "PUT /api/admin/palettes/active (custom palette)",
            "PUT",
            "/admin/palettes/active",
            200,
            data={"palette_id": self.test_custom_palette_id}
        )
        
        if not success:
            return False
        
        # Verify it's now active
        success, data = self.test(
            "GET /api/palettes/active (verify custom palette active)",
            "GET",
            "/palettes/active",
            200
        )
        
        if success and data.get('id') == self.test_custom_palette_id:
            print(f"✅ Custom palette is now active")
            self.tests_passed += 1
            self.tests_run += 1
        else:
            print(f"❌ Expected active palette {self.test_custom_palette_id}, got {data.get('id')}")
            self.tests_failed += 1
            self.tests_run += 1
        
        # Test with unknown palette id (should return 404)
        success, _ = self.test(
            "PUT /api/admin/palettes/active (unknown id - expect 404)",
            "PUT",
            "/admin/palettes/active",
            404,
            data={"palette_id": "nonexistent-palette-id"}
        )
        
        return True

    def test_palette_schedules(self):
        """Test palette schedule CRUD operations"""
        print("\n" + "="*60)
        print("📅 PALETTE SCHEDULES")
        print("="*60)
        
        # Test GET /api/admin/palettes/schedules
        success, data = self.test(
            "GET /api/admin/palettes/schedules",
            "GET",
            "/admin/palettes/schedules",
            200
        )
        
        if not success:
            return False
        
        if 'schedules' not in data:
            print("❌ Response missing 'schedules'")
            self.tests_failed += 1
            self.tests_run += 1
            return False
        
        print(f"✅ Found {len(data['schedules'])} existing schedules")
        
        # Create test schedules
        today = date.today()
        test_schedules = [
            {
                "id": "test-yearly-1",
                "label": "Test Yearly Schedule",
                "enabled": True,
                "palette_id": "signature",
                "start_month": 1,
                "start_day": 1,
                "end_month": 12,
                "end_day": 31,
                "repeats_yearly": True,
                "year": None
            },
            {
                "id": "test-oneoff-1",
                "label": "Test One-off Schedule",
                "enabled": True,
                "palette_id": "halloween",
                "start_month": today.month,
                "start_day": today.day,
                "end_month": today.month,
                "end_day": today.day,
                "repeats_yearly": False,
                "year": today.year + 1  # Next year, so it won't activate
            }
        ]
        
        # Test PUT /api/admin/palettes/schedules
        success, response = self.test(
            "PUT /api/admin/palettes/schedules",
            "PUT",
            "/admin/palettes/schedules",
            200,
            data={"schedules": test_schedules}
        )
        
        if not success:
            return False
        
        # Verify schedules were saved
        success, data = self.test(
            "GET /api/admin/palettes/schedules (verify persistence)",
            "GET",
            "/admin/palettes/schedules",
            200
        )
        
        if success:
            saved_schedules = data.get('schedules', [])
            if len(saved_schedules) == len(test_schedules):
                print(f"✅ Schedules persisted correctly ({len(saved_schedules)} schedules)")
                self.tests_passed += 1
                self.tests_run += 1
            else:
                print(f"❌ Expected {len(test_schedules)} schedules, got {len(saved_schedules)}")
                self.tests_failed += 1
                self.tests_run += 1
        
        # Test with non-list payload (should return 400)
        success, _ = self.test(
            "PUT /api/admin/palettes/schedules (non-list - expect 400)",
            "PUT",
            "/admin/palettes/schedules",
            400,
            data={"schedules": "not a list"}
        )
        
        return True

    def test_schedule_matching_logic(self):
        """Test that schedule matching works correctly"""
        print("\n" + "="*60)
        print("🎯 SCHEDULE MATCHING LOGIC")
        print("="*60)
        
        today = date.today()
        
        # Create a yearly schedule that spans today
        yearly_schedule = {
            "id": "test-active-yearly",
            "label": "Active Yearly Schedule",
            "enabled": True,
            "palette_id": "halloween",
            "start_month": 1,
            "start_day": 1,
            "end_month": 12,
            "end_day": 31,
            "repeats_yearly": True,
            "year": None
        }
        
        # Save the schedule
        success, _ = self.test(
            "PUT /api/admin/palettes/schedules (active yearly)",
            "PUT",
            "/admin/palettes/schedules",
            200,
            data={"schedules": [yearly_schedule]}
        )
        
        if not success:
            return False
        
        # Check that /api/palettes/active returns the halloween palette
        success, data = self.test(
            "GET /api/palettes/active (should return halloween)",
            "GET",
            "/palettes/active",
            200
        )
        
        if success:
            if data.get('id') == 'halloween':
                print("✅ Schedule matching works - halloween palette is active")
                self.tests_passed += 1
                self.tests_run += 1
            else:
                print(f"❌ Expected halloween palette, got {data.get('id')}")
                self.tests_failed += 1
                self.tests_run += 1
        
        # Test disabled schedule (should NOT activate)
        disabled_schedule = {
            "id": "test-disabled",
            "label": "Disabled Schedule",
            "enabled": False,
            "palette_id": "christmas",
            "start_month": 1,
            "start_day": 1,
            "end_month": 12,
            "end_day": 31,
            "repeats_yearly": True,
            "year": None
        }
        
        success, _ = self.test(
            "PUT /api/admin/palettes/schedules (disabled)",
            "PUT",
            "/admin/palettes/schedules",
            200,
            data={"schedules": [disabled_schedule]}
        )
        
        if success:
            # Should fall back to active_palette_id
            success, data = self.test(
                "GET /api/palettes/active (disabled schedule should not activate)",
                "GET",
                "/palettes/active",
                200
            )
            if success and data.get('id') != 'christmas':
                print("✅ Disabled schedule correctly ignored")
                self.tests_passed += 1
                self.tests_run += 1
            else:
                print("❌ Disabled schedule should not activate")
                self.tests_failed += 1
                self.tests_run += 1
        
        # Test one-off schedule NOT matching today's year
        oneoff_schedule = {
            "id": "test-oneoff-wrong-year",
            "label": "One-off Wrong Year",
            "enabled": True,
            "palette_id": "valentines",
            "start_month": today.month,
            "start_day": today.day,
            "end_month": today.month,
            "end_day": today.day,
            "repeats_yearly": False,
            "year": today.year - 1  # Last year
        }
        
        success, _ = self.test(
            "PUT /api/admin/palettes/schedules (one-off wrong year)",
            "PUT",
            "/admin/palettes/schedules",
            200,
            data={"schedules": [oneoff_schedule]}
        )
        
        if success:
            success, data = self.test(
                "GET /api/palettes/active (one-off wrong year should not activate)",
                "GET",
                "/palettes/active",
                200
            )
            if success and data.get('id') != 'valentines':
                print("✅ One-off schedule with wrong year correctly ignored")
                self.tests_passed += 1
                self.tests_run += 1
            else:
                print("❌ One-off schedule with wrong year should not activate")
                self.tests_failed += 1
                self.tests_run += 1
        
        return True

    def cleanup(self):
        """Clean up test data"""
        print("\n" + "="*60)
        print("🧹 CLEANUP")
        print("="*60)
        
        # Delete test custom palette
        if self.test_custom_palette_id:
            success, _ = self.test(
                f"DELETE /api/admin/palettes/custom/{self.test_custom_palette_id}",
                "DELETE",
                f"/admin/palettes/custom/{self.test_custom_palette_id}",
                200
            )
            if success:
                print(f"✅ Deleted test custom palette")
        
        # Reset schedules to empty
        success, _ = self.test(
            "PUT /api/admin/palettes/schedules (reset to [])",
            "PUT",
            "/admin/palettes/schedules",
            200,
            data={"schedules": []}
        )
        if success:
            print("✅ Reset schedules to []")
        
        # Reset site content toggles to true
        if self.original_site_content:
            reset_data = {
                "header_show_logo": True,
                "header_show_theme_toggle": True,
                "header_show_inquire_cta": True,
                "about_show_image": True,
                "about_show_designer": True,
                "about_show_ctas": True,
                "services_page_show_header": True,
                "services_page_show_grid": True,
                "gallery_page_show_header": True,
                "gallery_page_show_filters": True,
                "gallery_page_show_grid": True,
                "contact_page_show_header": True,
                "contact_page_show_info_block": True,
                "contact_page_show_form": True,
                "palette_schedules": []
            }
            
            # Restore original nav items if they exist
            if 'header_nav_items' in self.original_site_content:
                reset_data['header_nav_items'] = self.original_site_content['header_nav_items']
            
            success, _ = self.test(
                "PUT /api/admin/site-content (reset toggles)",
                "PUT",
                "/admin/site-content",
                200,
                data=reset_data
            )
            if success:
                print("✅ Reset site content toggles to true")
        
        # Reset active palette to signature
        success, _ = self.test(
            "PUT /api/admin/palettes/active (reset to signature)",
            "PUT",
            "/admin/palettes/active",
            200,
            data={"palette_id": "signature"}
        )
        if success:
            print("✅ Reset active palette to signature")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Total tests: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
        if self.tests_run > 0:
            print(f"Success rate: {round((self.tests_passed/self.tests_run)*100, 1)}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for ft in self.failed_tests:
                print(f"  - {ft['name']}")
                if 'endpoint' in ft:
                    print(f"    Endpoint: {ft['endpoint']}")
                if 'expected' in ft and 'got' in ft:
                    print(f"    Expected: {ft['expected']}, Got: {ft['got']}")
                if 'error' in ft:
                    print(f"    Error: {ft['error']}")
                if 'response' in ft:
                    print(f"    Response: {ft['response']}")
        
        return self.tests_failed == 0


def main():
    tester = NewFeaturesTester()
    
    print("="*60)
    print("🧪 NEW FEATURES BACKEND API TESTING")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*60)
    
    # Login
    if not tester.login():
        return 1
    
    # Run tests
    try:
        tester.test_site_content_new_fields()
        tester.test_site_content_persistence()
        tester.test_custom_palettes()
        tester.test_custom_palette_activation()
        tester.test_palette_schedules()
        tester.test_schedule_matching_logic()
    finally:
        # Always cleanup
        tester.cleanup()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

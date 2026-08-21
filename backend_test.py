#!/usr/bin/env python3
"""
Backend API tests for Embed Widget feature
Tests all 6 new home_widget_* fields in site-content endpoints
"""
import requests
import sys
import os

# Read backend URL from frontend .env
BACKEND_URL = None
try:
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BACKEND_URL = line.split('=', 1)[1].strip()
                break
except Exception as e:
    print(f"❌ Could not read REACT_APP_BACKEND_URL from /app/frontend/.env: {e}")
    sys.exit(1)

if not BACKEND_URL:
    print("❌ REACT_APP_BACKEND_URL not found in /app/frontend/.env")
    sys.exit(1)

print(f"🔗 Testing against: {BACKEND_URL}")

# Test credentials from review_request
ADMIN_EMAIL = "support@swelldesignla.com"
ADMIN_PASSWORD = "ChangeThisNow-SwellSupport-2026!"

class EmbedWidgetTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.original_state = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}")
                except Exception:
                    pass

            try:
                return success, response.json() if response.text else {}
            except Exception:
                return success, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and verify response uses 'token' not 'access_token'"""
        success, response = self.run_test(
            "Login with super admin credentials",
            "POST",
            "/api/auth/login",
            200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if success:
            # Verify response uses 'token' not 'access_token'
            if 'token' in response:
                print(f"   ✓ Response correctly uses 'token' field")
                self.token = response['token']
                return True
            elif 'access_token' in response:
                print(f"   ❌ Response incorrectly uses 'access_token' instead of 'token'")
                return False
            else:
                print(f"   ❌ Response missing both 'token' and 'access_token' fields")
                return False
        return False

    def test_public_site_content(self):
        """Test GET /api/site-content includes new fields and strips preview_token"""
        success, response = self.run_test(
            "GET /api/site-content (public endpoint)",
            "GET",
            "/api/site-content",
            200
        )
        if not success:
            return False

        # Check for new fields
        required_fields = [
            'home_widget_active',
            'home_widget_eyebrow',
            'home_widget_heading',
            'home_widget_subheading',
            'home_widget_snippet',
            'home_widget_position'
        ]
        
        missing_fields = [f for f in required_fields if f not in response]
        if missing_fields:
            print(f"   ❌ Missing fields: {missing_fields}")
            return False
        
        print(f"   ✓ All 6 home_widget_* fields present")
        
        # Verify preview_token is NOT in public response
        if 'preview_token' in response:
            print(f"   ❌ preview_token should NOT be in public /api/site-content response")
            return False
        
        print(f"   ✓ preview_token correctly stripped from public response")
        
        # Store original state for cleanup
        self.original_state = {
            'home_widget_active': response.get('home_widget_active', False),
            'home_widget_snippet': response.get('home_widget_snippet', '')
        }
        
        return True

    def test_admin_site_content_update(self):
        """Test PUT /api/admin/site-content persists all 6 fields"""
        test_data = {
            'home_widget_active': True,
            'home_widget_eyebrow': 'TEST EYEBROW',
            'home_widget_heading': 'Test Heading',
            'home_widget_subheading': 'Test subheading',
            'home_widget_snippet': '<script src="https://test.com/test.js"></script><div class="test-widget"></div>',
            'home_widget_position': 'after-services'
        }
        
        success, response = self.run_test(
            "PUT /api/admin/site-content with all 6 home_widget_* fields",
            "PUT",
            "/api/admin/site-content",
            200,
            data=test_data
        )
        
        if not success:
            return False
        
        # Verify all fields were persisted
        for key, value in test_data.items():
            if response.get(key) != value:
                print(f"   ❌ Field {key} not persisted correctly. Expected: {value}, Got: {response.get(key)}")
                return False
        
        print(f"   ✓ All 6 fields persisted correctly")
        return True

    def test_admin_auth_required(self):
        """Test that admin endpoint requires authentication"""
        # Save current token
        saved_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "PUT /api/admin/site-content without auth (should fail with 401)",
            "PUT",
            "/api/admin/site-content",
            401,
            data={'home_widget_active': True}
        )
        
        # Restore token
        self.token = saved_token
        return success

    def test_position_options(self):
        """Test all 8 position options"""
        positions = [
            'after-hero',
            'after-services',
            'after-portfolio',
            'after-backdrops',
            'after-testimonials',
            'after-designer',
            'after-faq',
            'before-cta'
        ]
        
        print(f"\n🔍 Test {self.tests_run + 1}: Testing all 8 position options...")
        self.tests_run += 1
        
        all_passed = True
        for pos in positions:
            success, response = self.run_test(
                f"  Position: {pos}",
                "PUT",
                "/api/admin/site-content",
                200,
                data={'home_widget_position': pos}
            )
            if not success or response.get('home_widget_position') != pos:
                print(f"   ❌ Position {pos} failed")
                all_passed = False
            else:
                print(f"   ✓ Position {pos} works")
        
        if all_passed:
            self.tests_passed += 1
            print(f"✅ PASSED - All 8 positions work")
        else:
            print(f"❌ FAILED - Some positions failed")
        
        return all_passed

    def cleanup(self):
        """Reset to original state"""
        print(f"\n🧹 Cleaning up: Resetting home_widget_active and home_widget_snippet...")
        success, response = self.run_test(
            "Reset widget state to original",
            "PUT",
            "/api/admin/site-content",
            200,
            data={
                'home_widget_active': self.original_state.get('home_widget_active', False),
                'home_widget_snippet': self.original_state.get('home_widget_snippet', '')
            }
        )
        if success:
            print(f"   ✓ State reset successfully")
        return success

def main():
    tester = EmbedWidgetTester()
    
    print("=" * 60)
    print("EMBED WIDGET BACKEND API TESTS")
    print("=" * 60)
    
    # Run tests in order
    if not tester.test_login():
        print("\n❌ Login failed, stopping tests")
        return 1
    
    if not tester.test_public_site_content():
        print("\n❌ Public site-content test failed")
        return 1
    
    if not tester.test_admin_auth_required():
        print("\n❌ Auth requirement test failed")
        return 1
    
    if not tester.test_admin_site_content_update():
        print("\n❌ Admin site-content update test failed")
        return 1
    
    if not tester.test_position_options():
        print("\n❌ Position options test failed")
        return 1
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 BACKEND TESTS COMPLETE")
    print(f"   Passed: {tester.tests_passed}/{tester.tests_run}")
    print("=" * 60)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())

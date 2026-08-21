#!/usr/bin/env python3
"""
Backend API tests for HTTP Caching + Super Admin System Stats features
Tests:
1. Cache-Control and ETag headers on 7 public GET endpoints
2. ETag revalidation (304 vs 200)
3. preview_token stripping regression
4. Super admin endpoint gating (404 for non-super-admins)
5. Super admin endpoint data structure
6. Auth endpoints return is_super_admin flag
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

# For cache header tests, use localhost:8001 (preview ingress rewrites headers)
LOCALHOST_URL = "http://localhost:8001"

print(f"🔗 Testing against: {BACKEND_URL}")
print(f"🔗 Cache header tests against: {LOCALHOST_URL}")

# Test credentials
SUPER_ADMIN_EMAIL = "support@swelldesignla.com"
SUPER_ADMIN_PASSWORD = "ChangeThisNow-SwellSupport-2026!"
REGULAR_ADMIN_EMAIL = "admin@swelldesignla.com"
REGULAR_ADMIN_PASSWORD = "swell2025"

class CacheAndSystemStatsTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.localhost_url = LOCALHOST_URL
        self.super_token = None
        self.regular_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_localhost=False):
        """Run a single API test"""
        base = self.localhost_url if use_localhost else self.base_url
        url = f"{base}{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                self.failed_tests.append(name)
                return False, {}, None

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append(name)
                try:
                    print(f"   Response: {response.text[:200]}")
                except Exception:
                    pass

            try:
                return success, response.json() if response.text else {}, response
            except Exception:
                return success, {}, response

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append(name)
            return False, {}, None

    def test_super_admin_login(self):
        """Test super admin login and verify is_super_admin flag"""
        success, response, _ = self.run_test(
            "Super admin login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if success:
            if 'token' in response:
                self.super_token = response['token']
                user = response.get('user', {})
                if user.get('is_super_admin') == True:
                    print(f"   ✓ is_super_admin=true in login response")
                    return True
                else:
                    print(f"   ❌ is_super_admin should be true, got: {user.get('is_super_admin')}")
                    self.failed_tests.append("Super admin login - is_super_admin flag")
                    return False
            else:
                print(f"   ❌ No token in response")
                return False
        return False

    def test_regular_admin_login(self):
        """Test regular admin login and verify is_super_admin=false"""
        success, response, _ = self.run_test(
            "Regular admin login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": REGULAR_ADMIN_EMAIL, "password": REGULAR_ADMIN_PASSWORD}
        )
        if success:
            if 'token' in response:
                self.regular_token = response['token']
                user = response.get('user', {})
                if user.get('is_super_admin') == False:
                    print(f"   ✓ is_super_admin=false in login response")
                    return True
                else:
                    print(f"   ❌ is_super_admin should be false, got: {user.get('is_super_admin')}")
                    self.failed_tests.append("Regular admin login - is_super_admin flag")
                    return False
            else:
                print(f"   ❌ No token in response")
                return False
        return False

    def test_auth_me_super_admin(self):
        """Test GET /api/auth/me for super admin"""
        success, response, _ = self.run_test(
            "GET /api/auth/me (super admin)",
            "GET",
            "/api/auth/me",
            200,
            headers={'Authorization': f'Bearer {self.super_token}'}
        )
        if success:
            if response.get('is_super_admin') == True:
                print(f"   ✓ is_super_admin=true in /auth/me response")
                return True
            else:
                print(f"   ❌ is_super_admin should be true, got: {response.get('is_super_admin')}")
                self.failed_tests.append("Auth me super admin - is_super_admin flag")
                return False
        return False

    def test_auth_me_regular_admin(self):
        """Test GET /api/auth/me for regular admin"""
        success, response, _ = self.run_test(
            "GET /api/auth/me (regular admin)",
            "GET",
            "/api/auth/me",
            200,
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        if success:
            if response.get('is_super_admin') == False:
                print(f"   ✓ is_super_admin=false in /auth/me response")
                return True
            else:
                print(f"   ❌ is_super_admin should be false, got: {response.get('is_super_admin')}")
                self.failed_tests.append("Auth me regular admin - is_super_admin flag")
                return False
        return False

    def test_cache_headers(self):
        """Test Cache-Control and ETag headers on 7 public endpoints"""
        endpoints = [
            '/api/site-content',
            '/api/services',
            '/api/gallery',
            '/api/backdrops',
            '/api/testimonials',
            '/api/faqs',
            '/api/palettes/active'
        ]
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: Testing cache headers on {len(endpoints)} public endpoints (against localhost:8001)...")
        all_passed = True
        
        for endpoint in endpoints:
            print(f"\n  Testing {endpoint}...")
            try:
                response = requests.get(f"{self.localhost_url}{endpoint}", timeout=10)
                
                # Check Cache-Control header
                cache_control = response.headers.get('Cache-Control', '')
                etag = response.headers.get('ETag', '')
                
                expected_cache = 'public, max-age=60, s-maxage=60, must-revalidate'
                
                if cache_control == expected_cache:
                    print(f"    ✓ Cache-Control: {cache_control}")
                else:
                    print(f"    ❌ Cache-Control incorrect. Expected: {expected_cache}, Got: {cache_control}")
                    all_passed = False
                    self.failed_tests.append(f"Cache headers - {endpoint} - Cache-Control")
                
                if etag:
                    print(f"    ✓ ETag present: {etag[:30]}...")
                else:
                    print(f"    ❌ ETag header missing")
                    all_passed = False
                    self.failed_tests.append(f"Cache headers - {endpoint} - ETag")
                    
            except Exception as e:
                print(f"    ❌ Error: {e}")
                all_passed = False
                self.failed_tests.append(f"Cache headers - {endpoint} - Error")
        
        if all_passed:
            self.tests_passed += 1
            print(f"\n✅ PASSED - All cache headers correct")
        else:
            print(f"\n❌ FAILED - Some cache headers incorrect")
        
        return all_passed

    def test_etag_revalidation(self):
        """Test ETag revalidation (304 vs 200)"""
        print(f"\n🔍 Testing ETag revalidation...")
        self.tests_run += 1
        
        try:
            # First request to get ETag
            response1 = requests.get(f"{self.localhost_url}/api/site-content", timeout=10)
            etag = response1.headers.get('ETag')
            
            if not etag:
                print(f"  ❌ No ETag in first response")
                self.failed_tests.append("ETag revalidation - No ETag")
                return False
            
            print(f"  ✓ Got ETag from first request: {etag[:30]}...")
            
            # Second request with matching If-None-Match (should get 304)
            response2 = requests.get(
                f"{self.localhost_url}/api/site-content",
                headers={'If-None-Match': etag},
                timeout=10
            )
            
            if response2.status_code == 304:
                print(f"  ✓ Matching ETag returned 304 Not Modified")
            else:
                print(f"  ❌ Matching ETag should return 304, got {response2.status_code}")
                self.failed_tests.append("ETag revalidation - 304 not returned")
                return False
            
            # Third request with wrong If-None-Match (should get 200)
            response3 = requests.get(
                f"{self.localhost_url}/api/site-content",
                headers={'If-None-Match': 'W/"wrong-etag-12345678"'},
                timeout=10
            )
            
            if response3.status_code == 200 and response3.text:
                print(f"  ✓ Wrong ETag returned 200 with body")
                self.tests_passed += 1
                print(f"\n✅ PASSED - ETag revalidation works correctly")
                return True
            else:
                print(f"  ❌ Wrong ETag should return 200 with body, got {response3.status_code}")
                self.failed_tests.append("ETag revalidation - 200 not returned for wrong ETag")
                return False
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            self.failed_tests.append(f"ETag revalidation - Error: {e}")
            return False

    def test_preview_token_stripped(self):
        """Test that preview_token is stripped from public /api/site-content"""
        success, response, _ = self.run_test(
            "preview_token stripped from public /api/site-content",
            "GET",
            "/api/site-content",
            200
        )
        if success:
            if 'preview_token' in response:
                print(f"   ❌ preview_token should NOT be in public response")
                self.failed_tests.append("preview_token stripping")
                return False
            else:
                print(f"   ✓ preview_token correctly stripped")
                return True
        return False

    def test_system_stats_unauthenticated(self):
        """Test /api/admin/system-stats returns 404 for unauthenticated requests"""
        success, response, _ = self.run_test(
            "System stats - unauthenticated (should return 404)",
            "GET",
            "/api/admin/system-stats",
            404
        )
        return success

    def test_system_stats_bad_token(self):
        """Test /api/admin/system-stats returns 404 for bad token"""
        success, response, _ = self.run_test(
            "System stats - bad token (should return 404)",
            "GET",
            "/api/admin/system-stats",
            404,
            headers={'Authorization': 'Bearer invalid-token-12345'}
        )
        return success

    def test_system_stats_regular_admin(self):
        """Test /api/admin/system-stats returns 404 for regular admin"""
        success, response, _ = self.run_test(
            "System stats - regular admin (should return 404)",
            "GET",
            "/api/admin/system-stats",
            404,
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        return success

    def test_system_stats_super_admin(self):
        """Test /api/admin/system-stats returns 200 with correct structure for super admin"""
        success, response, _ = self.run_test(
            "System stats - super admin (should return 200)",
            "GET",
            "/api/admin/system-stats",
            200,
            headers={'Authorization': f'Bearer {self.super_token}'}
        )
        
        if not success:
            return False
        
        # Check top-level keys
        required_keys = ['generated_at', 'server', 'app', 'mongo']
        missing_keys = [k for k in required_keys if k not in response]
        if missing_keys:
            print(f"   ❌ Missing top-level keys: {missing_keys}")
            self.failed_tests.append("System stats - missing top-level keys")
            return False
        print(f"   ✓ All top-level keys present: {required_keys}")
        
        # Check server keys
        server = response.get('server', {})
        server_keys = [
            'ram_total_bytes', 'ram_used_bytes', 'ram_pct',
            'cpu_cores', 'cpu_pct_1m', 'cpu_pct_5m', 'cpu_pct_15m',
            'cpu_load_1m', 'cpu_load_5m', 'cpu_load_15m',
            'disk_total_bytes', 'disk_used_bytes', 'disk_pct',
            'uptime_seconds'
        ]
        missing_server = [k for k in server_keys if k not in server]
        if missing_server:
            print(f"   ❌ Missing server keys: {missing_server}")
            self.failed_tests.append("System stats - missing server keys")
            return False
        print(f"   ✓ All server keys present")
        
        # Check app keys
        app = response.get('app', {})
        app_keys = [
            'inquiries_total', 'inquiries_last_7d', 'inquiries_last_30d',
            'status_breakdown', 'counts', 'uploads_bytes', 'uploads_files'
        ]
        missing_app = [k for k in app_keys if k not in app]
        if missing_app:
            print(f"   ❌ Missing app keys: {missing_app}")
            self.failed_tests.append("System stats - missing app keys")
            return False
        print(f"   ✓ All app keys present")
        
        # Check mongo keys
        mongo = response.get('mongo', {})
        mongo_keys = ['collections', 'objects', 'data_size', 'storage_size', 'index_size']
        missing_mongo = [k for k in mongo_keys if k not in mongo]
        if missing_mongo:
            print(f"   ❌ Missing mongo keys: {missing_mongo}")
            self.failed_tests.append("System stats - missing mongo keys")
            return False
        print(f"   ✓ All mongo keys present")
        
        return True

    def test_gallery_reorder_no_auth(self):
        """Test POST /api/admin/gallery/reorder returns 401 without token"""
        success, response, _ = self.run_test(
            "Gallery reorder - no auth (should return 401)",
            "POST",
            "/api/admin/gallery/reorder",
            401,
            data={"items": [{"id": "test", "order": 1}]}
        )
        return success

    def test_gallery_reorder_empty_items(self):
        """Test POST /api/admin/gallery/reorder rejects empty items list with 400"""
        success, response, _ = self.run_test(
            "Gallery reorder - empty items (should return 400)",
            "POST",
            "/api/admin/gallery/reorder",
            400,
            data={"items": []},
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        return success

    def test_gallery_reorder_too_many_items(self):
        """Test POST /api/admin/gallery/reorder rejects >1000 items with 400"""
        # Create 1001 fake items
        items = [{"id": f"item_{i}", "order": i} for i in range(1001)]
        success, response, _ = self.run_test(
            "Gallery reorder - too many items (should return 400)",
            "POST",
            "/api/admin/gallery/reorder",
            400,
            data={"items": items},
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        return success

    def test_gallery_reorder_valid(self):
        """Test POST /api/admin/gallery/reorder with valid payload"""
        # First, get existing gallery items
        success, gallery_items, _ = self.run_test(
            "Get gallery items for reorder test",
            "GET",
            "/api/gallery",
            200
        )
        
        if not success or not gallery_items:
            print("   ⚠️  No gallery items to test reorder with")
            return True  # Skip test if no items
        
        # Take first 3 items and swap their order values
        items_to_reorder = gallery_items[:min(3, len(gallery_items))]
        if len(items_to_reorder) < 2:
            print("   ⚠️  Need at least 2 items to test reorder")
            return True  # Skip if not enough items
        
        # Swap order values
        reorder_payload = [
            {"id": items_to_reorder[0]["id"], "order": items_to_reorder[1].get("order", 1)},
            {"id": items_to_reorder[1]["id"], "order": items_to_reorder[0].get("order", 0)}
        ]
        
        success, response, _ = self.run_test(
            "Gallery reorder - valid payload",
            "POST",
            "/api/admin/gallery/reorder",
            200,
            data={"items": reorder_payload},
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        
        if success:
            if response.get("ok") and response.get("updated") == 2:
                print(f"   ✓ Successfully reordered {response.get('updated')} items")
                return True
            else:
                print(f"   ❌ Expected ok=true and updated=2, got: {response}")
                self.failed_tests.append("Gallery reorder - response structure")
                return False
        return False

    def test_gallery_reorder_malformed_entries(self):
        """Test POST /api/admin/gallery/reorder silently skips malformed entries"""
        # Mix valid and invalid entries
        payload = {
            "items": [
                {"id": "valid_id_1", "order": 10},  # valid
                {"id": "valid_id_2"},  # missing order
                {"order": 20},  # missing id
                None,  # null entry
                {"id": "valid_id_3", "order": "not_an_int"},  # wrong type
            ]
        }
        
        success, response, _ = self.run_test(
            "Gallery reorder - malformed entries (should skip invalid, process valid)",
            "POST",
            "/api/admin/gallery/reorder",
            200,
            data=payload,
            headers={'Authorization': f'Bearer {self.regular_token}'}
        )
        
        if success:
            # Should return ok=true even if some entries were skipped
            if response.get("ok"):
                print(f"   ✓ Endpoint handled malformed entries gracefully (updated={response.get('updated')})")
                return True
            else:
                print(f"   ❌ Expected ok=true, got: {response}")
                self.failed_tests.append("Gallery reorder - malformed handling")
                return False
        return False

    def test_gallery_crud_regression(self):
        """Test existing gallery CRUD endpoints still work"""
        print(f"\n🔍 Testing gallery CRUD regression...")
        self.tests_run += 1
        all_passed = True
        
        # Test GET /api/gallery
        try:
            response = requests.get(f"{self.base_url}/api/gallery", timeout=10)
            if response.status_code == 200:
                print(f"  ✓ GET /api/gallery works (status 200)")
            else:
                print(f"  ❌ GET /api/gallery failed (status {response.status_code})")
                all_passed = False
                self.failed_tests.append("Gallery CRUD - GET /api/gallery")
        except Exception as e:
            print(f"  ❌ GET /api/gallery error: {e}")
            all_passed = False
            self.failed_tests.append("Gallery CRUD - GET /api/gallery error")
        
        # Test POST /api/admin/gallery (create)
        try:
            headers = {'Authorization': f'Bearer {self.regular_token}', 'Content-Type': 'application/json'}
            test_item = {
                "image_url": "/api/uploads/test.jpg",
                "title": "Test Gallery Item",
                "category": "weddings",
                "featured": False
            }
            response = requests.post(f"{self.base_url}/api/admin/gallery", json=test_item, headers=headers, timeout=10)
            if response.status_code in [200, 201]:
                created_id = response.json().get("id")
                print(f"  ✓ POST /api/admin/gallery works (created id={created_id})")
                
                # Test PUT /api/admin/gallery/{id} (update)
                if created_id:
                    update_data = {"title": "Updated Test Item"}
                    response = requests.put(f"{self.base_url}/api/admin/gallery/{created_id}", json=update_data, headers=headers, timeout=10)
                    if response.status_code == 200:
                        print(f"  ✓ PUT /api/admin/gallery/{created_id} works")
                    else:
                        print(f"  ❌ PUT /api/admin/gallery/{created_id} failed (status {response.status_code})")
                        all_passed = False
                        self.failed_tests.append("Gallery CRUD - PUT")
                    
                    # Test DELETE /api/admin/gallery/{id}
                    response = requests.delete(f"{self.base_url}/api/admin/gallery/{created_id}", headers=headers, timeout=10)
                    if response.status_code == 200:
                        print(f"  ✓ DELETE /api/admin/gallery/{created_id} works")
                    else:
                        print(f"  ❌ DELETE /api/admin/gallery/{created_id} failed (status {response.status_code})")
                        all_passed = False
                        self.failed_tests.append("Gallery CRUD - DELETE")
            else:
                print(f"  ❌ POST /api/admin/gallery failed (status {response.status_code})")
                all_passed = False
                self.failed_tests.append("Gallery CRUD - POST")
        except Exception as e:
            print(f"  ❌ Gallery CRUD error: {e}")
            all_passed = False
            self.failed_tests.append("Gallery CRUD - error")
        
        if all_passed:
            self.tests_passed += 1
            print(f"\n✅ PASSED - Gallery CRUD regression tests")
        else:
            print(f"\n❌ FAILED - Some gallery CRUD tests failed")
        
        return all_passed

def main():
    tester = CacheAndSystemStatsTester()
    
    print("=" * 70)
    print("BACKEND TESTS: CACHING + SYSTEM STATS + GALLERY REORDER")
    print("=" * 70)
    
    # Auth tests
    print("\n" + "=" * 70)
    print("AUTHENTICATION TESTS")
    print("=" * 70)
    
    if not tester.test_super_admin_login():
        print("\n❌ Super admin login failed, stopping tests")
        return 1
    
    if not tester.test_regular_admin_login():
        print("\n❌ Regular admin login failed, stopping tests")
        return 1
    
    if not tester.test_auth_me_super_admin():
        print("\n❌ Auth me super admin test failed")
    
    if not tester.test_auth_me_regular_admin():
        print("\n❌ Auth me regular admin test failed")
    
    # Cache tests
    print("\n" + "=" * 70)
    print("HTTP CACHING TESTS")
    print("=" * 70)
    
    tester.test_cache_headers()
    tester.test_etag_revalidation()
    tester.test_preview_token_stripped()
    
    # System stats tests
    print("\n" + "=" * 70)
    print("SUPER ADMIN SYSTEM STATS TESTS")
    print("=" * 70)
    
    tester.test_system_stats_unauthenticated()
    tester.test_system_stats_bad_token()
    tester.test_system_stats_regular_admin()
    tester.test_system_stats_super_admin()
    
    # Gallery reorder tests
    print("\n" + "=" * 70)
    print("GALLERY REORDER ENDPOINT TESTS")
    print("=" * 70)
    
    tester.test_gallery_reorder_no_auth()
    tester.test_gallery_reorder_empty_items()
    tester.test_gallery_reorder_too_many_items()
    tester.test_gallery_reorder_valid()
    tester.test_gallery_reorder_malformed_entries()
    
    # Gallery CRUD regression
    print("\n" + "=" * 70)
    print("GALLERY CRUD REGRESSION TESTS")
    print("=" * 70)
    
    tester.test_gallery_crud_regression()
    
    # Print results
    print("\n" + "=" * 70)
    print(f"📊 BACKEND TESTS COMPLETE")
    print(f"   Passed: {tester.tests_passed}/{tester.tests_run}")
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for test in tester.failed_tests:
            print(f"   - {test}")
    print("=" * 70)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())

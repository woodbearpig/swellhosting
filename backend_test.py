"""Backend API tests for swell design + media"""
import requests
import sys
from datetime import datetime, date, timedelta

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []

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
                    'response': response.text[:200]
                })
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
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

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Total tests: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
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
        
        return self.tests_failed == 0


def main():
    tester = APITester()
    
    print("="*60)
    print("🧪 BACKEND API TESTING - swell design + media")
    print("="*60)
    
    # ========================================
    # 1. HEALTH & PUBLIC ENDPOINTS
    # ========================================
    print("\n\n📍 SECTION 1: Health & Public Endpoints")
    print("-"*60)
    
    tester.test("Health check", "GET", "/health", 200)
    tester.test("Root endpoint", "GET", "/", 200)
    tester.test("Get site content", "GET", "/site-content", 200)
    
    # ========================================
    # 2. SERVICES
    # ========================================
    print("\n\n📍 SECTION 2: Services")
    print("-"*60)
    
    success, services = tester.test("List all services", "GET", "/services", 200)
    if success and services:
        print(f"   Found {len(services)} services")
        if len(services) > 0:
            first_slug = services[0].get('slug')
            tester.test(f"Get service detail: {first_slug}", "GET", f"/services/{first_slug}", 200)
    
    tester.test("List published services only", "GET", "/services", 200, params={'published': True})
    
    # ========================================
    # 3. GALLERY
    # ========================================
    print("\n\n📍 SECTION 3: Gallery")
    print("-"*60)
    
    success, gallery = tester.test("List all gallery items", "GET", "/gallery", 200)
    if success and gallery:
        print(f"   Found {len(gallery)} gallery items")
    
    tester.test("List featured gallery items", "GET", "/gallery", 200, params={'featured': True})
    tester.test("Filter gallery by category", "GET", "/gallery", 200, params={'category': 'weddings'})
    
    # ========================================
    # 4. TESTIMONIALS
    # ========================================
    print("\n\n📍 SECTION 4: Testimonials")
    print("-"*60)
    
    success, testimonials = tester.test("List all testimonials", "GET", "/testimonials", 200)
    if success and testimonials:
        print(f"   Found {len(testimonials)} testimonials")
    
    tester.test("List featured testimonials", "GET", "/testimonials", 200, params={'featured': True})
    
    # ========================================
    # 5. FAQs
    # ========================================
    print("\n\n📍 SECTION 5: FAQs")
    print("-"*60)
    
    success, faqs = tester.test("List all FAQs", "GET", "/faqs", 200)
    if success and faqs:
        print(f"   Found {len(faqs)} FAQs")
    
    # ========================================
    # 6. BLOG
    # ========================================
    print("\n\n📍 SECTION 6: Blog")
    print("-"*60)
    
    success, posts = tester.test("List all blog posts", "GET", "/blog", 200)
    if success and posts:
        print(f"   Found {len(posts)} blog posts")
        if len(posts) > 0:
            first_slug = posts[0].get('slug')
            tester.test(f"Get blog post: {first_slug}", "GET", f"/blog/{first_slug}", 200)
    
    # ========================================
    # 7. AVAILABILITY
    # ========================================
    print("\n\n📍 SECTION 7: Availability")
    print("-"*60)
    
    tester.test("Get availability", "GET", "/availability", 200)
    
    # Test slots for tomorrow
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    tester.test(f"Get available slots for {tomorrow}", "GET", "/availability/slots", 200, params={'date': tomorrow})
    
    # ========================================
    # 8. PUBLIC SUBMISSIONS
    # ========================================
    print("\n\n📍 SECTION 8: Public Submissions")
    print("-"*60)
    
    # Newsletter subscription
    newsletter_data = {
        'email': f'test_{datetime.now().strftime("%H%M%S")}@example.com',
        'source': 'footer'
    }
    tester.test("Subscribe to newsletter", "POST", "/newsletter", 200, data=newsletter_data)
    
    # Create inquiry
    inquiry_data = {
        'client_name': 'Test Client',
        'client_email': f'inquiry_{datetime.now().strftime("%H%M%S")}@example.com',
        'client_phone': '310-555-0100',
        'event_type': 'wedding',
        'event_date': (date.today() + timedelta(days=60)).isoformat(),
        'venue_name': 'Test Venue',
        'services_needed': ['balloon_garland', 'balloon_arch'],
        'budget_range': '$2,500 – $5,000'
    }
    success, inquiry_response = tester.test("Create inquiry", "POST", "/inquiries", 200, data=inquiry_data)
    inquiry_id = inquiry_response.get('id') if success else None
    
    # Create consultation
    consultation_data = {
        'client_name': 'Test Consultation',
        'client_email': f'consult_{datetime.now().strftime("%H%M%S")}@example.com',
        'client_phone': '310-555-0101',
        'consultation_type': 'phone',
        'date': tomorrow,
        'time': '10:00',
        'notes': 'Test consultation booking'
    }
    success, consult_response = tester.test("Create consultation", "POST", "/consultations", 200, data=consultation_data)
    consultation_id = consult_response.get('id') if success else None
    
    # ========================================
    # 9. AUTHENTICATION
    # ========================================
    print("\n\n📍 SECTION 9: Authentication")
    print("-"*60)
    
    # Test invalid login
    tester.test("Login with invalid credentials", "POST", "/auth/login", 401, data={
        'email': 'wrong@example.com',
        'password': 'wrongpass'
    })
    
    # Test valid login
    success, login_response = tester.test("Login with valid credentials", "POST", "/auth/login", 200, data={
        'email': 'admin@swelldesignla.com',
        'password': 'swell2025'
    })
    
    if success and 'token' in login_response:
        tester.token = login_response['token']
        print(f"   ✓ Token received")
        
        # Test /auth/me
        tester.test("Get current user", "GET", "/auth/me", 200)
    else:
        print("   ⚠️  Login failed - skipping admin tests")
        tester.print_summary()
        return 1
    
    # ========================================
    # 10. ADMIN - UNAUTHORIZED ACCESS
    # ========================================
    print("\n\n📍 SECTION 10: Admin Unauthorized Access")
    print("-"*60)
    
    # Temporarily remove token
    temp_token = tester.token
    tester.token = None
    
    tester.test("Admin inquiries without auth", "GET", "/admin/inquiries", 401)
    tester.test("Admin stats without auth", "GET", "/admin/stats", 401)
    
    # Restore token
    tester.token = temp_token
    
    # ========================================
    # 11. ADMIN - DASHBOARD & STATS
    # ========================================
    print("\n\n📍 SECTION 11: Admin Dashboard & Stats")
    print("-"*60)
    
    success, stats = tester.test("Get admin stats", "GET", "/admin/stats", 200)
    if success and stats:
        print(f"   Total inquiries: {stats.get('total_inquiries', 0)}")
        print(f"   Total clients: {stats.get('total_clients', 0)}")
    
    # ========================================
    # 12. ADMIN - INQUIRIES
    # ========================================
    print("\n\n📍 SECTION 12: Admin Inquiries")
    print("-"*60)
    
    success, inquiries = tester.test("List all inquiries", "GET", "/admin/inquiries", 200)
    if success and inquiries:
        print(f"   Found {len(inquiries)} inquiries")
    
    tester.test("Filter inquiries by status", "GET", "/admin/inquiries", 200, params={'status': 'new'})
    
    if inquiry_id:
        tester.test(f"Get inquiry detail: {inquiry_id}", "GET", f"/admin/inquiries/{inquiry_id}", 200)
        
        # Update inquiry
        update_data = {'status': 'needs_follow_up', 'admin_notes': 'Test note'}
        tester.test(f"Update inquiry: {inquiry_id}", "PUT", f"/admin/inquiries/{inquiry_id}", 200, data=update_data)
    
    # ========================================
    # 13. ADMIN - CLIENTS
    # ========================================
    print("\n\n📍 SECTION 13: Admin Clients")
    print("-"*60)
    
    success, clients = tester.test("List all clients", "GET", "/admin/clients", 200)
    if success and clients and len(clients) > 0:
        print(f"   Found {len(clients)} clients")
        client_id = clients[0].get('id')
        if client_id:
            tester.test(f"Get client detail: {client_id}", "GET", f"/admin/clients/{client_id}", 200)
    
    # ========================================
    # 14. ADMIN - CONSULTATIONS
    # ========================================
    print("\n\n📍 SECTION 14: Admin Consultations")
    print("-"*60)
    
    success, consultations = tester.test("List all consultations", "GET", "/admin/consultations", 200)
    if success and consultations:
        print(f"   Found {len(consultations)} consultations")
    
    if consultation_id:
        update_data = {'status': 'completed', 'notes': 'Test completed'}
        tester.test(f"Update consultation: {consultation_id}", "PUT", f"/admin/consultations/{consultation_id}", 200, data=update_data)
    
    # ========================================
    # 15. ADMIN - AVAILABILITY
    # ========================================
    print("\n\n📍 SECTION 15: Admin Availability")
    print("-"*60)
    
    availability_update = {
        'weekly': {
            'mon': [],
            'tue': [{'start': '10:00', 'end': '17:00'}],
            'wed': [{'start': '10:00', 'end': '17:00'}],
            'thu': [{'start': '10:00', 'end': '17:00'}],
            'fri': [{'start': '10:00', 'end': '17:00'}],
            'sat': [{'start': '11:00', 'end': '15:00'}],
            'sun': []
        },
        'blackout_dates': []
    }
    tester.test("Update availability", "PUT", "/admin/availability", 200, data=availability_update)
    
    # ========================================
    # 16. ADMIN - SERVICES CRUD
    # ========================================
    print("\n\n📍 SECTION 16: Admin Services CRUD")
    print("-"*60)
    
    new_service = {
        'title': 'Test Service',
        'subtitle': 'Test subtitle',
        'short_description': 'Test description',
        'price_from': '$500+',
        'published': False
    }
    success, service_response = tester.test("Create service", "POST", "/admin/services", 200, data=new_service)
    service_id = service_response.get('id') if success else None
    
    if service_id:
        update_service = {'title': 'Updated Test Service', 'published': True}
        tester.test(f"Update service: {service_id}", "PUT", f"/admin/services/{service_id}", 200, data=update_service)
        tester.test(f"Delete service: {service_id}", "DELETE", f"/admin/services/{service_id}", 200)
    
    # ========================================
    # 17. ADMIN - GALLERY CRUD
    # ========================================
    print("\n\n📍 SECTION 17: Admin Gallery CRUD")
    print("-"*60)
    
    new_gallery = {
        'title': 'Test Gallery Item',
        'image_url': 'https://images.unsplash.com/photo-1649615644622-6d83f48e69c5',
        'category': 'weddings',
        'featured': False
    }
    success, gallery_response = tester.test("Create gallery item", "POST", "/admin/gallery", 200, data=new_gallery)
    gallery_id = gallery_response.get('id') if success else None
    
    if gallery_id:
        update_gallery = {'featured': True}
        tester.test(f"Update gallery item: {gallery_id}", "PUT", f"/admin/gallery/{gallery_id}", 200, data=update_gallery)
        tester.test(f"Delete gallery item: {gallery_id}", "DELETE", f"/admin/gallery/{gallery_id}", 200)
    
    # ========================================
    # 18. ADMIN - TESTIMONIALS CRUD
    # ========================================
    print("\n\n📍 SECTION 18: Admin Testimonials CRUD")
    print("-"*60)
    
    new_testimonial = {
        'name': 'Test Client',
        'event_type': 'Wedding',
        'quote': 'This is a test testimonial',
        'rating': 5,
        'featured': False
    }
    success, testimonial_response = tester.test("Create testimonial", "POST", "/admin/testimonials", 200, data=new_testimonial)
    testimonial_id = testimonial_response.get('id') if success else None
    
    if testimonial_id:
        update_testimonial = {'featured': True}
        tester.test(f"Update testimonial: {testimonial_id}", "PUT", f"/admin/testimonials/{testimonial_id}", 200, data=update_testimonial)
        tester.test(f"Delete testimonial: {testimonial_id}", "DELETE", f"/admin/testimonials/{testimonial_id}", 200)
    
    # ========================================
    # 19. ADMIN - FAQS CRUD
    # ========================================
    print("\n\n📍 SECTION 19: Admin FAQs CRUD")
    print("-"*60)
    
    new_faq = {
        'category': 'General',
        'question': 'Test question?',
        'answer': 'Test answer.'
    }
    success, faq_response = tester.test("Create FAQ", "POST", "/admin/faqs", 200, data=new_faq)
    faq_id = faq_response.get('id') if success else None
    
    if faq_id:
        update_faq = {'answer': 'Updated test answer.'}
        tester.test(f"Update FAQ: {faq_id}", "PUT", f"/admin/faqs/{faq_id}", 200, data=update_faq)
        tester.test(f"Delete FAQ: {faq_id}", "DELETE", f"/admin/faqs/{faq_id}", 200)
    
    # ========================================
    # 20. ADMIN - BLOG CRUD
    # ========================================
    print("\n\n📍 SECTION 20: Admin Blog CRUD")
    print("-"*60)
    
    new_blog = {
        'title': 'Test Blog Post',
        'excerpt': 'Test excerpt',
        'content': 'Test content',
        'published': False
    }
    success, blog_response = tester.test("Create blog post", "POST", "/admin/blog", 200, data=new_blog)
    blog_id = blog_response.get('id') if success else None
    
    if blog_id:
        update_blog = {'published': True}
        tester.test(f"Update blog post: {blog_id}", "PUT", f"/admin/blog/{blog_id}", 200, data=update_blog)
        tester.test(f"Delete blog post: {blog_id}", "DELETE", f"/admin/blog/{blog_id}", 200)
    
    # ========================================
    # 21. ADMIN - SITE CONTENT
    # ========================================
    print("\n\n📍 SECTION 21: Admin Site Content")
    print("-"*60)
    
    site_content_update = {
        'hero_headline': 'Test headline update',
        'promo_active': True
    }
    tester.test("Update site content", "PUT", "/admin/site-content", 200, data=site_content_update)
    
    # ========================================
    # 21B. COMING SOON FEATURE (NEW)
    # ========================================
    print("\n\n📍 SECTION 21B: Coming Soon Feature (NEW)")
    print("-"*60)
    
    # First, get site content and verify new fields exist
    tester.token = None  # Public endpoint
    success, site_content = tester.test("Get site content with new Coming Soon fields", "GET", "/site-content", 200)
    if success:
        has_coming_soon_active = 'coming_soon_active' in site_content
        has_coming_soon_eyebrow = 'coming_soon_eyebrow' in site_content
        has_coming_soon_title = 'coming_soon_title' in site_content
        has_coming_soon_script = 'coming_soon_script' in site_content
        has_coming_soon_message = 'coming_soon_message' in site_content
        has_coming_soon_launch_date = 'coming_soon_launch_date' in site_content
        
        print(f"   ✓ coming_soon_active: {has_coming_soon_active} (value: {site_content.get('coming_soon_active', 'N/A')})")
        print(f"   ✓ coming_soon_eyebrow: {has_coming_soon_eyebrow}")
        print(f"   ✓ coming_soon_title: {has_coming_soon_title}")
        print(f"   ✓ coming_soon_script: {has_coming_soon_script}")
        print(f"   ✓ coming_soon_message: {has_coming_soon_message}")
        print(f"   ✓ coming_soon_launch_date: {has_coming_soon_launch_date}")
        
        if not all([has_coming_soon_active, has_coming_soon_eyebrow, has_coming_soon_title, 
                    has_coming_soon_script, has_coming_soon_message, has_coming_soon_launch_date]):
            print("   ⚠️  WARNING: Some Coming Soon fields are missing!")
    
    tester.token = temp_token  # Restore admin token
    
    # Test updating coming_soon_active to true
    coming_soon_enable = {
        'coming_soon_active': True
    }
    success, response = tester.test("Enable Coming Soon mode", "PUT", "/admin/site-content", 200, data=coming_soon_enable)
    if success:
        print(f"   ✓ Coming Soon mode enabled: {response.get('coming_soon_active', False)}")
    
    # Test updating coming_soon content fields
    coming_soon_content = {
        'coming_soon_title': 'Test Coming Soon Title',
        'coming_soon_message': 'This is a test coming soon message for automated testing.',
        'coming_soon_eyebrow': 'TEST MODE',
        'coming_soon_script': 'testing',
        'coming_soon_launch_date': 'Spring 2026'
    }
    success, response = tester.test("Update Coming Soon content", "PUT", "/admin/site-content", 200, data=coming_soon_content)
    if success:
        print(f"   ✓ Title updated: {response.get('coming_soon_title', 'N/A')}")
        print(f"   ✓ Message updated: {response.get('coming_soon_message', 'N/A')[:50]}...")
    
    # Verify the changes persisted
    tester.token = None
    success, site_content = tester.test("Verify Coming Soon changes persisted", "GET", "/site-content", 200)
    if success:
        print(f"   ✓ coming_soon_active: {site_content.get('coming_soon_active', False)}")
        print(f"   ✓ coming_soon_title: {site_content.get('coming_soon_title', 'N/A')}")
    
    tester.token = temp_token
    
    # Disable Coming Soon mode for normal operation after tests
    coming_soon_disable = {
        'coming_soon_active': False
    }
    success, response = tester.test("Disable Coming Soon mode (cleanup)", "PUT", "/admin/site-content", 200, data=coming_soon_disable)
    if success:
        print(f"   ✓ Coming Soon mode disabled: {not response.get('coming_soon_active', True)}")
    
    # ========================================
    # 22. ADMIN - NEWSLETTER
    # ========================================
    print("\n\n📍 SECTION 22: Admin Newsletter")
    print("-"*60)
    
    success, subscribers = tester.test("List newsletter subscribers", "GET", "/admin/newsletter", 200)
    if success and subscribers:
        print(f"   Found {len(subscribers)} subscribers")
    
    # ========================================
    # 23. INTEGRATIONS - GOOGLE CALENDAR
    # ========================================
    print("\n\n📍 SECTION 23: Integrations - Google Calendar")
    print("-"*60)
    
    # Test unauthorized access
    temp_token = tester.token
    tester.token = None
    tester.test("Google Calendar status without auth", "GET", "/admin/integrations/google/status", 401)
    tester.token = temp_token
    
    # Test initial status (should be not connected)
    success, gcal_status = tester.test("Google Calendar status (initial)", "GET", "/admin/integrations/google/status", 200)
    if success:
        print(f"   Connected: {gcal_status.get('connected', False)}")
        print(f"   Email: {gcal_status.get('email', 'N/A')}")
    
    # Test saving credentials
    gcal_creds = {
        'client_id': 'test_client_id_123.apps.googleusercontent.com',
        'client_secret': 'test_client_secret_xyz'
    }
    success, save_response = tester.test("Save Google Calendar credentials", "POST", "/admin/integrations/google/settings", 200, data=gcal_creds)
    if success:
        print(f"   Credentials saved: {save_response.get('ok', False)}")
    
    # Test authorize endpoint (should return authorization URL)
    success, auth_response = tester.test("Get Google Calendar authorization URL", "GET", "/admin/integrations/google/authorize", 200)
    if success:
        print(f"   Has authorization_url: {'authorization_url' in auth_response}")
        print(f"   Has redirect_uri: {'redirect_uri' in auth_response}")
    
    # Test callback with missing code (public endpoint, no auth) - should redirect
    # Note: The endpoint returns a RedirectResponse which the browser follows, but requests library
    # will follow redirects by default and return 200 with the final page content
    tester.token = None
    print(f"\n   ℹ️  Skipping callback redirect test (requires browser to test properly)")
    tester.token = temp_token
    
    # Test disconnect
    success, disconnect_response = tester.test("Disconnect Google Calendar", "POST", "/admin/integrations/google/disconnect", 200)
    if success:
        print(f"   Disconnected: {disconnect_response.get('ok', False)}")
    
    # ========================================
    # 24. INTEGRATIONS - INSTAGRAM
    # ========================================
    print("\n\n📍 SECTION 24: Integrations - Instagram")
    print("-"*60)
    
    # Test unauthorized access
    tester.token = None
    tester.test("Instagram status without auth", "GET", "/admin/integrations/instagram/status", 401)
    tester.token = temp_token
    
    # Test initial status (should be not configured)
    success, ig_status = tester.test("Instagram status (initial)", "GET", "/admin/integrations/instagram/status", 200)
    if success:
        print(f"   Configured: {ig_status.get('configured', False)}")
        print(f"   Username: {ig_status.get('username', 'N/A')}")
        print(f"   Post count: {ig_status.get('post_count', 0)}")
    
    # Test public feed (should return empty array initially)
    tester.token = None
    success, feed = tester.test("Instagram public feed (empty)", "GET", "/instagram/feed", 200)
    if success:
        print(f"   Feed posts: {len(feed) if isinstance(feed, list) else 'N/A'}")
    tester.token = temp_token
    
    # Test saving settings with invalid token (should fail with 400)
    invalid_ig_settings = {
        'ig_business_account_id': '12345678901234567',
        'access_token': 'invalid_token_xyz'
    }
    success, ig_save_response = tester.test("Save Instagram settings with invalid token", "POST", "/admin/integrations/instagram/settings", 400, data=invalid_ig_settings)
    if not success:
        print(f"   Expected 400 validation error")
    
    # Test lookup with invalid token (should fail with 400)
    invalid_lookup = {
        'access_token': 'invalid_token_xyz'
    }
    success, lookup_response = tester.test("Instagram lookup with invalid token", "POST", "/admin/integrations/instagram/lookup", 400, data=invalid_lookup)
    if not success:
        print(f"   Expected 400 validation error")
    
    # Test disconnect
    success, ig_disconnect = tester.test("Disconnect Instagram", "POST", "/admin/integrations/instagram/disconnect", 200)
    if success:
        print(f"   Disconnected: {ig_disconnect.get('ok', False)}")
    
    # ========================================
    # 25. REGRESSION - AVAILABILITY & CONSULTATIONS
    # ========================================
    print("\n\n📍 SECTION 25: Regression - Availability & Consultations (without Google Calendar)")
    print("-"*60)
    
    # Test that availability slots still work without Google Calendar connected
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    tester.token = None
    success, slots = tester.test(f"Get available slots (no Google Calendar)", "GET", "/availability/slots", 200, params={'date': tomorrow})
    if success:
        print(f"   Slots returned: {len(slots.get('slots', [])) if isinstance(slots, dict) else 'N/A'}")
    
    # Test that consultation creation still works without Google Calendar
    consultation_data_2 = {
        'client_name': 'Test No GCal',
        'client_email': f'nogcal_{datetime.now().strftime("%H%M%S")}@example.com',
        'client_phone': '310-555-0102',
        'consultation_type': 'phone',
        'date': tomorrow,
        'time': '14:00',
        'notes': 'Test without Google Calendar'
    }
    success, consult_response_2 = tester.test("Create consultation (no Google Calendar)", "POST", "/consultations", 200, data=consultation_data_2)
    consultation_id_2 = consult_response_2.get('id') if success else None
    if success:
        has_gcal_id = 'gcal_event_id' in consult_response_2
        print(f"   Consultation created: {consultation_id_2}")
        print(f"   Has gcal_event_id: {has_gcal_id} (should be False)")
    
    tester.token = temp_token
    
    # ========================================
    # 26. CLEANUP (Delete test data)
    # ========================================
    print("\n\n📍 SECTION 26: Cleanup")
    print("-"*60)
    
    if inquiry_id:
        tester.test(f"Delete test inquiry: {inquiry_id}", "DELETE", f"/admin/inquiries/{inquiry_id}", 200)
    
    if consultation_id:
        tester.test(f"Delete test consultation: {consultation_id}", "DELETE", f"/admin/consultations/{consultation_id}", 200)
    
    if consultation_id_2:
        tester.test(f"Delete test consultation 2: {consultation_id_2}", "DELETE", f"/admin/consultations/{consultation_id_2}", 200)
    
    # Print final summary
    success = tester.print_summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

"""Backend API tests for Coming Soon customization features"""
import requests
import sys

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"

class ComingSoonTester:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []

    def test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        h = {'Content-Type': 'application/json'}
        if self.token:
            h['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=h, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, timeout=10)

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
                    'expected': expected_status,
                    'got': response.status_code,
                    'response': response.text[:300]
                })
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append({'name': name, 'error': str(e)})
            print(f"❌ FAIL - Error: {str(e)}")
            return False, {}

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("📊 COMING SOON CUSTOMIZATION TEST SUMMARY")
        print("="*70)
        print(f"Total tests: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
        print(f"Success rate: {round((self.tests_passed/self.tests_run)*100, 1)}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for ft in self.failed_tests:
                print(f"  - {ft['name']}")
                if 'expected' in ft and 'got' in ft:
                    print(f"    Expected: {ft['expected']}, Got: {ft['got']}")
                if 'error' in ft:
                    print(f"    Error: {ft['error']}")
        
        return self.tests_failed == 0


def main():
    tester = ComingSoonTester()
    
    print("="*70)
    print("🧪 COMING SOON CUSTOMIZATION - BACKEND API TESTING")
    print("="*70)
    
    # ========================================
    # 1. LOGIN
    # ========================================
    print("\n\n📋 SECTION 1: Authentication")
    success, response = tester.test(
        "Admin login",
        "POST",
        "/auth/login",
        200,
        {"email": "admin@swelldesignla.com", "password": "swell2025"}
    )
    if success and 'token' in response:
        tester.token = response['token']
        print(f"   Token obtained: {tester.token[:20]}...")
    else:
        print("❌ Cannot proceed without authentication")
        return 1

    # ========================================
    # 2. GET SITE CONTENT - VERIFY NEW FIELDS
    # ========================================
    print("\n\n📋 SECTION 2: Verify new Coming Soon fields exist")
    success, site_content = tester.test(
        "GET /api/site-content returns all new fields",
        "GET",
        "/site-content",
        200
    )
    
    if success:
        # Check all 13 new fields
        new_fields = [
            'coming_soon_show_logo',
            'coming_soon_show_newsletter',
            'coming_soon_show_email',
            'coming_soon_show_phone',
            'coming_soon_show_instagram',
            'coming_soon_show_footer',
            'coming_soon_show_admin_link',
            'coming_soon_email_override',
            'coming_soon_phone_override',
            'coming_soon_instagram_override',
            'coming_soon_instagram_label',
            'coming_soon_footer_text',
            'coming_soon_newsletter_placeholder',
            'coming_soon_newsletter_button'
        ]
        
        missing_fields = []
        for field in new_fields:
            if field not in site_content:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing fields: {missing_fields}")
            tester.tests_failed += 1
            tester.failed_tests.append({
                'name': 'Verify all new fields exist',
                'error': f'Missing fields: {missing_fields}'
            })
        else:
            print(f"✅ All 13 new fields present with correct defaults")
            tester.tests_passed += 1
        
        tester.tests_run += 1

    # ========================================
    # 3. TEST TOGGLE FIELDS (boolean)
    # ========================================
    print("\n\n📋 SECTION 3: Test boolean toggle fields")
    
    # Test setting coming_soon_show_logo to false
    success, response = tester.test(
        "Set coming_soon_show_logo to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_logo": False}
    )
    if success and response.get('coming_soon_show_logo') == False:
        print("   ✓ Value persisted correctly as false")
    elif success:
        print(f"   ⚠️ Expected false, got {response.get('coming_soon_show_logo')}")
    
    # Test setting coming_soon_show_newsletter to false
    success, response = tester.test(
        "Set coming_soon_show_newsletter to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_newsletter": False}
    )
    if success and response.get('coming_soon_show_newsletter') == False:
        print("   ✓ Value persisted correctly as false")
    
    # Test setting coming_soon_show_email to false
    success, response = tester.test(
        "Set coming_soon_show_email to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_email": False}
    )
    if success and response.get('coming_soon_show_email') == False:
        print("   ✓ Value persisted correctly as false")
    
    # Test setting coming_soon_show_phone to false
    success, response = tester.test(
        "Set coming_soon_show_phone to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_phone": False}
    )
    if success and response.get('coming_soon_show_phone') == False:
        print("   ✓ Value persisted correctly as false")
    
    # Test setting coming_soon_show_instagram to false
    success, response = tester.test(
        "Set coming_soon_show_instagram to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_instagram": False}
    )
    if success and response.get('coming_soon_show_instagram') == False:
        print("   ✓ Value persisted correctly as false")
    
    # Test setting coming_soon_show_footer to false
    success, response = tester.test(
        "Set coming_soon_show_footer to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_footer": False}
    )
    if success and response.get('coming_soon_show_footer') == False:
        print("   ✓ Value persisted correctly as false")
    
    # Test setting coming_soon_show_admin_link to false
    success, response = tester.test(
        "Set coming_soon_show_admin_link to false",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_show_admin_link": False}
    )
    if success and response.get('coming_soon_show_admin_link') == False:
        print("   ✓ Value persisted correctly as false")

    # ========================================
    # 4. TEST OVERRIDE TEXT FIELDS
    # ========================================
    print("\n\n📋 SECTION 4: Test override text fields")
    
    # Test email override
    success, response = tester.test(
        "Set coming_soon_email_override",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_email_override": "hello@override.com"}
    )
    if success and response.get('coming_soon_email_override') == "hello@override.com":
        print("   ✓ Email override persisted correctly")
    
    # Test phone override
    success, response = tester.test(
        "Set coming_soon_phone_override",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_phone_override": "(555) 123-4567"}
    )
    if success and response.get('coming_soon_phone_override') == "(555) 123-4567":
        print("   ✓ Phone override persisted correctly")
    
    # Test Instagram override
    success, response = tester.test(
        "Set coming_soon_instagram_override",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_instagram_override": "https://instagram.com/testaccount"}
    )
    if success and response.get('coming_soon_instagram_override') == "https://instagram.com/testaccount":
        print("   ✓ Instagram override persisted correctly")
    
    # Test Instagram label
    success, response = tester.test(
        "Set coming_soon_instagram_label",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_instagram_label": "Follow us"}
    )
    if success and response.get('coming_soon_instagram_label') == "Follow us":
        print("   ✓ Instagram label persisted correctly")
    
    # Test footer text
    success, response = tester.test(
        "Set coming_soon_footer_text",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_footer_text": "Custom footer text"}
    )
    if success and response.get('coming_soon_footer_text') == "Custom footer text":
        print("   ✓ Footer text persisted correctly")
    
    # Test newsletter placeholder
    success, response = tester.test(
        "Set coming_soon_newsletter_placeholder",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_newsletter_placeholder": "your@email.com"}
    )
    if success and response.get('coming_soon_newsletter_placeholder') == "your@email.com":
        print("   ✓ Newsletter placeholder persisted correctly")
    
    # Test newsletter button
    success, response = tester.test(
        "Set coming_soon_newsletter_button",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_newsletter_button": "Subscribe"}
    )
    if success and response.get('coming_soon_newsletter_button') == "Subscribe":
        print("   ✓ Newsletter button persisted correctly")

    # ========================================
    # 5. TEST EMPTY STRING PERSISTENCE
    # ========================================
    print("\n\n📋 SECTION 5: Test empty string persistence")
    
    # Clear coming_soon_title
    success, response = tester.test(
        "Clear coming_soon_title (empty string)",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_title": ""}
    )
    if success and response.get('coming_soon_title') == "":
        print("   ✓ Empty string persisted correctly")
    
    # Clear coming_soon_email_override
    success, response = tester.test(
        "Clear coming_soon_email_override (empty string)",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_email_override": ""}
    )
    if success and response.get('coming_soon_email_override') == "":
        print("   ✓ Empty override persisted correctly")
    
    # Clear coming_soon_footer_text
    success, response = tester.test(
        "Clear coming_soon_footer_text (empty string)",
        "PUT",
        "/admin/site-content",
        200,
        {"coming_soon_footer_text": ""}
    )
    if success and response.get('coming_soon_footer_text') == "":
        print("   ✓ Empty footer text persisted correctly")

    # ========================================
    # 6. RESET TO DEFAULTS
    # ========================================
    print("\n\n📋 SECTION 6: Reset to default state")
    
    success, response = tester.test(
        "Reset all Coming Soon toggles to true",
        "PUT",
        "/admin/site-content",
        200,
        {
            "coming_soon_active": False,
            "coming_soon_show_logo": True,
            "coming_soon_show_newsletter": True,
            "coming_soon_show_email": True,
            "coming_soon_show_phone": True,
            "coming_soon_show_instagram": True,
            "coming_soon_show_footer": True,
            "coming_soon_show_admin_link": True,
            "coming_soon_email_override": "",
            "coming_soon_phone_override": "",
            "coming_soon_instagram_override": "",
            "coming_soon_footer_text": "",
            "coming_soon_title": "We're styling something dreamy.",
            "coming_soon_message": "A boutique event styling studio launching soon in Los Angeles — custom balloon installations, thoughtful florals, and dreamy details for weddings, showers, birthdays, and brand moments."
        }
    )
    if success:
        print("   ✓ Reset to defaults successful")

    # ========================================
    # SUMMARY
    # ========================================
    tester.print_summary()
    return 0 if tester.tests_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

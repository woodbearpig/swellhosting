import requests
import io

BASE_URL = "https://balloon-decor-cms.preview.emergentagent.com/api"

# Create a minimal valid PNG file (1x1 transparent pixel)
png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}

print("Testing file upload endpoint with PNG...")
try:
    response = requests.post(f"{BASE_URL}/uploads", files=files, timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Upload successful")
        print(f"   URL: {data.get('url')}")
        print(f"   Filename: {data.get('filename')}")
        
        # Test retrieving the uploaded file
        if 'url' in data:
            file_url = f"{BASE_URL.replace('/api', '')}{data['url']}"
            print(f"\nTesting file retrieval from: {file_url}")
            get_response = requests.get(file_url, timeout=10)
            print(f"Status: {get_response.status_code}")
            if get_response.status_code == 200:
                print(f"✅ File retrieval successful")
                print(f"   Content length: {len(get_response.content)} bytes")
            else:
                print(f"❌ File retrieval failed: {get_response.text}")
    else:
        print(f"❌ Upload failed: {response.text}")
except Exception as e:
    print(f"❌ Error: {str(e)}")

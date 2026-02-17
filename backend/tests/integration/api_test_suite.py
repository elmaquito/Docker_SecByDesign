import unittest
import requests
import jwt
import time
import uuid
import sys

# Configuration
API_URL = "http://localhost:3000"
JWT_SECRET = "dev_jwt_secret_change_me"

class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n--- Running API Test Suite (Python) ---")
        cls.cookies = {} # Default
        cls.token = ""

        # 1. Try to setup admin (for fresh DB)
        try:
            print("[Setup] Checking if admin exists...")
            setup_res = requests.post(f"{API_URL}/users/setup", json={
                "username": "admin", 
                "password": "securepassword123"
            })
            if setup_res.status_code == 200:
                print("✅ Admin created via /users/setup")
            elif setup_res.status_code == 403:
                print("ℹ️ Admin already exists (403)")
            else:
                print(f"⚠️ Unexpected setup response: {setup_res.status_code}")
        except Exception as e:
            print(f"⚠️ Setup check failed (Connection Error?): {e}")

        # 2. Try to Login
        try:
            print("[Login] Attempting login as admin...")
            login_res = requests.post(f"{API_URL}/auth/login", json={
                "username": "admin", 
                "password": "securepassword123"
            })
            
            if login_res.status_code == 200:
                print("✅ Login successful")
                # Try to get cookie
                if 'auth_token' in login_res.cookies:
                    cls.cookies = login_res.cookies
                    cls.token = login_res.cookies['auth_token']
                # Try to get from body (if API returns it)
                elif 'token' in login_res.json():
                    cls.token = login_res.json()['token']
                    cls.cookies = {'auth_token': cls.token}
            else:
                print(f"⚠️ Login failed ({login_res.status_code}). Using forged token fallback.")
                cls.forge_token()
        except Exception as e:
            print(f"❌ Login request failed: {e}")
            print("⚠️ Using forged token fallback due to connection error.")
            cls.forge_token()

    @classmethod
    def forge_token(cls):
        payload = {
            "id": 1,
            "username": "admin",
            "role": "admin",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        cls.cookies = {"auth_token": token}
        cls.token = token
        print(f"ℹ️ Forged Token: {token[:10]}...")

    def test_01_health_check(self):
        """Verify API verifies health"""
        try:
            res = requests.get(f"{API_URL}/health")
            self.assertEqual(res.status_code, 200, "Health check failed")
            self.assertEqual(res.json().get("status"), "OK")
        except requests.ConnectionError:
            self.fail("API Unreachable")

    def test_02_get_themes(self):
        """Verify we can fetch themes"""
        res = requests.get(f"{API_URL}/themes", cookies=self.cookies)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(isinstance(res.json(), list))

    def test_03_create_note(self):
        """Verify note creation workflow"""
        note_data = {
            "title": f"Test Note {uuid.uuid4()}",
            "content": "Content created by python test suite",
        }
        # Try to attach theme/category if possible
        # Check constraints?
        # NoteCreateSchema says theme_id/category_id are optional.
        
        res = requests.post(f"{API_URL}/notes", json=note_data, cookies=self.cookies)
        if res.status_code not in [200, 201]:
            print(f"Create Note Failed: {res.text}")
        
        self.assertIn(res.status_code, [200, 201])
        note = res.json()
        self.assertEqual(note["title"], note_data["title"])
        self.__class__.note_id = note["id"] # Save for next tests

    def test_04_get_note(self):
        """Verify retrieving the created note"""
        if not hasattr(self.__class__, 'note_id'):
            self.skipTest("No note created")
            
        note_id = self.__class__.note_id
        res = requests.get(f"{API_URL}/notes/{note_id}", cookies=self.cookies)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["id"], note_id)

    def test_05_update_note(self):
        """Verify updating note"""
        if not hasattr(self.__class__, 'note_id'):
            self.skipTest("No note created")

        note_id = self.__class__.note_id
        update_data = {"title": "Updated Title Python"}
        res = requests.patch(f"{API_URL}/notes/{note_id}", json=update_data, cookies=self.cookies)
        self.assertIn(res.status_code, [200, 204])
        
        # Verify
        res = requests.get(f"{API_URL}/notes/{note_id}", cookies=self.cookies)
        self.assertEqual(res.json()["title"], "Updated Title Python")

    def test_06_delete_note(self):
        """Verify deleting note"""
        if not hasattr(self.__class__, 'note_id'):
            self.skipTest("No note created")

        note_id = self.__class__.note_id
        res = requests.delete(f"{API_URL}/notes/{note_id}", cookies=self.cookies)
        self.assertEqual(res.status_code, 200)
        
        # Verify 404
        res = requests.get(f"{API_URL}/notes/{note_id}", cookies=self.cookies)
        self.assertEqual(res.status_code, 404)

if __name__ == "__main__":
    unittest.main()

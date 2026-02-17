import requests
import jwt
import time
import os
import sys

# Configuration
API_URL = "http://localhost:3001/api/v1"
JWT_SECRET = "dev_jwt_secret_change_me"

# User payload for admin
admin_payload = {
    "id": 1,
    "username": "admin",
    "role": "admin"
}

# Generate Token
token = jwt.encode(admin_payload, JWT_SECRET, algorithm="HS256")
headers = {
    "Cookie": f"auth_token={token}",
    "Content-Type": "application/json"
}

def print_result(name, passed):
    if passed:
        print(f"✅ {name}: PASS")
    else:
        print(f"❌ {name}: FAIL")
        sys.exit(1)

def test_themes():
    print("\n--- Testing Themes API ---")
    
    # 1. Create Theme
    theme_data = {"name": "Test Theme From Python"}
    res = requests.post(f"{API_URL}/themes", json=theme_data, headers=headers)
    
    if res.status_code != 201:
        print(f"Failed to create theme: {res.status_code} {res.text}")
        print_result("Create Theme", False)
        return

    theme = res.json()
    theme_id = theme['id']
    print(f"Created theme with ID: {theme_id}")
    print_result("Create Theme", True)

    # 2. Get Themes
    res = requests.get(f"{API_URL}/themes", headers=headers)
    if res.status_code != 200:
        print_result("Get Themes", False)
    else:
        themes = res.json()
        found = any(t['id'] == theme_id for t in themes)
        print_result("Get Themes", found)

    # 3. Update Theme
    update_data = {"name": "Updated Theme From Python"}
    res = requests.put(f"{API_URL}/themes/{theme_id}", json=update_data, headers=headers)
    if res.status_code != 200:
        print_result("Update Theme", False)
    else:
        updated = res.json()
        print_result("Update Theme", updated['name'] == "Updated Theme From Python")

    # 4. Delete Theme
    res = requests.delete(f"{API_URL}/themes/{theme_id}", headers=headers)
    if res.status_code != 200:
        print_result("Delete Theme", False)
    else:
        print_result("Delete Theme", True)

    # Verify Deletion
    res = requests.get(f"{API_URL}/themes/{theme_id}", headers=headers)
    if res.status_code == 404:
        print_result("Verify Deletion", True)
    else:
        # If GET /themes returns list, we check explicitly
        res = requests.get(f"{API_URL}/themes", headers=headers)
        themes = res.json()
        found = any(t['id'] == theme_id for t in themes)
        print_result("Verify Deletion", not found)


def test_categories():
    print("\n--- Testing Categories API ---")
    
    # 1. Create Category
    cat_data = {
        "name": "Test Category From Python",
        "target_type": "classe",
        "target_value": "3A"
    }
    res = requests.post(f"{API_URL}/categories", json=cat_data, headers=headers)
    
    if res.status_code != 201:
        print(f"Failed to create category: {res.status_code} {res.text}")
        print_result("Create Category", False)
        return

    cat = res.json()
    cat_id = cat['id']
    print(f"Created category with ID: {cat_id}")
    print_result("Create Category", True)

    # 2. Get Categories
    res = requests.get(f"{API_URL}/categories", headers=headers)
    if res.status_code != 200:
        print_result("Get Categories", False)
    else:
        cats = res.json()
        found = any(t['id'] == cat_id for t in cats)
        print_result("Get Categories", found)

    # 3. Update Category
    update_data = {"name": "Updated Category From Python"}
    res = requests.put(f"{API_URL}/categories/{cat_id}", json=update_data, headers=headers)
    if res.status_code != 200:
        print_result("Update Category", False)
    else:
        updated = res.json()
        print_result("Update Category", updated['name'] == "Updated Category From Python")

    # 4. Delete Category
    res = requests.delete(f"{API_URL}/categories/{cat_id}", headers=headers)
    if res.status_code != 200:
        print_result("Delete Category", False)
    else:
        print_result("Delete Category", True)


if __name__ == "__main__":
    try:
        # Check if backend is reachable with retries
        print(f"Checking {API_URL} connectivity...")
        connected = False
        for i in range(10):
            try:
                 # Just checking root or health check if exists, otherwise auth check
                 requests.get(API_URL, timeout=5)
                 connected = True
                 break
            except requests.exceptions.ConnectionError:
                print(f"Waiting for backend ({i+1}/10)...")
                time.sleep(3)
        
        if not connected:
            print("Backend not reachable. Ensure docker-compose is running.")
            sys.exit(1)

        test_themes()
        test_categories()
        print("\nAll Tests Passed!")
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

import pytest
import requests
import psycopg2
import os
from dotenv import load_dotenv

# Load .env relative to this file
backend_env = os.path.join(os.path.dirname(__file__), '../../backend/.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv() 

BASE_URL = os.getenv("TEST_API_URL", "http://localhost:3001/api/v1")

@pytest.fixture(scope="session")
def admin_session():
    """Configures an admin session"""
    setup_payload = {"username": "admin", "password": "password123!"}
    
    # 1. Try setup (works if 0 users)
    # The setup endpoint is at /api/v1/setup based on my analysis of main.ts
    try:
        requests.post(f"{BASE_URL}/setup", json=setup_payload)
    except:
        pass
        
    # 2. Login
    login_url = f"{BASE_URL}/auth/login"
    resp = requests.post(login_url, json=setup_payload)
    
    if resp.status_code != 200:
        # If admin login fails, critical failure for tests requiring auth
        # Maybe DB has different admin?
        pytest.fail(f"Admin login failed: {resp.text}. Ensure DB has admin user (admin/password123!)")
        
    token = resp.json().get("accessToken")
    session = requests.Session()
    session.cookies.set("auth_token", token)
    return session

@pytest.fixture
def auth_session(admin_session):
    """Creates a fresh teacher user for testing, using Admin session"""
    username = f"teacher_{os.urandom(4).hex()}"
    password = "password123!"
    
    # Create user via Admin API
    create_url = f"{BASE_URL}/users"
    resp = admin_session.post(create_url, json={
        "username": username,
        "password": password,
        "role": "teacher"
    })
    
    if resp.status_code == 409: 
        pass
    elif resp.status_code != 201:
        # If user creation fails, we can try to proceed if we think user exists or fall back
        pytest.fail(f"Could not create test user: {resp.text}")
        
    # Login as new user
    login_url = f"{BASE_URL}/auth/login"
    login_resp = requests.post(login_url, json={
        "username": username,
        "password": password
    })
    
    if login_resp.status_code != 200:
        pytest.fail(f"Test user login failed: {login_resp.text}")
        
    token = login_resp.json().get("accessToken")
    session = requests.Session()
    session.cookies.set("auth_token", token)
    return session

def test_health():
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

def test_create_profile(auth_session):
    payload = {
        "classe": "CyberSecurity",
        "promotion": "2024",
        "niveau": "Master 1"
    }
    resp = auth_session.post(f"{BASE_URL}/profiles/me", json=payload)
    assert resp.status_code == 200, f"Profile create failed: {resp.text}"
    data = resp.json()
    assert data["classe"] == "CyberSecurity"

def test_themes_lifecycle(auth_session):
    theme_name = f"Security_{os.urandom(4).hex()}"
    payload = {
        "name": theme_name,
        "description": "Security things",
        "color": "red"
    }
    
    # Create
    resp = auth_session.post(f"{BASE_URL}/themes", json=payload)
    assert resp.status_code == 201, f"Theme create failed: {resp.text}"
    
    # List
    resp = auth_session.get(f"{BASE_URL}/themes")
    assert resp.status_code == 200
    themes = resp.json()
    assert any(t["name"] == theme_name for t in themes)

def test_categories_lifecycle(auth_session):
    cat_name = f"Promo2024_{os.urandom(4).hex()}"
    payload = {
        "name": cat_name,
        "target_type": "promotion",
        "target_value": "2024"
    }
    
    resp = auth_session.post(f"{BASE_URL}/categories", json=payload)
    assert resp.status_code == 201, f"Category create failed: {resp.text}"
    
    resp = auth_session.get(f"{BASE_URL}/categories")
    assert resp.status_code == 200
    cats = resp.json()
    assert any(c["name"] == cat_name for c in cats)

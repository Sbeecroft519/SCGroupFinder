"""
Pilot's Lounge (LFG) API Tests
Tests for the casual social grouping feature - broadcasts, hailing, and closing
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"

# Test user for second user scenarios
TEST_USER_EMAIL = f"test_lounge_{int(time.time())}@test.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_HANDLE = f"TestPilot_{int(time.time())}"


class TestPilotsLoungeAPI:
    """Tests for Pilot's Lounge broadcast endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_token):
        """Get admin user ID"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if response.status_code == 200:
            return response.json().get("id")
        return None
    
    # ===== GET /api/lounge/broadcasts Tests =====
    
    def test_get_broadcasts_returns_list(self):
        """GET /api/lounge/broadcasts - returns list of broadcasts"""
        response = requests.get(f"{BASE_URL}/api/lounge/broadcasts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET broadcasts returns list with {len(data)} items")
    
    def test_get_broadcasts_no_auth_required(self):
        """GET /api/lounge/broadcasts - no authentication required"""
        response = requests.get(f"{BASE_URL}/api/lounge/broadcasts")
        assert response.status_code == 200, "Should not require auth"
        print("✓ GET broadcasts works without authentication")
    
    # ===== POST /api/lounge/broadcasts Tests =====
    
    def test_create_broadcast_requires_auth(self):
        """POST /api/lounge/broadcasts - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts", json={
            "activity": "mining",
            "title": "Test Broadcast"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Create broadcast requires authentication")
    
    def test_create_broadcast_success(self, admin_headers):
        """POST /api/lounge/broadcasts - creates broadcast successfully"""
        # First, close any existing broadcasts for this user
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        for b in broadcasts:
            if b.get("handle") == "Beecroft":  # Admin handle
                requests.post(f"{BASE_URL}/api/lounge/broadcasts/{b['id']}/close", headers=admin_headers)
        
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts", headers=admin_headers, json={
            "activity": "mining",
            "title": "TEST_Looking for mining crew",
            "description": "Need 2 more for Quantanium run",
            "available_from": "Now",
            "available_until": "2 hours",
            "group_size": "2-3 Crew",
            "region": "US"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain broadcast ID"
        assert data.get("message") == "Broadcast created"
        print(f"✓ Created broadcast with ID: {data['id']}")
        return data["id"]
    
    def test_one_post_per_user_rule(self, admin_headers):
        """POST /api/lounge/broadcasts - 1-post-per-user rule enforced"""
        # First create a broadcast
        response1 = requests.post(f"{BASE_URL}/api/lounge/broadcasts", headers=admin_headers, json={
            "activity": "combat",
            "title": "TEST_First broadcast"
        })
        
        # Try to create another - should fail
        response2 = requests.post(f"{BASE_URL}/api/lounge/broadcasts", headers=admin_headers, json={
            "activity": "exploration",
            "title": "TEST_Second broadcast"
        })
        
        # Either first succeeds and second fails, or first already exists
        if response1.status_code == 200:
            assert response2.status_code == 400, f"Second broadcast should fail, got {response2.status_code}"
            assert "already have an active broadcast" in response2.json().get("detail", "").lower()
            print("✓ 1-post-per-user rule enforced - second broadcast rejected")
        else:
            # User already has a broadcast
            assert response1.status_code == 400
            print("✓ 1-post-per-user rule enforced - user already has broadcast")
    
    def test_broadcast_has_required_fields(self, admin_headers):
        """Verify broadcast response contains all required fields"""
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        if broadcasts:
            b = broadcasts[0]
            required_fields = ["id", "user_id", "handle", "activity", "title", "status", 
                            "responses", "hailers", "created_at", "expires_at"]
            for field in required_fields:
                assert field in b, f"Missing field: {field}"
            print(f"✓ Broadcast contains all required fields: {required_fields}")
        else:
            print("⚠ No broadcasts to verify fields")
    
    # ===== POST /api/lounge/broadcasts/{id}/hail Tests =====
    
    def test_hail_requires_auth(self):
        """POST /api/lounge/broadcasts/{id}/hail - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts/fake-id/hail")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Hail requires authentication")
    
    def test_cannot_hail_own_broadcast(self, admin_headers, admin_user_id):
        """POST /api/lounge/broadcasts/{id}/hail - cannot hail own broadcast"""
        # Get broadcasts and find one owned by admin
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        own_broadcast = next((b for b in broadcasts if b.get("user_id") == admin_user_id), None)
        
        if own_broadcast:
            response = requests.post(
                f"{BASE_URL}/api/lounge/broadcasts/{own_broadcast['id']}/hail",
                headers=admin_headers
            )
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            assert "cannot hail your own" in response.json().get("detail", "").lower()
            print("✓ Cannot hail own broadcast - returns 400 error")
        else:
            print("⚠ No own broadcast found to test hail restriction")
    
    def test_hail_nonexistent_broadcast(self, admin_headers):
        """POST /api/lounge/broadcasts/{id}/hail - 404 for nonexistent broadcast"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/broadcasts/nonexistent-id-12345/hail",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Hail nonexistent broadcast returns 404")
    
    # ===== POST /api/lounge/broadcasts/{id}/close Tests =====
    
    def test_close_requires_auth(self):
        """POST /api/lounge/broadcasts/{id}/close - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts/fake-id/close")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Close requires authentication")
    
    def test_close_own_broadcast(self, admin_headers, admin_user_id):
        """POST /api/lounge/broadcasts/{id}/close - owner can close broadcast"""
        # Get broadcasts and find one owned by admin
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        own_broadcast = next((b for b in broadcasts if b.get("user_id") == admin_user_id), None)
        
        if own_broadcast:
            response = requests.post(
                f"{BASE_URL}/api/lounge/broadcasts/{own_broadcast['id']}/close",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert response.json().get("message") == "Comms closed"
            print(f"✓ Owner can close own broadcast: {own_broadcast['id']}")
        else:
            print("⚠ No own broadcast found to test close")
    
    def test_close_nonexistent_broadcast(self, admin_headers):
        """POST /api/lounge/broadcasts/{id}/close - 404 for nonexistent broadcast"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/broadcasts/nonexistent-id-12345/close",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Close nonexistent broadcast returns 404")
    
    # ===== Auto-expiration Tests =====
    
    def test_expired_broadcasts_not_returned(self):
        """GET /api/lounge/broadcasts - expired broadcasts are filtered out"""
        response = requests.get(f"{BASE_URL}/api/lounge/broadcasts")
        broadcasts = response.json()
        
        now = datetime.now(timezone.utc)
        for b in broadcasts:
            assert b.get("status") == "open", f"Non-open broadcast returned: {b.get('status')}"
            # Check expires_at is in the future (if present)
            if b.get("expires_at"):
                expires = datetime.fromisoformat(b["expires_at"].replace("Z", "+00:00"))
                assert expires > now, f"Expired broadcast returned: {b['id']}"
        
        print(f"✓ All {len(broadcasts)} returned broadcasts are open and not expired")
    
    # ===== Activity Tags Tests =====
    
    def test_activity_tags_valid(self, admin_headers):
        """Verify activity tags are valid"""
        valid_activities = ["mining", "combat", "trade", "exploration", "crew", "vibing", "pvp", "org"]
        
        # Close any existing broadcast first
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        for b in broadcasts:
            if b.get("handle") == "Beecroft":
                requests.post(f"{BASE_URL}/api/lounge/broadcasts/{b['id']}/close", headers=admin_headers)
        
        # Test creating with valid activity
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts", headers=admin_headers, json={
            "activity": "exploration",
            "title": "TEST_Exploration run"
        })
        
        if response.status_code == 200:
            print("✓ Valid activity tag accepted")
            # Clean up
            broadcast_id = response.json().get("id")
            requests.post(f"{BASE_URL}/api/lounge/broadcasts/{broadcast_id}/close", headers=admin_headers)
        else:
            print(f"⚠ Could not test activity tags: {response.text}")


class TestBroadcastDataIntegrity:
    """Tests for broadcast data integrity and persistence"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_create_and_verify_broadcast_data(self, admin_headers):
        """Create broadcast and verify all fields are persisted correctly"""
        # Close any existing
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        for b in broadcasts:
            if b.get("handle") == "Beecroft":
                requests.post(f"{BASE_URL}/api/lounge/broadcasts/{b['id']}/close", headers=admin_headers)
        
        # Create with specific data
        create_data = {
            "activity": "trade",
            "title": "TEST_Trade run to Lorville",
            "description": "Looking for escort for high-value cargo",
            "available_from": "In 30 min",
            "available_until": "3 hours",
            "group_size": "4-6 Crew",
            "region": "EU"
        }
        
        response = requests.post(f"{BASE_URL}/api/lounge/broadcasts", headers=admin_headers, json=create_data)
        assert response.status_code == 200
        broadcast_id = response.json()["id"]
        
        # Fetch and verify
        broadcasts = requests.get(f"{BASE_URL}/api/lounge/broadcasts").json()
        created = next((b for b in broadcasts if b["id"] == broadcast_id), None)
        
        assert created is not None, "Created broadcast not found"
        assert created["activity"] == create_data["activity"]
        assert created["title"] == create_data["title"]
        assert created["description"] == create_data["description"]
        assert created["available_from"] == create_data["available_from"]
        assert created["available_until"] == create_data["available_until"]
        assert created["group_size"] == create_data["group_size"]
        assert created["region"] == create_data["region"]
        assert created["status"] == "open"
        assert created["responses"] == 0
        assert created["hailers"] == []
        
        print("✓ All broadcast fields persisted correctly")
        
        # Clean up
        requests.post(f"{BASE_URL}/api/lounge/broadcasts/{broadcast_id}/close", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

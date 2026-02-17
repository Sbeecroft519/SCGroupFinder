"""
Test suite for NavCom Iteration 5 Features:
1. Admin Roadmap - CRUD operations for roadmap items
2. Player Search - User search by RSI handle
3. Settings About - About section (UI only, no backend test needed)
4. Legal Pages - Privacy Policy and Terms of Service (public routes)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# ===== FEATURE 1: Admin Roadmap Tests =====

class TestAdminRoadmap:
    """Test Admin Roadmap CRUD operations"""
    
    def test_get_public_roadmap(self):
        """Test public roadmap endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/roadmap")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public roadmap has {len(data)} items")
    
    def test_get_admin_roadmap(self, admin_headers):
        """Test admin roadmap endpoint (requires admin auth)"""
        response = requests.get(f"{BASE_URL}/api/admin/roadmap", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin roadmap has {len(data)} items")
    
    def test_create_roadmap_item_stable(self, admin_headers):
        """Test creating a roadmap item with STABLE status"""
        item_data = {
            "title": f"TEST_Stable_Feature_{uuid.uuid4().hex[:8]}",
            "description": "A stable feature for testing",
            "status": "STABLE"
        }
        response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == item_data["title"]
        assert data["status"] == "STABLE"
        assert "id" in data
        print(f"Created STABLE item: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/roadmap/{data['id']}", headers=admin_headers)
    
    def test_create_roadmap_item_in_progress(self, admin_headers):
        """Test creating a roadmap item with IN_PROGRESS status"""
        item_data = {
            "title": f"TEST_InProgress_Feature_{uuid.uuid4().hex[:8]}",
            "description": "An in-progress feature for testing",
            "status": "IN_PROGRESS"
        }
        response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        print(f"Created IN_PROGRESS item: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/roadmap/{data['id']}", headers=admin_headers)
    
    def test_create_roadmap_item_planned(self, admin_headers):
        """Test creating a roadmap item with PLANNED status"""
        item_data = {
            "title": f"TEST_Planned_Feature_{uuid.uuid4().hex[:8]}",
            "description": "A planned feature for testing",
            "status": "PLANNED"
        }
        response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "PLANNED"
        print(f"Created PLANNED item: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/roadmap/{data['id']}", headers=admin_headers)
    
    def test_create_roadmap_item_backlog(self, admin_headers):
        """Test creating a roadmap item with BACKLOG status"""
        item_data = {
            "title": f"TEST_Backlog_Feature_{uuid.uuid4().hex[:8]}",
            "description": "A backlog feature for testing",
            "status": "BACKLOG"
        }
        response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "BACKLOG"
        print(f"Created BACKLOG item: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/roadmap/{data['id']}", headers=admin_headers)
    
    def test_create_roadmap_item_invalid_status(self, admin_headers):
        """Test creating a roadmap item with invalid status fails"""
        item_data = {
            "title": "TEST_Invalid_Status",
            "description": "Should fail",
            "status": "INVALID_STATUS"
        }
        response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert response.status_code == 400
        print("Invalid status correctly rejected")
    
    def test_update_roadmap_item(self, admin_headers):
        """Test updating a roadmap item"""
        # Create item first
        item_data = {
            "title": f"TEST_Update_Feature_{uuid.uuid4().hex[:8]}",
            "description": "Original description",
            "status": "PLANNED"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update the item
        update_data = {
            "title": "TEST_Updated_Title",
            "description": "Updated description",
            "status": "IN_PROGRESS"
        }
        update_response = requests.put(f"{BASE_URL}/api/admin/roadmap/{item_id}", json=update_data, headers=admin_headers)
        assert update_response.status_code == 200
        
        # Verify update via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/roadmap")
        items = public_response.json()
        updated_item = next((i for i in items if i["id"] == item_id), None)
        if updated_item:
            assert updated_item["title"] == "TEST_Updated_Title"
            assert updated_item["status"] == "IN_PROGRESS"
            print(f"Item {item_id} updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/roadmap/{item_id}", headers=admin_headers)
    
    def test_delete_roadmap_item(self, admin_headers):
        """Test deleting a roadmap item"""
        # Create item first
        item_data = {
            "title": f"TEST_Delete_Feature_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "status": "BACKLOG"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/roadmap", json=item_data, headers=admin_headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Delete the item
        delete_response = requests.delete(f"{BASE_URL}/api/admin/roadmap/{item_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        public_response = requests.get(f"{BASE_URL}/api/roadmap")
        items = public_response.json()
        deleted_item = next((i for i in items if i["id"] == item_id), None)
        assert deleted_item is None
        print(f"Item {item_id} deleted successfully")
    
    def test_delete_nonexistent_item(self, admin_headers):
        """Test deleting a non-existent item returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/roadmap/{fake_id}", headers=admin_headers)
        assert response.status_code == 404
        print("Non-existent item deletion correctly returns 404")
    
    def test_admin_roadmap_requires_auth(self):
        """Test admin roadmap endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/roadmap")
        assert response.status_code == 401
        print("Admin roadmap correctly requires authentication")


# ===== FEATURE 2: Player Search Tests =====

class TestPlayerSearch:
    """Test Player Search functionality"""
    
    def test_search_users_by_handle(self):
        """Test searching users by RSI handle"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": "Mowri"})
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "id" in user
            assert "handle" in user
            assert "rank" in user
            assert "reputation" in user
            print(f"Found user: {user['handle']} with rank {user['rank']}")
    
    def test_search_users_partial_match(self):
        """Test partial match search"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": "Mo"})
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"Partial search 'Mo' returned {len(data['users'])} users")
    
    def test_search_users_case_insensitive(self):
        """Test case-insensitive search"""
        response_lower = requests.get(f"{BASE_URL}/api/users/search", params={"q": "mowri"})
        response_upper = requests.get(f"{BASE_URL}/api/users/search", params={"q": "MOWRI"})
        
        assert response_lower.status_code == 200
        assert response_upper.status_code == 200
        
        # Both should return same results
        lower_users = response_lower.json()["users"]
        upper_users = response_upper.json()["users"]
        assert len(lower_users) == len(upper_users)
        print("Case-insensitive search working correctly")
    
    def test_search_users_empty_query(self):
        """Test empty query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["users"] == []
        print("Empty query correctly returns empty results")
    
    def test_search_users_short_query(self):
        """Test query less than 2 chars returns empty results"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": "a"})
        assert response.status_code == 200
        data = response.json()
        assert data["users"] == []
        print("Short query correctly returns empty results")
    
    def test_search_users_no_match(self):
        """Test search with no matching users"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": "ZZZZNONEXISTENT"})
        assert response.status_code == 200
        data = response.json()
        assert data["users"] == []
        print("No match search correctly returns empty results")
    
    def test_search_users_response_structure(self):
        """Test search response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"q": "Mowri"})
        assert response.status_code == 200
        data = response.json()
        
        if len(data["users"]) > 0:
            user = data["users"][0]
            # Verify required fields
            assert "id" in user
            assert "handle" in user
            assert "rank" in user
            assert "reputation" in user
            # Verify no sensitive data
            assert "password_hash" not in user
            assert "email" not in user
            print("Search response structure is correct")


# ===== FEATURE 4: Legal Pages Tests =====

class TestLegalPages:
    """Test Privacy Policy and Terms of Service routes"""
    
    def test_privacy_page_accessible(self):
        """Test privacy policy page is accessible (frontend route)"""
        # This is a frontend route, we just verify the frontend serves it
        response = requests.get(f"{BASE_URL.replace('/api', '')}/privacy", allow_redirects=True)
        # Frontend routes return HTML
        assert response.status_code == 200
        print("Privacy policy route accessible")
    
    def test_terms_page_accessible(self):
        """Test terms of service page is accessible (frontend route)"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}/terms", allow_redirects=True)
        assert response.status_code == 200
        print("Terms of service route accessible")


# ===== Cleanup =====

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(admin_token):
    """Cleanup any TEST_ prefixed roadmap items after all tests"""
    yield
    
    if admin_token:
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        # Get all roadmap items
        response = requests.get(f"{BASE_URL}/api/admin/roadmap", headers=headers)
        if response.status_code == 200:
            items = response.json()
            for item in items:
                if item.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/roadmap/{item['id']}", headers=headers)
                    print(f"Cleaned up test item: {item['title']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

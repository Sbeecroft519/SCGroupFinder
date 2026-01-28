"""
Test suite for NavCom new features:
1. Authentication required for all routes
2. Admin panel CRUD for goals
3. Notification settings
4. Roadmap/Goals endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "beecroft519@outlook.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"

# Test user credentials
TEST_EMAIL = "test_newfeatures@navcom.com"
TEST_PASSWORD = "testpass123"
TEST_RSI_HANDLE = "TEST_NewFeaturesTester"


class TestAuthenticationRequired:
    """Test that protected routes require authentication"""
    
    def test_intel_without_auth_returns_401(self):
        """Intel endpoint should work without auth (public)"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "cargo",
            "risk": "MEDIUM"
        })
        # Intel is public - should work
        assert response.status_code == 200
    
    def test_contracts_create_without_auth_returns_401(self):
        """Creating contracts requires authentication"""
        response = requests.post(f"{BASE_URL}/api/contracts", json={
            "type": "escort",
            "title": "Test Contract",
            "description": "Test description"
        })
        assert response.status_code == 401
    
    def test_notification_settings_without_auth_returns_401(self):
        """Notification settings require authentication"""
        response = requests.get(f"{BASE_URL}/api/user/notification-settings")
        assert response.status_code == 401
    
    def test_admin_routes_without_auth_returns_401(self):
        """Admin routes require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/goals")
        assert response.status_code == 401


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["rsi_handle"] == "Mowri"
    
    def test_admin_login_wrong_password(self):
        """Admin login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestAdminPanel:
    """Test admin panel CRUD operations for goals"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Get headers with admin auth"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_get_goals(self, admin_headers):
        """Admin can fetch all goals"""
        response = requests.get(f"{BASE_URL}/api/admin/goals", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_create_goal(self, admin_headers):
        """Admin can create a new goal"""
        response = requests.post(f"{BASE_URL}/api/admin/goals", headers=admin_headers, json={
            "title": "TEST_Goal_Creation",
            "description": "Test goal for automated testing",
            "target_amount": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Goal_Creation"
        assert data["target_amount"] == 100
        assert "id" in data
        return data["id"]
    
    def test_admin_update_goal(self, admin_headers):
        """Admin can update a goal"""
        # First create a goal
        create_response = requests.post(f"{BASE_URL}/api/admin/goals", headers=admin_headers, json={
            "title": "TEST_Goal_Update",
            "description": "Goal to be updated",
            "target_amount": 50
        })
        assert create_response.status_code == 200
        goal_id = create_response.json()["id"]
        
        # Update the goal
        update_response = requests.put(f"{BASE_URL}/api/admin/goals/{goal_id}", headers=admin_headers, json={
            "title": "TEST_Goal_Updated",
            "target_amount": 200
        })
        assert update_response.status_code == 200
        
        # Verify update
        goals_response = requests.get(f"{BASE_URL}/api/admin/goals", headers=admin_headers)
        goals = goals_response.json()
        updated_goal = next((g for g in goals if g["id"] == goal_id), None)
        assert updated_goal is not None
        assert updated_goal["title"] == "TEST_Goal_Updated"
        assert updated_goal["target_amount"] == 200
    
    def test_admin_delete_goal(self, admin_headers):
        """Admin can delete a goal"""
        # First create a goal
        create_response = requests.post(f"{BASE_URL}/api/admin/goals", headers=admin_headers, json={
            "title": "TEST_Goal_Delete",
            "description": "Goal to be deleted",
            "target_amount": 25
        })
        assert create_response.status_code == 200
        goal_id = create_response.json()["id"]
        
        # Delete the goal
        delete_response = requests.delete(f"{BASE_URL}/api/admin/goals/{goal_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        goals_response = requests.get(f"{BASE_URL}/api/admin/goals", headers=admin_headers)
        goals = goals_response.json()
        deleted_goal = next((g for g in goals if g["id"] == goal_id), None)
        assert deleted_goal is None
    
    def test_admin_get_contributions(self, admin_headers):
        """Admin can fetch contributions"""
        response = requests.get(f"{BASE_URL}/api/admin/contributions", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_admin_get_users(self, admin_headers):
        """Admin can fetch users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the admin user
        assert len(data) >= 1
        # Password hash should not be exposed
        for user in data:
            assert "password_hash" not in user
    
    def test_non_admin_cannot_access_admin_routes(self):
        """Non-admin users cannot access admin routes"""
        # First register a test user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_nonadmin@navcom.com",
            "password": "testpass123",
            "rsi_handle": "TEST_NonAdmin",
            "is_verified": True
        })
        
        if register_response.status_code == 200:
            # Login as test user
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test_nonadmin@navcom.com",
                "password": "testpass123"
            })
            
            if login_response.status_code == 200:
                token = login_response.json()["token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Try to access admin routes
                admin_response = requests.get(f"{BASE_URL}/api/admin/goals", headers=headers)
                assert admin_response.status_code == 403


class TestRoadmapGoals:
    """Test public roadmap/goals endpoints"""
    
    def test_get_goals_public(self):
        """Goals endpoint is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have default goals if none exist
        if len(data) > 0:
            goal = data[0]
            assert "id" in goal
            assert "title" in goal
            assert "description" in goal
            assert "target_amount" in goal
            assert "current_amount" in goal
            assert "backers" in goal
    
    def test_contribute_to_goal_requires_auth(self):
        """Contributing to a goal requires authentication"""
        # First get a goal ID
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        if len(goals) > 0:
            goal_id = goals[0]["id"]
            response = requests.post(f"{BASE_URL}/api/goals/{goal_id}/contribute", json={
                "goal_id": goal_id,
                "amount": 10
            })
            assert response.status_code == 401


class TestNotificationSettings:
    """Test notification settings endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get headers with auth"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_notification_settings(self, auth_headers):
        """User can get their notification settings"""
        response = requests.get(f"{BASE_URL}/api/user/notification-settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check default settings structure
        assert "websocket_enabled" in data or data == {}
    
    def test_update_notification_settings(self, auth_headers):
        """User can update their notification settings"""
        new_settings = {
            "websocket_enabled": True,
            "sound_enabled": False,
            "threat_alerts": True,
            "stability_alerts": False,
            "issue_alerts": True,
            "contract_alerts": True,
            "contract_types": ["escort", "rescue"]
        }
        
        response = requests.put(f"{BASE_URL}/api/user/notification-settings", 
                               headers=auth_headers, json=new_settings)
        assert response.status_code == 200
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/user/notification-settings", headers=auth_headers)
        assert get_response.status_code == 200
        saved_settings = get_response.json()
        assert saved_settings["sound_enabled"] == False
        assert saved_settings["stability_alerts"] == False
        assert "escort" in saved_settings.get("contract_types", [])


class TestAlertTickers:
    """Test alert ticker endpoints"""
    
    def test_get_alerts(self):
        """Alerts endpoint returns recent alerts"""
        response = requests.get(f"{BASE_URL}/api/signals/alerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# Cleanup test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_goals():
    """Cleanup TEST_ prefixed goals after all tests"""
    yield
    # Login as admin
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all goals
        goals_response = requests.get(f"{BASE_URL}/api/admin/goals", headers=headers)
        if goals_response.status_code == 200:
            goals = goals_response.json()
            for goal in goals:
                if goal.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/goals/{goal['id']}", headers=headers)

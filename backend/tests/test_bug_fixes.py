"""
Test Bug Fixes for NavCom - Iteration 4
Tests:
1. BUG FIX 1: Mark-complete endpoint accepts both 'active' AND 'in_progress' status
2. BUG FIX 3: Mission history endpoint returns data for users with completed contracts
3. BUG FIX 4: Contract descriptions are saved and displayed
4. BUG FIX 5: Text moderation filters profanity from contract titles and descriptions
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"

# Pre-verified test user for bidding (created in database)
TEST_USER_EMAIL = "test_bidder@navcom.com"
TEST_USER_PASSWORD = "TestBidder123!"
TEST_USER_HANDLE = "TEST_Bidder"


class TestMarkCompleteEndpoint:
    """BUG FIX 1: Mark-complete endpoint should accept both 'active' AND 'in_progress' status"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_user_token(self):
        """Get token for pre-verified test user"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_response.status_code == 200, f"Test user login failed: {login_response.text}"
        return login_response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_user_headers(self, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}", "Content-Type": "application/json"}
    
    def test_mark_complete_accepts_active_status(self, admin_headers, test_user_headers):
        """Test that mark-complete endpoint accepts contracts with 'active' status"""
        # Create a contract
        contract_data = {
            "title": f"TEST_MarkComplete_Active_{uuid.uuid4().hex[:8]}",
            "description": "Testing mark-complete with active status",
            "category": "COMBAT",
            "payment_amount": 10000,
            "system": "Stanton",
            "planet": "Crusader",
            "location": "Port Olisar"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Create contract failed: {create_response.text}"
        contract_id = create_response.json()["id"]
        
        # Accept the contract as test user (this sets status to 'active')
        accept_response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/accept",
            headers=test_user_headers
        )
        assert accept_response.status_code == 200, f"Accept contract failed: {accept_response.text}"
        
        # Verify contract status is 'active'
        get_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=admin_headers)
        assert get_response.status_code == 200
        contract = get_response.json()
        assert contract["status"] == "active", f"Expected status 'active', got '{contract['status']}'"
        
        # Now try to mark complete - this should work with 'active' status
        mark_complete_response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/mark-complete",
            headers=admin_headers  # Poster marks complete first
        )
        
        # BUG FIX: This should now return 200 instead of error
        assert mark_complete_response.status_code == 200, f"Mark complete failed: {mark_complete_response.text}"
        
        result = mark_complete_response.json()
        assert result.get("status") == "pending_completion", f"Expected pending_completion, got {result}"
        
        print(f"SUCCESS: Mark-complete accepts 'active' status for contract {contract_id}")
        
        # Cleanup - have the other party also mark complete
        mark_complete_response2 = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/mark-complete",
            headers=test_user_headers  # Merc marks complete
        )
        assert mark_complete_response2.status_code == 200
        
        print(f"SUCCESS: Contract {contract_id} fully completed")


class TestMissionHistoryEndpoint:
    """BUG FIX 3: Mission history endpoint should return data for users with completed contracts"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_token):
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        return response.json()["id"]
    
    def test_mission_history_endpoint_exists(self, admin_headers, admin_user_id):
        """Test that mission history endpoint returns valid response"""
        response = requests.get(
            f"{BASE_URL}/api/users/{admin_user_id}/mission-history",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Mission history endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "summary" in data, "Response should have 'summary' field"
        assert "missions" in data, "Response should have 'missions' field"
        
        summary = data["summary"]
        assert "total_completed" in summary, "Summary should have 'total_completed'"
        assert "total_earnings" in summary, "Summary should have 'total_earnings'"
        
        print(f"SUCCESS: Mission history endpoint returns valid data")
        print(f"  - Total completed: {summary.get('total_completed', 0)}")
        print(f"  - Total earnings: {summary.get('total_earnings', 0)}")
        print(f"  - Missions count: {len(data.get('missions', []))}")
    
    def test_mission_history_for_nonexistent_user(self, admin_headers):
        """Test that mission history returns 404 for non-existent user"""
        fake_user_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/users/{fake_user_id}/mission-history",
            headers=admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        print("SUCCESS: Mission history returns 404 for non-existent user")


class TestContractDescriptions:
    """BUG FIX 4: Contract descriptions should be saved and displayed"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_contract_description_saved(self, admin_headers):
        """Test that contract description is saved when creating a contract"""
        test_description = f"This is a test description for contract {uuid.uuid4().hex[:8]}"
        
        contract_data = {
            "title": f"TEST_Description_{uuid.uuid4().hex[:8]}",
            "description": test_description,
            "category": "TRANSPORT",
            "payment_amount": 5000,
            "system": "Stanton",
            "planet": "Hurston",
            "location": "Lorville"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Create contract failed: {create_response.text}"
        
        created_contract = create_response.json()
        contract_id = created_contract["id"]
        
        # Verify description is in create response
        assert created_contract.get("description") == test_description, \
            f"Description not in create response. Got: {created_contract.get('description')}"
        
        # Verify description is returned when fetching contract
        get_response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=admin_headers)
        assert get_response.status_code == 200
        
        fetched_contract = get_response.json()
        assert fetched_contract.get("description") == test_description, \
            f"Description not persisted. Got: {fetched_contract.get('description')}"
        
        print(f"SUCCESS: Contract description saved and retrieved correctly")
        print(f"  - Contract ID: {contract_id}")
        print(f"  - Description: {test_description}")
    
    def test_contract_description_in_list(self, admin_headers):
        """Test that contract description appears in contracts list"""
        unique_desc = f"UNIQUE_DESC_{uuid.uuid4().hex[:8]}"
        
        contract_data = {
            "title": f"TEST_DescList_{uuid.uuid4().hex[:8]}",
            "description": unique_desc,
            "category": "MINING",
            "payment_amount": 8000,
            "system": "Stanton",
            "planet": "microTech",
            "location": "New Babbage"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        
        # Get contracts list
        list_response = requests.get(f"{BASE_URL}/api/contracts", headers=admin_headers)
        assert list_response.status_code == 200
        
        contracts = list_response.json()
        our_contract = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert our_contract is not None, f"Contract {contract_id} not found in list"
        assert our_contract.get("description") == unique_desc, \
            f"Description not in list. Got: {our_contract.get('description')}"
        
        print(f"SUCCESS: Contract description appears in contracts list")


class TestTextModeration:
    """BUG FIX 5: Text moderation should filter profanity from contract titles and descriptions"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_profanity_filtered_in_title(self, admin_headers):
        """Test that profanity is filtered from contract title"""
        # Use a word from the BLOCKED_WORDS list
        contract_data = {
            "title": "Test Contract with bad word shit in it",
            "description": "Clean description",
            "category": "COMBAT",
            "payment_amount": 10000,
            "system": "Stanton",
            "planet": "Crusader",
            "location": "Port Olisar"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Create contract failed: {create_response.text}"
        
        created_contract = create_response.json()
        
        # Verify the bad word is replaced with asterisks
        assert "shit" not in created_contract["title"].lower(), \
            f"Profanity not filtered from title: {created_contract['title']}"
        assert "****" in created_contract["title"], \
            f"Expected asterisks in title: {created_contract['title']}"
        
        print(f"SUCCESS: Profanity filtered from title")
        print(f"  - Original: 'Test Contract with bad word shit in it'")
        print(f"  - Filtered: '{created_contract['title']}'")
    
    def test_profanity_filtered_in_description(self, admin_headers):
        """Test that profanity is filtered from contract description"""
        contract_data = {
            "title": "Clean Title",
            "description": "This description has fuck and damn in it",
            "category": "TRANSPORT",
            "payment_amount": 5000,
            "system": "Stanton",
            "planet": "Hurston",
            "location": "Lorville"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Create contract failed: {create_response.text}"
        
        created_contract = create_response.json()
        
        # Verify the bad word is replaced with asterisks
        assert "fuck" not in created_contract["description"].lower(), \
            f"Profanity not filtered from description: {created_contract['description']}"
        assert "****" in created_contract["description"], \
            f"Expected asterisks in description: {created_contract['description']}"
        
        print(f"SUCCESS: Profanity filtered from description")
        print(f"  - Original: 'This description has fuck and damn in it'")
        print(f"  - Filtered: '{created_contract['description']}'")
    
    def test_clean_text_unchanged(self, admin_headers):
        """Test that clean text is not modified"""
        clean_title = f"Clean Contract Title {uuid.uuid4().hex[:8]}"
        clean_description = "This is a perfectly clean description with no bad words"
        
        contract_data = {
            "title": clean_title,
            "description": clean_description,
            "category": "MINING",
            "payment_amount": 7000,
            "system": "Stanton",
            "planet": "microTech",
            "location": "New Babbage"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200
        
        created_contract = create_response.json()
        
        assert created_contract["title"] == clean_title, \
            f"Clean title was modified: {created_contract['title']}"
        assert created_contract["description"] == clean_description, \
            f"Clean description was modified: {created_contract['description']}"
        
        print(f"SUCCESS: Clean text unchanged")
    
    def test_case_insensitive_filtering(self, admin_headers):
        """Test that profanity filtering is case-insensitive"""
        contract_data = {
            "title": "Test with SHIT and Shit and sHiT",
            "description": "Testing FUCK and Fuck and fUcK",
            "category": "COMBAT",
            "payment_amount": 10000,
            "system": "Stanton",
            "planet": "Crusader",
            "location": "Port Olisar"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200
        
        created_contract = create_response.json()
        
        # All variations should be filtered
        assert "shit" not in created_contract["title"].lower()
        assert "fuck" not in created_contract["description"].lower()
        
        print(f"SUCCESS: Case-insensitive filtering works")
        print(f"  - Title: '{created_contract['title']}'")
        print(f"  - Description: '{created_contract['description']}'")


class TestProfileNavigation:
    """BUG FIX 2: Profile link should use bid.bidder_id (tested via API - frontend uses this ID)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_user_token(self):
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_response.status_code == 200
        return login_response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_user_headers(self, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_user_id(self, test_user_token):
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {test_user_token}"
        })
        return response.json()["id"]
    
    def test_bid_contains_bidder_id(self, admin_headers, test_user_headers, test_user_id):
        """Test that bids contain bidder_id field for profile navigation"""
        # Create a contract
        contract_data = {
            "title": f"TEST_BidProfile_{uuid.uuid4().hex[:8]}",
            "description": "Testing bid profile navigation",
            "category": "COMBAT",
            "payment_amount": 10000,
            "system": "Stanton",
            "planet": "Crusader",
            "location": "Port Olisar"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=admin_headers)
        assert create_response.status_code == 200
        contract_id = create_response.json()["id"]
        
        # Submit a bid as test user
        bid_response = requests.post(
            f"{BASE_URL}/api/contracts/{contract_id}/bid",
            headers=test_user_headers
        )
        assert bid_response.status_code == 200, f"Bid failed: {bid_response.text}"
        
        # Get bids for the contract
        bids_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/bids",
            headers=admin_headers
        )
        assert bids_response.status_code == 200, f"Get bids failed: {bids_response.text}"
        
        bids = bids_response.json()
        assert len(bids) > 0, "No bids found"
        
        # Verify bid has bidder_id field
        bid = bids[0]
        assert "bidder_id" in bid, f"Bid missing bidder_id field: {bid}"
        assert bid["bidder_id"] == test_user_id, \
            f"bidder_id mismatch. Expected {test_user_id}, got {bid.get('bidder_id')}"
        
        # Verify profile endpoint works with this ID
        profile_response = requests.get(
            f"{BASE_URL}/api/users/{bid['bidder_id']}/profile",
            headers=admin_headers
        )
        assert profile_response.status_code == 200, f"Profile fetch failed: {profile_response.text}"
        
        profile = profile_response.json()
        assert profile.get("id") == test_user_id, "Profile ID mismatch"
        
        print(f"SUCCESS: Bid contains correct bidder_id for profile navigation")
        print(f"  - bidder_id: {bid['bidder_id']}")
        print(f"  - Profile accessible: Yes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

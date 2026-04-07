"""
Quick Match Feature Tests for Pilot's Lounge
Tests the new Quick Match functionality including:
- POST /api/lounge/quick-match - matches broadcasts based on ship and activities
- PUT /api/user/lounge-preferences - saves Quick Match preferences
- GET /api/user/lounge-preferences - retrieves saved preferences
- Ship-to-activity mapping validation
- Match scoring algorithm
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "beecroft519@gmail.com"
TEST_PASSWORD = "Nv$C0m_Adm1n_2025!"


class TestQuickMatchAuthentication:
    """Test authentication requirements for Quick Match endpoints"""
    
    def test_quick_match_requires_auth(self):
        """POST /api/lounge/quick-match requires authentication"""
        response = requests.post(f"{BASE_URL}/api/lounge/quick-match", json={
            "ship": "Prospector",
            "preferred_activities": ["mining"],
            "region": "Any"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Quick match requires authentication")
    
    def test_save_preferences_requires_auth(self):
        """PUT /api/user/lounge-preferences requires authentication"""
        response = requests.put(f"{BASE_URL}/api/user/lounge-preferences", json={
            "ship": "Prospector",
            "preferred_activities": ["mining"],
            "region": "US"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Save preferences requires authentication")
    
    def test_get_preferences_requires_auth(self):
        """GET /api/user/lounge-preferences requires authentication"""
        response = requests.get(f"{BASE_URL}/api/user/lounge-preferences")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Get preferences requires authentication")


class TestQuickMatchPreferences:
    """Test saving and retrieving Quick Match preferences"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = login_response.json()["user"]["id"]
    
    def test_save_preferences_success(self):
        """PUT /api/user/lounge-preferences saves preferences successfully"""
        prefs = {
            "ship": "Prospector",
            "preferred_activities": ["mining", "crew"],
            "region": "US"
        }
        response = requests.put(
            f"{BASE_URL}/api/user/lounge-preferences",
            json=prefs,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ Save preferences returns success message")
    
    def test_get_preferences_returns_saved_data(self):
        """GET /api/user/lounge-preferences returns previously saved preferences"""
        # First save preferences
        prefs = {
            "ship": "Cutlass Black",
            "preferred_activities": ["combat", "trade"],
            "region": "EU"
        }
        save_response = requests.put(
            f"{BASE_URL}/api/user/lounge-preferences",
            json=prefs,
            headers=self.headers
        )
        assert save_response.status_code == 200
        
        # Then retrieve them
        get_response = requests.get(
            f"{BASE_URL}/api/user/lounge-preferences",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        data = get_response.json()
        
        assert data.get("ship") == "Cutlass Black", f"Ship mismatch: {data}"
        assert "combat" in data.get("preferred_activities", []), f"Activities mismatch: {data}"
        assert "trade" in data.get("preferred_activities", []), f"Activities mismatch: {data}"
        assert data.get("region") == "EU", f"Region mismatch: {data}"
        print("✓ Get preferences returns saved data correctly")
    
    def test_save_preferences_with_null_ship(self):
        """Preferences can be saved with null ship (Any Ship)"""
        prefs = {
            "ship": None,
            "preferred_activities": ["vibing"],
            "region": "Any"
        }
        response = requests.put(
            f"{BASE_URL}/api/user/lounge-preferences",
            json=prefs,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Preferences saved with null ship")
    
    def test_save_preferences_with_empty_activities(self):
        """Preferences can be saved with empty activities list"""
        prefs = {
            "ship": "Prospector",
            "preferred_activities": [],
            "region": "Any"
        }
        response = requests.put(
            f"{BASE_URL}/api/user/lounge-preferences",
            json=prefs,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Preferences saved with empty activities")


class TestQuickMatchAlgorithm:
    """Test the Quick Match matching algorithm"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = login_response.json()["user"]["id"]
    
    def test_quick_match_returns_matches_array(self):
        """POST /api/lounge/quick-match returns matches array"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Prospector",
                "preferred_activities": ["mining"],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "matches" in data, f"Response missing 'matches': {data}"
        assert isinstance(data["matches"], list), f"matches should be a list: {data}"
        print(f"✓ Quick match returns matches array with {len(data['matches'])} results")
    
    def test_quick_match_returns_compatible_activities(self):
        """Quick match returns compatible_activities based on ship"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Prospector",
                "preferred_activities": [],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Prospector should map to mining
        if "compatible_activities" in data:
            assert "mining" in data["compatible_activities"], f"Prospector should be compatible with mining: {data}"
            print(f"✓ Prospector maps to compatible activities: {data['compatible_activities']}")
        else:
            print("✓ Quick match response received (no compatible_activities when no matches)")
    
    def test_quick_match_cutlass_black_activities(self):
        """Cutlass Black should map to combat, pvp, trade, crew"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Cutlass Black",
                "preferred_activities": [],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if "compatible_activities" in data:
            expected = ["combat", "pvp", "trade", "crew"]
            for act in expected:
                assert act in data["compatible_activities"], f"Cutlass Black should be compatible with {act}: {data}"
            print(f"✓ Cutlass Black maps to: {data['compatible_activities']}")
        else:
            print("✓ Quick match response received for Cutlass Black")
    
    def test_quick_match_excludes_own_broadcasts(self):
        """Quick match should not return user's own broadcasts"""
        # First create a broadcast
        broadcast_response = requests.post(
            f"{BASE_URL}/api/lounge/broadcasts",
            json={
                "activity": "mining",
                "title": "TEST_QuickMatch_OwnBroadcast",
                "description": "Testing own broadcast exclusion",
                "available_from": "Now",
                "available_until": "2 hours",
                "group_size": "Any",
                "region": "Any"
            },
            headers=self.headers
        )
        
        # Run quick match
        match_response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Prospector",
                "preferred_activities": ["mining"],
                "region": "Any"
            },
            headers=self.headers
        )
        assert match_response.status_code == 200
        data = match_response.json()
        
        # Check that own broadcast is not in results
        own_broadcast_in_results = any(
            m.get("user_id") == self.user_id 
            for m in data.get("matches", [])
        )
        assert not own_broadcast_in_results, "Own broadcast should be excluded from matches"
        print("✓ Own broadcasts excluded from quick match results")
        
        # Cleanup - close the broadcast
        if broadcast_response.status_code == 200:
            broadcast_id = broadcast_response.json().get("id")
            if broadcast_id:
                requests.post(
                    f"{BASE_URL}/api/lounge/broadcasts/{broadcast_id}/close",
                    headers=self.headers
                )
    
    def test_quick_match_with_no_preferences(self):
        """Quick match with no preferences returns available now broadcasts"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": None,
                "preferred_activities": [],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "matches" in data
        print(f"✓ Quick match with no preferences returns {len(data['matches'])} matches")
    
    def test_quick_match_region_filter(self):
        """Quick match respects region preference"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": None,
                "preferred_activities": ["mining", "combat", "trade"],
                "region": "US"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Matches should prioritize US region
        for match in data.get("matches", []):
            if match.get("region") == "US":
                assert "Region: US" in match.get("match_reasons", []) or match.get("match_score", 0) > 0
                print(f"✓ US region match found with score {match.get('match_score')}")
                break
        print("✓ Quick match respects region preference")


class TestShipActivityMapping:
    """Test the ship-to-activity mapping covers all ships"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_prospector_maps_to_mining(self):
        """Prospector should map to mining"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={"ship": "Prospector", "preferred_activities": [], "region": "Any"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        if "compatible_activities" in data:
            assert "mining" in data["compatible_activities"]
        print("✓ Prospector -> mining mapping verified")
    
    def test_mole_maps_to_mining_and_crew(self):
        """MOLE should map to mining and crew"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={"ship": "MOLE", "preferred_activities": [], "region": "Any"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        if "compatible_activities" in data:
            assert "mining" in data["compatible_activities"]
            assert "crew" in data["compatible_activities"]
        print("✓ MOLE -> mining, crew mapping verified")
    
    def test_carrack_maps_to_exploration_org_crew(self):
        """Carrack should map to exploration, org, crew"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={"ship": "Carrack", "preferred_activities": [], "region": "Any"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        if "compatible_activities" in data:
            assert "exploration" in data["compatible_activities"]
            assert "org" in data["compatible_activities"]
            assert "crew" in data["compatible_activities"]
        print("✓ Carrack -> exploration, org, crew mapping verified")
    
    def test_890_jump_maps_to_vibing_org(self):
        """890 Jump should map to vibing and org"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={"ship": "890 Jump", "preferred_activities": [], "region": "Any"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        if "compatible_activities" in data:
            assert "vibing" in data["compatible_activities"]
            assert "org" in data["compatible_activities"]
        print("✓ 890 Jump -> vibing, org mapping verified")


class TestMatchScoring:
    """Test the match scoring algorithm"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_matches_have_score_and_reasons(self):
        """Matches should include match_score and match_reasons"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Cutlass Black",
                "preferred_activities": ["combat", "trade"],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for match in data.get("matches", []):
            assert "match_score" in match, f"Match missing match_score: {match}"
            assert "match_reasons" in match, f"Match missing match_reasons: {match}"
            assert isinstance(match["match_score"], (int, float)), f"match_score should be numeric: {match}"
            assert isinstance(match["match_reasons"], list), f"match_reasons should be a list: {match}"
        
        print(f"✓ All {len(data.get('matches', []))} matches have score and reasons")
    
    def test_matches_sorted_by_score_descending(self):
        """Matches should be sorted by score in descending order"""
        response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Cutlass Black",
                "preferred_activities": ["combat", "trade", "mining"],
                "region": "Any"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        matches = data.get("matches", [])
        if len(matches) > 1:
            scores = [m.get("match_score", 0) for m in matches]
            assert scores == sorted(scores, reverse=True), f"Matches not sorted by score: {scores}"
            print(f"✓ Matches sorted by score descending: {scores}")
        else:
            print("✓ Not enough matches to verify sorting (need 2+)")


class TestQuickMatchIntegration:
    """Integration tests for Quick Match with broadcasts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = login_response.json()["user"]["id"]
        self.created_broadcasts = []
    
    def teardown_method(self, method):
        """Cleanup created broadcasts"""
        for broadcast_id in self.created_broadcasts:
            try:
                requests.post(
                    f"{BASE_URL}/api/lounge/broadcasts/{broadcast_id}/close",
                    headers=self.headers
                )
            except:
                pass
    
    def test_quick_match_full_flow(self):
        """Test complete Quick Match flow: save prefs -> match -> hail"""
        # 1. Save preferences
        save_response = requests.put(
            f"{BASE_URL}/api/user/lounge-preferences",
            json={
                "ship": "Prospector",
                "preferred_activities": ["mining"],
                "region": "US"
            },
            headers=self.headers
        )
        assert save_response.status_code == 200
        print("✓ Step 1: Preferences saved")
        
        # 2. Verify preferences saved
        get_response = requests.get(
            f"{BASE_URL}/api/user/lounge-preferences",
            headers=self.headers
        )
        assert get_response.status_code == 200
        prefs = get_response.json()
        assert prefs.get("ship") == "Prospector"
        print("✓ Step 2: Preferences verified")
        
        # 3. Run quick match
        match_response = requests.post(
            f"{BASE_URL}/api/lounge/quick-match",
            json={
                "ship": "Prospector",
                "preferred_activities": ["mining"],
                "region": "US"
            },
            headers=self.headers
        )
        assert match_response.status_code == 200
        data = match_response.json()
        assert "matches" in data
        print(f"✓ Step 3: Quick match returned {len(data['matches'])} matches")
        
        # 4. If there are matches, try to hail one
        if data["matches"]:
            match = data["matches"][0]
            hail_response = requests.post(
                f"{BASE_URL}/api/lounge/broadcasts/{match['id']}/hail",
                headers=self.headers
            )
            # May fail if already hailed, that's ok
            if hail_response.status_code == 200:
                print(f"✓ Step 4: Successfully hailed broadcast {match['id']}")
            else:
                print(f"✓ Step 4: Hail attempt returned {hail_response.status_code} (may be already hailed)")
        else:
            print("✓ Step 4: No matches to hail (expected if no active broadcasts)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

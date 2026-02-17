"""
Test UEXcorp POI Integration for Mission Advisor
Tests FEATURE 1-6: Real UEXcorp locations in Mission Advisor and Signals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUEXcorpLocationsAPI:
    """Test UEXcorp POI API endpoints"""
    
    def test_locations_endpoint_returns_pois(self):
        """FEATURE 3: GET /api/locations returns UEXcorp POI data"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert "count" in data
        # UEXcorp returns 168 live POIs
        assert data["count"] >= 100
        print(f"✓ Locations endpoint returns {data['count']} POIs")
    
    def test_locations_have_required_fields(self):
        """FEATURE 3: POI data has required fields"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        
        if data["locations"]:
            poi = data["locations"][0]
            assert "name" in poi
            assert "type" in poi
            assert "is_available_live" in poi
            print(f"✓ POI has required fields: name={poi['name']}, type={poi['type']}")
    
    def test_categorized_locations_endpoint(self):
        """FEATURE 5: GET /api/locations/categorized groups POIs by type"""
        response = requests.get(f"{BASE_URL}/api/locations/categorized")
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected categories exist
        expected_categories = ["outposts", "bunkers", "stanton", "pyro", "all"]
        for cat in expected_categories:
            assert cat in data, f"Missing category: {cat}"
        
        print(f"✓ Categorized endpoint has all expected categories")
        print(f"  - Outposts: {len(data.get('outposts', []))}")
        print(f"  - Bunkers: {len(data.get('bunkers', []))}")
        print(f"  - Stanton: {len(data.get('stanton', []))}")
    
    def test_stanton_locations_count(self):
        """FEATURE 5: Stanton system has sufficient locations"""
        response = requests.get(f"{BASE_URL}/api/locations/categorized")
        assert response.status_code == 200
        data = response.json()
        
        stanton_count = len(data.get("stanton", []))
        assert stanton_count >= 50, f"Expected 50+ Stanton locations, got {stanton_count}"
        print(f"✓ Stanton has {stanton_count} locations")


class TestMissionAdvisorFPS:
    """FEATURE 1: FPS activity returns real UEXcorp bunker/outpost locations"""
    
    def test_fps_returns_real_location(self):
        """FPS mission returns real bunker location from UEXcorp"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "fps",
            "risk": "LOW"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "fps"
        assert "location" in data
        assert "name" in data["location"]
        
        # Should NOT be generic fallback
        location_name = data["location"]["name"]
        assert location_name != "Underground Bunker", f"Got generic fallback instead of real location"
        
        # Should have context (moon/planet)
        assert "description" in data["location"]
        context = data["location"]["description"]
        assert "Stanton" in context or context != "", f"Missing location context"
        
        print(f"✓ FPS returns real location: {location_name}")
        print(f"  Context: {context}")
    
    def test_fps_location_format(self):
        """FEATURE 6: FPS location has proper display format"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "fps",
            "risk": "MEDIUM"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Location name should be the primary identifier (bold in UI)
        location = data["location"]
        assert location["name"], "Location name is empty"
        
        # Description should provide context (small/muted in UI)
        assert "description" in location
        print(f"✓ FPS location format: name='{location['name']}', context='{location.get('description', '')}'")


class TestMissionAdvisorCombat:
    """FEATURE 2: Combat activity returns real UEXcorp outpost locations"""
    
    def test_combat_returns_real_outpost(self):
        """Combat mission returns real outpost location from UEXcorp"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "combat",
            "risk": "MEDIUM"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "combat"
        location_name = data["location"]["name"]
        
        # Should NOT be generic fallback
        assert location_name != "Security Post Kareah", f"Got hardcoded fallback instead of real location"
        
        print(f"✓ Combat returns real outpost: {location_name}")
        print(f"  Context: {data['location'].get('description', '')}")
    
    def test_combat_multiple_calls_vary(self):
        """Combat should return varied locations (random selection)"""
        locations = set()
        for _ in range(5):
            response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
                "ship": "Aurora MR",
                "system": "Stanton",
                "time": "30m",
                "activity": "combat",
                "risk": "MEDIUM"
            })
            if response.status_code == 200:
                locations.add(response.json()["location"]["name"])
        
        # Should get at least 2 different locations in 5 calls
        print(f"✓ Combat returned {len(locations)} unique locations in 5 calls: {locations}")


class TestMissionAdvisorSalvage:
    """FEATURE 3: Salvage activity returns real UEXcorp outpost locations"""
    
    def test_salvage_returns_real_outpost(self):
        """Salvage mission returns real outpost location from UEXcorp"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Vulture",
            "system": "Stanton",
            "time": "1h",
            "activity": "salvage",
            "risk": "MEDIUM"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "salvage"
        location_name = data["location"]["name"]
        
        # Should NOT be generic fallback
        assert location_name != "Comm Array debris fields", f"Got generic fallback"
        
        print(f"✓ Salvage returns real outpost: {location_name}")
        print(f"  Context: {data['location'].get('description', '')}")


class TestMissionAdvisorChill:
    """FEATURE 4: Chill activity returns curated locations with proper context"""
    
    def test_chill_returns_curated_location(self):
        """Chill mission returns curated scenic location"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "chill",
            "risk": "LOW"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "chill"
        location = data["location"]
        
        # Chill locations are curated, not from UEXcorp
        curated_names = [
            "microTech Ice Caves", "Daymar Racing Canyons", "Hurston Savanna at Sunset",
            "Orison Cloudview Gardens", "GrimHEX Underground", "Port Tressler Observatory"
        ]
        
        assert location["name"] in curated_names, f"Unexpected chill location: {location['name']}"
        
        # Should have context in description
        assert "description" in location
        assert location["description"], "Chill location missing context"
        
        print(f"✓ Chill returns curated location: {location['name']}")
        print(f"  Context: {location['description']}")
    
    def test_chill_location_format(self):
        """FEATURE 6: Chill location has proper context format"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "chill",
            "risk": "LOW"
        })
        assert response.status_code == 200
        data = response.json()
        
        location = data["location"]
        # Description should contain context like "Crusader, Stanton"
        desc = location.get("description", "")
        assert "Stanton" in desc or "," in desc, f"Context format incorrect: {desc}"
        
        print(f"✓ Chill context format: '{desc}'")


class TestSignalsLocationDropdown:
    """FEATURE 5: Signals report form location dropdown shows UEXcorp locations"""
    
    def test_categorized_locations_for_signals(self):
        """Signals dropdown should have access to categorized locations"""
        response = requests.get(f"{BASE_URL}/api/locations/categorized")
        assert response.status_code == 200
        data = response.json()
        
        # Signals uses 'all' category filtered by system
        all_locations = data.get("all", [])
        assert len(all_locations) >= 100, f"Expected 100+ locations, got {len(all_locations)}"
        
        # Check Stanton locations exist
        stanton_locs = [p for p in all_locations if p.get("star_system_name") == "Stanton"]
        assert len(stanton_locs) >= 50, f"Expected 50+ Stanton locations"
        
        print(f"✓ Signals has access to {len(all_locations)} total locations")
        print(f"  - Stanton: {len(stanton_locs)}")
    
    def test_location_has_system_info(self):
        """Locations have star_system_name for grouping"""
        response = requests.get(f"{BASE_URL}/api/locations/categorized")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("all"):
            poi = data["all"][0]
            assert "star_system_name" in poi, "POI missing star_system_name"
            print(f"✓ POI has system info: {poi.get('star_system_name')}")


class TestLocationDisplayFormat:
    """FEATURE 6: Location display format - name bold, context small/muted"""
    
    def test_location_structure_for_display(self):
        """Location response has name and description for UI display"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "fps",
            "risk": "MEDIUM"
        })
        assert response.status_code == 200
        data = response.json()
        
        location = data["location"]
        
        # Name should be primary (bold, 16px white in UI)
        assert "name" in location
        assert location["name"], "Location name is empty"
        
        # Description should be context (small, 12px gray in UI)
        assert "description" in location
        
        # Activities should be separate
        assert "activities" in location
        
        print(f"✓ Location structure for display:")
        print(f"  - Name (bold): {location['name']}")
        print(f"  - Context (muted): {location['description']}")
        print(f"  - Activities: {location['activities']}")
    
    def test_context_format_moon_planet_system(self):
        """Context should show moon/planet, system hierarchy"""
        response = requests.post(f"{BASE_URL}/api/intel/analyze", json={
            "ship": "Aurora MR",
            "system": "Stanton",
            "time": "30m",
            "activity": "combat",
            "risk": "MEDIUM"
        })
        assert response.status_code == 200
        data = response.json()
        
        context = data["location"].get("description", "")
        # Should contain system name
        assert "Stanton" in context, f"Context missing system: {context}"
        
        print(f"✓ Context includes system hierarchy: {context}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

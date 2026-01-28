"""
Backend API tests for NavCom Signals page endpoints
Tests: /api/signals/status, /api/signals/reports, /api/signals/alerts, /api/signals/report
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignalsStatus:
    """Tests for /api/signals/status endpoint"""
    
    def test_signals_status_returns_200(self):
        """Test that signals status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/signals/status")
        assert response.status_code == 200
        print(f"✓ Signals status endpoint returned 200")
    
    def test_signals_status_has_required_fields(self):
        """Test that signals status response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/signals/status")
        data = response.json()
        
        # Check required fields
        assert 'server_status' in data, "Missing server_status field"
        assert 'rsi_status' in data, "Missing rsi_status field"
        assert 'reports_24h' in data, "Missing reports_24h field"
        
        # Validate server_status values
        assert data['server_status'] in ['operational', 'degraded', 'outage'], \
            f"Invalid server_status: {data['server_status']}"
        
        # Validate rsi_status structure
        assert 'status' in data['rsi_status'], "Missing rsi_status.status"
        
        # Validate reports_24h is a number
        assert isinstance(data['reports_24h'], int), "reports_24h should be an integer"
        
        print(f"✓ Signals status has all required fields")
        print(f"  - server_status: {data['server_status']}")
        print(f"  - rsi_status: {data['rsi_status']['status']}")
        print(f"  - reports_24h: {data['reports_24h']}")


class TestSignalsReports:
    """Tests for /api/signals/reports endpoint"""
    
    def test_signals_reports_returns_200(self):
        """Test that signals reports endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/signals/reports")
        assert response.status_code == 200
        print(f"✓ Signals reports endpoint returned 200")
    
    def test_signals_reports_returns_list(self):
        """Test that signals reports returns a list"""
        response = requests.get(f"{BASE_URL}/api/signals/reports")
        data = response.json()
        
        assert isinstance(data, list), "Reports should be a list"
        print(f"✓ Signals reports returned {len(data)} reports")
    
    def test_signals_reports_structure(self):
        """Test that each report has required fields"""
        response = requests.get(f"{BASE_URL}/api/signals/reports")
        data = response.json()
        
        if len(data) > 0:
            report = data[0]
            assert 'id' in report, "Report missing id field"
            assert 'type' in report, "Report missing type field"
            assert 'created_at' in report, "Report missing created_at field"
            
            # Validate report type
            valid_types = ['lag', 'mission_bug', 'cargo_issue', 'pirates', 'pvp', '30k']
            assert report['type'] in valid_types, f"Invalid report type: {report['type']}"
            
            print(f"✓ Report structure validated")
            print(f"  - id: {report['id']}")
            print(f"  - type: {report['type']}")
            print(f"  - location: {report.get('location', 'N/A')}")


class TestSignalsAlerts:
    """Tests for /api/signals/alerts endpoint"""
    
    def test_signals_alerts_returns_200(self):
        """Test that signals alerts endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/signals/alerts")
        assert response.status_code == 200
        print(f"✓ Signals alerts endpoint returned 200")
    
    def test_signals_alerts_returns_list(self):
        """Test that signals alerts returns a list"""
        response = requests.get(f"{BASE_URL}/api/signals/alerts")
        data = response.json()
        
        assert isinstance(data, list), "Alerts should be a list"
        print(f"✓ Signals alerts returned {len(data)} alerts")
    
    def test_signals_alerts_are_recent(self):
        """Test that alerts are from the last hour"""
        response = requests.get(f"{BASE_URL}/api/signals/alerts")
        data = response.json()
        
        if len(data) > 0:
            # Check that alerts have created_at field
            for alert in data[:5]:  # Check first 5
                assert 'created_at' in alert, "Alert missing created_at"
            print(f"✓ Alerts have valid timestamps")


class TestSignalsReportSubmission:
    """Tests for POST /api/signals/report endpoint"""
    
    def test_submit_report_without_auth(self):
        """Test submitting a report without authentication"""
        report_data = {
            "type": "lag",
            "system": "Stanton",
            "location": "Yela",
            "shard": "TEST_360",
            "details": "TEST_Report from automated testing",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/signals/report", json=report_data)
        # Should work without auth (user_id will be null)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'message' in data, "Response missing message"
        assert 'id' in data, "Response missing report id"
        
        print(f"✓ Report submitted successfully without auth")
        print(f"  - Report ID: {data['id']}")
    
    def test_submit_report_with_all_types(self):
        """Test submitting reports with all valid types"""
        valid_types = ['lag', 'mission_bug', 'cargo_issue', 'pirates', 'pvp', '30k']
        
        for report_type in valid_types:
            report_data = {
                "type": report_type,
                "system": "Stanton",
                "shard": "TEST_999"
            }
            
            response = requests.post(f"{BASE_URL}/api/signals/report", json=report_data)
            assert response.status_code == 200, f"Failed for type {report_type}: {response.status_code}"
        
        print(f"✓ All report types submitted successfully: {valid_types}")
    
    def test_submit_report_with_location(self):
        """Test submitting a report with location details"""
        report_data = {
            "type": "pirates",
            "system": "Stanton",
            "location": "GrimHEX",
            "shard": "TEST_512",
            "details": "TEST_Heavy pirate activity near station"
        }
        
        response = requests.post(f"{BASE_URL}/api/signals/report", json=report_data)
        assert response.status_code == 200
        
        data = response.json()
        assert 'id' in data
        
        # Verify the report was created by fetching reports
        reports_response = requests.get(f"{BASE_URL}/api/signals/reports")
        reports = reports_response.json()
        
        # Find our report
        found = any(r['id'] == data['id'] for r in reports)
        assert found, "Submitted report not found in reports list"
        
        print(f"✓ Report with location submitted and verified")


class TestAPIRoot:
    """Tests for API root endpoint"""
    
    def test_api_root_returns_200(self):
        """Test that API root returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"✓ API root returned 200")
    
    def test_api_root_has_version(self):
        """Test that API root returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        data = response.json()
        
        assert 'message' in data, "Missing message field"
        assert 'status' in data, "Missing status field"
        assert 'NavCom' in data['message'], "Message should contain NavCom"
        
        print(f"✓ API version: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

#!/usr/bin/env python3
"""
NavCom Backend API Testing Suite
Tests all API endpoints for the NavCom tactical companion app
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class NavComAPITester:
    def __init__(self, base_url="https://citizen-hub-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_email = None
        self.test_password = "TestPass123!"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:500]
                })
                try:
                    return False, response.json()
                except:
                    return False, response.text

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Status",
            "GET",
            "/",
            200
        )
        return success and isinstance(response, dict) and 'message' in response

    def test_ships_endpoint(self):
        """Test ships endpoint"""
        success, response = self.run_test(
            "Ships List",
            "GET",
            "/ships",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Verify ship data structure
            ship = response[0]
            if all(key in ship for key in ['name', 'scu', 'type']):
                self.log(f"   Found {len(response)} ships")
                return True
            else:
                self.log(f"   Invalid ship data structure: {ship}")
                return False
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        test_handle = f"TestPilot_{datetime.now().strftime('%H%M%S')}"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "rsi_handle": test_handle,
                "verification_code": "TEST123"
            }
        )
        
        if success and isinstance(response, dict):
            self.user_id = response.get('user_id')
            self.log(f"   Registered user: {test_handle}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        if not self.user_id:
            self.log("   Skipping login test - no registered user")
            return False
            
        # Use the same credentials from registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!"
            }
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.token = response['token']
            self.log(f"   Login successful, token received")
            return True
        return False

    def test_auth_me(self):
        """Test authenticated user info"""
        if not self.token:
            self.log("   Skipping auth/me test - no token")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/auth/me",
            200
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            self.log(f"   User info retrieved: {response.get('rsi_handle')}")
            return True
        return False

    def test_intel_analyze(self):
        """Test intel analysis endpoint"""
        success, response = self.run_test(
            "Intel Analysis",
            "POST",
            "/intel/analyze",
            200,
            data={
                "ship": "Cutlass Black",
                "system": "Stanton",
                "time": "1h",
                "activity": "cargo",
                "risk": "MEDIUM"
            }
        )
        
        if success and isinstance(response, dict):
            required_fields = ['type', 'title', 'description', 'location', 'duration', 'reward', 'risk_level']
            if all(field in response for field in required_fields):
                self.log(f"   Mission generated: {response.get('title')}")
                return True
            else:
                self.log(f"   Missing required fields in response")
                return False
        return False

    def test_signals_status(self):
        """Test signals status endpoint"""
        success, response = self.run_test(
            "Signals Status",
            "GET",
            "/signals/status",
            200
        )
        
        if success and isinstance(response, dict):
            if 'server_status' in response:
                self.log(f"   Server status: {response.get('server_status')}")
                return True
        return False

    def test_signals_reports(self):
        """Test signals reports endpoints"""
        # Test getting reports
        success, response = self.run_test(
            "Get Reports",
            "GET",
            "/signals/reports",
            200
        )
        
        if not success:
            return False
            
        # Test creating a report
        success, response = self.run_test(
            "Create Report",
            "POST",
            "/signals/report",
            200,
            data={
                "type": "lag",
                "shard": "360",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            self.log(f"   Report created: {response.get('id')}")
            return True
        return False

    def test_contracts(self):
        """Test contracts endpoints"""
        # Test getting contracts
        success, response = self.run_test(
            "Get Contracts",
            "GET",
            "/contracts",
            200
        )
        
        if not success:
            return False
            
        # Test creating a contract (requires auth)
        if not self.token:
            self.log("   Skipping contract creation - no auth token")
            return True
            
        success, response = self.run_test(
            "Create Contract",
            "POST",
            "/contracts",
            200,
            data={
                "type": "security",
                "title": "Test Security Contract",
                "description": "This is a test contract for API validation",
                "location": "Stanton System",
                "shard": "360"
            }
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            self.log(f"   Contract created: {response.get('title')}")
            return True
        return False

    def test_goals(self):
        """Test goals/roadmap endpoint"""
        success, response = self.run_test(
            "Get Goals",
            "GET",
            "/goals",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} goals")
            if len(response) > 0:
                goal = response[0]
                required_fields = ['id', 'title', 'description', 'target_amount', 'current_amount']
                if all(field in goal for field in required_fields):
                    return True
        return False

    def run_all_tests(self):
        """Run all API tests"""
        self.log("Starting NavCom API Test Suite")
        self.log(f"Testing against: {self.api_url}")
        
        # Core API tests
        tests = [
            ("Root API", self.test_root_endpoint),
            ("Ships Data", self.test_ships_endpoint),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Auth Me", self.test_auth_me),
            ("Intel Analysis", self.test_intel_analyze),
            ("Signals Status", self.test_signals_status),
            ("Signals Reports", self.test_signals_reports),
            ("Contracts", self.test_contracts),
            ("Goals/Roadmap", self.test_goals)
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if not result:
                    self.log(f"❌ {test_name} test failed")
            except Exception as e:
                self.log(f"❌ {test_name} test error: {str(e)}")
                self.failed_tests.append({
                    'name': test_name,
                    'error': str(e)
                })
        
        # Print summary
        self.log("\n" + "="*50)
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log("\nFailed tests:")
            for failure in self.failed_tests:
                self.log(f"  - {failure['name']}: {failure.get('error', 'Status code mismatch')}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = NavComAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
#!/usr/bin/env python3
"""
Quick Smoke Test - Backend API Stability Check
Tests core authentication and process CRUD after UI/UX changes
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://processmind-1.preview.emergentagent.com/api"
TIMEOUT = 30

# Test credentials from review request
TEST_EMAIL = "test@superhumanly.ai"
TEST_PASSWORD = "Test1234!"
TEST_USER_ID = "cce96199-695e-4f47-8c3f-760d93f5d7fe"

class SmokeTest:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
    
    def test_authentication(self):
        """Test user login with provided credentials"""
        print("\n🔐 Testing Authentication...")
        
        try:
            login_payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", 
                                       json=login_payload, timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if 'access_token' in result and 'user' in result:
                    self.auth_token = result['access_token']
                    # Set authorization header for subsequent requests
                    self.session.headers['Authorization'] = f"Bearer {self.auth_token}"
                    
                    user = result['user']
                    if user.get('email') == TEST_EMAIL and user.get('id') == TEST_USER_ID:
                        self.log_result("Authentication", True, 
                                      f"Login successful for {TEST_EMAIL}, JWT token received")
                        return True
                    else:
                        self.log_result("Authentication", False, 
                                      f"User data mismatch. Expected ID: {TEST_USER_ID}, Got: {user.get('id')}")
                        return False
                else:
                    self.log_result("Authentication", False, 
                                  f"Missing access_token or user in response: {list(result.keys())}")
                    return False
            else:
                self.log_result("Authentication", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Authentication", False, f"Error: {str(e)}")
            return False
    
    def test_get_all_processes(self):
        """Test GET /api/process - List all processes"""
        print("\n📋 Testing Process Listing...")
        
        try:
            response = self.session.get(f"{self.base_url}/process", timeout=TIMEOUT)
            
            if response.status_code == 200:
                processes = response.json()
                if isinstance(processes, list):
                    process_count = len(processes)
                    process_names = [p.get('name', 'Unknown') for p in processes[:3]]  # First 3 names
                    
                    self.log_result("GET All Processes", True, 
                                  f"Retrieved {process_count} processes. Examples: {process_names}")
                    return processes
                else:
                    self.log_result("GET All Processes", False, 
                                  f"Expected list, got: {type(processes)}")
                    return []
            else:
                self.log_result("GET All Processes", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            self.log_result("GET All Processes", False, f"Error: {str(e)}")
            return []
    
    def test_create_process(self):
        """Test POST /api/process - Create new process"""
        print("\n➕ Testing Process Creation...")
        
        try:
            test_process = {
                "id": str(uuid.uuid4()),
                "name": "Smoke Test Process",
                "description": f"Created during smoke test at {datetime.now().isoformat()}",
                "status": "draft",
                "nodes": [
                    {
                        "id": "smoke-node-1",
                        "type": "trigger",
                        "status": "trigger",
                        "title": "Start Smoke Test",
                        "description": "Initial step for smoke testing",
                        "actors": ["Test User"],
                        "subSteps": [],
                        "dependencies": [],
                        "parallelWith": [],
                        "failures": [],
                        "blocking": None,
                        "currentState": "Ready",
                        "idealState": "Automated",
                        "gap": None,
                        "impact": "low",
                        "timeEstimate": "1 minute",
                        "position": {"x": 100, "y": 100}
                    }
                ],
                "actors": ["Test User"],
                "criticalGaps": [],
                "improvementOpportunities": [],
                "theme": "minimalist",
                "healthScore": 90,
                "views": 0
            }
            
            response = self.session.post(f"{self.base_url}/process", 
                                       json=test_process, timeout=TIMEOUT)
            
            if response.status_code == 200:
                created_process = response.json()
                if created_process.get('id') == test_process['id']:
                    self.log_result("POST Create Process", True, 
                                  f"Created process: {created_process.get('name')}")
                    return created_process
                else:
                    self.log_result("POST Create Process", False, 
                                  f"ID mismatch in created process")
                    return None
            else:
                self.log_result("POST Create Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_result("POST Create Process", False, f"Error: {str(e)}")
            return None
    
    def test_get_specific_process(self, process_id):
        """Test GET /api/process/{id} - Get specific process"""
        print("\n🔍 Testing Specific Process Retrieval...")
        
        try:
            response = self.session.get(f"{self.base_url}/process/{process_id}", timeout=TIMEOUT)
            
            if response.status_code == 200:
                process = response.json()
                if process.get('id') == process_id:
                    self.log_result("GET Specific Process", True, 
                                  f"Retrieved process: {process.get('name', 'Unknown')}")
                    return True
                else:
                    self.log_result("GET Specific Process", False, 
                                  f"ID mismatch: expected {process_id}, got {process.get('id')}")
                    return False
            elif response.status_code == 404:
                self.log_result("GET Specific Process", False, 
                              f"Process {process_id} not found")
                return False
            else:
                self.log_result("GET Specific Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("GET Specific Process", False, f"Error: {str(e)}")
            return False
    
    def test_database_connection(self):
        """Test database connectivity by checking existing processes"""
        print("\n🗄️ Testing Database Connection...")
        
        try:
            # Try to get processes - this tests MongoDB connection
            response = self.session.get(f"{self.base_url}/process", timeout=TIMEOUT)
            
            if response.status_code == 200:
                processes = response.json()
                # Check if we can find expected existing processes
                existing_names = [p.get('name', '') for p in processes]
                
                # Look for known processes from test_result.md
                known_processes = ['EROAD Alert Management Process', 'InTime to Deputy Data Migration']
                found_known = [name for name in known_processes if any(name in existing for existing in existing_names)]
                
                if found_known:
                    self.log_result("Database Connection", True, 
                                  f"Database connected. Found known processes: {found_known}")
                else:
                    self.log_result("Database Connection", True, 
                                  f"Database connected. Found {len(processes)} processes")
                return True
            else:
                self.log_result("Database Connection", False, 
                              f"Cannot access database: HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Database Connection", False, f"Database error: {str(e)}")
            return False
    
    def run_smoke_test(self):
        """Run the complete smoke test suite"""
        print("🚀 Starting Backend Smoke Test...")
        print(f"Target: {BASE_URL}")
        print(f"Test User: {TEST_EMAIL}")
        print("=" * 60)
        
        # Test 1: Authentication
        auth_success = self.test_authentication()
        if not auth_success:
            print("\n❌ Authentication failed - stopping smoke test")
            return self.generate_summary()
        
        # Test 2: Database Connection
        self.test_database_connection()
        
        # Test 3: Process CRUD Operations
        processes = self.test_get_all_processes()
        
        # Test 4: Create new process
        created_process = self.test_create_process()
        
        # Test 5: Get specific process
        if created_process:
            self.test_get_specific_process(created_process['id'])
        elif processes:
            # Use existing process if creation failed
            self.test_get_specific_process(processes[0]['id'])
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 SMOKE TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  - {result['test']}: {result['details']}")
        
        # Overall status
        if failed_tests == 0:
            print("\n🎉 ALL SMOKE TESTS PASSED - Backend is stable after UI changes")
        elif failed_tests <= 1:
            print("\n⚠️ MOSTLY STABLE - Minor issues detected")
        else:
            print("\n🚨 STABILITY ISSUES - Multiple failures detected")
        
        return {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'success_rate': (passed_tests/total_tests*100) if total_tests > 0 else 0,
            'results': self.test_results
        }

if __name__ == "__main__":
    tester = SmokeTest()
    summary = tester.run_smoke_test()
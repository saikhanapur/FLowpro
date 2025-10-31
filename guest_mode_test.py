#!/usr/bin/env python3
"""
Guest Mode Testing - Focused test for the new Guest Mode features
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import os
import time

# Configuration
BASE_URL = "https://processmind-1.preview.emergentagent.com/api"
TIMEOUT = 60

class GuestModeTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        
    def log_result(self, test_name, success, details, response_data=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_data': response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
    
    def test_guest_process_creation(self):
        """Test Guest Mode - Process Creation Without Auth"""
        print("\n👤 Testing Guest Mode - Process Creation Without Auth...")
        
        # Clear any existing auth headers for guest mode
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            # Test 1: Create first guest process (should succeed)
            guest_process = {
                "name": "Guest Test Process",
                "description": "Testing guest mode",
                "nodes": [
                    {
                        "id": "node-1",
                        "type": "start",
                        "status": "trigger",
                        "title": "Start",
                        "description": "Begin process",
                        "actors": ["Guest User"],
                        "subSteps": [],
                        "dependencies": [],
                        "parallelWith": [],
                        "failures": [],
                        "blocking": None,
                        "currentState": None,
                        "idealState": None,
                        "gap": None,
                        "impact": None,
                        "timeEstimate": None,
                        "position": {"x": 100, "y": 100}
                    }
                ],
                "actors": ["Guest User"],
                "status": "draft"
            }
            
            response = self.session.post(f"{self.base_url}/process", 
                                       json=guest_process, timeout=TIMEOUT)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response cookies: {dict(response.cookies)}")
            
            if response.status_code == 200:
                created_process = response.json()
                guest_session_cookie = response.cookies.get('guest_session')
                
                print(f"Created process: {json.dumps(created_process, indent=2)}")
                
                if (created_process.get('isGuest') == True and 
                    guest_session_cookie and
                    created_process.get('name') == guest_process['name']):
                    self.log_result("Guest Process Creation (First)", True, 
                                  f"Created guest process with session cookie: {guest_session_cookie[:20]}...")
                    self.guest_process_id = created_process.get('id')
                    self.guest_session_cookie = guest_session_cookie
                else:
                    self.log_result("Guest Process Creation (First)", False, 
                                  f"Missing guest fields or cookie. isGuest: {created_process.get('isGuest')}, cookie: {guest_session_cookie}")
            else:
                self.log_result("Guest Process Creation (First)", False, 
                              f"HTTP {response.status_code}: {response.text}")
            
            # Test 2: Try to create second guest process (should fail with 403)
            if hasattr(self, 'guest_session_cookie'):
                # Set the guest session cookie for the second request
                self.session.cookies.set('guest_session', self.guest_session_cookie)
                
                second_process = {
                    "name": "Second Guest Process",
                    "description": "Should be rejected",
                    "nodes": [],
                    "actors": [],
                    "status": "draft"
                }
                
                response = self.session.post(f"{self.base_url}/process", 
                                           json=second_process, timeout=TIMEOUT)
                
                print(f"Second process response status: {response.status_code}")
                print(f"Second process response: {response.text}")
                
                if response.status_code == 403:
                    error_message = response.json().get('detail', '')
                    if "Guest users can only create one flowchart" in error_message:
                        self.log_result("Guest Process Creation (Limit)", True, 
                                      "Correctly enforced 1 flowchart limit for guests")
                    else:
                        self.log_result("Guest Process Creation (Limit)", False, 
                                      f"Wrong error message: {error_message}")
                else:
                    self.log_result("Guest Process Creation (Limit)", False, 
                                  f"Expected 403, got HTTP {response.status_code}: {response.text}")
            
        except Exception as e:
            self.log_result("Guest Process Creation", False, f"Error: {str(e)}")
        finally:
            # Restore original headers
            self.session.headers = original_headers
    
    def test_guest_process_listing(self):
        """Test Guest Mode - Process Listing for Guest Users"""
        print("\n📋 Testing Guest Mode - Process Listing...")
        
        # Clear auth headers for guest mode
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            # Test 1: List processes as guest (with guest_session cookie)
            if hasattr(self, 'guest_session_cookie'):
                self.session.cookies.set('guest_session', self.guest_session_cookie)
                
                response = self.session.get(f"{self.base_url}/process", timeout=TIMEOUT)
                
                print(f"Guest listing response status: {response.status_code}")
                
                if response.status_code == 200:
                    processes = response.json()
                    guest_processes = [p for p in processes if p.get('isGuest') == True]
                    
                    print(f"Total processes: {len(processes)}")
                    print(f"Guest processes: {len(guest_processes)}")
                    
                    if len(guest_processes) >= 1:
                        self.log_result("Guest Process Listing (Guest User)", True, 
                                      f"Retrieved {len(guest_processes)} guest process(es)")
                    else:
                        self.log_result("Guest Process Listing (Guest User)", False, 
                                      f"Expected at least 1 guest process, got {len(guest_processes)}")
                else:
                    self.log_result("Guest Process Listing (Guest User)", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            
        except Exception as e:
            self.log_result("Guest Process Listing", False, f"Error: {str(e)}")
        finally:
            # Restore original headers
            self.session.headers = original_headers
    
    def test_guest_publish_gating(self):
        """Test Guest Mode - Publish Gating"""
        print("\n🚫 Testing Guest Mode - Publish Gating...")
        
        # Clear auth headers for guest mode
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            if hasattr(self, 'guest_process_id') and hasattr(self, 'guest_session_cookie'):
                # Set guest session cookie
                self.session.cookies.set('guest_session', self.guest_session_cookie)
                
                # Try to publish guest process
                response = self.session.patch(f"{self.base_url}/process/{self.guest_process_id}/publish", 
                                            timeout=TIMEOUT)
                
                print(f"Publish response status: {response.status_code}")
                print(f"Publish response: {response.text}")
                
                if response.status_code == 403:
                    error_message = response.json().get('detail', '')
                    if "Guest users cannot publish" in error_message:
                        self.log_result("Guest Publish Gating", True, 
                                      "Correctly blocked guest from publishing with proper message")
                    else:
                        self.log_result("Guest Publish Gating", False, 
                                      f"Wrong error message: {error_message}")
                else:
                    self.log_result("Guest Publish Gating", False, 
                                  f"Expected 403, got HTTP {response.status_code}: {response.text}")
            else:
                self.log_result("Guest Publish Gating", False, 
                              "No guest process available to test publish gating")
        
        except Exception as e:
            self.log_result("Guest Publish Gating", False, f"Error: {str(e)}")
        finally:
            # Restore original headers
            self.session.headers = original_headers
    
    def test_guest_to_user_migration(self):
        """Test Guest Mode - Auto Migration on Signup"""
        print("\n🔄 Testing Guest Mode - Auto Migration on Signup...")
        
        # Clear auth headers and set guest session cookie
        original_headers = self.session.headers.copy()
        
        try:
            # Step 1: Ensure we have a guest process and session
            if not (hasattr(self, 'guest_process_id') and hasattr(self, 'guest_session_cookie')):
                self.log_result("Guest Migration", False, "No guest process/session to test migration")
                return
            
            # Step 2: Create new user account with guest_session cookie
            new_user_email = f"migration_test_{uuid.uuid4().hex[:8]}@flowforge.test"
            new_user_password = "MigrationTest123!"
            new_user_name = "Migration Test User"
            
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
            self.session.cookies.set('guest_session', self.guest_session_cookie)
            
            signup_payload = {
                "email": new_user_email,
                "password": new_user_password,
                "name": new_user_name
            }
            
            signup_response = self.session.post(f"{self.base_url}/auth/signup", 
                                              json=signup_payload, timeout=TIMEOUT)
            
            print(f"Signup response status: {signup_response.status_code}")
            print(f"Signup response: {signup_response.text}")
            
            if signup_response.status_code == 200:
                signup_result = signup_response.json()
                new_user_token = signup_result.get('access_token') or signup_result.get('token')
                new_user_id = signup_result.get('user', {}).get('id')
                
                if new_user_token and new_user_id:
                    self.log_result("Guest Migration (Signup)", True, 
                                  f"Successfully signed up user: {new_user_email}")
                    
                    # Step 3: Login with new credentials and check if guest process was migrated
                    login_payload = {
                        "email": new_user_email,
                        "password": new_user_password
                    }
                    
                    login_response = self.session.post(f"{self.base_url}/auth/login", 
                                                     json=login_payload, timeout=TIMEOUT)
                    
                    print(f"Login response status: {login_response.status_code}")
                    
                    if login_response.status_code == 200:
                        login_result = login_response.json()
                        auth_token = login_result.get('token')
                        
                        # Step 4: Set auth token and get processes
                        self.session.cookies.clear()
                        self.session.headers['Authorization'] = f"Bearer {auth_token}"
                        
                        processes_response = self.session.get(f"{self.base_url}/process", timeout=TIMEOUT)
                        
                        print(f"Processes response status: {processes_response.status_code}")
                        
                        if processes_response.status_code == 200:
                            processes = processes_response.json()
                            
                            print(f"User processes after migration: {len(processes)}")
                            
                            # Look for the migrated process
                            migrated_process = None
                            for process in processes:
                                if process.get('id') == self.guest_process_id:
                                    migrated_process = process
                                    break
                            
                            if migrated_process:
                                print(f"Found migrated process: {json.dumps(migrated_process, indent=2)}")
                                
                                # Verify migration properties
                                is_migrated = (
                                    migrated_process.get('isGuest') == False and
                                    migrated_process.get('userId') == new_user_id and
                                    migrated_process.get('workspaceId') is not None
                                )
                                
                                if is_migrated:
                                    self.log_result("Guest Migration (Process Transfer)", True, 
                                                  f"Guest process successfully migrated to user {new_user_id}")
                                else:
                                    self.log_result("Guest Migration (Process Transfer)", False, 
                                                  f"Process not properly migrated. isGuest: {migrated_process.get('isGuest')}, userId: {migrated_process.get('userId')}")
                            else:
                                self.log_result("Guest Migration (Process Transfer)", False, 
                                              "Guest process not found in user's processes after migration")
                        else:
                            self.log_result("Guest Migration (Process Transfer)", False, 
                                          f"Could not retrieve processes after login: {processes_response.status_code}")
                    else:
                        self.log_result("Guest Migration (Login)", False, 
                                      f"Could not login after signup: {login_response.status_code}")
                else:
                    self.log_result("Guest Migration (Signup)", False, 
                                  f"Signup response missing token or user ID")
            else:
                self.log_result("Guest Migration (Signup)", False, 
                              f"Signup failed: HTTP {signup_response.status_code}: {signup_response.text}")
        
        except Exception as e:
            self.log_result("Guest Migration", False, f"Error: {str(e)}")
        finally:
            # Restore original headers
            self.session.headers = original_headers

    def run_tests(self):
        """Run all guest mode tests"""
        print("🚀 Starting Guest Mode Testing Suite")
        print(f"🎯 Target URL: {self.base_url}")
        print("=" * 60)
        
        self.test_guest_process_creation()
        self.test_guest_process_listing()
        self.test_guest_publish_gating()
        self.test_guest_to_user_migration()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 GUEST MODE TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")

if __name__ == "__main__":
    tester = GuestModeTester()
    tester.run_tests()
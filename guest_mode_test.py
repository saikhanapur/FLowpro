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
                        "title": "Start",
                        "description": "Begin process",
                        "actors": ["Guest User"],
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
    
    def run_tests(self):
        """Run all guest mode tests"""
        print("🚀 Starting Guest Mode Testing Suite")
        print(f"🎯 Target URL: {self.base_url}")
        print("=" * 60)
        
        self.test_guest_process_creation()
        self.test_guest_process_listing()
        self.test_guest_publish_gating()
        
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
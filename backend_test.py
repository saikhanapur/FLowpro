#!/usr/bin/env python3
"""
FlowForge AI Backend API Testing Suite
Tests all backend endpoints systematically
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import os
from pathlib import Path

# Configuration
BASE_URL = "https://process-mapper-6.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.existing_process_ids = []
        
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
    
    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                if "FlowForge AI API" in data.get("message", ""):
                    self.log_result("Root Endpoint", True, "API is responding correctly")
                    return True
                else:
                    self.log_result("Root Endpoint", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_get_all_processes(self):
        """Test GET /api/process - List all processes"""
        try:
            response = self.session.get(f"{self.base_url}/process", timeout=TIMEOUT)
            if response.status_code == 200:
                processes = response.json()
                if isinstance(processes, list):
                    # Store existing process IDs for later tests
                    self.existing_process_ids = [p.get('id') for p in processes if p.get('id')]
                    self.log_result("GET All Processes", True, 
                                  f"Retrieved {len(processes)} processes. IDs: {self.existing_process_ids}")
                    return True
                else:
                    self.log_result("GET All Processes", False, f"Expected list, got: {type(processes)}")
                    return False
            else:
                self.log_result("GET All Processes", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("GET All Processes", False, f"Error: {str(e)}")
            return False
    
    def test_get_specific_process(self):
        """Test GET /api/process/{id} - Get specific process"""
        if not self.existing_process_ids:
            self.log_result("GET Specific Process", False, "No existing process IDs to test with")
            return False
        
        try:
            process_id = self.existing_process_ids[0]
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
                self.log_result("GET Specific Process", False, f"Process {process_id} not found")
                return False
            else:
                self.log_result("GET Specific Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("GET Specific Process", False, f"Error: {str(e)}")
            return False
    
    def test_create_process(self):
        """Test POST /api/process - Create new process"""
        try:
            test_process = {
                "id": str(uuid.uuid4()),
                "name": "Test Process - Backend Testing",
                "description": "A test process created during backend API testing",
                "status": "draft",
                "nodes": [
                    {
                        "id": "node-1",
                        "type": "trigger",
                        "status": "trigger",
                        "title": "Start Test Process",
                        "description": "Initial trigger for test process",
                        "actors": ["Test User"],
                        "subSteps": ["Initialize", "Validate"],
                        "dependencies": [],
                        "parallelWith": [],
                        "failures": [],
                        "blocking": None,
                        "currentState": "Ready to start",
                        "idealState": "Automated trigger",
                        "gap": None,
                        "impact": "low",
                        "timeEstimate": "5 minutes",
                        "position": {"x": 100, "y": 100}
                    }
                ],
                "actors": ["Test User", "System"],
                "criticalGaps": [],
                "improvementOpportunities": [],
                "theme": "minimalist",
                "healthScore": 85,
                "views": 0
            }
            
            response = self.session.post(f"{self.base_url}/process", 
                                       json=test_process, timeout=TIMEOUT)
            if response.status_code == 200:
                created_process = response.json()
                if created_process.get('id') == test_process['id']:
                    self.log_result("POST Create Process", True, 
                                  f"Created process: {created_process.get('name')}")
                    # Store for cleanup
                    self.existing_process_ids.append(test_process['id'])
                    return True
                else:
                    self.log_result("POST Create Process", False, 
                                  f"ID mismatch in created process")
                    return False
            else:
                self.log_result("POST Create Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("POST Create Process", False, f"Error: {str(e)}")
            return False
    
    def test_update_process(self):
        """Test PUT /api/process/{id} - Update process"""
        if not self.existing_process_ids:
            self.log_result("PUT Update Process", False, "No process IDs to test with")
            return False
        
        try:
            # Use the last process ID (likely our test process)
            process_id = self.existing_process_ids[-1]
            
            # First get the current process
            get_response = self.session.get(f"{self.base_url}/process/{process_id}", timeout=TIMEOUT)
            if get_response.status_code != 200:
                self.log_result("PUT Update Process", False, f"Could not fetch process to update")
                return False
            
            process = get_response.json()
            
            # Update the process
            process['description'] = "Updated during backend testing - " + datetime.now().isoformat()
            process['status'] = "published"
            
            response = self.session.put(f"{self.base_url}/process/{process_id}", 
                                      json=process, timeout=TIMEOUT)
            if response.status_code == 200:
                updated_process = response.json()
                if "Updated during backend testing" in updated_process.get('description', ''):
                    self.log_result("PUT Update Process", True, 
                                  f"Updated process successfully")
                    return True
                else:
                    self.log_result("PUT Update Process", False, 
                                  f"Update not reflected in response")
                    return False
            else:
                self.log_result("PUT Update Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("PUT Update Process", False, f"Error: {str(e)}")
            return False
    
    def test_document_upload(self):
        """Test POST /api/upload - Upload document"""
        try:
            # Create a simple text file for testing
            test_content = """
            Sample Process Documentation
            
            This is a test document for FlowForge AI backend testing.
            
            Process Steps:
            1. User initiates request
            2. System validates input
            3. Process data
            4. Generate response
            5. Send confirmation
            
            Key Actors:
            - Customer Service Representative
            - System Administrator
            - End User
            
            Current Issues:
            - Manual validation takes too long
            - No automated notifications
            """
            
            files = {
                'file': ('test_document.txt', test_content, 'text/plain')
            }
            
            # Remove Content-Type header for file upload
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = requests.post(f"{self.base_url}/upload", 
                                   files=files, headers=headers, timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if 'text' in result and len(result['text']) > 0:
                    self.log_result("POST Upload Document", True, 
                                  f"Uploaded and extracted {len(result['text'])} characters")
                    return result['text']  # Return extracted text for parsing test
                else:
                    self.log_result("POST Upload Document", False, 
                                  f"No text extracted from document")
                    return None
            else:
                self.log_result("POST Upload Document", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self.log_result("POST Upload Document", False, f"Error: {str(e)}")
            return None
    
    def test_ai_parse_process(self, text=None):
        """Test POST /api/process/parse - AI parsing"""
        try:
            if not text:
                # Use a simple test text if no document text provided
                text = """
                Customer Support Ticket Resolution Process
                
                1. Customer submits ticket through portal
                2. System assigns ticket ID and priority
                3. Support agent reviews and categorizes
                4. Agent investigates and provides solution
                5. Customer confirms resolution
                6. Ticket is closed and archived
                
                Actors: Customer, Support Agent, System
                Issues: Long response times, manual categorization
                """
            
            payload = {
                "text": text,
                "inputType": "document"
            }
            
            response = self.session.post(f"{self.base_url}/process/parse", 
                                       json=payload, timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if 'processName' in result and 'nodes' in result:
                    nodes_count = len(result.get('nodes', []))
                    self.log_result("POST AI Parse Process", True, 
                                  f"Parsed process: {result.get('processName')} with {nodes_count} nodes")
                    return True
                else:
                    self.log_result("POST AI Parse Process", False, 
                                  f"Invalid response structure: {list(result.keys())}")
                    return False
            else:
                error_detail = response.text
                if "budget" in error_detail.lower() or "credit" in error_detail.lower():
                    self.log_result("POST AI Parse Process", False, 
                                  f"AI Budget/Credit Issue: {error_detail}")
                elif "too large" in error_detail.lower() or "truncated" in error_detail.lower():
                    self.log_result("POST AI Parse Process", False, 
                                  f"AI Response Truncation Issue: {error_detail}")
                else:
                    self.log_result("POST AI Parse Process", False, 
                                  f"HTTP {response.status_code}: {error_detail}")
                return False
        except Exception as e:
            self.log_result("POST AI Parse Process", False, f"Error: {str(e)}")
            return False
    
    def test_ai_ideal_state(self):
        """Test POST /api/process/{id}/ideal-state - Generate ideal state"""
        if not self.existing_process_ids:
            self.log_result("POST AI Ideal State", False, "No process IDs to test with")
            return False
        
        try:
            process_id = self.existing_process_ids[0]  # Use first existing process
            
            response = self.session.post(f"{self.base_url}/process/{process_id}/ideal-state", 
                                       timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if 'vision' in result and 'categories' in result:
                    categories_count = len(result.get('categories', []))
                    self.log_result("POST AI Ideal State", True, 
                                  f"Generated ideal state with {categories_count} improvement categories")
                    return True
                else:
                    self.log_result("POST AI Ideal State", False, 
                                  f"Invalid response structure: {list(result.keys())}")
                    return False
            else:
                error_detail = response.text
                if "budget" in error_detail.lower() or "credit" in error_detail.lower():
                    self.log_result("POST AI Ideal State", False, 
                                  f"AI Budget/Credit Issue: {error_detail}")
                else:
                    self.log_result("POST AI Ideal State", False, 
                                  f"HTTP {response.status_code}: {error_detail}")
                return False
        except Exception as e:
            self.log_result("POST AI Ideal State", False, f"Error: {str(e)}")
            return False
    
    def test_ai_chat(self):
        """Test POST /api/chat - Chat interaction"""
        try:
            payload = {
                "history": [],
                "message": "I need help documenting a simple approval process. Where should I start?"
            }
            
            response = self.session.post(f"{self.base_url}/chat", 
                                       json=payload, timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if 'response' in result and len(result['response']) > 0:
                    response_length = len(result['response'])
                    self.log_result("POST AI Chat", True, 
                                  f"Received chat response ({response_length} characters)")
                    return True
                else:
                    self.log_result("POST AI Chat", False, 
                                  f"Empty or invalid chat response")
                    return False
            else:
                error_detail = response.text
                if "budget" in error_detail.lower() or "credit" in error_detail.lower():
                    self.log_result("POST AI Chat", False, 
                                  f"AI Budget/Credit Issue: {error_detail}")
                else:
                    self.log_result("POST AI Chat", False, 
                                  f"HTTP {response.status_code}: {error_detail}")
                return False
        except Exception as e:
            self.log_result("POST AI Chat", False, f"Error: {str(e)}")
            return False
    
    def test_delete_process(self):
        """Test DELETE /api/process/{id} - Delete process (cleanup)"""
        # Only delete test processes we created
        test_processes = [pid for pid in self.existing_process_ids 
                         if pid not in self.existing_process_ids[:2]]  # Keep first 2 (existing)
        
        if not test_processes:
            self.log_result("DELETE Process", True, "No test processes to clean up")
            return True
        
        try:
            process_id = test_processes[0]
            response = self.session.delete(f"{self.base_url}/process/{process_id}", timeout=TIMEOUT)
            
            if response.status_code == 200:
                result = response.json()
                if "deleted" in result.get('message', '').lower():
                    self.log_result("DELETE Process", True, 
                                  f"Successfully deleted test process")
                    return True
                else:
                    self.log_result("DELETE Process", False, 
                                  f"Unexpected response: {result}")
                    return False
            elif response.status_code == 404:
                self.log_result("DELETE Process", False, 
                              f"Process {process_id} not found for deletion")
                return False
            else:
                self.log_result("DELETE Process", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("DELETE Process", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in order"""
        print(f"🚀 Starting FlowForge AI Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_root_endpoint():
            print("❌ Cannot connect to API. Stopping tests.")
            return False
        
        # Test Process CRUD endpoints
        print("\n📋 Testing Process CRUD Endpoints...")
        self.test_get_all_processes()
        self.test_get_specific_process()
        self.test_create_process()
        self.test_update_process()
        
        # Test Document Upload & AI Processing
        print("\n🤖 Testing Document Upload & AI Processing...")
        uploaded_text = self.test_document_upload()
        self.test_ai_parse_process(uploaded_text)
        
        # Test AI Integration endpoints
        print("\n🧠 Testing AI Integration Endpoints...")
        self.test_ai_ideal_state()
        self.test_ai_chat()
        
        # Cleanup
        print("\n🧹 Cleanup...")
        self.test_delete_process()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
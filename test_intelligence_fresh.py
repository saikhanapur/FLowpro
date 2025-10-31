#!/usr/bin/env python3
"""
Test Enhanced Process Intelligence with a fresh emergency process
"""

import requests
import json
import uuid
import time

BASE_URL = "https://processmind-1.preview.emergentagent.com/api"
TIMEOUT = 180

def authenticate():
    """Authenticate as test@superhumanly.ai"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    login_payload = {
        "email": "test@superhumanly.ai",
        "password": "Test1234!"
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        token = result.get('token') or result.get('access_token')
        if token:
            session.headers.update({'Authorization': f'Bearer {token}'})
            print(f"✅ Authenticated as test@superhumanly.ai")
            return session
        else:
            print(f"❌ Login successful but no token received")
            return None
    else:
        print(f"❌ Login failed: HTTP {response.status_code}")
        return None

def create_emergency_process(session):
    """Create a test emergency process with multiple steps for intelligence testing"""
    emergency_process = {
        "id": str(uuid.uuid4()),
        "name": "Emergency Response Process - Intelligence Test",
        "description": "Emergency response process designed to test TIER 1 issue detection",
        "status": "draft",
        "nodes": [
            {
                "id": "node-1",
                "type": "trigger",
                "status": "trigger",
                "title": "Emergency Alert Received",
                "description": "Emergency alert comes in through various channels",
                "actors": ["Call Handler"],
                "subSteps": ["Check alert source", "Verify authenticity"],
                "dependencies": [],
                "parallelWith": [],
                "failures": [],
                "blocking": None,
                "currentState": "Manual verification required",
                "idealState": "Automated alert validation",
                "gap": "No automated verification system",
                "impact": "high",
                "timeEstimate": "2 minutes",
                "position": {"x": 100, "y": 100}
            },
            {
                "id": "node-2",
                "type": "step",
                "status": "current",
                "title": "Assess Situation",
                "description": "Evaluate the severity and type of emergency",
                "actors": ["Call Handler"],
                "subSteps": ["Gather information", "Determine priority"],
                "dependencies": ["node-1"],
                "parallelWith": [],
                "failures": ["Incomplete information", "Wrong priority assigned"],
                "blocking": None,
                "currentState": "Manual assessment with no time limit",
                "idealState": "Structured assessment with timeout",
                "gap": "No assessment timeout or escalation",
                "impact": "critical",
                "timeEstimate": "Variable - no limit",
                "position": {"x": 300, "y": 100}
            },
            {
                "id": "node-3",
                "type": "step",
                "status": "current",
                "title": "Notify Escalation Contacts",
                "description": "Contact management and relevant stakeholders",
                "actors": ["Call Handler"],
                "subSteps": ["Call manager", "Send notifications"],
                "dependencies": ["node-2"],
                "parallelWith": [],
                "failures": ["Manager unavailable", "Contact details outdated"],
                "blocking": None,
                "currentState": "Sequential notification process",
                "idealState": "Parallel notification system",
                "gap": "No backup contact method",
                "impact": "high",
                "timeEstimate": "4 minutes",
                "position": {"x": 500, "y": 100}
            },
            {
                "id": "node-4",
                "type": "step",
                "status": "warning",
                "title": "Contact Emergency Services",
                "description": "Call emergency services if required",
                "actors": ["Call Handler"],
                "subSteps": ["Dial emergency number", "Provide details"],
                "dependencies": ["node-2"],
                "parallelWith": [],
                "failures": ["Line busy", "No answer", "Wrong information provided"],
                "blocking": None,
                "currentState": "Single emergency contact method",
                "idealState": "Multiple contact methods with failover",
                "gap": "No backup emergency contact",
                "impact": "critical",
                "timeEstimate": "4 minutes",
                "position": {"x": 500, "y": 300}
            },
            {
                "id": "node-5",
                "type": "step",
                "status": "current",
                "title": "Provide Information",
                "description": "Share relevant details with emergency responders",
                "actors": ["Call Handler", "Emergency Services"],
                "subSteps": ["Confirm location", "Describe situation", "Provide contact details"],
                "dependencies": ["node-3", "node-4"],
                "parallelWith": [],
                "failures": ["Incomplete handoff", "Missing critical information"],
                "blocking": None,
                "currentState": "Verbal handoff only",
                "idealState": "Structured information transfer",
                "gap": "No confirmation of information received",
                "impact": "high",
                "timeEstimate": "3 minutes",
                "position": {"x": 700, "y": 200}
            }
        ],
        "actors": ["Call Handler", "Emergency Services", "Management", "System"],
        "criticalGaps": [
            "No backup emergency contact method",
            "Assessment has no time limit",
            "Sequential notifications cause delays",
            "No handoff confirmation process"
        ],
        "improvementOpportunities": [
            {
                "description": "Implement parallel notification system",
                "type": "automation",
                "estimatedSavings": "4 minutes per incident"
            },
            {
                "description": "Add backup emergency contact methods",
                "type": "reliability",
                "estimatedSavings": "Prevents 8% of failed emergency calls"
            }
        ],
        "theme": "minimalist",
        "healthScore": 65,
        "views": 0
    }
    
    response = session.post(f"{BASE_URL}/process", json=emergency_process, timeout=30)
    
    if response.status_code == 200:
        created_process = response.json()
        print(f"✅ Created emergency test process: {created_process.get('name')}")
        return created_process
    else:
        print(f"❌ Failed to create test process: HTTP {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def test_intelligence():
    """Test the intelligence endpoint with fresh process"""
    session = authenticate()
    if not session:
        return
    
    # Create a fresh emergency process
    process = create_emergency_process(session)
    if not process:
        return
    
    process_id = process['id']
    print(f"🧠 Testing intelligence for fresh process: {process.get('name', 'Unknown')}")
    print(f"   Process ID: {process_id}")
    
    # Test intelligence endpoint
    print("   Calling intelligence endpoint...")
    start_time = time.time()
    
    response = session.get(f"{BASE_URL}/process/{process_id}/intelligence", timeout=TIMEOUT)
    
    elapsed_time = time.time() - start_time
    print(f"   Response time: {elapsed_time:.2f}s")
    
    if response.status_code == 200:
        intelligence = response.json()
        
        print(f"✅ Intelligence analysis successful!")
        print(f"   Health Score: {intelligence.get('health_score', 'N/A')}")
        print(f"   Issues Detected: {len(intelligence.get('issues', []))}")
        
        # Check for TIER 1 issues
        issues = intelligence.get('issues', [])
        tier1_types = ["missing_error_handling", "serial_bottleneck", "unclear_ownership", "missing_timeout", "missing_handoff"]
        tier1_issues = [issue.get('issue_type') for issue in issues if issue.get('issue_type') in tier1_types]
        
        if tier1_issues:
            print(f"   🎯 TIER 1 Issues: {tier1_issues}")
        else:
            print(f"   ⚠️ No TIER 1 issues detected")
        
        print(f"   💰 Total Savings Potential: ${intelligence.get('total_savings_potential', 0)}")
        print(f"   ⚠️ Top Weakness: {intelligence.get('top_weakness', 'N/A')}")
        
        # Show some issue details
        if issues:
            print(f"\n   📋 Issue Details:")
            for i, issue in enumerate(issues[:3]):  # Show first 3 issues
                print(f"      {i+1}. {issue.get('title', 'Unknown Issue')}")
                print(f"         Type: {issue.get('issue_type', 'N/A')}")
                print(f"         Node: {issue.get('node_title', 'N/A')}")
                print(f"         Cost Impact: ${issue.get('cost_impact_monthly', 0)}/month")
        
        # Test caching
        print("\n   Testing caching...")
        cache_start = time.time()
        cache_response = session.get(f"{BASE_URL}/process/{process_id}/intelligence", timeout=30)
        cache_time = time.time() - cache_start
        
        if cache_response.status_code == 200 and cache_time < 5:
            print(f"   ✅ Caching works: {cache_time:.2f}s")
        else:
            print(f"   ⚠️ Caching may not work: {cache_time:.2f}s")
            
    elif response.status_code == 404:
        print(f"❌ Process not found")
    elif response.status_code == 403:
        print(f"❌ Access denied")
    else:
        print(f"❌ HTTP {response.status_code}: {response.text}")

if __name__ == "__main__":
    test_intelligence()
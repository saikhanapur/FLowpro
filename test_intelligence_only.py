#!/usr/bin/env python3
"""
Quick test for Enhanced Process Intelligence endpoint
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
        print(f"Login response: {result}")
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

def test_intelligence():
    """Test the intelligence endpoint"""
    session = authenticate()
    if not session:
        return
    
    # Get existing processes
    response = session.get(f"{BASE_URL}/process", timeout=30)
    if response.status_code != 200:
        print("❌ Could not fetch processes")
        return
    
    processes = response.json()
    if not processes:
        print("❌ No processes found")
        return
    
    process_id = processes[0]['id']
    print(f"🧠 Testing intelligence for process: {processes[0].get('name', 'Unknown')}")
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
            print(f"   TIER 1 Issues: {tier1_issues}")
        else:
            print(f"   No TIER 1 issues detected")
        
        print(f"   Total Savings Potential: ${intelligence.get('total_savings_potential', 0)}")
        print(f"   Top Weakness: {intelligence.get('top_weakness', 'N/A')}")
        
        # Test caching
        print("   Testing caching...")
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
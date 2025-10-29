#!/usr/bin/env python3
"""
AI Verification Test - Verify Claude API is working properly after EMERGENT_LLM_KEY fix
Tests AI consistency and quality with realistic enterprise scenarios
"""

import requests
import json
import time

BASE_URL = "https://superhuman-flow.preview.emergentagent.com/api"
TIMEOUT = 60

def test_ai_quality_and_consistency():
    """Test AI quality and consistency with realistic enterprise document"""
    
    print("🧠 Testing AI Quality and Consistency...")
    
    # Realistic enterprise process document
    enterprise_document = """
    Employee Performance Review Process - Annual Cycle
    
    Purpose:
    This process ensures consistent, fair, and comprehensive performance evaluations
    for all employees across the organization. The annual review cycle supports
    career development, compensation decisions, and organizational planning.
    
    Process Overview:
    
    Phase 1: Preparation (January - February)
    1. HR sends review schedule and templates to all managers
    2. Employees complete self-assessment forms
    3. Managers gather 360-degree feedback from peers and stakeholders
    4. HR validates completion of required training modules
    
    Phase 2: Review Meetings (March - April)  
    5. Manager conducts initial performance discussion with employee
    6. Employee and manager jointly set goals for upcoming year
    7. Manager completes formal performance rating in system
    8. HR reviews ratings for consistency and bias
    
    Phase 3: Calibration (May)
    9. Department heads participate in calibration meetings
    10. Ratings are adjusted to ensure fairness across teams
    11. Final ratings are approved by senior leadership
    
    Phase 4: Communication (June)
    12. Managers communicate final ratings and development plans
    13. Compensation adjustments are processed by HR
    14. Individual development plans are created and tracked
    
    Key Stakeholders:
    - Employee (review subject)
    - Direct Manager (primary reviewer)
    - HR Business Partner (process oversight)
    - Department Head (calibration)
    - Senior Leadership (final approval)
    - Peer Reviewers (360 feedback)
    
    Current Challenges:
    - Inconsistent rating standards across departments
    - Lengthy calibration process causes delays
    - Limited real-time feedback throughout the year
    - Manual tracking of development plan progress
    - Bias in peer selection for 360 reviews
    
    Success Metrics:
    - 95% completion rate by deadline
    - Manager satisfaction score: 4.1/5.0
    - Employee engagement post-review: 78%
    - Development plan completion: 65%
    """
    
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    results = []
    
    # Test 1: Basic AI parsing quality
    try:
        payload = {
            "text": enterprise_document,
            "inputType": "document"
        }
        
        response = session.post(f"{BASE_URL}/process/parse", json=payload, timeout=TIMEOUT)
        
        if response.status_code == 200:
            result = response.json()
            
            # Analyze quality of AI response
            quality_score = 0
            issues = []
            
            # Extract process data
            if 'processes' in result and result['processes']:
                process = result['processes'][0]
            elif 'processName' in result:
                process = result
            else:
                print("❌ FAIL AI Quality: Invalid response structure")
                return False
            
            # Check 1: Process name quality
            process_name = process.get('processName', '')
            if 'performance' in process_name.lower() and 'review' in process_name.lower():
                quality_score += 20
            else:
                issues.append(f"Process name not descriptive: '{process_name}'")
            
            # Check 2: Node count (should be reasonable for this complex process)
            nodes = process.get('nodes', [])
            if 8 <= len(nodes) <= 15:
                quality_score += 20
            else:
                issues.append(f"Node count seems off: {len(nodes)} (expected 8-15)")
            
            # Check 3: Actor identification
            actors = process.get('actors', [])
            expected_actors = ['hr', 'manager', 'employee', 'leadership']
            found_actors = sum(1 for actor in actors if any(exp in actor.lower() for exp in expected_actors))
            if found_actors >= 3:
                quality_score += 20
            else:
                issues.append(f"Key actors missing. Found: {actors}")
            
            # Check 4: Gap identification
            gaps = process.get('criticalGaps', [])
            if len(gaps) > 0:
                quality_score += 20
            else:
                issues.append("No critical gaps identified")
            
            # Check 5: Node details quality
            detailed_nodes = sum(1 for node in nodes if len(node.get('description', '')) > 20)
            if detailed_nodes >= len(nodes) * 0.7:  # 70% of nodes should have good descriptions
                quality_score += 20
            else:
                issues.append(f"Only {detailed_nodes}/{len(nodes)} nodes have detailed descriptions")
            
            if quality_score >= 80:
                print(f"✅ PASS AI Quality: Score {quality_score}/100 - High quality process extraction")
                results.append(True)
            else:
                print(f"❌ FAIL AI Quality: Score {quality_score}/100 - Issues: {issues}")
                results.append(False)
                
        else:
            print(f"❌ FAIL AI Quality: HTTP {response.status_code}: {response.text}")
            results.append(False)
            
    except Exception as e:
        print(f"❌ FAIL AI Quality: Error: {str(e)}")
        results.append(False)
    
    # Test 2: AI Consistency (run same document twice)
    print("\n🔄 Testing AI Consistency...")
    
    try:
        responses = []
        for i in range(2):
            payload = {
                "text": enterprise_document,
                "inputType": "document"
            }
            
            response = session.post(f"{BASE_URL}/process/parse", json=payload, timeout=TIMEOUT)
            
            if response.status_code == 200:
                responses.append(response.json())
                time.sleep(2)  # Brief pause between requests
            else:
                print(f"❌ FAIL AI Consistency: HTTP {response.status_code} on attempt {i+1}")
                results.append(False)
                break
        
        if len(responses) == 2:
            # Compare responses for consistency
            def extract_process_data(resp):
                if 'processes' in resp and resp['processes']:
                    return resp['processes'][0]
                elif 'processName' in resp:
                    return resp
                return {}
            
            proc1 = extract_process_data(responses[0])
            proc2 = extract_process_data(responses[1])
            
            # Compare key metrics
            nodes1 = len(proc1.get('nodes', []))
            nodes2 = len(proc2.get('nodes', []))
            actors1 = len(proc1.get('actors', []))
            actors2 = len(proc2.get('actors', []))
            
            node_diff = abs(nodes1 - nodes2)
            actor_diff = abs(actors1 - actors2)
            
            if node_diff <= 2 and actor_diff <= 2:
                print(f"✅ PASS AI Consistency: Node variance: {node_diff}, Actor variance: {actor_diff}")
                results.append(True)
            else:
                print(f"❌ FAIL AI Consistency: High variance - Nodes: {node_diff}, Actors: {actor_diff}")
                results.append(False)
        
    except Exception as e:
        print(f"❌ FAIL AI Consistency: Error: {str(e)}")
        results.append(False)
    
    # Test 3: Context-enriched parsing
    print("\n🎯 Testing Context-Enriched Parsing...")
    
    try:
        additional_context = """
        Important context: The review process has been updated this year. 
        Sarah Johnson from HR leads the calibration meetings. 
        The new system requires manager approval within 48 hours.
        Budget constraints limit development plan funding to $2000 per employee.
        """
        
        payload = {
            "text": enterprise_document,
            "inputType": "document",
            "additionalContext": additional_context
        }
        
        response = session.post(f"{BASE_URL}/process/parse", json=payload, timeout=TIMEOUT)
        
        if response.status_code == 200:
            result = response.json()
            result_str = json.dumps(result).lower()
            
            # Check if context was incorporated
            context_indicators = ['sarah', 'johnson', '48 hours', '2000', 'budget']
            found_indicators = sum(1 for indicator in context_indicators if indicator in result_str)
            
            if found_indicators >= 2:
                print(f"✅ PASS Context-Enriched Parsing: Found {found_indicators}/5 context indicators")
                results.append(True)
            else:
                print(f"❌ FAIL Context-Enriched Parsing: Only found {found_indicators}/5 context indicators")
                results.append(False)
                
        else:
            print(f"❌ FAIL Context-Enriched Parsing: HTTP {response.status_code}: {response.text}")
            results.append(False)
            
    except Exception as e:
        print(f"❌ FAIL Context-Enriched Parsing: Error: {str(e)}")
        results.append(False)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 AI Verification Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 AI functionality is working excellently after EMERGENT_LLM_KEY fix!")
        return True
    else:
        print("⚠️ Some AI functionality issues detected")
        return False

if __name__ == "__main__":
    success = test_ai_quality_and_consistency()
    exit(0 if success else 1)
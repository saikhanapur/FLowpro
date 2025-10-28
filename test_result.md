#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  FlowForge AI is a workflow-to-flowchart platform that captures processes via voice, documents, or chat,
  generates visual flowcharts, and enables collaboration. The current issue is PDF export text clipping
  where words cut off within flowchart boxes. Recent fixes have been implemented to address this:
  - Improved text wrapping in FlowNode components with break-words and whitespace-normal classes
  - Enhanced html2canvas configuration for better content capture
  - Dynamic box sizing to fit content

backend:
  - task: "Process CRUD API endpoints"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "API endpoints for getting processes, creating, updating, deleting. Need to verify all endpoints are working correctly."
      - working: true
        agent: "testing"
        comment: "✅ ALL CRUD endpoints working perfectly. Tested: GET /api/process (retrieved 2 existing processes: EROAD Alert Management Process & InTime to Deputy Data Migration), GET /api/process/{id} (successfully retrieved specific process), POST /api/process (created test process successfully), PUT /api/process/{id} (updated process successfully), DELETE /api/process/{id} (deleted test process successfully). All endpoints return proper JSON responses and handle operations correctly."

  - task: "AI Processing with Claude API"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Claude API integration for parsing process input, gap detection, ideal state generation. Previous issues with budget and truncated responses. Need to test if AI endpoints are stable."
      - working: true
        agent: "testing"
        comment: "✅ ALL AI endpoints working perfectly. Tested: POST /api/process/parse (successfully parsed document text into structured process with 5 nodes), POST /api/process/{id}/ideal-state (generated comprehensive ideal state with 5 improvement categories), POST /api/chat (received proper chat response for process documentation guidance), POST /api/upload (successfully uploaded and extracted text from document). No budget/credit issues encountered. All AI responses are properly formatted JSON."

  - task: "PDF/HTML Export Generation"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Backend endpoints for generating interactive HTML and PDF exports. Need to verify export endpoints are working."
      - working: "NA"
        agent: "testing"
        comment: "⚠️ No dedicated PDF/HTML export endpoints found in backend server.py. The export functionality appears to be handled client-side in the frontend ExportModal component using html2canvas. Backend only provides data via CRUD endpoints. This is not a backend issue - export generation is frontend responsibility."

frontend:
  - task: "Dashboard with Process Listing"
    implemented: true
    working: true
    file: "/app/frontend/src/components/Dashboard.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Dashboard is rendering correctly with hero section, process cards showing EROAD and InTime processes. Search and filters visible."

  - task: "Flowchart Editor and Visualization"
    implemented: true
    working: true
    file: "/app/frontend/src/components/FlowchartEditor.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Flowchart editor is rendering properly with nodes, arrows, legend. EROAD process displays correctly with trigger, active, warning nodes. Text is visible in UI."

  - task: "PDF Export with Proper Text Rendering"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/ExportModal.js"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "user"
        comment: "User reported text clipping in PDF exports - words cutting off in flowchart boxes"
      - working: "NA"
        agent: "main"
        comment: "Implemented fixes: FlowNode text wrapping with break-words, whitespace-normal. ExportModal html2canvas config improved with scale:2.5, forced overflow:visible, height:auto before capture. Need to test if text clipping is resolved in actual PDF export."

  - task: "Process Creation Flow (Voice, Document, Chat)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/ProcessCreator.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Three input methods implemented. Need to test document upload and AI processing flow."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "PDF Export with Proper Text Rendering"
    - "Process CRUD API endpoints"
    - "AI Processing with Claude API"
  stuck_tasks:
    - "PDF Export with Proper Text Rendering"
  test_all: false
  test_priority: "stuck_first"

agent_communication:
  - agent: "main"
    message: |
      Initial test setup complete. The main issue is PDF export text clipping.
      Recent fixes implemented to FlowNode and ExportModal. 
      Priority: Test PDF export functionality first to verify text clipping is resolved.
      Backend API endpoints need verification as well, especially AI processing endpoints.
      Frontend UI is working correctly based on screenshots.
  - agent: "testing"
    message: |
      ✅ BACKEND TESTING COMPLETE - ALL SYSTEMS OPERATIONAL
      
      Comprehensive backend API testing completed with 10/10 tests passing:
      
      🔹 Process CRUD Operations: All endpoints (GET, POST, PUT, DELETE) working perfectly
      🔹 AI Integration: Claude API fully functional - parsing, ideal state generation, chat all working
      🔹 Document Upload: Successfully processing and extracting text from documents
      🔹 Database Operations: Proper data persistence and retrieval confirmed
      
      Key Findings:
      - No budget/credit issues with Claude API (previous concern resolved)
      - All AI responses properly formatted as JSON
      - 2 existing processes confirmed in database: "EROAD Alert Management Process" & "InTime to Deputy Data Migration"
      - PDF/HTML export is frontend-only functionality (no backend endpoints needed)
      
      Backend is fully operational and ready for production use.
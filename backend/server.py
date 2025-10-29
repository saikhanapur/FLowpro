from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import re
import uuid
from datetime import datetime, timezone, timedelta
import json
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import pypdf
    import docx
    from PIL import Image
    import pytesseract
    DOCUMENT_SUPPORT = True
except ImportError:
    DOCUMENT_SUPPORT = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Authentication configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fallback-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper functions for password hashing
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============

class ProcessNode(BaseModel):
    id: str
    type: str  # trigger, process, decision, gap
    status: str  # trigger, current, warning, critical-gap
    title: str
    description: str
    actors: List[str] = []
    subSteps: List[str] = []
    dependencies: List[str] = []
    parallelWith: List[str] = []
    failures: List[str] = []
    blocking: Optional[str] = None
    currentState: Optional[str] = None
    idealState: Optional[str] = None
    gap: Optional[str] = None
    impact: Optional[str] = None
    timeEstimate: Optional[str] = None
    position: Dict[str, float] = {"x": 0, "y": 0}

class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    color: str = "blue"  # For visual distinction
    icon: str = "folder"  # Icon identifier
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processCount: int = 0  # Denormalized for performance
    isDefault: bool = False  # First workspace created is default

class Process(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    workspaceId: Optional[str] = None  # NEW: Link to workspace
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    publishedAt: Optional[datetime] = None  # Added for publish feature
    version: int = 1
    status: str = "draft"  # draft, published, archived
    nodes: List[ProcessNode] = []
    actors: List[str] = []
    criticalGaps: List[str] = []
    improvementOpportunities: List[Dict[str, Any]] = []
    theme: str = "minimalist"
    healthScore: int = 0
    views: int = 0

class ProcessInput(BaseModel):
    text: str
    inputType: str  # voice_transcript, document, chat
    additionalContext: Optional[str] = None  # Optional context added via voice/chat

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    processId: str
    nodeId: str
    content: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isResolved: bool = False

# ============ AI Service ============

class AIService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    def _preprocess_and_detect_boundaries(self, text: str) -> Dict[str, Any]:
        """
        Preprocess text to detect process boundaries using pattern matching.
        Conservative approach to avoid false positives.
        """
        process_titles = []
        
        # More conservative patterns - must have clear process indicators
        patterns = [
            # Pattern 1: Explicit "Process" keyword
            r'^([A-Z][A-Za-z\s&/\-–()]{20,120}?Process)$',
            # Pattern 2: Title with dash/en-dash separator (e.g., "Job Posting - Security")
            r'^([A-Z][A-Za-z\s&/()]{15,80}?)\s*[-–]\s*([A-Za-z\s/&()]{3,40})$',
            # Pattern 3: Title with (All) or similar suffix
            r'^([A-Z][A-Za-z\s&/\-–]{15,80}?)\s*\(All\)$',
            # Pattern 4: Title ending with "Admin" or specific keywords
            r'^([A-Z][A-Za-z\s&/\-–]{15,80}?(?:Admin|Employee))\s*\(All\)$',
        ]
        
        lines = text.split('\n')
        seen_titles = set()
        seen_normalized = set()
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 20 or len(line) > 150:  # Strict length bounds
                continue
            
            # Skip lines that are clearly not process titles
            skip_keywords = ['candidate', 'recruiter', 'hiring manager', 'approved', 'requisition administrator', 
                           'hrmm', 'hmm', 'wh ', 'hra', 'hrbp', 'page', '==']
            if any(skip.lower() in line.lower() for skip in skip_keywords):
                continue
            
            matched = False
            for pattern in patterns:
                match = re.match(pattern, line, re.MULTILINE)
                if match:
                    # Extract the full title
                    if len(match.groups()) > 1 and match.group(2):
                        # Pattern with two groups (e.g., "Title - Detail")
                        title = f"{match.group(1).strip()} {match.group(2).strip()}"
                    else:
                        title = match.group(1).strip()
                    
                    # Normalize for duplicate checking (remove extra spaces, standardize separators)
                    normalized = ' '.join(title.lower().split())
                    normalized = normalized.replace('–', '-')  # Standardize dashes
                    
                    # Check if we've seen this title (or very similar)
                    if normalized in seen_normalized:
                        continue
                    
                    # Must contain at least one strong process keyword
                    strong_keywords = ['process', 'requisition', 'posting', 'onboarding', 'offer', 'application']
                    if not any(keyword in title.lower() for keyword in strong_keywords):
                        continue
                    
                    # Additional validation: check context - next few lines should have content
                    has_content = False
                    for j in range(i+1, min(i+5, len(lines))):
                        next_line = lines[j].strip()
                        if len(next_line) > 30:  # Has substantial content nearby
                            has_content = True
                            break
                    
                    if has_content and title not in seen_titles:
                        process_titles.append(title)
                        seen_titles.add(title)
                        seen_normalized.add(normalized)
                        logger.debug(f"Found process title: {title}")
                        matched = True
                        break
            
            # Special handling for compound titles (e.g., "Manage Applications & Offer" + "Security")
            if not matched and len(line) > 20 and len(line) < 60:
                # Check if this looks like a base title that might have variants
                if ('manage' in line.lower() and 'offer' in line.lower()) or \
                   ('raise' in line.lower() and 'requisition' in line.lower()):
                    # Look at next line to see if it's a variant (Security, Group, etc.)
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        variant_keywords = ['security', 'parking', 'group', 'casual']
                        if any(kw in next_line.lower() for kw in variant_keywords) and len(next_line) < 40:
                            # This is a split title
                            combined = f"{line} {next_line}".strip()
                            normalized = ' '.join(combined.lower().split()).replace('–', '-')
                            if normalized not in seen_normalized and len(combined) > 20:
                                # Validate it's a real process
                                strong_keywords = ['requisition', 'posting', 'offer', 'application', 'manage']
                                if any(keyword in combined.lower() for keyword in strong_keywords):
                                    process_titles.append(combined)
                                    seen_titles.add(combined)
                                    seen_normalized.add(normalized)
                                    logger.debug(f"Found compound process title: {combined}")
        
        # Final cleanup: Remove any title that's a substring of another (keep the longer one)
        filtered_titles = []
        for title in process_titles:
            is_subset = False
            for other in process_titles:
                if title != other and title in other:
                    is_subset = True
                    break
            if not is_subset:
                filtered_titles.append(title)
        
        process_count = len(filtered_titles)
        high_confidence = process_count >= 2 and any('process' in t.lower() or 'requisition' in t.lower() for t in filtered_titles)
        
        print(f"[DEBUG] Preprocessing found {process_count} processes: {filtered_titles}", flush=True)
        logger.info(f"Preprocessing found {process_count} unique process titles: {filtered_titles}")
        
        return {
            'process_count': process_count,
            'process_titles': filtered_titles,
            'high_confidence': high_confidence
        }
    
    def _smart_truncate(self, text: str, max_length: int, process_titles: List[str]) -> str:
        """
        Smart truncation that tries to preserve process boundaries.
        """
        if len(text) <= max_length:
            return text
        
        # Try to find a good truncation point near a process boundary
        truncated = text[:max_length]
        
        # Look for the last process title before max_length
        best_cut = max_length
        for title in process_titles:
            last_occurrence = truncated.rfind(title)
            if last_occurrence > max_length * 0.7:  # If title is in last 30%
                # Find the end of that process (next title or end)
                next_title_pos = max_length
                for other_title in process_titles:
                    if other_title != title:
                        pos = text.find(other_title, last_occurrence + len(title))
                        if pos != -1 and pos < next_title_pos:
                            next_title_pos = pos
                
                if next_title_pos < len(text):
                    best_cut = min(next_title_pos, max_length)
                    break
        
        return text[:best_cut] + "\n\n[Document truncated. Multiple processes may follow.]"
    
    async def parse_process(self, input_text: str, input_type: str) -> Dict[str, Any]:
        """Parse input text and extract process structure using Claude - can detect multiple processes"""
        try:
            # First, preprocess to detect clear process boundaries
            process_detection = self._preprocess_and_detect_boundaries(input_text)
            
            print(f"[DEBUG] Preprocessing detected {process_detection['process_count']} potential processes", flush=True)
            print(f"[DEBUG] Process titles: {process_detection['process_titles'][:5]}", flush=True)
            print(f"[DEBUG] High confidence: {process_detection['high_confidence']}", flush=True)
            
            logger.info(f"Preprocessing detected {process_detection['process_count']} potential processes")
            logger.info(f"Process titles: {process_detection['process_titles']}")
            
            # If preprocessing found multiple clear processes (≥2), use that directly
            if process_detection['process_count'] >= 2 and process_detection['high_confidence']:
                print(f"[DEBUG] HIGH CONFIDENCE MULTI-PROCESS: Parsing {process_detection['process_count']} processes", flush=True)
                logger.info(f"High confidence multi-process detection: {process_detection['process_count']} processes")
                return await self._parse_multiple_processes(
                    input_text, 
                    input_type, 
                    {
                        'multipleProcesses': True,
                        'processCount': process_detection['process_count'],
                        'processTitles': process_detection['process_titles']
                    }
                )
            
            # Otherwise, fall back to AI detection for ambiguous cases
            print(f"[DEBUG] Using AI detection (low confidence or <2 processes)", flush=True)
            logger.info("Using AI detection for process identification")
            
            # Limit input size but keep it generous for multi-process documents
            max_length = 30000  # Increased significantly
            truncated_text = input_text
            if len(input_text) > max_length:
                logger.warning(f"Input text too long ({len(input_text)} chars), truncating to {max_length}")
                # Try to truncate at a process boundary if possible
                truncated_text = self._smart_truncate(input_text, max_length, process_detection['process_titles'])
            
            logger.info(f"Starting AI detection for {input_type} with {len(truncated_text)} characters")
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"detect_{uuid.uuid4()}",
                system_message="You are an expert at identifying process workflows in documents. Analyze carefully and detect ALL distinct processes."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            detection_prompt = f"""CRITICAL TASK: Analyze this {input_type} to detect if it contains MULTIPLE DISTINCT PROCESS WORKFLOWS.

PREPROCESSING HINTS:
- Preprocessing detected {process_detection['process_count']} potential processes
- Potential process titles found: {', '.join(process_detection['process_titles'][:5])}

FULL TEXT:
{truncated_text}

YOU MUST:
1. Look for MULTIPLE separate process flowcharts or workflow descriptions
2. Check for section headers like "Process:", different workflow titles, page separators "==End of OCR for page X=="
3. Identify if different sections describe DIFFERENT workflows (not steps of ONE workflow)
4. Each distinct process has its own START and END, own actors, own purpose

EXAMPLES of MULTIPLE processes:
- Multiple titled sections: "Recruitment Process", "Onboarding Process" (separate workflows)
- Page breaks with new process headers
- Different process maps with distinct names

EXAMPLES of SINGLE process:
- One workflow with multiple steps (even if 10+ steps)
- Sequential phases within ONE end-to-end process

Return ONLY this JSON (no markdown, no explanations):
{{
  "multipleProcesses": true or false,
  "processCount": exact number,
  "processTitles": ["Exact Title 1 from Document", "Exact Title 2 from Document", ...],
  "confidence": "high" or "medium" or "low",
  "reasoning": "brief explanation"
}}

BE THOROUGH. The preprocessing hints should guide you."""
            
            detection_message = UserMessage(text=detection_prompt)
            detection_response = await chat.send_message(detection_message)
            
            logger.info(f"AI Detection response: {detection_response[:500]}")
            
            # Parse detection response
            detection_text = detection_response.strip()
            if detection_text.startswith('```'):
                start = detection_text.find('{')
                end = detection_text.rfind('}')
                if start != -1 and end != -1:
                    detection_text = detection_text[start:end+1]
            
            detection_result = json.loads(detection_text)
            logger.info(f"AI Detection result: {detection_result}")
            
            # If AI OR preprocessing detected multiple (≥2), parse them separately
            if detection_result.get('multipleProcesses') and detection_result.get('processCount', 0) >= 2:
                logger.info(f"AI confirmed multiple processes: {detection_result.get('processCount')}")
                return await self._parse_multiple_processes(input_text, input_type, detection_result)
            else:
                # Single process - use existing logic
                logger.info("Single process detected, using standard parsing")
                return await self._parse_single_process(truncated_text, input_type)
                
        except Exception as e:
            logger.error(f"Error in parse_process: {e}")
            # Fallback to single process parsing
            return await self._parse_single_process(input_text, input_type)
    
    async def _parse_single_process(self, input_text: str, input_type: str) -> Dict[str, Any]:
        """Parse a single process from input text"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"parse_{uuid.uuid4()}",
                system_message="You are FlowForge AI. Extract ONLY the 5-8 most critical steps. Be concise. Return valid JSON only."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            prompt = f"""Extract ONLY the 5-8 most critical steps from this {input_type}. Be concise.

{input_text}

CRITICAL: Return ONLY valid JSON. No markdown. No explanations.

Extract:
- Main process steps (5-8 max)
- Key actors
- Critical gaps only

Return this JSON structure:
{{
  "processName": "string",
  "description": "brief",
  "actors": ["actor1", "actor2"],
  "nodes": [
    {{
      "id": "node-1",
      "type": "trigger",
      "status": "trigger",
      "title": "Clear title (max 6 words)",
      "description": "Brief description",
      "actors": ["who"],
      "subSteps": ["step 1", "step 2"],
      "dependencies": [],
      "parallelWith": [],
      "failures": [],
      "blocking": null,
      "currentState": "brief",
      "idealState": "brief",
      "gap": null,
      "impact": "medium",
      "timeEstimate": null
    }}
  ],
  "criticalGaps": ["gap 1"],
  "improvementOpportunities": [
    {{
      "description": "brief",
      "type": "automation",
      "estimatedSavings": "time"
    }}
  ]
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse JSON from response
            response_text = response.strip()
            if response_text.startswith('```'):
                start = response_text.find('{')
                end = response_text.rfind('}')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
            parsed = json.loads(response_text)
            return {"multipleProcesses": False, "processes": [parsed]}
            
        except Exception as e:
            logger.error(f"Error parsing single process: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to parse process: {str(e)}")
    
    async def _parse_multiple_processes(self, input_text: str, input_type: str, detection_result: Dict) -> Dict[str, Any]:
        """Parse multiple processes from input text - ONE AT A TIME to avoid truncation"""
        try:
            process_titles = detection_result.get('processTitles', [])
            process_count = detection_result.get('processCount', len(process_titles))
            
            print(f"[DEBUG] Starting ONE-BY-ONE parsing for {process_count} processes", flush=True)
            logger.info(f"Parsing {process_count} processes ONE AT A TIME: {process_titles}")
            
            # Parse each process individually to avoid truncation
            processes_array = []
            
            for i, process_title in enumerate(process_titles):
                print(f"[DEBUG] Parsing process {i+1}/{process_count}: {process_title}", flush=True)
                
                try:
                    # Extract the section of text relevant to this process
                    process_text = self._extract_process_section(input_text, process_title, process_titles)
                    
                    # Parse this ONE process
                    chat = LlmChat(
                        api_key=self.api_key,
                        session_id=f"parse_{uuid.uuid4()}",
                        system_message="Extract this single process concisely. Return valid JSON only."
                    ).with_model("anthropic", "claude-4-sonnet-20250514")
                    
                    prompt = f"""Extract ONLY this process: "{process_title}"

RELEVANT TEXT:
{process_text[:5000]}

Extract 3-5 key steps. Be CONCISE. Assign varied status for visual distinction:
- First node: "trigger" status
- Active/current steps: "current" status  
- Steps with issues: "warning" status
- Last step: "current" or "completed" status

Return ONLY this JSON (no markdown):
{{
  "processName": "{process_title}",
  "description": "Brief purpose (1 sentence)",
  "actors": ["Actor1", "Actor2"],
  "nodes": [
    {{
      "id": "node-1",
      "type": "trigger",
      "status": "trigger",
      "title": "Step title",
      "description": "Brief",
      "actors": ["Who"],
      "subSteps": [],
      "dependencies": [],
      "parallelWith": [],
      "failures": [],
      "blocking": null,
      "currentState": "",
      "idealState": "",
      "gap": null,
      "impact": "medium",
      "timeEstimate": null
    }},
    {{
      "id": "node-2",
      "type": "step",
      "status": "current",
      "title": "Step 2",
      "description": "Brief",
      "actors": ["Who"],
      "subSteps": [],
      "dependencies": [],
      "parallelWith": [],
      "failures": [],
      "blocking": null,
      "currentState": "",
      "idealState": "",
      "gap": "Describe issue if exists",
      "impact": "medium",
      "timeEstimate": null
    }}
  ],
  "criticalGaps": ["gap description if any"],
  "improvementOpportunities": [
    {{
      "description": "brief improvement description",
      "type": "automation/standardization/communication",
      "estimatedSavings": "time saved or benefit"
    }}
  ]
}}

Use status values: "trigger", "current", "warning" for variety. Include gaps where appropriate."""
                    
                    message = UserMessage(text=prompt)
                    response = await chat.send_message(message)
                    
                    # Parse this process
                    response_text = response.strip()
                    if response_text.startswith('```'):
                        start = response_text.find('{')
                        end = response_text.rfind('}')
                        if start != -1 and end != -1:
                            response_text = response_text[start:end+1]
                    
                    process_data = json.loads(response_text)
                    processes_array.append(process_data)
                    print(f"[DEBUG] ✅ Successfully parsed process {i+1}: {process_title}", flush=True)
                    
                except Exception as e:
                    print(f"[DEBUG] ⚠️ Failed to parse process {i+1} ({process_title}): {e}", flush=True)
                    logger.error(f"Failed to parse process '{process_title}': {e}")
                    # Continue with next process instead of failing completely
                    continue
            
            print(f"[DEBUG] Successfully parsed {len(processes_array)}/{process_count} processes", flush=True)
            logger.info(f"Successfully parsed {len(processes_array)} out of {process_count} processes")
            
            if len(processes_array) == 0:
                raise Exception("Failed to parse any processes")
            
            return {
                "multipleProcesses": True,
                "processCount": len(processes_array),
                "processes": processes_array
            }
            
        except Exception as e:
            print(f"[DEBUG] Critical error in multi-process parsing: {e}", flush=True)
            logger.error(f"Error parsing multiple processes: {e}", exc_info=True)
            # Fallback: try to parse as single process
            print(f"[DEBUG] Falling back to single process parsing", flush=True)
            logger.info("Falling back to single process parsing due to error")
            return await self._parse_single_process(input_text[:30000], input_type)
    
    def _extract_process_section(self, full_text: str, process_title: str, all_titles: List[str]) -> str:
        """Extract the section of text relevant to a specific process"""
        # Find where this process starts
        start_pos = full_text.find(process_title)
        if start_pos == -1:
            # Try case-insensitive search
            start_pos = full_text.lower().find(process_title.lower())
        
        if start_pos == -1:
            return full_text[:5000]  # Return first 5k chars as fallback
        
        # Find where the next process starts
        end_pos = len(full_text)
        for other_title in all_titles:
            if other_title != process_title:
                next_pos = full_text.find(other_title, start_pos + len(process_title))
                if next_pos != -1 and next_pos < end_pos:
                    end_pos = next_pos
        
        # Extract this section with some buffer
        section = full_text[max(0, start_pos - 100):min(len(full_text), end_pos + 100)]
        return section
    
    async def generate_ideal_state(self, process_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ideal state vision for a process"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"ideal_{uuid.uuid4()}",
                system_message="You are FlowForge AI, an expert at process improvement."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            prompt = f"""Given this process with identified gaps:
{json.dumps(process_data, indent=2)}

CRITICAL: Return ONLY the JSON object, no explanations, no markdown, no code blocks.

Generate a comprehensive "Ideal State" vision that:
1. Groups improvements into 3-5 clear categories
2. For each category:
   - Clear title with relevant emoji
   - 3-5 specific, actionable improvements
   - Expected outcomes/benefits
3. Prioritizes by impact (mark CRITICAL items)
4. Estimates time/cost savings where possible

Return this exact JSON structure (and NOTHING else):
{{
  "vision": "One paragraph describing the fully optimized process",
  "categories": [
    {{
      "title": "Category Name",
      "icon": "🎯",
      "priority": "critical",
      "improvements": ["Specific improvement 1", "Specific improvement 2"]
    }}
  ],
  "expectedOutcomes": {{
    "operational": ["benefit 1", "benefit 2"],
    "business": ["benefit 1", "benefit 2"]
  }},
  "estimatedImpact": {{
    "timeSaved": "X hours per week",
    "costSaved": "Y per year",
    "efficiencyGain": "Z%"
  }}
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse JSON from response - handle markdown code blocks
            response_text = response.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                start = response_text.find('{')
                end = response_text.rfind('}')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
            return json.loads(response_text)
            
        except Exception as e:
            logger.error(f"Error generating ideal state: {e}")
            return {
                "vision": "Unable to generate ideal state. Please check your API credits.",
                "categories": [],
                "expectedOutcomes": {"operational": [], "business": []},
                "estimatedImpact": {}
            }
    
    async def chat_message(self, conversation_history: List[Dict[str, str]], user_message: str) -> str:
        """Handle interactive chat for process documentation"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"chat_{uuid.uuid4()}",
                system_message="""You are FlowForge AI, helping users document their processes through conversation.

Your goal:
- Ask clear, specific questions about their process
- Build a complete picture step by step
- Probe for gaps, failures, and edge cases
- Be friendly and encouraging

Ask about:
- Who starts the process?
- What are the steps in order?
- What happens in parallel?
- What can go wrong?
- Who are the actors/systems?
- What are the dependencies?
- What's the current state vs ideal state?

When you have enough information, say:
"Perfect! I have everything I need. [Summary of what you captured]"

Keep responses concise (2-3 sentences max)."""
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            message = UserMessage(text=user_message)
            response = await chat.send_message(message)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return "I'm having trouble processing that. Could you rephrase?"

ai_service = AIService()

# ============ Routes ============

@api_router.get("/")
async def root():
    return {"message": "FlowForge AI API"}

@api_router.post("/process/parse", response_model=Dict[str, Any])
async def parse_process(input_data: ProcessInput):
    """Parse input and extract process structure"""
    try:
        # Merge document text with additional context if provided
        text_to_parse = input_data.text
        if input_data.additionalContext:
            text_to_parse = f"{input_data.text}\n\n---ADDITIONAL CONTEXT FROM USER---\n{input_data.additionalContext}"
        
        result = await ai_service.parse_process(text_to_parse, input_data.inputType)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/process/{process_id}/publish", response_model=Process)
async def publish_process(process_id: str):
    """
    Publish a process - marks it as official and ready to share.
    This creates a version snapshot for audit trail.
    """
    try:
        # Get the current process
        process = await db.processes.find_one({"id": process_id})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Update status to published
        update_data = {
            "status": "published",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "publishedAt": datetime.now(timezone.utc).isoformat(),
            "version": process.get('version', 1) + 1  # Increment version
        }
        
        await db.processes.update_one(
            {"id": process_id},
            {"$set": update_data}
        )
        
        # Fetch updated process
        updated = await db.processes.find_one({"id": process_id})
        updated['_id'] = str(updated['_id'])
        return Process(**updated)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to publish process: {str(e)}")

@api_router.patch("/process/{process_id}/unpublish", response_model=Process)
async def unpublish_process(process_id: str):
    """
    Unpublish a process - returns it to draft status for editing.
    """
    try:
        process = await db.processes.find_one({"id": process_id})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        update_data = {
            "status": "draft",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.processes.update_one(
            {"id": process_id},
            {"$set": update_data}
        )
        
        updated = await db.processes.find_one({"id": process_id})
        updated['_id'] = str(updated['_id'])
        return Process(**updated)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unpublishing process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unpublish process: {str(e)}")

@api_router.patch("/process/{process_id}/move")
async def move_process_to_workspace(process_id: str, request: dict):
    """
    Move a process to a different workspace.
    Updates process counts for both source and destination workspaces.
    """
    try:
        workspace_id = request.get('workspaceId')
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspaceId is required")
        
        # Get the process
        process = await db.processes.find_one({"id": process_id})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Verify target workspace exists
        target_workspace = await db.workspaces.find_one({"id": workspace_id})
        if not target_workspace:
            raise HTTPException(status_code=404, detail="Target workspace not found")
        
        old_workspace_id = process.get('workspaceId')
        
        # Update process workspace
        await db.processes.update_one(
            {"id": process_id},
            {"$set": {
                "workspaceId": workspace_id,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update process counts for both workspaces
        if old_workspace_id:
            old_count = await db.processes.count_documents({"workspaceId": old_workspace_id})
            await db.workspaces.update_one(
                {"id": old_workspace_id},
                {"$set": {"processCount": old_count}}
            )
        
        new_count = await db.processes.count_documents({"workspaceId": workspace_id})
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {"processCount": new_count}}
        )
        
        return {"message": "Process moved successfully", "workspaceId": workspace_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to move process: {str(e)}")

# ============ Workspace APIs ============

@api_router.get("/workspaces", response_model=List[Workspace])
async def get_workspaces():
    """Get all workspaces"""
    try:
        workspaces = await db.workspaces.find().to_list(length=None)
        for ws in workspaces:
            ws['_id'] = str(ws['_id'])
            # Convert datetime to ISO string
            if isinstance(ws.get('createdAt'), datetime):
                ws['createdAt'] = ws['createdAt'].isoformat()
            if isinstance(ws.get('updatedAt'), datetime):
                ws['updatedAt'] = ws['updatedAt'].isoformat()
        return [Workspace(**ws) for ws in workspaces]
    except Exception as e:
        logger.error(f"Error fetching workspaces: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch workspaces: {str(e)}")

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace: Workspace):
    """Create a new workspace"""
    try:
        workspace_dict = workspace.model_dump()
        workspace_dict['createdAt'] = workspace_dict['createdAt'].isoformat()
        workspace_dict['updatedAt'] = workspace_dict['updatedAt'].isoformat()
        
        # If this is the first workspace, mark it as default
        existing_count = await db.workspaces.count_documents({})
        if existing_count == 0:
            workspace_dict['isDefault'] = True
        
        await db.workspaces.insert_one(workspace_dict)
        workspace_dict['_id'] = str(workspace_dict['_id'])
        return Workspace(**workspace_dict)
    except Exception as e:
        logger.error(f"Error creating workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")

@api_router.get("/workspaces/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str):
    """Get a specific workspace"""
    try:
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        workspace['_id'] = str(workspace['_id'])
        if isinstance(workspace.get('createdAt'), datetime):
            workspace['createdAt'] = workspace['createdAt'].isoformat()
        if isinstance(workspace.get('updatedAt'), datetime):
            workspace['updatedAt'] = workspace['updatedAt'].isoformat()
        return Workspace(**workspace)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch workspace: {str(e)}")

@api_router.put("/workspaces/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, workspace: Workspace):
    """Update a workspace"""
    try:
        workspace_dict = workspace.model_dump()
        workspace_dict['updatedAt'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": workspace_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        updated = await db.workspaces.find_one({"id": workspace_id})
        updated['_id'] = str(updated['_id'])
        if isinstance(updated.get('createdAt'), datetime):
            updated['createdAt'] = updated['createdAt'].isoformat()
        if isinstance(updated.get('updatedAt'), datetime):
            updated['updatedAt'] = updated['updatedAt'].isoformat()
        return Workspace(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update workspace: {str(e)}")

@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str):
    """Delete a workspace - processes will be moved to default workspace"""
    try:
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Don't allow deleting default workspace if it has processes
        if workspace.get('isDefault'):
            count = await db.processes.count_documents({"workspaceId": workspace_id})
            if count > 0:
                raise HTTPException(status_code=400, detail="Cannot delete default workspace with processes")
        
        # Move all processes to default workspace
        default_workspace = await db.workspaces.find_one({"isDefault": True})
        if default_workspace and default_workspace['id'] != workspace_id:
            await db.processes.update_many(
                {"workspaceId": workspace_id},
                {"$set": {"workspaceId": default_workspace['id']}}
            )
        
        await db.workspaces.delete_one({"id": workspace_id})
        return {"message": "Workspace deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete workspace: {str(e)}")

# ============ Process APIs ============
        logger.error(f"Error unpublishing process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unpublish process: {str(e)}")

@api_router.post("/process", response_model=Process)
async def create_process(process_data: dict):
    """Create a new process with security validation"""
    try:
        # SECURITY: Sanitize text fields to prevent XSS
        text_fields = ['name', 'description']
        for field in text_fields:
            if field in process_data and process_data[field]:
                # Remove script tags and other dangerous HTML
                process_data[field] = re.sub(r'<script[^>]*>.*?</script>', '', process_data[field], flags=re.DOTALL | re.IGNORECASE)
                process_data[field] = re.sub(r'<iframe[^>]*>.*?</iframe>', '', process_data[field], flags=re.DOTALL | re.IGNORECASE)
                process_data[field] = re.sub(r'on\w+\s*=', '', process_data[field], flags=re.IGNORECASE)  # Remove event handlers
        
        # Ensure required datetime fields are present
        now = datetime.now(timezone.utc)
        if 'createdAt' not in process_data or not process_data['createdAt']:
            process_data['createdAt'] = now
        if 'updatedAt' not in process_data or not process_data['updatedAt']:
            process_data['updatedAt'] = now
        if 'publishedAt' not in process_data:
            process_data['publishedAt'] = None
            
        # Normalize improvementOpportunities - convert strings to dicts
        if 'improvementOpportunities' in process_data:
            opportunities = process_data['improvementOpportunities']
            if isinstance(opportunities, list):
                normalized = []
                for item in opportunities:
                    if isinstance(item, str):
                        # Convert string to dict format
                        normalized.append({
                            'description': item,
                            'priority': 'medium',
                            'impact': 'medium'
                        })
                    elif isinstance(item, dict):
                        normalized.append(item)
                process_data['improvementOpportunities'] = normalized
        
        # Normalize criticalGaps - ensure it's a list of strings
        if 'criticalGaps' in process_data:
            gaps = process_data['criticalGaps']
            if isinstance(gaps, list):
                process_data['criticalGaps'] = [str(g) if not isinstance(g, str) else g for g in gaps]
            
        # VALIDATION: Check required fields
        required_fields = ['name']
        missing_fields = [field for field in required_fields if field not in process_data or not process_data[field]]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
            
        # Create and validate Process object
        process = Process(**process_data)
        
        # Convert to dict for MongoDB
        doc = process.model_dump()
        doc['createdAt'] = doc['createdAt'].isoformat() if isinstance(doc['createdAt'], datetime) else doc['createdAt']
        doc['updatedAt'] = doc['updatedAt'].isoformat() if isinstance(doc['updatedAt'], datetime) else doc['updatedAt']
        if doc.get('publishedAt'):
            doc['publishedAt'] = doc['publishedAt'].isoformat() if isinstance(doc['publishedAt'], datetime) else doc['publishedAt']
        
        await db.processes.insert_one(doc)
        return process
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating process: {e}")
        # Return 422 for validation errors instead of 500
        if 'validation error' in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/process", response_model=List[Process])
async def get_processes(workspace_id: Optional[str] = None):
    """Get all processes, optionally filtered by workspace"""
    try:
        query = {}
        if workspace_id:
            query['workspaceId'] = workspace_id
        
        processes = await db.processes.find(query, {"_id": 0}).to_list(1000)
        
        for process in processes:
            if isinstance(process.get('createdAt'), str):
                process['createdAt'] = datetime.fromisoformat(process['createdAt'])
            if isinstance(process.get('updatedAt'), str):
                process['updatedAt'] = datetime.fromisoformat(process['updatedAt'])
            if isinstance(process.get('publishedAt'), str):
                process['publishedAt'] = datetime.fromisoformat(process['publishedAt'])
        
        return processes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/process/{process_id}", response_model=Process)
async def get_process(process_id: str):
    """Get a specific process"""
    try:
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if isinstance(process.get('createdAt'), str):
            process['createdAt'] = datetime.fromisoformat(process['createdAt'])
        if isinstance(process.get('updatedAt'), str):
            process['updatedAt'] = datetime.fromisoformat(process['updatedAt'])
        
        # Increment views
        await db.processes.update_one(
            {"id": process_id},
            {"$inc": {"views": 1}}
        )
        
        return process
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/process/{process_id}", response_model=Process)
async def update_process(process_id: str, process: Process):
    """Update a process"""
    try:
        process.updatedAt = datetime.now(timezone.utc)
        process.version += 1
        
        doc = process.model_dump()
        doc['createdAt'] = doc['createdAt'].isoformat()
        doc['updatedAt'] = doc['updatedAt'].isoformat()
        
        await db.processes.update_one(
            {"id": process_id},
            {"$set": doc}
        )
        
        return process
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/process/{process_id}")
async def delete_process(process_id: str):
    """Delete a process"""
    try:
        result = await db.processes.delete_one({"id": process_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Process not found")
        return {"message": "Process deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/process/{process_id}/ideal-state")
async def generate_ideal_state(process_id: str):
    """Generate ideal state for a process"""
    try:
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        ideal_state = await ai_service.generate_ideal_state(process)
        return ideal_state
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/chat")
async def chat(data: Dict[str, Any]):
    """Handle chat messages"""
    try:
        history = data.get("history", [])
        message = data.get("message", "")
        
        response = await ai_service.chat_message(history, message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/comment", response_model=Comment)
async def create_comment(comment: Comment):
    """Create a comment on a process node"""
    try:
        doc = comment.model_dump()
        doc['createdAt'] = doc['createdAt'].isoformat()
        
        await db.comments.insert_one(doc)
        return comment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/comment/{process_id}", response_model=List[Comment])
async def get_comments(process_id: str):
    """Get comments for a process"""
    try:
        comments = await db.comments.find({"processId": process_id}, {"_id": 0}).to_list(1000)
        
        for comment in comments:
            if isinstance(comment.get('createdAt'), str):
                comment['createdAt'] = datetime.fromisoformat(comment['createdAt'])
        
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and extract text from documents"""
    if not DOCUMENT_SUPPORT:
        raise HTTPException(status_code=501, detail="Document processing not available")
    
    try:
        content = await file.read()
        text = ""
        
        if file.filename.endswith('.pdf'):
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        
        elif file.filename.endswith('.docx'):
            doc = docx.Document(io.BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        
        elif file.filename.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)
        
        else:
            text = content.decode('utf-8')
        
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

@api_router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper via Emergent LLM key"""
    if not OPENAI_AVAILABLE:
        raise HTTPException(status_code=501, detail="OpenAI transcription not available")
    
    try:
        # Get Emergent LLM key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Read audio file
        audio_content = await file.read()
        
        # Create a temporary file-like object
        audio_file = io.BytesIO(audio_content)
        audio_file.name = file.filename or "audio.webm"
        
        # Transcribe using Whisper
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        
        return {"text": transcript.text}
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

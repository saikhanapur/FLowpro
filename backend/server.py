from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
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
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
from cache_service import cache_service
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

# Guest mode configuration
GUEST_SESSION_COLLECTION = "guest_sessions"

async def create_guest_session(request: Request) -> str:
    """Create a temporary guest session ID"""
    # Use a combination of IP and timestamp for guest session
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    return guest_id

async def get_guest_session(request: Request) -> Optional[str]:
    """Get guest session ID from cookie or create new"""
    guest_id = request.cookies.get("guest_session")
    if not guest_id:
        guest_id = await create_guest_session(request)
    return guest_id

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

# User and Authentication Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: Optional[str] = None  # None for Google OAuth users
    picture: Optional[str] = None  # Profile picture URL from Google
    auth_method: str = "email"  # "email" or "google"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    token: str
    expiresAt: datetime
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleSessionRequest(BaseModel):
    session_id: str

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
    userId: Optional[str] = None  # Owner of the workspace
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processCount: int = 0  # Denormalized for performance
    isDefault: bool = False  # First workspace created is default

class Process(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    userId: Optional[str] = None  # Owner of the process (or guest session ID)
    workspaceId: Optional[str] = None  # Link to workspace
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
    isGuest: bool = False  # Guest mode flag
    guestCreatedAt: Optional[str] = None  # When guest process was created
    guestEditCount: int = 0  # Track edits in guest mode (limit to 1)

class ProcessInput(BaseModel):
    text: str
    inputType: str  # voice_transcript, document, chat
    additionalContext: Optional[str] = None  # Optional context added via voice/chat
    contextAnswers: Optional[Dict[str, str]] = None  # Smart question answers

class SmartQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    why_asking: str
    category: str  # "roles", "thresholds", "timing", "systems", "escalation"

class DocumentAnalysis(BaseModel):
    process_type: str
    complexity: str  # "low", "medium", "high"
    confidence: float
    detected_steps: int
    detected_actors: int
    suggested_questions: List[SmartQuestion]
    summary: str
    is_multi_process: bool = False  # NEW: Flag for multi-process documents
    process_count: int = 1  # NEW: Number of processes detected

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    processId: str
    nodeId: str
    content: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isResolved: bool = False

class Share(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    processId: str
    accessLevel: str  # "view", "comment", "edit"
    
    # Owner tracking
    createdBy: str  # userId of share creator
    createdByName: str  # User's name for display
    
    # Expiration
    expiresAt: Optional[datetime] = None  # None = never expires
    isActive: bool = True  # Can be revoked without deleting
    
    # Usage tracking
    accessCount: int = 0
    lastAccessedAt: Optional[datetime] = None
    
    # Timestamps
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    revokedAt: Optional[datetime] = None

class CreateShareRequest(BaseModel):
    accessLevel: str
    expiresInDays: Optional[int] = None  # 7, 30, 90, or None for never

# Constants for validation
ALLOWED_ACCESS_LEVELS = ["view", "comment", "edit"]
ALLOWED_EXPIRATION_DAYS = [7, 30, 90, None]

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
    
    async def analyze_document(self, text: str) -> DocumentAnalysis:
        """
        Intelligent document analysis to understand complexity and suggest contextual questions.
        This is called BEFORE parsing to gather smart context.
        """
        try:
            logger.info(f"Starting smart document analysis for {len(text)} characters")
            
            # Quick preprocessing to get initial metrics and detect multiple processes
            process_detection = self._preprocess_and_detect_boundaries(text)
            
            # Check if multiple processes detected - if yes, skip smart questions
            is_multi_process = process_detection['process_count'] >= 2 and process_detection['high_confidence']
            
            if is_multi_process:
                logger.info(f"Multi-process document detected ({process_detection['process_count']} processes). Skipping smart questions.")
                return DocumentAnalysis(
                    process_type="Multiple Processes Detected",
                    complexity="high",
                    confidence=0.9,
                    detected_steps=process_detection['process_count'] * 5,  # Rough estimate
                    detected_actors=process_detection['process_count'] * 2,
                    suggested_questions=[],  # No questions for multi-process
                    summary=f"Found {process_detection['process_count']} distinct processes. You'll review each one individually.",
                    is_multi_process=True,
                    process_count=process_detection['process_count']
                )
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"analyze_{uuid.uuid4()}",
                system_message="You are an expert at analyzing business process documents and identifying what contextual information would improve AI flowchart generation."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            analysis_prompt = f"""TASK: Analyze this document to understand what it is and what SPECIFIC questions would help create a perfect flowchart.

DOCUMENT TEXT:
{text[:8000]}  

YOUR GOAL: Identify 2-3 SMART, SPECIFIC questions that would dramatically improve flowchart accuracy.

ANALYSIS REQUIREMENTS:
1. Process Type: What kind of process is this? (e.g., "Invoice Approval", "Customer Onboarding", "Bug Triage")
2. Complexity: Rate complexity (low: 1-3 steps, medium: 4-7 steps, high: 8+ steps or multiple decision points)
3. Confidence: How clear is this document? (0.0-1.0)
4. Detected Elements: Count approximate steps and actors
5. Smart Questions: Generate 2-3 targeted questions with multiple-choice options

QUESTION GUIDELINES:
- Ask about SPECIFIC things that are AMBIGUOUS or MISSING
- Provide 3-4 realistic multiple-choice options
- Categories: "roles", "thresholds", "timing", "systems", "escalation"
- ONLY ask if the answer would significantly improve the flowchart
- Each question must have a "why_asking" explanation

EXAMPLES OF GOOD QUESTIONS:
- "What's the approval amount threshold?" (when doc mentions approval but no specific amounts)
- "Who typically submits these requests?" (when actors are vague)
- "What happens if approval takes > 2 days?" (when timing/escalation unclear)
- "Which system is used for tracking?" (when "the system" is mentioned without specifics)

EXAMPLES OF BAD QUESTIONS:
- "What color should the flowchart be?" (irrelevant)
- "Do you want detailed or simple output?" (too vague)
- "Should we include edge cases?" (not specific enough)

Return ONLY this JSON (no markdown, no explanations):
{{
  "process_type": "Invoice Approval Process",
  "complexity": "medium",
  "confidence": 0.75,
  "detected_steps": 5,
  "detected_actors": 3,
  "summary": "Finance approval workflow with manager review and payment processing",
  "suggested_questions": [
    {{
      "id": "q1",
      "question": "What's the approval amount threshold?",
      "options": ["Under $1,000", "$1,000-$5,000", "$5,000-$10,000", "Over $10,000"],
      "why_asking": "Document mentions approval but no specific amount thresholds are defined",
      "category": "thresholds"
    }},
    {{
      "id": "q2",
      "question": "Who submits invoices in your organization?",
      "options": ["Employees", "Vendors/Suppliers", "Both", "Finance team only"],
      "why_asking": "Multiple actors mentioned but submission role is unclear",
      "category": "roles"
    }}
  ]
}}"""
            
            response = await chat.send_message(UserMessage(text=analysis_prompt))
            result = json.loads(response)
            
            # Add multi-process info
            result['is_multi_process'] = False
            result['process_count'] = 1
            
            logger.info(f"Document analysis complete: {result['process_type']} ({result['complexity']} complexity)")
            
            return DocumentAnalysis(**result)
            
        except Exception as e:
            logger.error(f"Document analysis failed: {e}")
            # Return basic analysis if AI fails
            return DocumentAnalysis(
                process_type="Business Process",
                complexity="medium",
                confidence=0.5,
                detected_steps=5,
                detected_actors=2,
                suggested_questions=[],
                summary="Unable to fully analyze document",
                is_multi_process=False,
                process_count=1
            )
    
    async def analyze_document_stream(self, text: str):
        """
        STREAMING version with real-time progress updates
        Yields SSE events to show what AI is finding
        """
        try:
            # Event 1: Start
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "start",
                    "message": "Starting intelligent analysis...",
                    "progress": 10
                })
            }
            
            await asyncio.sleep(0.1)  # Small delay for UX
            
            # Event 2: Check cache
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "cache_check",
                    "message": "🔍 Checking cache for similar documents...",
                    "progress": 20
                })
            }
            
            cached = cache_service.get_analysis_cache(text)
            if cached:
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "step": "cache_hit",
                        "message": "✨ Found cached analysis! (Instant result)",
                        "progress": 100
                    })
                }
                
                yield {
                    "event": "complete",
                    "data": json.dumps(cached)
                }
                return
            
            # Event 3: Preprocessing
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "preprocessing",
                    "message": f"📄 Analyzing {len(text):,} characters...",
                    "progress": 30
                })
            }
            
            process_detection = self._preprocess_and_detect_boundaries(text)
            is_multi_process = process_detection['process_count'] >= 2 and process_detection['high_confidence']
            
            if is_multi_process:
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "step": "multi_process",
                        "message": f"📊 Detected {process_detection['process_count']} distinct processes!",
                        "progress": 60
                    })
                }
                
                result = {
                    "process_type": "Multiple Processes Detected",
                    "complexity": "high",
                    "confidence": 0.9,
                    "detected_steps": process_detection['process_count'] * 5,
                    "detected_actors": process_detection['process_count'] * 2,
                    "suggested_questions": [],
                    "summary": f"Found {process_detection['process_count']} distinct processes. You'll review each one individually.",
                    "is_multi_process": True,
                    "process_count": process_detection['process_count']
                }
                
                yield {
                    "event": "complete",
                    "data": json.dumps(result)
                }
                return
            
            # Event 4: AI Analysis
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "ai_analysis",
                    "message": "🧠 Claude AI analyzing document structure...",
                    "progress": 50
                })
            }
            
            # Perform actual analysis (non-streaming for now)
            analysis = await self.analyze_document(text)
            
            # Event 5: Extracting insights
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "extracting",
                    "message": f"✨ Found: {analysis.process_type}",
                    "progress": 70
                })
            }
            
            await asyncio.sleep(0.2)
            
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "actors",
                    "message": f"👥 Detected {analysis.detected_actors} actors, {analysis.detected_steps} steps",
                    "progress": 85
                })
            }
            
            # Cache the result
            cache_service.set_analysis_cache(text, analysis.dict())
            
            yield {
                "event": "progress",
                "data": json.dumps({
                    "step": "caching",
                    "message": "💾 Caching for future use...",
                    "progress": 95
                })
            }
            
            # Event 6: Complete
            yield {
                "event": "complete",
                "data": json.dumps(analysis.dict())
            }
            
        except Exception as e:
            logger.error(f"Streaming analysis failed: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
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
                system_message="You are SuperHumanly AI. Extract ONLY the 5-8 most critical steps. Be concise. Return valid JSON only."
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
                system_message="You are SuperHumanly AI, an expert at process improvement."
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
                system_message="""You are SuperHumanly AI, helping users document their processes through conversation.

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
    
    async def analyze_process_intelligence(self, process_data: Dict) -> Dict[str, Any]:
        """
        Analyze process for intelligence insights:
        - Health score
        - Bottlenecks
        - Cost analysis
        - Recommendations
        """
        try:
            logger.info(f"Analyzing process intelligence for: {process_data.get('name', 'Unknown')}")
            
            nodes = process_data.get('nodes', [])
            
            # Calculate basic metrics
            step_count = len(nodes)
            decision_points = sum(1 for node in nodes if node.get('type') == 'decision' or '?' in node.get('title', ''))
            handoffs = sum(1 for node in nodes if 'actor' in node and len(set(n.get('actor') for n in nodes if 'actor' in n)) > 1)
            
            # Build analysis prompt
            process_description = f"""
Process Name: {process_data.get('name', 'Unknown Process')}
Number of Steps: {step_count}
Decision Points: {decision_points}
Detected Handoffs: {handoffs}

Steps:
{chr(10).join([f"{i+1}. {node.get('title', 'Step')} - {node.get('description', '')}" for i, node in enumerate(nodes)])}
"""
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"intelligence_{uuid.uuid4()}",
                system_message="You are an expert process analyst who helps companies identify inefficiencies and save money."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            intelligence_prompt = f"""You are an elite process intelligence analyst. Your goal: identify ACTIONABLE, QUANTIFIABLE opportunities for improvement.

CRITICAL LANGUAGE GUIDELINES:
- Use DESCRIPTIVE language (what you observe) NOT PRESCRIPTIVE (what they must do)
- Avoid alarmist terms: "life-safety", "critical failure", "severe", "dangerous"
- Frame as opportunities, not risks: "could improve" not "is broken"
- Use comparative language: "similar processes typically include..." not "you must have..."
- Be humble: "based on common patterns" not "industry requires"
- Never claim certainty about operational risk or system reliability
- Avoid legal/medical claims: "potentially life-threatening", "fails X% of time"

GOOD: "This step lacks documented backup procedures, which is commonly included in similar processes"
BAD: "This creates life-safety risks and will fail 20% of the time"

GOOD: "Similar processes typically include timeout definitions to maintain consistent pacing"
BAD: "Without timeouts, this process will stall indefinitely and fail"

PROCESS TO ANALYZE:
{process_description}

🎯 TIER 1 DETECTION PRIORITIES - FOCUS ON THESE FIRST:

═══════════════════════════════════════════════════════
1. MISSING ERROR HANDLING / "HAPPY PATH SYNDROME"
═══════════════════════════════════════════════════════
WHAT TO DETECT:
- Steps with external dependencies (services, people, systems) but no "what if it fails" branch
- Decision points without alternative paths
- Steps that could fail but have no documented fallback/escalation
- Single points of failure (one critical step with no backup)

DETECTION RULES:
✓ Step mentions: "call", "contact", "notify", "send", "request" → Check if alternative is documented
✓ Actor is external system/service → Look for documented backup procedure
✓ Step requires user input/action → Check if timeout guidance exists
✓ "Wait for" or "monitor" steps → Check for max duration guidance

EXAMPLE PATTERNS TO IDENTIFY:
- "Contact Emergency Services" without documented backup contact method
- "Await Manager Approval" without documented escalation for unavailability
- "Submit to External API" without documented retry or alternative procedure

IMPACT ESTIMATION (Use as Guidelines, Not Absolutes):
- Frame as: "Based on typical patterns in similar processes..."
- Typical external service unavailability: 5-10% during peak periods
- Common escalation contact unavailability: 10-15%
- Present as estimates with clear calculation basis

═══════════════════════════════════════════════════════
2. BOTTLENECKS / SERIAL WORK THAT SHOULD BE PARALLEL
═══════════════════════════════════════════════════════
WHAT TO DETECT:
- Steps happening in sequence that could run simultaneously
- Independent steps with different actors running serially
- No shared data dependency between consecutive steps

DETECTION RULES:
✓ Consecutive steps with different actors → Likely can be parallel
✓ Steps don't reference output of previous step → Can run parallel
✓ Both steps are "notify" or "inform" actions → Definitely parallel
✓ Steps with "THEN" between them → Check if dependency is real

EXAMPLE ISSUES TO FLAG:
- Step 3: "Notify Manager" THEN Step 4: "Call Emergency Services" (both independent)
- Step 2: "Check Inventory" THEN Step 3: "Send Email" (no dependency)

TIME SAVINGS CALCULATION:
- Time saved = (Longer step duration) - (Overlap time)
- Example: Step A (5 min) + Step B (3 min) in sequence = 8 min total
- If parallel: max(5, 3) = 5 min total → Save 3 min per occurrence
- Monthly savings = 3 min × occurrences/month × hourly rate

═══════════════════════════════════════════════════════
3. UNCLEAR OWNERSHIP / "WHO DOES THIS?"
═══════════════════════════════════════════════════════
WHAT TO DETECT:
- Steps without actor/owner assignment
- Generic actors like "Team", "Management", "Department"
- Multiple actors on one step without clear RACI (who's Responsible vs Consulted)
- Ambiguous phrasing: "Review and approve" without specifying who

DETECTION RULES:
✓ Actor is missing or null → Flag immediately
✓ Actor contains: "Team", "Group", "Department", "Staff" → Too generic
✓ Step has multiple actors → Must clarify roles (who initiates, who confirms, who escalates)
✓ Action verbs: "Review", "Approve", "Monitor" → Need clear single owner

EXAMPLE ISSUES TO FLAG:
- Step with actor "Management" instead of "CFO" or "VP Operations"
- "Notify stakeholders" without defining which stakeholders
- Multiple people listed but unclear who's accountable

IMPACT CALCULATION:
- Delay cost = (Average delay days × Daily cost of delay × Occurrences/month)
- Industry avg: Unclear ownership adds 2-5 days delay
- Onboarding time per unclear step: 30 minutes per new employee

═══════════════════════════════════════════════════════
4. MISSING TIMEOUTS / SLAs
═══════════════════════════════════════════════════════
WHAT TO DETECT:
- Steps without time limit or expected duration
- "Wait for" or "Monitor" steps with no max duration
- Approval steps without timeout
- No defined SLAs for customer-facing steps

DETECTION RULES:
✓ Words like "wait", "monitor", "review", "assess" → Must have timeout
✓ Approval steps → Must have max wait time and escalation
✓ Customer-facing steps → Must have SLA
✓ Any step that could stall indefinitely → Flag

EXAMPLE ISSUES TO FLAG:
- "Assess Situation" with no max time (could take indefinitely)
- "Wait for Manager Response" with no escalation after X time
- "Monitor Until Complete" with no end condition

IMPACT CALCULATION:
- Cost of delay = (Average stall time × Hourly rate × Occurrences)
- Customer satisfaction impact: Every 10 min delay = 5% satisfaction drop
- SLA breach penalties: Calculate based on contract terms

═══════════════════════════════════════════════════════
5. MISSING HANDOFF DOCUMENTATION
═══════════════════════════════════════════════════════
WHAT TO DETECT:
- Actor changes between consecutive steps without documented handoff
- No clear trigger mechanism when responsibility shifts
- No data/information specified to pass between actors
- Missing confirmation/acknowledgment step

DETECTION RULES:
✓ Actor changes from Step N to Step N+1 → Check for handoff details
✓ No trigger mechanism specified → How does next person know to start?
✓ No data artifacts mentioned → What information is passed?
✓ No confirmation → How to verify handoff completed?

EXAMPLE PATTERNS TO IDENTIFY:
- Step 2 (User) → Step 3 (Call Handler): How is the Call Handler notified to begin?
- Step 4 (Sales) → Step 5 (Finance): What data needs to be transferred?
- Missing confirmation that next actor has received handoff

IMPACT ESTIMATION:
- Frame as potential costs, not guaranteed losses
- Typical observation: "Undocumented handoffs may lead to information gaps"
- Present as: "Based on observations in similar processes..."

═══════════════════════════════════════════════════════

🎯 ANALYSIS OUTPUT FORMAT:

For EACH issue detected, you MUST provide:

1. THE ISSUE (What you observed):
   - node_id: Specific step number
   - node_title: Step name
   - issue_type: One of ["missing_error_handling", "serial_bottleneck", "unclear_ownership", "missing_timeout", "missing_handoff"]
   - title: Descriptive summary (avoid "Critical" or "Severe" in title)
   - description: Factual explanation of what's missing/different

2. THE IMPACT (Why this pattern matters):
   - severity: "critical", "high", "medium", "low"
   - why_this_matters: Explain potential benefits of addressing this
   - risk_description: Describe possible delays or gaps (not catastrophic outcomes)

3. THE EVIDENCE (Common patterns):
   - detected_pattern: What pattern you observed
   - industry_benchmark: Frame as "common practice" not "requirement"
   - failure_rate_estimate: Present as typical occurrence rate, not guaranteed

4. THE FIX (Suggested improvement):
   - recommendation_title: Use "Consider..." or "Evaluate..." not "Must..." or "Fix..."
   - recommendation_description: Descriptive suggestion, not directive
   - implementation_difficulty: "easy", "medium", "hard"

5. THE VALUE (ROI):
   - cost_impact_monthly: Estimated monthly cost of NOT fixing (in dollars)
   - time_savings_minutes: Time saved per occurrence (if applicable)
   - risk_mitigation_value: Risk cost avoided (if applicable)
   - calculation_basis: Show your math/assumptions

═══════════════════════════════════════════════════════

HEALTH SCORE CALCULATION RULES:

Base score = 100

DEDUCTIONS:
- Missing error handling (Critical): -15 points per occurrence
- Serial bottleneck (High): -10 points per major bottleneck
- Unclear ownership (High): -12 points per unclear step
- Missing timeout (Medium): -8 points per step
- Missing handoff (Medium): -7 points per handoff

CLARITY SCORE (0-100):
- Deduct 10 pts for each generic actor
- Deduct 15 pts for missing actor
- Deduct 8 pts for ambiguous terminology
- Deduct 5 pts for poor handoff documentation

EFFICIENCY SCORE (0-100):
- Deduct 20 pts for each major serial bottleneck
- Deduct 10 pts for unnecessary steps
- Deduct 15 pts for duplicate work

RELIABILITY SCORE (0-100):
- Deduct 20 pts for each missing error handler
- Deduct 15 pts for single points of failure
- Deduct 10 pts for missing escalation paths

RISK MANAGEMENT SCORE (0-100):
- Deduct 15 pts for each critical missing timeout
- Deduct 10 pts for compliance gaps
- Deduct 12 pts for unclear accountability

═══════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown, no code blocks):

{{
  "health_score": 68,
  "score_breakdown": {{
    "clarity": 72,
    "clarity_explanation": "Most steps are clearly defined with specific descriptions. Two actors could be more specific ('Team' could specify role), and one handoff could benefit from additional documentation",
    "efficiency": 55,
    "efficiency_explanation": "Potential optimization identified: Steps 3-4 could execute in parallel rather than sequentially, reducing process time by approximately 8 minutes per occurrence",
    "reliability": 45,
    "reliability_explanation": "Three steps involve external dependencies without documented fallback procedures. Common practice includes backup methods for external calls (8% typical busy rate) and escalation paths for unavailable contacts",
    "risk_management": 68,
    "risk_management_explanation": "Two steps lack defined timeouts. Similar processes typically include maximum duration limits and escalation triggers for assessment steps"
  }},
  "overall_explanation": "This process shows opportunities for improvement in three areas: error handling for external dependencies, execution efficiency through parallelization, and timeout definitions. These patterns are commonly addressed in similar processes and represent approximately $3,200/month in potential time savings and risk mitigation",
  "top_strength": "Clear step definitions with well-documented process flow",
  "top_weakness": "Limited documentation of alternative paths when external dependencies are unavailable",
  "issues": [
    {{
      "node_id": 4,
      "node_title": "Contact Emergency Services",
      "issue_type": "missing_error_handling",
      "title": "Missing documented backup for external service contact",
      "description": "This step relies on external emergency services without documented alternative if the primary contact method is unavailable",
      "severity": "critical",
      "why_this_matters": "External services may be temporarily unavailable (industry data suggests 5-10% peak hour busy rates). Having documented backup procedures is common practice in time-sensitive processes",
      "risk_description": "When primary contact is unavailable, staff may experience delays determining next steps without documented procedures",
      "detected_pattern": "External dependency without documented alternative procedure",
      "industry_benchmark": "Similar time-sensitive processes commonly include at least 2 contact methods with defined failover timing",
      "failure_rate_estimate": 8,
      "recommendation_title": "Document backup contact procedure",
      "recommendation_description": "Consider adding: 'If no response within 30 seconds, attempt backup contact method [specify method]'. This follows common practices in similar processes",
      "implementation_difficulty": "easy",
      "cost_impact_monthly": 2500,
      "time_savings_minutes": 0,
      "risk_mitigation_value": 2500,
      "calculation_basis": "Based on typical patterns: 8% unavailability × 50 monthly occurrences × estimated $625 delay cost per incident"
    }},
    {{
      "node_id": 3,
      "node_title": "Notify Escalation Contacts",
      "issue_type": "serial_bottleneck",
      "title": "Sequential execution opportunity: Steps 3-4 could run in parallel",
      "description": "Steps 3 (Notify Escalation Contacts) and 4 (Contact Emergency Services) currently execute sequentially but appear to be independent actions that could happen simultaneously",
      "severity": "high",
      "why_this_matters": "If Step 3 takes 4 minutes and Step 4 takes 4 minutes, sequential execution totals 8 minutes. Parallel execution could reduce this to 4 minutes (the longer of the two). For time-sensitive processes, this represents significant improvement",
      "risk_description": "Current sequential approach may add 4 minutes to process duration when parallel execution is feasible",
      "detected_pattern": "Two consecutive steps with the same actor performing independent actions without apparent data dependency",
      "industry_benchmark": "Common practice in time-sensitive processes: parallel notification of all parties when tasks are independent",
      "failure_rate_estimate": 0,
      "recommendation_title": "Consider parallel execution structure",
      "recommendation_description": "Evaluate restructuring: After Step 2 (Assess Situation), could Steps 3 and 4 execute simultaneously? If independent, this follows patterns seen in similar processes",
      "implementation_difficulty": "medium",
      "cost_impact_monthly": 1400,
      "time_savings_minutes": 4,
      "risk_mitigation_value": 0,
      "calculation_basis": "4 minutes saved per occurrence × 50 monthly occurrences × estimated $7/minute labor cost"
    }},
    {{
      "node_id": 2,
      "node_title": "Assess Situation",
      "issue_type": "missing_timeout",
      "title": "Assessment step lacks defined time limit",
      "description": "Step 2 'Assess Situation' does not include a maximum duration or escalation trigger if assessment extends beyond typical timeframes",
      "severity": "high",
      "why_this_matters": "In time-sensitive scenarios, undefined assessment periods can lead to extended decision times. Industry observations suggest assessments without time limits average 3-5 minutes vs 1-2 minutes with defined timeframes",
      "risk_description": "Without defined timeframes, assessment duration may vary significantly, potentially delaying subsequent steps",
      "detected_pattern": "Decision-making step without documented time limit or escalation guidance",
      "industry_benchmark": "Common practice in time-sensitive processes: 60-120 second assessment windows with defined escalation if exceeded",
      "failure_rate_estimate": 25,
      "recommendation_title": "Consider adding assessment time guidance",
      "recommendation_description": "Evaluate adding: 'Target assessment completion within 2 minutes. If assessment extends beyond this, consider escalation to supervisor'. This follows patterns in similar processes",
      "implementation_difficulty": "easy",
      "cost_impact_monthly": 875,
      "time_savings_minutes": 3,
      "risk_mitigation_value": 0,
      "calculation_basis": "25% of cases exceed optimal time × 3 min avg delay × 50 incidents/month × $7/min = $875/month + faster response improves outcomes"
    }}
  ],
  "recommendations": [
    {{
      "title": "Quick Win: Add backup emergency contact",
      "description": "Immediately document backup emergency numbers and train all call handlers on 30-second failover protocol",
      "why_it_works": "Eliminates single point of failure in most critical step. Industry standard for emergency services. Takes 1 hour to implement.",
      "savings_potential": 2500,
      "affected_nodes": [4],
      "implementation_effort": "1 hour setup + 30 min training",
      "expected_impact": "Reduces emergency response failure rate from 8% to <1%"
    }},
    {{
      "title": "Medium Win: Parallelize notifications",
      "description": "Update process documentation to show Steps 3-4 happening simultaneously. Update training materials and call handler scripts.",
      "why_it_works": "Steps are truly independent - Call Handler can dial emergency services while system simultaneously sends notifications to escalation contacts. No technical barriers.",
      "savings_potential": 1400,
      "affected_nodes": [3, 4],
      "implementation_effort": "2 hours documentation + system configuration if automated",
      "expected_impact": "Saves 4 minutes per incident, improves emergency response time by 33%"
    }}
  ],
  "benchmarks": {{
    "expected_duration_minutes": 8,
    "current_estimated_duration_minutes": 15,
    "industry_comparison": "67% slower than best-in-class emergency response",
    "success_rate_current": 88,
    "success_rate_potential": 99,
    "estimated_monthly_incidents": 50
  }},
  "total_savings_potential": 4775,
  "total_risk_mitigation": 2500,
  "roi_summary": "Implementing top 3 fixes saves $4,775/month with 4 hours implementation effort. Break-even in first month."
}}"""
            
            response = await chat.send_message(UserMessage(text=intelligence_prompt))
            logger.info(f"AI Intelligence Response: {response[:500]}...")
            
            # Parse JSON from response - handle markdown code blocks
            response_text = response.strip()
            if response_text.startswith('```'):
                start = response_text.find('{')
                end = response_text.rfind('}')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
            result = json.loads(response_text)
            
            logger.info(f"Intelligence analysis complete: Health score {result.get('health_score', 'N/A')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Intelligence analysis failed: {e}")
            # Return basic fallback
            return {
                "health_score": 75,
                "score_breakdown": {
                    "clarity": 75,
                    "efficiency": 70,
                    "reliability": 75,
                    "risk_management": 80
                },
                "issues": [
                    {
                        "title": "Analysis in progress",
                        "description": "Full intelligence analysis coming soon",
                        "severity": "low",
                        "cost_impact": 0
                    }
                ],
                "recommendations": [],
                "benchmarks": {
                    "expected_duration_days": 1,
                    "current_estimated_duration_days": 2,
                    "industry_comparison": "average"
                }
            }

ai_service = AIService()

# ============ Authentication Helper ============

async def get_current_user(request: Request) -> Optional[Dict]:
    """Get current user from JWT token in cookie or Authorization header"""
    token = None
    
    # Try to get token from cookie first
    token = request.cookies.get("session_token")
    logger.info(f"🍪 Cookie token present: {bool(token)}")
    if token:
        logger.info(f"🍪 Cookie token starts with: {token[:20]}... (is JWT: {token.startswith('eyJ')})")
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        logger.info(f"🔑 Auth header present: {bool(auth_header)}")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            logger.info(f"🔑 Header token starts with: {token[:20]}...")
    
    if not token:
        logger.warning("❌ No token found in cookie or header")
        return None
    
    # Decode token
    logger.info(f"🔓 Attempting to decode token...")
    payload = decode_access_token(token)
    if not payload:
        logger.warning(f"❌ Failed to decode token. Token: {token[:30]}...")
        return None
    
    logger.info(f"✅ Token decoded successfully. Payload: {payload}")
    
    # Get user from database
    user_id = payload.get("sub")
    if not user_id:
        logger.warning(f"❌ No user_id (sub) in token payload: {payload}")
        return None
    
    logger.info(f"🔍 Looking up user in DB: {user_id}")
    user = await db.users.find_one({"id": user_id})
    if not user:
        logger.warning(f"❌ User not found for id: {user_id}")
        return None
    
    logger.info(f"✅ User authenticated: {user['email']} (ID: {user['id']})")
    return user

async def require_auth(request: Request) -> Dict:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        # Debug info
        has_cookie = "session_token" in request.cookies
        has_auth_header = "Authorization" in request.headers
        logger.warning(f"Auth failed - Cookie: {has_cookie}, Auth Header: {has_auth_header}")
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ============ Routes ============

@api_router.get("/")
async def root():
    return {"message": "SuperHumanly API"}

# ============ Authentication Endpoints ============

@api_router.post("/auth/signup")
async def signup(data: SignupRequest, request: Request):
    """Register a new user with email and password"""
    try:
        # Validate password strength
        if len(data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in data.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
        
        if not any(c.isdigit() for c in data.password):
            raise HTTPException(status_code=400, detail="Password must contain at least one number")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": data.email.lower()})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user = User(
            email=data.email.lower(),
            name=data.name,
            password_hash=hash_password(data.password),
            auth_method="email"
        )
        
        user_dict = user.model_dump()
        user_dict['createdAt'] = user_dict['createdAt'].isoformat()
        user_dict['updatedAt'] = user_dict['updatedAt'].isoformat()
        
        await db.users.insert_one(user_dict)
        
        # Create default workspace for new user
        default_workspace = Workspace(
            name="My Workspace",
            description="Your default workspace",
            userId=user.id,
            isDefault=True
        )
        
        workspace_dict = default_workspace.model_dump()
        workspace_dict['createdAt'] = workspace_dict['createdAt'].isoformat()
        workspace_dict['updatedAt'] = workspace_dict['updatedAt'].isoformat()
        
        await db.workspaces.insert_one(workspace_dict)
        logger.info(f"✅ Created default workspace for new user: {user.email}")
        
        # Migrate guest process if exists
        guest_id = request.cookies.get("guest_session")
        if guest_id:
            guest_process = await db.processes.find_one({
                "userId": guest_id,
                "isGuest": True
            })
            
            if guest_process:
                # Convert guest process to user process
                await db.processes.update_one(
                    {"id": guest_process['id']},
                    {
                        "$set": {
                            "userId": user.id,
                            "workspaceId": default_workspace.id,
                            "isGuest": False,
                            "updatedAt": datetime.now(timezone.utc).isoformat()
                        },
                        "$unset": {
                            "guestCreatedAt": "",
                            "guestEditCount": ""
                        }
                    }
                )
                
                # Update workspace process count
                await db.workspaces.update_one(
                    {"id": default_workspace.id},
                    {"$inc": {"processCount": 1}}
                )
                
                logger.info(f"🎉 Migrated guest process {guest_process['id']} to user {user.id}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        # Create session
        session = Session(
            userId=user.id,
            token=access_token,
            expiresAt=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
        )
        
        session_dict = session.model_dump()
        session_dict['createdAt'] = session_dict['createdAt'].isoformat()
        session_dict['expiresAt'] = session_dict['expiresAt'].isoformat()
        
        await db.sessions.insert_one(session_dict)
        
        return {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    """Login with email and password"""
    try:
        # Find user
        user = await db.users.find_one({"email": data.email.lower()})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not user.get('password_hash') or not verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create access token
        access_token = create_access_token(data={"sub": user['id']})
        
        # Create session
        session = Session(
            userId=user['id'],
            token=access_token,
            expiresAt=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
        )
        
        session_dict = session.model_dump()
        session_dict['createdAt'] = session_dict['createdAt'].isoformat()
        session_dict['expiresAt'] = session_dict['expiresAt'].isoformat()
        
        await db.sessions.insert_one(session_dict)
        
        # CRITICAL: Clear any existing session_token cookies
        response.delete_cookie(key="session_token", path="/")
        response.delete_cookie(key="session_token", path="/api")
        response.delete_cookie(key="session_token")
        
        # Set our JWT token as httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=access_token,
            max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,  # 7 days in seconds
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        return {
            "access_token": access_token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "picture": user.get('picture')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/google/session")
async def google_session(data: GoogleSessionRequest, request: Request, response: Response):
    """Process Emergent Google OAuth session"""
    try:
        import httpx
        
        logger.info(f"🔵 GOOGLE AUTH START - Session ID: {data.session_id[:20]}...")
        
        # Get session data from Emergent Auth
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id}
            )
            
            if auth_response.status_code != 200:
                logger.error(f"❌ Emergent auth failed: {auth_response.status_code}")
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            session_data = auth_response.json()
            logger.info(f"✅ Got Emergent session data for: {session_data.get('email')}")
        
        # Check if user exists
        user = await db.users.find_one({"email": session_data['email'].lower()})
        
        is_new_user = not user
        
        if not user:
            logger.info(f"🆕 Creating new user: {session_data['email']}")
            # Create new user
            new_user = User(
                email=session_data['email'].lower(),
                name=session_data['name'],
                picture=session_data.get('picture'),
                auth_method="google"
            )
            
            user_dict = new_user.model_dump()
            user_dict['createdAt'] = user_dict['createdAt'].isoformat()
            user_dict['updatedAt'] = user_dict['updatedAt'].isoformat()
            
            await db.users.insert_one(user_dict)
            user = user_dict
            logger.info(f"✅ User created with ID: {user['id']}")
            
            # Create default workspace for new Google OAuth user
            default_workspace = Workspace(
                name="My Workspace",
                description="Your default workspace",
                userId=user['id'],
                isDefault=True
            )
            
            workspace_dict = default_workspace.model_dump()
            workspace_dict['createdAt'] = workspace_dict['createdAt'].isoformat()
            workspace_dict['updatedAt'] = workspace_dict['updatedAt'].isoformat()
            
            await db.workspaces.insert_one(workspace_dict)
            logger.info(f"✅ Created default workspace for Google user: {user['email']}")
            
            # Migrate guest process if exists (for new users only)
            guest_id = request.cookies.get("guest_session")
            if guest_id:
                guest_process = await db.processes.find_one({
                    "userId": guest_id,
                    "isGuest": True
                })
                
                if guest_process:
                    # Convert guest process to user process
                    await db.processes.update_one(
                        {"id": guest_process['id']},
                        {
                            "$set": {
                                "userId": user['id'],
                                "workspaceId": workspace_dict['id'],
                                "isGuest": False,
                                "updatedAt": datetime.now(timezone.utc).isoformat()
                            },
                            "$unset": {
                                "guestCreatedAt": "",
                                "guestEditCount": ""
                            }
                        }
                    )
                    
                    # Update workspace process count
                    await db.workspaces.update_one(
                        {"id": workspace_dict['id']},
                        {"$inc": {"processCount": 1}}
                    )
                    
                    logger.info(f"🎉 Migrated guest process {guest_process['id']} to Google user {user['id']}")
        else:
            logger.info(f"✅ Found existing user: {user['email']} (ID: {user['id']})")
        
        # Create our own access token (don't use Emergent session token)
        access_token = create_access_token(data={"sub": user['id']})
        logger.info(f"🔑 Created JWT token: {access_token[:20]}... (starts with eyJ: {access_token.startswith('eyJ')})")
        
        # Create session
        session = Session(
            userId=user['id'],
            token=access_token,
            expiresAt=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
        )
        
        session_dict = session.model_dump()
        session_dict['createdAt'] = session_dict['createdAt'].isoformat()
        session_dict['expiresAt'] = session_dict['expiresAt'].isoformat()
        
        await db.sessions.insert_one(session_dict)
        logger.info(f"✅ Session created in DB for user: {user['id']}")
        
        # CRITICAL: Clear any existing session_token cookies with different paths/domains
        # This prevents old Emergent tokens from conflicting with our JWT tokens
        logger.info("🧹 Clearing old cookies...")
        response.delete_cookie(key="session_token", path="/")
        response.delete_cookie(key="session_token", path="/api")
        response.delete_cookie(key="session_token")
        
        # Set our JWT token as httpOnly cookie
        logger.info(f"🍪 Setting new JWT cookie with token: {access_token[:20]}...")
        response.set_cookie(
            key="session_token",
            value=access_token,
            max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        logger.info(f"✅ GOOGLE AUTH COMPLETE for user: {user['email']}")
        
        return {
            "access_token": access_token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "picture": user.get('picture')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await require_auth(request)
    return {
        "id": user['id'],
        "email": user['email'],
        "name": user['name'],
        "picture": user.get('picture'),
        "auth_method": user.get('auth_method', 'email')
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    try:
        user = await get_current_user(request)
        if user:
            # Delete session from database
            token = request.cookies.get("session_token")
            if token:
                await db.sessions.delete_many({"token": token})
        
        # Clear cookie
        response.delete_cookie(
            key="session_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="none"
        )
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/process/analyze-stream")
async def analyze_document_stream(text: str):
    """
    STREAMING endpoint for real-time analysis progress
    Uses Server-Sent Events (SSE) for live updates
    """
    async def event_generator():
        async for event in ai_service.analyze_document_stream(text):
            yield event
    
    return EventSourceResponse(event_generator())

@api_router.get("/admin/cache-stats")
async def get_cache_stats():
    """Get cache statistics for monitoring (admin only in production)"""
    try:
        stats = cache_service.get_cache_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/process/analyze", response_model=DocumentAnalysis)
async def analyze_document(input_data: ProcessInput):
    """
    Intelligent document analysis - analyzes document to understand complexity 
    and generate smart contextual questions BEFORE parsing.
    """
    try:
        logger.info(f"Analyzing document for smart questions: {input_data.inputType}")
        result = await ai_service.analyze_document(input_data.text)
        return result
    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/process/parse", response_model=Dict[str, Any])
async def parse_process(input_data: ProcessInput):
    """Parse input and extract process structure with optional smart context"""
    try:
        # Build enhanced context from smart questions if provided
        text_to_parse = input_data.text
        
        # Add context answers if provided (smart questions)
        if input_data.contextAnswers:
            context_parts = []
            for question_id, answer in input_data.contextAnswers.items():
                context_parts.append(f"{question_id}: {answer}")
            
            if context_parts:
                smart_context = "\n".join(context_parts)
                text_to_parse = f"{input_data.text}\n\n---SMART CONTEXT FROM USER---\n{smart_context}"
        
        # Add additional freeform context if provided
        if input_data.additionalContext:
            text_to_parse = f"{text_to_parse}\n\n---ADDITIONAL CONTEXT FROM USER---\n{input_data.additionalContext}"
        
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
        
        # Check if guest trying to publish
        if process.get('isGuest', False):
            raise HTTPException(
                status_code=403,
                detail="Guest users cannot publish. Sign up to share your flowchart!"
            )
        
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
    Also deactivates all active shares for security.
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
        
        # Deactivate all active shares for this process (security measure)
        deactivate_result = await db.shares.update_many(
            {"processId": process_id, "isActive": True},
            {
                "$set": {
                    "isActive": False,
                    "revokedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        
        if deactivate_result.modified_count > 0:
            logger.info(f"✅ Deactivated {deactivate_result.modified_count} shares for unpublished process {process_id}")
        
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
async def get_workspaces(request: Request):
    """Get all workspaces for the authenticated user"""
    try:
        logger.info("📂 GET /workspaces called")
        # Get current user
        user = await require_auth(request)
        user_id = user.get('id')
        logger.info(f"✅ User authenticated for workspaces: {user_id}")
        
        # Filter workspaces by userId
        workspaces = await db.workspaces.find({"userId": user_id}).to_list(length=None)
        logger.info(f"📂 Found {len(workspaces)} workspaces for user {user_id}")
        for ws in workspaces:
            ws['_id'] = str(ws['_id'])
            # Convert datetime to ISO string
            if isinstance(ws.get('createdAt'), datetime):
                ws['createdAt'] = ws['createdAt'].isoformat()
            if isinstance(ws.get('updatedAt'), datetime):
                ws['updatedAt'] = ws['updatedAt'].isoformat()
        return [Workspace(**ws) for ws in workspaces]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching workspaces: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch workspaces: {str(e)}")

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace: Workspace, request: Request):
    """Create a new workspace for the authenticated user"""
    try:
        # Get authenticated user
        user = await require_auth(request)
        user_id = user.get('id')
        
        workspace_dict = workspace.model_dump()
        workspace_dict['userId'] = user_id  # CRITICAL: Assign to user
        workspace_dict['createdAt'] = workspace_dict['createdAt'].isoformat()
        workspace_dict['updatedAt'] = workspace_dict['updatedAt'].isoformat()
        
        # Check if this is the user's first workspace, mark it as default
        user_workspace_count = await db.workspaces.count_documents({"userId": user_id})
        if user_workspace_count == 0:
            workspace_dict['isDefault'] = True
        
        await db.workspaces.insert_one(workspace_dict)
        workspace_dict['_id'] = str(workspace_dict['_id'])
        logger.info(f"✅ Created workspace '{workspace.name}' for user {user_id}")
        return Workspace(**workspace_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")

@api_router.get("/workspaces/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str, request: Request):
    """Get a specific workspace for the authenticated user"""
    try:
        # Get current user
        user = await require_auth(request)
        user_id = user.get('id')
        
        # Filter by userId and workspace_id
        workspace = await db.workspaces.find_one({"id": workspace_id, "userId": user_id})
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
async def update_workspace(workspace_id: str, workspace: Workspace, request: Request):
    """Update a workspace for the authenticated user"""
    try:
        # Get current user
        user = await require_auth(request)
        user_id = user.get('id')
        
        workspace_dict = workspace.model_dump()
        workspace_dict['updatedAt'] = datetime.now(timezone.utc).isoformat()
        
        # Update only if owned by user
        result = await db.workspaces.update_one(
            {"id": workspace_id, "userId": user_id},
            {"$set": workspace_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        updated = await db.workspaces.find_one({"id": workspace_id, "userId": user_id})
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
async def delete_workspace(workspace_id: str, request: Request):
    """Delete a workspace for the authenticated user - processes will be moved to default workspace"""
    try:
        # Get current user
        user = await require_auth(request)
        user_id = user.get('id')
        
        # Check workspace exists and belongs to user
        workspace = await db.workspaces.find_one({"id": workspace_id, "userId": user_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Don't allow deleting default workspace if it has processes
        if workspace.get('isDefault'):
            count = await db.processes.count_documents({"workspaceId": workspace_id, "userId": user_id})
            if count > 0:
                raise HTTPException(status_code=400, detail="Cannot delete default workspace with processes")
        
        # Move all user's processes to their default workspace
        default_workspace = await db.workspaces.find_one({"isDefault": True, "userId": user_id})
        if default_workspace and default_workspace['id'] != workspace_id:
            await db.processes.update_many(
                {"workspaceId": workspace_id, "userId": user_id},
                {"$set": {"workspaceId": default_workspace['id']}}
            )
        
        await db.workspaces.delete_one({"id": workspace_id, "userId": user_id})
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
async def create_process(process_data: dict, request: Request, response: Response):
    """Create a new process with security validation"""
    try:
        # Check if this is guest mode (no auth header)
        user = await get_current_user(request)
        
        if not user:
            # GUEST MODE - Create temporary process
            guest_id = await get_guest_session(request)
            
            # Set guest session cookie
            response.set_cookie(
                key="guest_session",
                value=guest_id,
                httponly=True,
                samesite="lax",
                max_age=None  # Session cookie (expires when browser closes)
            )
            
            # Mark as guest process
            process_data['userId'] = guest_id
            process_data['isGuest'] = True
            process_data['guestCreatedAt'] = datetime.now(timezone.utc).isoformat()
            
            # Check if guest already has a process (limit: 1)
            existing_guest_process = await db.processes.find_one({
                "userId": guest_id,
                "isGuest": True
            })
            
            if existing_guest_process:
                raise HTTPException(
                    status_code=403,
                    detail="Guest users can only create one flowchart. Sign up to create more!"
                )
            
            logger.info(f"🎭 Creating GUEST process for session: {guest_id}")
        else:
            # AUTHENTICATED USER MODE
            user_id = user.get('id')
            process_data['userId'] = user_id
            process_data['isGuest'] = False
            
            # If no workspaceId provided, assign to user's default workspace
            if 'workspaceId' not in process_data or not process_data.get('workspaceId'):
                default_workspace = await db.workspaces.find_one({"userId": user_id, "isDefault": True})
                if default_workspace:
                    process_data['workspaceId'] = default_workspace['id']
                    logger.info(f"✅ Assigned process to default workspace: {default_workspace['id']}")
                else:
                    # Create default workspace if it doesn't exist
                    default_workspace = Workspace(
                        name="My Workspace",
                        description="Your default workspace",
                        userId=user_id,
                        isDefault=True
                    )
                    workspace_dict = default_workspace.model_dump()
                    workspace_dict['createdAt'] = workspace_dict['createdAt'].isoformat()
                    workspace_dict['updatedAt'] = workspace_dict['updatedAt'].isoformat()
                    await db.workspaces.insert_one(workspace_dict)
                    process_data['workspaceId'] = default_workspace.id
                    logger.info(f"✅ Created default workspace and assigned process to it")
        
        
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
async def get_processes(request: Request, workspace_id: Optional[str] = None):
    """Get all processes for the authenticated user or guest, optionally filtered by workspace"""
    try:
        # Try to get current user (optional for guest mode)
        user = await get_current_user(request)
        
        if user:
            # AUTHENTICATED USER - Get their processes (exclude guest processes)
            user_id = user.get('id')
            # Use $ne (not equal) to include processes without isGuest field (existing processes)
            query = {"userId": user_id, "isGuest": {"$ne": True}}
        else:
            # GUEST MODE - Get guest processes
            guest_id = request.cookies.get("guest_session")
            if not guest_id:
                # No user and no guest session - return empty list
                return []
            
            query = {"userId": guest_id, "isGuest": True}
        
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/process/search", response_model=List[Process])
async def search_processes(
    request: Request, 
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Search processes for the authenticated user"""
    try:
        # Get current user
        user = await require_auth(request)
        user_id = user.get('id')
        
        # Base query - filter by userId
        query = {"userId": user_id}
        
        # Add workspace filter if specified
        if workspace_id:
            query['workspaceId'] = workspace_id
            
        # Add status filter if specified
        if status and status in ['draft', 'published']:
            query['status'] = status
        
        # Add text search if query provided
        if q and q.strip():
            # Create text search conditions
            search_conditions = []
            search_term = {"$regex": q.strip(), "$options": "i"}  # Case-insensitive
            
            # Search in name, description, and node content
            search_conditions.append({"name": search_term})
            search_conditions.append({"description": search_term})
            
            # Search in node titles and descriptions
            search_conditions.append({
                "nodes": {
                    "$elemMatch": {
                        "$or": [
                            {"title": search_term},
                            {"description": search_term}
                        ]
                    }
                }
            })
            
            # Combine with OR condition
            query["$or"] = search_conditions
        
        # Execute search
        processes = await db.processes.find(query, {"_id": 0}).to_list(1000)
        
        # Convert datetime strings if needed
        for process in processes:
            if isinstance(process.get('createdAt'), str):
                process['createdAt'] = datetime.fromisoformat(process['createdAt'])
            if isinstance(process.get('updatedAt'), str):
                process['updatedAt'] = datetime.fromisoformat(process['updatedAt'])
            if isinstance(process.get('publishedAt'), str):
                process['publishedAt'] = datetime.fromisoformat(process['publishedAt'])
        
        # Sort by relevance (updated date desc)
        processes.sort(key=lambda x: x.get('updatedAt', datetime.min), reverse=True)
        
        logger.info(f"✅ Search completed: query='{q}' results={len(processes)} user={user['email']}")
        
        return processes
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching processes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search processes: {str(e)}")

@api_router.get("/process/{process_id}", response_model=Process)
async def get_process(process_id: str, request: Request):
    """Get a specific process - accessible if owned by user or if published"""
    try:
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Check access: allow if owned by user OR if published
        user = await get_current_user(request)
        is_owner = user and user.get('id') == process.get('userId')
        is_published = process.get('status') == 'published'
        
        if not is_owner and not is_published:
            raise HTTPException(status_code=403, detail="Access denied")
        
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

@api_router.get("/process/{process_id}/intelligence")
async def get_process_intelligence(process_id: str, request: Request):
    """Get intelligence analysis for a process"""
    try:
        # Get the process
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Check access
        user = await get_current_user(request)
        is_owner = user and user.get('id') == process.get('userId')
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if we have cached intelligence
        cached_intelligence = process.get('intelligence')
        if cached_intelligence:
            logger.info(f"Returning cached intelligence for process {process_id}")
            return cached_intelligence
        
        # Generate intelligence
        logger.info(f"Generating intelligence for process {process_id}")
        intelligence = await ai_service.analyze_process_intelligence(process)
        
        # Cache it
        await db.processes.update_one(
            {"id": process_id},
            {"$set": {"intelligence": intelligence, "intelligenceGeneratedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        return intelligence
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intelligence analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/process/{process_id}/intelligence/regenerate")
async def regenerate_intelligence(process_id: str, request: Request):
    """Regenerate intelligence for a process (clears cache and generates fresh analysis)"""
    try:
        # Get the process
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Check access
        user = await get_current_user(request)
        is_owner = user and user.get('id') == process.get('userId')
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Clear cached intelligence
        logger.info(f"Regenerating intelligence for process {process_id}")
        intelligence = await ai_service.analyze_process_intelligence(process)
        
        # Update cache
        await db.processes.update_one(
            {"id": process_id},
            {"$set": {"intelligence": intelligence, "intelligenceGeneratedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        return intelligence
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intelligence regeneration error: {e}")
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

@api_router.patch("/process/{process_id}/node/{node_id}")
async def update_node(process_id: str, node_id: str, node_data: dict, request: Request):
    """Update a specific node in a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can edit nodes")
        
        # Find and update the specific node
        nodes = process.get("nodes", [])
        node_found = False
        
        for i, node in enumerate(nodes):
            if node.get("id") == node_id:
                # Update only the fields provided in node_data
                for key, value in node_data.items():
                    if key != "id":  # Don't allow changing node ID
                        nodes[i][key] = value
                node_found = True
                break
        
        if not node_found:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Update the process with modified nodes
        await db.processes.update_one(
            {"id": process_id},
            {
                "$set": {
                    "nodes": nodes,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Node {node_id} updated in process {process_id} by {user['email']}")
        
        # Return the updated node
        updated_node = next((n for n in nodes if n.get("id") == node_id), None)
        return updated_node
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating node: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update node: {str(e)}")

@api_router.patch("/process/{process_id}/reorder")
async def reorder_nodes(process_id: str, node_order: dict, request: Request):
    """Reorder nodes in a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can reorder nodes")
        
        # Get the new order of node IDs
        new_order = node_order.get("nodeIds", [])
        if not new_order:
            raise HTTPException(status_code=400, detail="nodeIds array required")
        
        # Get current nodes
        nodes = process.get("nodes", [])
        
        # Validate that all node IDs exist
        node_ids_set = {n.get("id") for n in nodes}
        if set(new_order) != node_ids_set:
            raise HTTPException(status_code=400, detail="Node IDs don't match existing nodes")
        
        # Create a mapping of node ID to node
        node_map = {n.get("id"): n for n in nodes}
        
        # Reorder nodes based on new_order
        reordered_nodes = [node_map[node_id] for node_id in new_order]
        
        # Update positions for visual consistency
        for i, node in enumerate(reordered_nodes):
            node["position"] = {"x": 100.0, "y": 100.0 + (i * 150)}
        
        # Update the process with reordered nodes
        await db.processes.update_one(
            {"id": process_id},
            {
                "$set": {
                    "nodes": reordered_nodes,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Nodes reordered in process {process_id} by {user['email']}")
        
        return {"success": True, "nodes": reordered_nodes}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reordering nodes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reorder nodes: {str(e)}")

@api_router.post("/process/{process_id}/node")
async def add_node(process_id: str, node_data: dict, request: Request):
    """Add a new node to a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can add nodes")
        
        # Get current nodes
        nodes = process.get("nodes", [])
        
        # Create new node with default values
        new_node = {
            "id": f"node-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "title": node_data.get("title", "New Step"),
            "description": node_data.get("description", "Click to add details"),
            "status": node_data.get("status", "current"),
            "actors": node_data.get("actors", []),
            "subSteps": node_data.get("subSteps", []),
            "position": {"x": 100.0, "y": 100.0 + (len(nodes) * 150)}
        }
        
        # Determine where to insert (default: at the end)
        insert_index = node_data.get("insertIndex", len(nodes))
        if insert_index < 0 or insert_index > len(nodes):
            insert_index = len(nodes)
        
        # Insert the new node
        nodes.insert(insert_index, new_node)
        
        # Update positions for all nodes
        for i, node in enumerate(nodes):
            node["position"] = {"x": 100.0, "y": 100.0 + (i * 150)}
        
        # Update the process with new nodes
        await db.processes.update_one(
            {"id": process_id},
            {
                "$set": {
                    "nodes": nodes,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Node added to process {process_id} by {user['email']}")
        
        return {"success": True, "node": new_node, "nodes": nodes}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding node: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add node: {str(e)}")

@api_router.delete("/process/{process_id}/node/{node_id}")
async def delete_node(process_id: str, node_id: str, request: Request):
    """Delete a node from a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can delete nodes")
        
        # Get current nodes
        nodes = process.get("nodes", [])
        
        # Check if process has only one node
        if len(nodes) <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last node. Process must have at least one step.")
        
        # Find and remove the node
        original_length = len(nodes)
        nodes = [n for n in nodes if n.get("id") != node_id]
        
        if len(nodes) == original_length:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Update positions for remaining nodes
        for i, node in enumerate(nodes):
            node["position"] = {"x": 100.0, "y": 100.0 + (i * 150)}
        
        # Update the process
        await db.processes.update_one(
            {"id": process_id},
            {
                "$set": {
                    "nodes": nodes,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Node {node_id} deleted from process {process_id} by {user['email']}")
        
        return {"success": True, "nodes": nodes}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting node: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete node: {str(e)}")

@api_router.patch("/process/{process_id}/workspace")
async def move_process_to_workspace(process_id: str, data: dict, request: Request):
    """Move a process to a different workspace"""
    try:
        # Get authenticated user
        user = await require_auth(request)
        user_id = user.get('id')
        
        workspace_id = data.get('workspaceId')
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspaceId required")
        
        # Verify workspace belongs to user
        workspace = await db.workspaces.find_one({"id": workspace_id, "userId": user_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Verify process belongs to user
        process = await db.processes.find_one({"id": process_id, "userId": user_id})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Update process workspace
        result = await db.processes.update_one(
            {"id": process_id, "userId": user_id},
            {"$set": {"workspaceId": workspace_id, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to move process")
        
        logger.info(f"✅ Moved process {process_id} to workspace {workspace_id}")
        return {"message": "Process moved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving process: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/process/{process_id}/refine")
async def refine_process_with_ai(process_id: str, data: dict, request: Request):
    """Refine a process using AI based on user's natural language request"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can refine")
        
        user_message = data.get("message", "").strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Get API key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Prepare current process context
        process_context = {
            "name": process.get("name", ""),
            "description": process.get("description", ""),
            "nodes": process.get("nodes", [])
        }
        
        # Build prompt for Claude
        prompt = f"""You are helping refine a workflow/process flowchart. 

Current Process: {process_context['name']}
Description: {process_context['description']}

Current Steps:
{json.dumps(process_context['nodes'], indent=2)}

User's refinement request: "{user_message}"

Please analyze the user's request and return the COMPLETE updated process with all nodes (including unchanged ones) in the following JSON format:
{{
  "name": "Process name (keep same unless user wants to change)",
  "description": "Process description (keep same unless user wants to change)",
  "nodes": [
    {{
      "id": "existing_id_or_new_temp_id",
      "type": "step",
      "title": "Step title",
      "description": "Step description",
      "status": "current",
      "actors": ["Actor 1", "Actor 2"],
      "subSteps": ["Sub-step 1", "Sub-step 2"],
      "position": {{"x": 100.0, "y": 100.0}}
    }}
  ],
  "changes": ["Brief summary of what was changed"]
}}

IMPORTANT:
1. Return ALL nodes (not just changed ones)
2. For EXISTING nodes: Keep their original "id" values exactly as they are
3. For NEW nodes: Use placeholder IDs like "new-1", "new-2", etc.
4. Always include "type": "step" for each node
5. Update positions: y = 100.0 + (index * 150)
6. Keep all existing data for unchanged nodes
7. Provide clear "changes" summary

Return ONLY valid JSON, no markdown or explanations."""

        # Call Claude API with proper initialization
        logger.info(f"🤖 Refining process {process_id} with Claude...")
        
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"refine_{process_id}_{int(datetime.now(timezone.utc).timestamp())}",
                system_message="You are a process optimization expert. Return only valid JSON responses. Never include markdown code blocks, just pure JSON."
            ).with_model("anthropic", "claude-sonnet-4-20250514")
            
            user_msg = UserMessage(text=prompt)
            response = await chat.send_message(user_msg)
            
            logger.info(f"✅ Claude response received: {response[:200]}...")
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
        # Parse Claude's response
        try:
            # Extract JSON from response (handle markdown code blocks if present)
            json_str = response.strip()
            
            # Remove markdown code blocks if present
            if json_str.startswith('```'):
                json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', json_str, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
            
            refined_data = json.loads(json_str)
            
            # Validate response structure
            if 'nodes' not in refined_data:
                logger.error(f"Response missing 'nodes' field: {json_str[:500]}")
                raise ValueError("AI response missing 'nodes' field")
            
            if not isinstance(refined_data['nodes'], list):
                raise ValueError("'nodes' must be an array")
            
            # Post-process nodes: Replace placeholder IDs with proper timestamps
            processed_nodes = []
            timestamp_counter = int(datetime.now(timezone.utc).timestamp() * 1000)
            
            for idx, node in enumerate(refined_data.get("nodes", [])):
                # Ensure node has required fields
                if not isinstance(node, dict):
                    continue
                
                # If node has a placeholder ID (starts with "new-"), generate a real one
                node_id = node.get("id", f"new-{idx}")
                if node_id.startswith("new-"):
                    node["id"] = f"node-{timestamp_counter}"
                    timestamp_counter += 1
                
                # Ensure type field exists
                if "type" not in node:
                    node["type"] = "step"
                
                # Ensure position exists
                if "position" not in node:
                    node["position"] = {"x": 100.0, "y": 100.0 + (idx * 150)}
                
                processed_nodes.append(node)
            
            logger.info(f"✅ Processed {len(processed_nodes)} nodes")
            
            # Check if process was published
            was_published = process.get("status") == "published"
            
            # Update process in database
            update_data = {
                "nodes": processed_nodes,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            
            # Auto-unpublish if it was published (for quality control)
            if was_published:
                update_data["status"] = "draft"
                logger.info(f"⚠️ Auto-unpublished process {process_id} for review after AI refinement")
            
            # Update name/description if changed
            if refined_data.get("name") and refined_data["name"] != process_context["name"]:
                update_data["name"] = refined_data["name"]
            if refined_data.get("description") and refined_data["description"] != process_context["description"]:
                update_data["description"] = refined_data["description"]
            
            result = await db.processes.update_one(
                {"id": process_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                logger.warning(f"Process {process_id} not modified (maybe no changes?)")
            
            logger.info(f"✅ Process {process_id} refined successfully by {user['email']}")
            
            return {
                "success": True,
                "wasPublished": was_published,
                "process": {
                    "id": process_id,
                    "name": refined_data.get("name", process_context["name"]),
                    "description": refined_data.get("description", process_context["description"]),
                    "nodes": processed_nodes,
                    "status": update_data.get("status", process.get("status"))
                },
                "changes": refined_data.get("changes", ["Process updated based on your request"])
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Response was: {response}")
            raise HTTPException(
                status_code=500, 
                detail="AI returned invalid format. Please try rephrasing your request or try again."
            )
        except ValueError as e:
            logger.error(f"Invalid response structure: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error refining process: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to refine process: {str(e)}")

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

# ============ Share Endpoints ============

@api_router.post("/process/{process_id}/share", response_model=Share)
async def create_share(
    process_id: str, 
    share_request: CreateShareRequest,
    request: Request
):
    """Create a share link for a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Validate access level
        if share_request.accessLevel not in ALLOWED_ACCESS_LEVELS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid access level. Allowed: {', '.join(ALLOWED_ACCESS_LEVELS)}"
            )
        
        # Validate expiration days
        if share_request.expiresInDays not in ALLOWED_EXPIRATION_DAYS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expiration. Allowed: {', '.join(map(str, [d for d in ALLOWED_EXPIRATION_DAYS if d]))}, or null for never"
            )
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can create shares")
        
        # Check if process is published
        if process.get("status") != "published":
            raise HTTPException(
                status_code=400, 
                detail="Process must be published before sharing"
            )
        
        # Calculate expiration date
        expires_at = None
        if share_request.expiresInDays:
            expires_at = datetime.now(timezone.utc) + timedelta(days=share_request.expiresInDays)
        
        # Create share
        share = Share(
            processId=process_id,
            accessLevel=share_request.accessLevel,
            createdBy=user["id"],
            createdByName=user["name"],
            expiresAt=expires_at
        )
        
        # Store in database
        share_dict = share.model_dump()
        await db.shares.insert_one(share_dict)
        
        logger.info(f"✅ Share created: {share.token} for process {process_id} by {user['email']}")
        
        return share
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating share: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create share: {str(e)}")

@api_router.get("/process/{process_id}/shares", response_model=List[Share])
async def list_shares(process_id: str, request: Request):
    """List all shares for a process (owner only)"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get process and verify ownership
        process = await db.processes.find_one({"id": process_id}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can view shares")
        
        # Get all shares for this process
        shares = await db.shares.find(
            {"processId": process_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Convert datetime strings to datetime objects if needed
        for share in shares:
            for date_field in ['createdAt', 'updatedAt', 'expiresAt', 'lastAccessedAt', 'revokedAt']:
                if isinstance(share.get(date_field), str):
                    share[date_field] = datetime.fromisoformat(share[date_field])
        
        logger.info(f"✅ Listed {len(shares)} shares for process {process_id}")
        
        return shares
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing shares: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list shares: {str(e)}")

@api_router.delete("/share/{token}")
async def revoke_share(token: str, request: Request):
    """Revoke a share (soft delete) - owner only"""
    try:
        # Authenticate user
        user = await require_auth(request)
        
        # Get share
        share = await db.shares.find_one({"token": token}, {"_id": 0})
        if not share:
            raise HTTPException(status_code=404, detail="Share not found")
        
        # Verify ownership via process
        process = await db.processes.find_one({"id": share["processId"]}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Associated process not found")
        
        if process.get("userId") != user["id"]:
            raise HTTPException(status_code=403, detail="Only process owner can revoke shares")
        
        # Soft delete - set isActive to False and record revocation time
        await db.shares.update_one(
            {"token": token},
            {
                "$set": {
                    "isActive": False,
                    "revokedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"✅ Share revoked: {token} by {user['email']}")
        
        return {"success": True, "message": "Share revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking share: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke share: {str(e)}")

@api_router.get("/view/{token}")
async def view_shared_process(token: str):
    """Access a shared process via token (public endpoint, no auth required)"""
    try:
        # Get share by token
        share = await db.shares.find_one({"token": token}, {"_id": 0})
        if not share:
            raise HTTPException(status_code=404, detail="Share not found or invalid token")
        
        # Convert datetime strings if needed and ensure timezone awareness
        for date_field in ['createdAt', 'updatedAt', 'expiresAt', 'lastAccessedAt', 'revokedAt']:
            if isinstance(share.get(date_field), str):
                dt = datetime.fromisoformat(share[date_field])
                # Make timezone-aware if naive
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                share[date_field] = dt
            elif isinstance(share.get(date_field), datetime) and share[date_field].tzinfo is None:
                # If already datetime but naive, make it aware
                share[date_field] = share[date_field].replace(tzinfo=timezone.utc)
        
        # Check if share is active
        if not share.get("isActive", True):
            raise HTTPException(status_code=403, detail="This share has been revoked")
        
        # Check if share has expired
        if share.get("expiresAt"):
            if datetime.now(timezone.utc) > share["expiresAt"]:
                raise HTTPException(status_code=403, detail="This share has expired")
        
        # Get the process
        process = await db.processes.find_one({"id": share["processId"]}, {"_id": 0})
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        # Verify process is still published
        if process.get("status") != "published":
            raise HTTPException(status_code=403, detail="This process is no longer published")
        
        # Update access statistics
        await db.shares.update_one(
            {"token": token},
            {
                "$set": {
                    "lastAccessedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                },
                "$inc": {"accessCount": 1}
            }
        )
        
        logger.info(f"✅ Process accessed via share: {token} (access #{share.get('accessCount', 0) + 1})")
        
        # Return process data with access level
        return {
            "process": process,
            "accessLevel": share["accessLevel"],
            "shareInfo": {
                "createdBy": share.get("createdByName", "Unknown"),
                "createdAt": share.get("createdAt"),
                "expiresAt": share.get("expiresAt")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing shared process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to access shared process: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_indexes():
    """Create database indexes on startup"""
    try:
        # Shares indexes for performance
        await db.shares.create_index("token", unique=True)
        await db.shares.create_index("processId")
        await db.shares.create_index([("processId", 1), ("isActive", 1)])
        logger.info("✅ Database indexes created successfully")
    except Exception as e:
        logger.warning(f"⚠️ Error creating indexes (may already exist): {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

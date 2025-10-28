from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
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
from datetime import datetime, timezone
import json
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage
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

class Process(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
        This is faster and more reliable than AI for documents with clear headers.
        """
        process_titles = []
        
        # Pattern 1: Look for common process title patterns
        # Matches: "Process Name Process", "Process Name - Detail", "Process Name (All)", etc.
        patterns = [
            r'^([A-Z][^\n]{15,120}?(?:Process|Workflow|Procedure|Requisition))$',  # "Standard Requisition Process"
            r'^([A-Z][^\n]{15,120}?)\s*[-–]\s*([A-Z][^\n]{5,60})$',  # "Job Posting - Security" or "Job Posting – Security"
            r'^([A-Z][^\n]{15,120}?)\s+([A-Z][^\n]{5,60})$',  # "Manage Applications Security" (no dash)
            r'^([A-Z][^\n]{15,120}?)\s*\(([^)]+)\)$',  # "Onboarding (All)"
            r'==Start of OCR for page \d+==\s*([A-Z][^\n]{15,120})',  # After page markers
        ]
        
        lines = text.split('\n')
        seen_titles = set()
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 15:  # Skip very short lines
                continue
            
            # Check each pattern
            for pattern in patterns:
                match = re.match(pattern, line, re.MULTILINE)
                if match:
                    # Extract the full title
                    if len(match.groups()) > 1 and match.group(2):
                        # Pattern with two groups (e.g., "Title - Detail" or "Title Detail")
                        title = f"{match.group(1).strip()} {match.group(2).strip()}"
                    else:
                        title = match.group(1).strip()
                    
                    # Clean up title - remove duplicates within the title itself
                    # e.g., "Younity Onboarding (All)Younity Onboarding" -> "Younity Onboarding (All)"
                    words = title.split()
                    if len(words) > 4:
                        # Check if second half repeats first half
                        mid = len(words) // 2
                        first_half = ' '.join(words[:mid])
                        second_half = ' '.join(words[mid:])
                        if first_half in title and second_half in title and first_half == second_half.replace('(All)', '').strip():
                            title = first_half  # Use first occurrence
                    
                    # Filter out obviously non-process lines
                    if len(title) > 15 and title not in seen_titles:
                        # Check if it looks like a real process title
                        keywords = ['process', 'workflow', 'procedure', 'requisition', 'posting', 'onboarding', 
                                  'offer', 'application', 'recruit', 'hiring', 'manage', 'admin', 'standard', 'master']
                        title_lower = title.lower()
                        if any(keyword in title_lower for keyword in keywords):
                            # Additional check: avoid adding near-duplicates
                            is_duplicate = False
                            for existing_title in process_titles:
                                # Check similarity - if 80% of words match, it's a duplicate
                                existing_words = set(existing_title.lower().split())
                                new_words = set(title_lower.split())
                                if len(existing_words & new_words) / max(len(existing_words), len(new_words)) > 0.8:
                                    # But allow if it has distinguishing suffix like "Security" vs "Group"
                                    if not any(suffix in title_lower for suffix in ['security', 'group', 'parking', 'casual', 'master']):
                                        is_duplicate = True
                                        break
                            
                            if not is_duplicate:
                                process_titles.append(title)
                                seen_titles.add(title)
                                logger.debug(f"Found potential process title: {title}")
                    break
        
        # Pattern 2: Look for compound titles that might be on multiple lines or split
        # Search for lines like "Manage Applications & Offer" followed by "Security" or "Parking/Group"
        for i in range(len(lines) - 1):
            line = lines[i].strip()
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            
            # Check for split titles
            if ('Manage' in line or 'Applications' in line) and len(next_line) < 30 and next_line:
                combined = f"{line} {next_line}".strip()
                if len(combined) > 15 and combined not in seen_titles:
                    keywords = ['offer', 'application', 'security', 'parking', 'group']
                    if any(keyword in combined.lower() for keyword in keywords):
                        process_titles.append(combined)
                        seen_titles.add(combined)
                        logger.debug(f"Found compound process title: {combined}")
        
        # Remove duplicates while preserving order
        unique_titles = []
        for title in process_titles:
            if title not in unique_titles:
                unique_titles.append(title)
        
        process_count = len(unique_titles)
        high_confidence = process_count >= 2 and any('process' in t.lower() or 'requisition' in t.lower() for t in unique_titles)
        
        logger.info(f"Preprocessing found {process_count} unique process titles")
        
        return {
            'process_count': process_count,
            'process_titles': unique_titles,
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

Extract 3-5 key steps. Be CONCISE.

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
    }}
  ],
  "criticalGaps": [],
  "improvementOpportunities": []
}}

Return only 3-5 nodes. Keep it under 150 words total."""
                    
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
        result = await ai_service.parse_process(input_data.text, input_data.inputType)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/process", response_model=Process)
async def create_process(process: Process):
    """Create a new process"""
    try:
        doc = process.model_dump()
        doc['createdAt'] = doc['createdAt'].isoformat()
        doc['updatedAt'] = doc['updatedAt'].isoformat()
        
        await db.processes.insert_one(doc)
        return process
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/process", response_model=List[Process])
async def get_processes():
    """Get all processes"""
    try:
        processes = await db.processes.find({}, {"_id": 0}).to_list(1000)
        
        for process in processes:
            if isinstance(process.get('createdAt'), str):
                process['createdAt'] = datetime.fromisoformat(process['createdAt'])
            if isinstance(process.get('updatedAt'), str):
                process['updatedAt'] = datetime.fromisoformat(process['updatedAt'])
        
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

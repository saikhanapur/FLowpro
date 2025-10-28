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
    
    async def parse_process(self, input_text: str, input_type: str) -> Dict[str, Any]:
        """Parse input text and extract process structure using Claude - can detect multiple processes"""
        try:
            # Limit input size to prevent extremely long processing
            max_length = 20000  # Increased to handle multi-process documents
            if len(input_text) > max_length:
                logger.warning(f"Input text too long ({len(input_text)} chars), truncating to {max_length}")
                input_text = input_text[:max_length] + "\n\n[Document truncated. Analyze visible processes.]"
            
            logger.info(f"Starting process detection for {input_type} with {len(input_text)} characters")
            
            # First, detect if document contains multiple processes
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"detect_{uuid.uuid4()}",
                system_message="You are an expert at identifying process workflows in documents. Analyze carefully and detect ALL distinct processes."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            detection_prompt = f"""CRITICAL TASK: Analyze this {input_type} to detect if it contains MULTIPLE DISTINCT PROCESS WORKFLOWS.

{input_text}

YOU MUST:
1. Look for MULTIPLE separate process flowcharts or workflow descriptions
2. Check for section headers like "Process 1:", "Process Map 2:", different workflow titles
3. Identify if different pages/sections describe DIFFERENT workflows (not steps of ONE workflow)
4. Each distinct process has its own START and END, own actors, own purpose

EXAMPLES of MULTIPLE processes:
- "Recruitment Process" AND "Onboarding Process" (separate workflows)
- "Standard Requisition Process" AND "High Volume Recruitment" (different approaches)
- "Job Posting Process" AND "Offer Management Process" (distinct phases as separate processes)
- Multiple process maps on different pages with different titles

EXAMPLES of SINGLE process:
- One workflow with multiple steps (even if 10+ steps)
- Sequential phases within ONE end-to-end process
- One flowchart with decision branches

Return ONLY this JSON (no markdown, no explanations):
{{
  "multipleProcesses": true or false,
  "processCount": exact number,
  "processTitles": ["Exact Title 1 from Document", "Exact Title 2 from Document", ...],
  "confidence": "high" or "medium" or "low",
  "reasoning": "brief explanation"
}}

If ONLY ONE workflow detected, return:
{{"multipleProcesses": false, "processCount": 1, "processTitles": [], "confidence": "high", "reasoning": "Single end-to-end process"}}

BE THOROUGH. Check the ENTIRE document."""
            
            detection_message = UserMessage(text=detection_prompt)
            detection_response = await chat.send_message(detection_message)
            
            logger.info(f"Detection response: {detection_response[:500]}")
            
            # Parse detection response
            detection_text = detection_response.strip()
            if detection_text.startswith('```'):
                start = detection_text.find('{')
                end = detection_text.rfind('}')
                if start != -1 and end != -1:
                    detection_text = detection_text[start:end+1]
            
            detection_result = json.loads(detection_text)
            logger.info(f"Detection result: {detection_result}")
            
            # If multiple processes detected (≥2), parse them separately
            if detection_result.get('multipleProcesses') and detection_result.get('processCount', 0) >= 2:
                logger.info(f"Multiple processes detected: {detection_result.get('processCount')}")
                return await self._parse_multiple_processes(input_text, input_type, detection_result)
            else:
                # Single process - use existing logic
                logger.info("Single process detected, using standard parsing")
                return await self._parse_single_process(input_text, input_type)
                
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
        """Parse multiple processes from input text"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"multi_parse_{uuid.uuid4()}",
                system_message="You are FlowForge AI. Extract multiple distinct processes. Be concise. Return valid JSON only."
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            process_titles = detection_result.get('processTitles', [])
            
            prompt = f"""This document contains {len(process_titles)} distinct processes:
{', '.join(process_titles)}

Extract EACH process separately with 5-8 critical steps per process.

{input_text}

CRITICAL: Return ONLY valid JSON array. No markdown. No explanations.

Return this JSON structure:
[
  {{
    "processName": "Exact title from document",
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
        "subSteps": ["step 1"],
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
  }}
]"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse JSON array from response
            response_text = response.strip()
            if response_text.startswith('```'):
                start = response_text.find('[')
                end = response_text.rfind(']')
                if start != -1 and end != -1:
                    response_text = response_text[start:end+1]
            
            processes_array = json.loads(response_text)
            
            # Ensure it's a list
            if not isinstance(processes_array, list):
                processes_array = [processes_array]
            
            return {
                "multipleProcesses": True,
                "processCount": len(processes_array),
                "processes": processes_array
            }
            
        except Exception as e:
            logger.error(f"Error parsing multiple processes: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to parse multiple processes: {str(e)}")
    
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

import os
import json
import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
from supabase import create_client

# Initialize professional logging for Riwi AI Service
logger = logging.getLogger("riwi-ai-roadmap")

router = APIRouter(prefix="/roadmap", tags=["Learning Paths"])

# --- Data Transfer Objects (DTOs) ---
class RoadmapRequest(BaseModel):
    """
    Schema for generating personalized roadmaps.
    Integrates coder profiling and module-specific constraints.
    """
    topic: str
    coder_id: int
    module_id: int

# --- Business Logic Helpers ---
def get_module_context(module_id: int):
    """
    Returns specific Riwi curriculum constraints based on the module ID.
    This ensures the AI respects the 3-week or 4-week structure.
    """
    curriculum = {
        1: {"name": "Python Fundamentals", "weeks": 3, "critical": False},
        2: {"name": "HTML & CSS", "weeks": 3, "critical": False},
        3: {"name": "JavaScript", "weeks": 4, "critical": True},
        4: {"name": "Databases", "weeks": 3, "critical": False}
    }
    return curriculum.get(module_id, {"name": "Software Development", "weeks": 3, "critical": False})

# --- Main Endpoint ---
@router.post("/generate")
async def generate_roadmap(request: RoadmapRequest):
    """
    Generates a module-aligned roadmap that cross-references technical goals
    with onboarding soft skills and Riwi's specific timeframes.
    """
    execution_start = time.time()
    module_info = get_module_context(request.module_id)
    
    try:
        # 1. Initialize Cloud Service Clients
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

        # 2. Fetch Coder Onboarding Data (Soft Skills)
        # This aligns the AI output with the "Life Skills" objective.
        coder_data = supabase.table("soft_skills_assessment").select("*").eq("coder_id", request.coder_id).single().execute()
        soft_skills = coder_data.data if coder_data.data else {}
        
        # 3. Construct the Professional Pedagogical Prompt
        # We explicitly tell the AI about the 3/4 week limit and the performance test.
        prompt = f"""
        You are a Senior Technical Mentor at Riwi. 
        Student Profile: Learning Style: {soft_skills.get('learning_style', 'Mixed')}, 
        Autonomy: {soft_skills.get('autonomy', 3)}/5, Time Management: {soft_skills.get('time_management', 3)}/5.
        
        Task: Create a COMPLEMENTARY roadmap for '{request.topic}' within Module {request.module_id} ({module_info['name']}).
        
        Constraints:
        - Duration: Exactly {module_info['weeks']} weeks.
        - Week {module_info['weeks']} must focus on 'Performance Test Simulation'.
        - Level: {'Advanced & Rigorous' if module_info['critical'] else 'Foundational'}.
        
        Return ONLY a JSON object:
        {{
            "title": "{request.topic}",
            "targeted_soft_skill": "Based on onboarding, e.g., Time Management",
            "weeks": [
                {{
                    "week_number": 1,
                    "focus": "Topic",
                    "activities": ["Task 1", "Task 2"],
                    "estimated_hours": 5
                }}
            ]
        }}
        """

        # 4. AI Inference
        completion = groq_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        roadmap_json = json.loads(completion.choices[0].message.content)

        # 5. Persistence in Database
        # Saving the plan and logging the AI generation for TL auditing.
        plan_insert = supabase.table("complementary_plans").insert({
            "coder_id": request.coder_id,
            "module_id": request.module_id,
            "plan_content": roadmap_json,
            "targeted_soft_skill": roadmap_json.get("targeted_soft_skill"),
            "is_active": True
        }).execute()

        execution_time_ms = int((time.time() - execution_start) * 1000)
        supabase.table("ai_generation_log").insert({
            "coder_id": request.coder_id,
            "agent_type": "learning_plan",
            "input_payload": {"topic": request.topic, "module": module_info['name']},
            "output_payload": roadmap_json,
            "execution_time_ms": execution_time_ms,
            "success": True
        }).execute()

        return {
            "status": "success",
            "module_context": module_info,
            "data": roadmap_json
        }

    except Exception as e:
        logger.error(f"Roadmap generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Logic Error: {str(e)}")
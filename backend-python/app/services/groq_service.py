import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from groq import Groq
from app.models.plan_request import GeneratePlanRequest
from app.services.prompt_builder import build_personalized_prompt

# Configure logging to track service behavior and errors
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# MODEL SELECTION: Upgrading to Llama 3.3 70B for superior reasoning and JSON compliance
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

async def generate_plan_with_groq(request: GeneratePlanRequest) -> Dict[str, Any]:
    """
    Orchestrates the personalized learning path generation process using Llama 3.3 70B.
    """
    try:
        # 1. Build the high-context prompt
        prompt = build_personalized_prompt(request)
        
        # 2. Execute inference with Llama-specific optimizations
        chat_completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Senior Educational Architect at Riwi. "
                        "Your mission is to generate a detailed 4-week learning roadmap. "
                        "STRICT RULES:\n"
                        "- Output ONLY a valid JSON object.\n"
                        "- No conversational filler, no markdown code blocks (```json), no <think> tags.\n"
                        "- Ensure technical activities strictly address the student's weaknesses."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3, # Slightly higher than 0.2 to allow better pedagogical connections but keep it stable
            max_tokens=6000, # Increased for 70B models to ensure the 20-day JSON isn't cut off
            top_p=0.9,
            response_format={"type": "json_object"} # Native JSON enforcement
        )
        
        raw_content = chat_completion.choices[0].message.content
        
        # 3. Validation logic
        plan = extract_and_validate_json(raw_content)
        
        if not plan:
            logger.warning(f"Llama 70B failed JSON validation for user {request.coder_id}. Using fallback.")
            return get_default_plan(request)
            
        logger.info(f"Roadmap successfully generated using Llama 3.3 70B for user {request.coder_id}")
        return plan
        
    except Exception as e:
        logger.error(f"Critical failure in Groq Service (Llama 70B): {str(e)}")
        return get_default_plan(request)

def extract_and_validate_json(text: str) -> Optional[Dict[str, Any]]:
    """Parses raw LLM output into a Python dictionary, cleaning common noise."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != 0:
                return json.loads(text[start:end])
        except Exception:
            return None
    return None

def get_default_plan(request: GeneratePlanRequest) -> Dict[str, Any]:
    """Safety net based on the weakest identified soft skill."""
    skill_map = {
        "autonomy": request.soft_skills.autonomy,
        "time_management": request.soft_skills.time_management,
        "problem_solving": request.soft_skills.problem_solving
    }
    main_weakness = min(skill_map, key=skill_map.get)

    return {
        "status": "fallback",
        "weeks": [{
            "week_number": 1,
            "focus": "Core Technical Debt Review",
            "days": [{
                "day": 1,
                "technical_activity": {
                    "title": "Foundational Concepts Reinforcement",
                    "description": "Reviewing recent blockers and documentation.",
                    "duration_minutes": 60,
                    "resources": ["Internal Knowledge Base"]
                },
                "soft_skill_activity": {
                    "title": "Time Management Reflection",
                    "skill": main_weakness,
                    "description": "Self-assessment of learning speed.",
                    "duration_minutes": 30
                }
            }]
        }]
    }
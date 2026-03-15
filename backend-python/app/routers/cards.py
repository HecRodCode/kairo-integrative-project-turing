"""
app/routers/cards.py
BUG FIX #7: OpenAI → Groq (llama-3.3-70b-versatile)
"""
import os
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ia_services import _extract_json
from app.services.clients import get_groq_client, get_supabase_client

logger = logging.getLogger("kairo-cards")
router = APIRouter(tags=["Focus Cards"])

class FocusCardsRequest(BaseModel):
    coder_id:          int
    module_id:         int
    struggling_topics: list[str] = []

@router.post("/generate-focus-cards")
async def generate_focus_cards(req: FocusCardsRequest):
    """
    Called by Node.js: POST /generate-focus-cards
    Returns 6 cards: 2 High / 2 Medium / 2 Low priority
    """
    groq_client = get_groq_client()
    supabase = get_supabase_client()

    try:
        result = supabase.table("soft_skills_assessment") \
            .select("learning_style, problem_solving, autonomy") \
            .eq("coder_id", req.coder_id) \
            .single() \
            .execute()
        ss = result.data or {}

        topics = ', '.join(req.struggling_topics) if req.struggling_topics else "general programming concepts"

        prompt = f"""
You are Kairo, an AI tutor for Riwi coding bootcamp.
STUDENT CONTEXT:
- Learning style: {ss.get('learning_style', 'mixed')}
- Problem solving: {ss.get('problem_solving', 3)}/5
- Autonomy: {ss.get('autonomy', 3)}/5
- Module ID: {req.module_id}
- Struggling topics: {topics}

Generate exactly 6 smart study cards.
Distribution: 2 HIGH priority, 2 MEDIUM priority, 2 LOW priority.

Return ONLY valid JSON with no markdown, no backticks:
{{
    "cards": [
        {{
            "priority": "high",
            "topic": "topic name",
            "title": "card title",
            "theory": "3-4 sentence explanation",
            "practice": {{
                "description": "what to do",
                "example": "code snippet or step-by-step"
            }},
            "pro_tips": ["tip 1", "tip 2"]
        }}
    ]
}}
"""

        completion = groq_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": "You are an expert coding tutor. Respond only with valid JSON, no markdown."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=2048,
            temperature=0.7,
        )

        raw = completion.choices[0].message.content.strip()
        data = _extract_json(raw)
        if not data:
            raise json.JSONDecodeError("Invalid JSON response", raw, 0)

        cards = data.get("cards", [])
        if len(cards) != 6:
            logger.warning(f"Expected 6 cards, got {len(cards)}")

        return {"success": True, "data": data}

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        logger.error(f"Focus cards generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
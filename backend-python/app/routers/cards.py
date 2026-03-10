"""
app/routers/cards.py
Generates 6 smart focus cards (2 High, 2 Medium, 2 Low priority)
for the coder dashboard "Focus AI" section.
Each card has: theory, practice exercise, pro tips.
"""

import os
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client

logger = logging.getLogger("kairo-cards")
router = APIRouter(tags=["Focus Cards"])

def _get_clients():
    return (
        OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
        create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    )

# ── DTO ────────────────────────────────────────────────────────
class FocusCardsRequest(BaseModel):
    coder_id:         int
    module_id:        int
    struggling_topics: list[str] = []

# ── Endpoint ───────────────────────────────────────────────────
@router.post("/generate-focus-cards")
async def generate_focus_cards(req: FocusCardsRequest):
    """
    Called by Node.js: POST /generate-focus-cards
    Returns 6 cards: 2 High / 2 Medium / 2 Low priority
    with theory, practice, and pro_tips for each.
    """
    openai_client, supabase = _get_clients()

    try:
        # Fetch soft skills for personalization
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
High priority = critical gaps that block progress.
Medium priority = needs reinforcement.
Low priority = good to know / enrichment.

Return ONLY valid JSON:
{{
    "cards": [
        {{
            "priority": "high",
            "topic": "topic name",
            "title": "card title",
            "theory": "3-4 sentence explanation of the concept",
            "practice": {{
                "description": "what to do",
                "example": "code snippet or step-by-step exercise"
            }},
            "pro_tips": ["tip 1", "tip 2"]
        }}
    ]
}}
"""

        completion = openai_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are an expert coding tutor. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1800,
            temperature=0.7,
        )

        data = json.loads(completion.choices[0].message.content)

        # Validate we got 6 cards
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
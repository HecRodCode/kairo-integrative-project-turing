"""
app/routers/cards.py
POST /generate-focus-cards
"""

import os
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

from app.services.supabase_service import db_manager

logger = logging.getLogger("kairo-cards")
router = APIRouter(tags=["Focus Cards"])


class FocusCardsRequest(BaseModel):
    coder_id:          int
    module_id:         int
    struggling_topics: list[str] = []


@router.post("/generate-focus-cards")
async def generate_focus_cards(req: FocusCardsRequest):
    """
    Generates 6 focus cards: 2 High / 2 Medium / 2 Low priority.
    Cards are personalized using soft skills + module topics.
    Called by Node.js POST /api/ai/generate-focus-cards.
    """
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    # Fetch coder profile
    soft_skills = db_manager.get_soft_skills(req.coder_id) or {}
    module      = db_manager.get_module(req.module_id) or {}
    topics      = db_manager.get_topics(req.module_id)

    module_name     = module.get("name", "Módulo actual")
    topics_str      = ", ".join(topics[:8]) if topics else "conceptos generales del módulo"
    struggling_str  = ", ".join(req.struggling_topics) if req.struggling_topics else "ninguno reportado"
    learning_style  = soft_skills.get("learning_style", "mixed")
    problem_solving = soft_skills.get("problem_solving", 3)
    autonomy        = soft_skills.get("autonomy", 3)

    prompt = f"""
Eres Kairo, tutor de IA del bootcamp Riwi en Colombia.

PERFIL DEL CODER:
- Estilo de aprendizaje: {learning_style}
- Resolución de problemas: {problem_solving}/5
- Autonomía: {autonomy}/5
- Módulo actual: {module_name}
- Temas del módulo: {topics_str}
- Temas con dificultades: {struggling_str}

Genera exactamente 6 tarjetas de estudio inteligentes y específicas para {module_name}.
Distribución obligatoria: 2 HIGH, 2 MEDIUM, 2 LOW priority.
Los temas HIGH deben cubrir directamente: {struggling_str or topics_str}.

Responde ÚNICAMENTE con JSON válido, sin markdown ni backticks:
{{
  "cards": [
    {{
      "priority": "high",
      "topic": "nombre exacto del tema del módulo",
      "title": "título accionable de la tarjeta",
      "theory": "explicación de 3-4 oraciones adaptada al estilo {learning_style}",
      "practice": {{
        "description": "qué debe hacer el coder en 20 minutos",
        "example": "fragmento de código o pasos concretos"
      }},
      "pro_tips": ["tip concreto 1", "tip concreto 2"]
    }}
  ]
}}
"""

    try:
        completion = groq_client.chat.completions.create(
            model    = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages = [
                {
                    "role":    "system",
                    "content": "Eres un tutor técnico experto. Responde solo con JSON válido, sin markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens  = 2048,
            temperature = 0.7,
        )

        raw = completion.choices[0].message.content.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data  = json.loads(raw.strip())
        cards = data.get("cards", [])

        if len(cards) != 6:
            logger.warning(f"[Cards] Expected 6 cards, got {len(cards)}")

        db_manager.log_generation(
            coder_id          = req.coder_id,
            agent_type        = "focus_cards_generator",
            input_payload     = {
                "module_id":         req.module_id,
                "struggling_topics": req.struggling_topics,
            },
            output_payload    = {"cards_count": len(cards)},
            execution_time_ms = 0,
            success           = True,
        )

        return {"success": True, "data": data}

    except json.JSONDecodeError as e:
        logger.error(f"[Cards] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="La IA devolvió JSON inválido")
    except Exception as e:
        logger.error(f"[Cards] Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
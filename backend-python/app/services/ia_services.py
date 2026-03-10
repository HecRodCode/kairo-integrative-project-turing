"""
app/services/ia_services.py
OpenAI inference layer. Accepts a plain context dict assembled by roadmap.py.
"""

import os, json, logging
from typing import Dict, Any, Optional
from openai import OpenAI
from app.services.prompt_builder import build_prompt

logger = logging.getLogger("kairo-ia-services")
MODEL  = os.getenv("MODEL_NAME", "gpt-4o-mini")


def get_openai_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY not set.")
    return OpenAI(api_key=key)


def extract_json(text: str) -> Optional[Dict]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            s, e = text.find('{'), text.rfind('}') + 1
            if s != -1 and e > s:
                return json.loads(text[s:e])
        except Exception:
            return None
    return None


def get_fallback_plan(context: Dict) -> Dict:
    ss     = context.get("soft_skills", {})
    skills = {"autonomy": ss.get("autonomy", 3), "time_management": ss.get("time_management", 3), "problem_solving": ss.get("problem_solving", 3)}
    weakest = min(skills, key=skills.get)
    module  = context.get("module", {})
    return {
        "status": "fallback",
        "targeted_soft_skill": weakest,
        "summary": "Plan de respaldo — servicio de IA no disponible temporalmente.",
        "weeks": [{"week_number": 1, "focus": f"Revisión — {module.get('name','Módulo actual')}", "days": [{"day": 1,
            "technical_activity": {"title": "Repaso de Conceptos Clave", "description": "Revisa los temas dificultosos en tu Moodle de Riwi.", "duration_minutes": 45, "difficulty": "beginner", "resources": ["Moodle Riwi"]},
            "soft_skill_activity": {"title": "Sesión de Reflexión", "skill": weakest, "description": "¿Qué fue lo más difícil esta semana?", "duration_minutes": 20, "reflection_prompt": "¿Qué hábito concreto cambiarías para mejorar?"}}]}],
    }


async def generate_plan_with_openai(context: Dict) -> Dict:
    try:
        client     = get_openai_client()
        prompt     = build_prompt(context)
        completion = client.chat.completions.create(
            model=MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "Eres un Arquitecto Educativo Senior en Riwi. Genera planes de aprendizaje personalizados en JSON válido. Sin markdown. Sin texto fuera del JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=3500,
        )
        plan = extract_json(completion.choices[0].message.content)
        if not plan:
            logger.warning(f"Invalid JSON for coder {context.get('coder_id')}. Using fallback.")
            return get_fallback_plan(context)
        logger.info(f"Plan generated for coder {context.get('coder_id')}")
        return plan
    except Exception as e:
        logger.error(f"OpenAI call failed: {e}")
        return get_fallback_plan(context)
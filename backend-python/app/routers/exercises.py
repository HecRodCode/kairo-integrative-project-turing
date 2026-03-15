"""
app/routers/exercises.py
POST /generate-exercise
POST /exercise/{id}/submit
"""

import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

from app.services.ia_services     import _get_client, _extract_json, MODEL
from app.services.supabase_service import db_manager
from app.services.prompt_builder   import build_exercise_prompt, _detect_language

logger = logging.getLogger("kairo-exercises")
router = APIRouter(tags=["Exercises"])


class GenerateExerciseRequest(BaseModel):
    coder_id:    int
    plan_id:     int
    day_number:  int
    week_number: int
    topic:       str
    description: str          = ""
    difficulty:  str          = "intermediate"
    module_name: str          = "Bases de Datos"
    language:    Optional[str]= None


def _fallback_exercise(language: str, topic: str, reason: str) -> Dict:
    starters = {
        "sql":        f"-- Ejercicio: {topic}\n-- Escribe tu consulta aquí\nSELECT \n",
        "python":     f"# Ejercicio: {topic}\ndef solve():\n    # tu código aquí\n    pass\n",
        "javascript": f"// Ejercicio: {topic}\nfunction solve() {{\n  // tu código aquí\n}}\n",
        "html":       f"<!-- Ejercicio: {topic} -->\n<!DOCTYPE html>\n<html>\n<body>\n\n</body>\n</html>\n",
    }
    return {
        "title":           f"Ejercicio: {topic}",
        "description":     f"Ejercicio temporalmente no disponible. Motivo: {reason}. Consulta a tu TL.",
        "language":        language,
        "difficulty":      "intermediate",
        "topic":           topic,
        "starter_code":    starters.get(language, f"// {topic}\n"),
        "solution":        "",
        "expected_output": "Consulta con tu TL",
        "hints":           [
            "Revisa la documentación oficial del tema.",
            "Consulta los recursos de tu TL en la sección inferior.",
        ],
        "status": "fallback",
    }


@router.post("/generate-exercise")
async def generate_exercise(req: GenerateExerciseRequest):
    """
    Generates or returns a cached exercise for a specific plan day.
    UNIQUE(plan_id, day_number) ensures the same exercise is always returned
    for the same day — no regeneration on every open.
    """
    start = time.time()

    # 1. Check cache first — avoids Python round-trip on repeat opens
    cached = db_manager.get_exercise(req.plan_id, req.day_number)
    if cached:
        logger.info(f"[Exercise] Cache hit | plan={req.plan_id} day={req.day_number}")
        return {"success": True, "exercise": cached, "cached": True}

    # 2. Fetch coder profile for personalization
    soft_skills = db_manager.get_soft_skills(req.coder_id) or {}
    coder       = db_manager.get_coder(req.coder_id) or {}

    language = req.language or _detect_language(req.module_name)

    # 3. Build prompt context
    context = {
        "coder_id":       req.coder_id,
        "coder_name":     coder.get("full_name", "Estudiante"),
        "topic":          req.topic,
        "description":    req.description,
        "language":       language,
        "difficulty":     req.difficulty,
        "module_name":    req.module_name,
        "week_number":    req.week_number,
        "day_number":     req.day_number,
        "learning_style": soft_skills.get("learning_style", "mixed"),
        "soft_skills":    soft_skills,
    }

    prompt = build_exercise_prompt(context)

    # 4. Call Groq
    try:
        client   = _get_client()
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [
                {
                    "role":    "system",
                    "content": (
                        "Eres Kairo, el evaluador técnico de Riwi. "
                        "Respondes ÚNICAMENTE con JSON válido. "
                        "Sin texto adicional, sin markdown, sin backticks."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature     = 0.6,
            max_tokens      = 2048,
            response_format = {"type": "json_object"},
        )
        raw_text = response.choices[0].message.content

    except Exception as e:
        logger.error(f"[Exercise] Groq call failed: {e}")
        exercise = _fallback_exercise(language, req.topic, str(e))
        return {"success": False, "exercise": exercise, "cached": False}

    # 5. Parse JSON
    exercise = _extract_json(raw_text)
    if not exercise:
        logger.error(f"[Exercise] JSON parse failed. Raw: {raw_text[:300]}")
        exercise = _fallback_exercise(language, req.topic, "parse error")
        return {"success": False, "exercise": exercise, "cached": False}

    exercise["language"] = language
    exec_ms = int((time.time() - start) * 1000)

    # 6. Save to cache
    exercise_id = db_manager.save_exercise(
        plan_id    = req.plan_id,
        coder_id   = req.coder_id,
        day_number = req.day_number,
        exercise   = exercise,
    )

    logger.info(
        f"[Exercise] Generated | id={exercise_id} | plan={req.plan_id} "
        f"day={req.day_number} | lang={language} | {exec_ms}ms"
    )

    db_manager.log_generation(
        coder_id          = req.coder_id,
        agent_type        = "exercise_generator",
        input_payload     = {
            "plan_id":   req.plan_id,
            "day":       req.day_number,
            "topic":     req.topic,
            "language":  language,
        },
        output_payload    = {
            "exercise_id": exercise_id,
            "language":    language,
            "difficulty":  exercise.get("difficulty"),
        },
        execution_time_ms = exec_ms,
        success           = True,
    )

    return {
        "success":  True,
        "exercise": {**exercise, "id": exercise_id},
        "cached":   False,
    }


@router.post("/exercise/{exercise_id}/submit")
async def submit_exercise(exercise_id: int, body: dict):
    """
    Saves the coder's code submission for a given exercise.
    TL can query exercise_submissions JOIN exercises JOIN users to review code.
    No auto-grading — review is done by the TL.
    """
    coder_id = body.get("coder_id")
    code     = body.get("code", "").strip()

    if not coder_id:
        raise HTTPException(status_code=400, detail="coder_id es requerido.")
    if not code:
        raise HTTPException(status_code=400, detail="El campo code no puede estar vacío.")

    submission_id = db_manager.save_submission(
        exercise_id = exercise_id,
        coder_id    = coder_id,
        code        = code,
    )

    if not submission_id:
        raise HTTPException(status_code=500, detail="No se pudo guardar la solución.")

    return {
        "success":       True,
        "submission_id": submission_id,
        "message":       "¡Solución enviada! Tu TL podrá revisar tu código.",
    }
"""
app/services/ia_services.py

OpenAI inference layer. Receives the full context dict from roadmap.py and
routes to the correct prompt builder based on context["plan_type"].

  plan_type = "interpretive" → build_interpretive_prompt()
  plan_type = "analytical"   → build_analytical_prompt()

Model: gpt-4o-mini (configurable via MODEL_NAME env var).
Falls back to a safe error structure if generation fails so the caller
always gets a JSON-parseable response — the DB insert never crashes.
"""

import os
import json
import logging
from typing import Dict, Optional

from openai import OpenAI

from app.services.prompt_builder import (
    build_interpretive_prompt,
    build_analytical_prompt,
)

logger = logging.getLogger("kairo-ia-services")
MODEL  = os.getenv("MODEL_NAME", "gpt-4o-mini")


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set in environment.")
    return OpenAI(api_key=api_key)


def _extract_json(text: str) -> Optional[Dict]:
    """
    Tries to parse the model output as JSON.
    Handles cases where the model wraps the JSON in markdown fences.
    """
    clean = text.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        clean = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        try:
            s = clean.find("{")
            e = clean.rfind("}") + 1
            if s != -1 and e > s:
                return json.loads(clean[s:e])
        except Exception:
            pass
    return None


def _fallback_plan(plan_type: str, reason: str) -> Dict:
    """Returns a safe fallback structure so the DB insert never fails."""
    return {
        "plan_type":              plan_type,
        "status":                 "fallback",
        "targeted_soft_skill":    "autonomy",
        "learning_style_applied": "mixed",
        "summary":                f"Plan no disponible temporalmente: {reason}",
        "weeks":                  [],
    }


async def generate_plan_with_ai(context: Dict) -> Dict:
    """
    Main entry point called by roadmap.py.

    Selects the correct prompt based on context["plan_type"],
    calls OpenAI, parses the JSON response, and returns the plan dict
    (or a safe fallback on error).
    """
    plan_type = context.get("plan_type", "interpretive")

    # ── Select prompt ────────────────────────────────────────────────────────
    if plan_type == "analytical":
        prompt = build_analytical_prompt(context)
    else:
        prompt = build_interpretive_prompt(context)

    logger.info(
        f"[AI] Generating {plan_type} plan | "
        f"coder={context.get('coder_id')} | "
        f"module={context.get('module', {}).get('name')} | "
        f"week={context.get('current_week', 1)} | "
        f"style={context.get('soft_skills', {}).get('learning_style', 'unknown')}"
    )

    # ── Call OpenAI ──────────────────────────────────────────────────────────
    try:
        client   = _get_client()
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role":    "system",
                    "content": (
                        "Eres Kairo, un arquitecto educativo de Riwi. "
                        "Respondes ÚNICAMENTE con JSON válido, sin texto adicional, "
                        "sin markdown, sin explicaciones antes o después del JSON."
                    ),
                },
                {
                    "role":    "user",
                    "content": prompt,
                },
            ],
            temperature=0.7,
            max_tokens=4096,
            response_format={"type": "json_object"},  # enforces JSON output
        )
        raw_text = response.choices[0].message.content

    except Exception as e:
        logger.error(f"[AI] OpenAI call failed: {e}")
        return _fallback_plan(plan_type, str(e))

    # ── Parse JSON ───────────────────────────────────────────────────────────
    plan = _extract_json(raw_text)

    if not plan:
        logger.error(f"[AI] Could not parse JSON from OpenAI response. Raw: {raw_text[:300]}")
        return _fallback_plan(plan_type, "modelo retornó texto no parseable como JSON")

    # Ensure plan_type is always stamped on the returned dict
    plan["plan_type"] = plan_type

    logger.info(
        f"[AI] Plan OK | type={plan_type} | "
        f"weeks={len(plan.get('weeks', []))} | "
        f"targeted={plan.get('targeted_soft_skill')} | "
        f"style={plan.get('learning_style_applied')}"
    )

    return plan
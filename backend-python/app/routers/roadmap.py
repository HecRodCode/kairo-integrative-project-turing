"""
app/routers/roadmap.py
POST /generate-plan

Architecture: Slim Communication
  Node.js sends only: { coder_id, module_id, topic, struggling_topics, additional_topics }
  Python owns data retrieval: fetches soft_skills, module, weeks directly from Supabase.
  Python builds the full context and calls OpenAI.
"""

import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ia_services import generate_plan_with_openai
from app.services.supabase_service import db_manager

logger = logging.getLogger("kairo-roadmap")
router = APIRouter(tags=["Learning Plans"])


# ── Slim DTO — only IDs and dynamic context from Node ──────────
class GeneratePlanRequest(BaseModel):
    coder_id:         int
    module_id:        int
    topic:            str
    struggling_topics: list[str] = []
    additional_topics: list[str] = []


# ── Endpoint ───────────────────────────────────────────────────
@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest):
    """
    1. Python fetches soft_skills from Supabase using coder_id
    2. Python fetches module + weeks from Supabase using module_id
    3. Builds full profile and calls OpenAI
    4. Saves plan to complementary_plans + logs to ai_generation_log
    """
    start = time.time()

    # ── 1. Soft skills (learning style + scores) ────────────────
    soft_skills = db_manager.get_soft_skills(req.coder_id)
    if not soft_skills:
        raise HTTPException(
            status_code=400,
            detail=f"No diagnostic found for coder {req.coder_id}. Complete onboarding first."
        )

    # ── 2. Module info ──────────────────────────────────────────
    module = db_manager.get_module(req.module_id)
    if not module:
        raise HTTPException(
            status_code=404,
            detail=f"Module {req.module_id} not found in database. Run seed_modules.sql first."
        )

    # ── 3. Weeks for this module ────────────────────────────────
    weeks = db_manager.get_weeks(req.module_id)

    # ── 4. Coder name ───────────────────────────────────────────
    coder = db_manager.get_coder(req.coder_id)
    coder_name = coder.get("full_name", "Student") if coder else "Student"

    # ── 5. Build full context and generate plan ─────────────────
    context = {
        "coder_id":   req.coder_id,
        "coder_name": coder_name,
        "soft_skills": soft_skills,
        "module":      module,
        "weeks":       weeks,
        "topic":              req.topic,
        "struggling_topics":  req.struggling_topics,
        "additional_topics":  req.additional_topics,
    }

    plan = await generate_plan_with_openai(context)
    exec_ms = int((time.time() - start) * 1000)

    # ── 6. Persist plan ─────────────────────────────────────────
    moodle_snapshot = {
        "topic":             req.topic,
        "struggling_topics": req.struggling_topics,
        "additional_topics": req.additional_topics,
        "module_name":       module.get("name"),
        "total_weeks":       module.get("total_weeks"),
        "weeks_in_module":   [{"week": w.get("week_number"), "name": w.get("name")} for w in weeks],
    }
    plan_id = db_manager.save_plan(
        coder_id=req.coder_id,
        module_id=req.module_id,
        plan=plan,
        soft_skills_snapshot=soft_skills,
        moodle_status_snapshot=moodle_snapshot,
        targeted_soft_skill=plan.get("targeted_soft_skill"),
    )

    # ── 7. Log generation ───────────────────────────────────────
    db_manager.log_generation(
        coder_id=req.coder_id,
        agent_type="plan_generator",
        input_payload={
            "module_id":       req.module_id,
            "topic":           req.topic,
            "struggling_topics": req.struggling_topics,
        },
        output_payload={"plan_id": plan_id, "status": plan.get("status", "ok")},
        execution_time_ms=exec_ms,
        success=plan.get("status") != "fallback",
    )

    return {
        "success": True,
        "plan":    plan,
        "metadata": {
            "coder_id":     req.coder_id,
            "module_id":    req.module_id,
            "module_name":  module.get("name"),
            "plan_id":      plan_id,
            "execution_ms": exec_ms,
            "model":        "gpt-4o-mini",
        },
    }
"""
app/routers/roadmap.py
POST /generate-plan
"""

import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.ia_services      import generate_plan_with_ai
from app.services.supabase_service import db_manager

logger = logging.getLogger("kairo-roadmap")
router = APIRouter(tags=["Learning Plans"])


class GeneratePlanRequest(BaseModel):
    coder_id:          int
    module_id:         int
    plan_type:         str            = "interpretive"
    current_week:      Optional[int]  = 1
    average_score:     Optional[float]= 0.0
    struggling_topics: List[str]      = []
    weeks_completed:   List[dict]     = []


@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest):
    start = time.time()

    if req.plan_type not in ("interpretive", "analytical"):
        raise HTTPException(
            status_code=400,
            detail=f"plan_type must be 'interpretive' or 'analytical', got '{req.plan_type}'"
        )

    # 1. Soft skills — required for both plan types
    soft_skills = db_manager.get_soft_skills(req.coder_id)
    if not soft_skills:
        raise HTTPException(
            status_code=400,
            detail=f"No diagnostic found for coder {req.coder_id}. Complete onboarding first."
        )

    # 2. Module + weeks + topics
    module = db_manager.get_module(req.module_id)
    if not module:
        raise HTTPException(
            status_code=404,
            detail=f"Module {req.module_id} not found."
        )
    weeks  = db_manager.get_weeks(req.module_id)
    topics = db_manager.get_topics(req.module_id)

    # 3. Coder info
    coder      = db_manager.get_coder(req.coder_id)
    coder_name = coder.get("full_name", "Estudiante") if coder else "Estudiante"

    # 4. For analytical: auto-fetch moodle progress if caller didn't send it
    if req.plan_type == "analytical" and req.average_score == 0.0 and not req.weeks_completed:
        progress = db_manager.get_moodle_progress(req.coder_id)
        if progress:
            req.average_score     = float(progress.get("average_score", 0))
            req.struggling_topics = progress.get("struggling_topics", []) or []
            req.weeks_completed   = progress.get("weeks_completed", [])  or []
            req.current_week      = progress.get("current_week", 1)
            logger.info(
                f"[roadmap] analytical: auto-fetched moodle_progress "
                f"score={req.average_score} week={req.current_week}"
            )

    # 5. Deactivate previous active plan
    db_manager.deactivate_plans(req.coder_id)

    # 6. Build context
    context = {
        "plan_type":    req.plan_type,
        "coder_id":     req.coder_id,
        "coder_name":   coder_name,
        "soft_skills":  soft_skills,
        "module":       module,
        "weeks":        weeks,
        "topics":       topics,
        "current_week": req.current_week,
    }
    if req.plan_type == "analytical":
        context.update({
            "average_score":     req.average_score,
            "struggling_topics": req.struggling_topics,
            "weeks_completed":   req.weeks_completed,
        })

    # 7. Generate plan via LLM
    plan    = await generate_plan_with_ai(context)
    exec_ms = int((time.time() - start) * 1000)

    # 8. Persist plan
    moodle_snapshot = {
        "plan_type":    req.plan_type,
        "current_week": req.current_week,
        "module_name":  module.get("name"),
        "total_weeks":  module.get("total_weeks"),
        **({"average_score":     req.average_score,
            "struggling_topics": req.struggling_topics}
           if req.plan_type == "analytical" else {}),
    }

    plan_id = db_manager.save_plan(
        coder_id               = req.coder_id,
        module_id              = req.module_id,
        plan                   = plan,
        soft_skills_snapshot   = soft_skills,
        moodle_status_snapshot = moodle_snapshot,
        targeted_soft_skill    = plan.get("targeted_soft_skill"),
    )

    # 9. Populate plan_activities from generated JSON
    # This makes the table live so TL can see real activity data per coder
    if plan_id:
        try:
            activity_count = db_manager.save_plan_activities(plan_id, plan)
            logger.info(f"[roadmap] {activity_count} plan_activities saved for plan {plan_id}")
        except Exception as e:
            logger.warning(f"[roadmap] save_plan_activities failed (non-blocking): {e}")

    # 10. Log generation
    db_manager.log_generation(
        coder_id          = req.coder_id,
        agent_type        = "plan_generator",
        input_payload     = {
            "plan_type":         req.plan_type,
            "module_id":         req.module_id,
            "current_week":      req.current_week,
            "struggling_topics": req.struggling_topics,
        },
        output_payload    = {"plan_id": plan_id, "status": plan.get("status", "ok")},
        execution_time_ms = exec_ms,
        success           = plan.get("status") != "fallback",
    )

    return {
        "success":  True,
        "plan_id":  plan_id,
        "plan":     plan,
        "metadata": {
            "plan_type":    req.plan_type,
            "coder_id":     req.coder_id,
            "module_id":    req.module_id,
            "module_name":  module.get("name"),
            "current_week": req.current_week,
            "execution_ms": exec_ms,
        },
    }
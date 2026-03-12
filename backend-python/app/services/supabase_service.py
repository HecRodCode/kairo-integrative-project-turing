"""
app/services/supabase_service.py
Singleton Supabase client. SERVICE_ROLE key — bypasses RLS.
Python owns all data retrieval (Slim Communication architecture).
"""

import os
import logging
from typing import Dict, Any, Optional, List
from supabase import create_client, Client
from dotenv import load_dotenv

logger = logging.getLogger("kairo-supabase")
load_dotenv()


class SupabaseManager:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_KEY missing.")
        self.client: Client = create_client(url, key)
        logger.info("Supabase client initialized.")

    # ── READ ───────────────────────────────────────────────────

    def get_soft_skills(self, coder_id: int) -> Optional[Dict]:
        try:
            r = self.client.table("soft_skills_assessment") \
                .select("*").eq("coder_id", coder_id).single().execute()
            return r.data
        except Exception as e:
            logger.warning(f"Soft skills not found for coder {coder_id}: {e}")
            return None

    def get_module(self, module_id: int) -> Optional[Dict]:
        try:
            r = self.client.table("modules") \
                .select("id, name, description, total_weeks, is_critical, has_performance_test") \
                .eq("id", module_id).single().execute()
            return r.data
        except Exception as e:
            logger.warning(f"Module {module_id} not found: {e}")
            return None

    def get_weeks(self, module_id: int) -> List[Dict]:
        try:
            r = self.client.table("weeks") \
                .select("week_number, name, description, difficulty_level") \
                .eq("module_id", module_id).order("week_number").execute()
            return r.data or []
        except Exception as e:
            logger.warning(f"Weeks not found for module {module_id}: {e}")
            return []

    def get_coder(self, coder_id: int) -> Optional[Dict]:
        try:
            r = self.client.table("users") \
                .select("id, full_name, email, clan") \
                .eq("id", coder_id).single().execute()
            return r.data
        except Exception as e:
            logger.warning(f"Coder {coder_id} not found: {e}")
            return None

    def get_topics(self, module_id: int) -> List[str]:
        try:
            r = self.client.table("topics") \
                .select("name").eq("module_id", module_id).execute()
            return [t["name"] for t in (r.data or [])]
        except Exception as e:
            logger.warning(f"Topics not found for module {module_id}: {e}")
            return []

    # ── WRITE ──────────────────────────────────────────────────

    def deactivate_plans(self, coder_id: int) -> None:
        """
        Marks all existing active plans for a coder as inactive
        before inserting a new one. Ensures only one plan is active at a time.
        """
        try:
            self.client.table("complementary_plans") \
                .update({"is_active": False}) \
                .eq("coder_id", coder_id) \
                .eq("is_active", True) \
                .execute()
            logger.info(f"Deactivated previous plans for coder {coder_id}")
        except Exception as e:
            logger.warning(f"Could not deactivate plans for coder {coder_id}: {e}")

    def get_moodle_progress(self, coder_id: int) -> Optional[Dict]:
        """
        Fetches the current moodle_progress row for a coder.
        Used by the Monday analytical plan trigger to get
        current_week, average_score, struggling_topics, weeks_completed.
        """
        try:
            r = self.client.table("moodle_progress") \
                .select("current_week, average_score, struggling_topics, weeks_completed") \
                .eq("coder_id", coder_id) \
                .order("updated_at", desc=True) \
                .limit(1) \
                .execute()
            return r.data[0] if r.data else None
        except Exception as e:
            logger.warning(f"moodle_progress not found for coder {coder_id}: {e}")
            return None

    def save_plan(self, coder_id: int, module_id: int, plan: Dict,
                  soft_skills_snapshot: Optional[Dict] = None,
                  moodle_status_snapshot: Optional[Dict] = None,
                  targeted_soft_skill: Optional[str] = None) -> Optional[int]:
        try:
            r = self.client.table("complementary_plans").insert({
                "coder_id":              coder_id,
                "module_id":             module_id,
                "plan_content":          plan,
                "soft_skills_snapshot":  soft_skills_snapshot,
                "moodle_status_snapshot": moodle_status_snapshot,  # snapshot of academic state at generation time
                "targeted_soft_skill":   targeted_soft_skill,
                "is_active":             True,
            }).execute()
            plan_id = r.data[0]["id"] if r.data else None
            logger.info(f"Plan saved: id={plan_id} for coder {coder_id}")
            return plan_id
        except Exception as e:
            logger.error(f"Failed to save plan: {e}")
            return None

    def log_generation(self, coder_id: Optional[int], agent_type: str,
                       input_payload: Dict, output_payload: Dict,
                       execution_time_ms: int = 0, success: bool = True,
                       error_message: Optional[str] = None) -> None:
        try:
            self.client.table("ai_generation_log").insert({
                "coder_id":          coder_id,
                "agent_type":        agent_type,       # plan_generator | report_generator | diagnostic | risk_detector
                "input_payload":     input_payload,
                "output_payload":    output_payload,
                "model_name":        os.getenv("MODEL_NAME", "gpt-4o-mini"),
                "execution_time_ms": execution_time_ms,
                "success":           success,
                "error_message":     error_message,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log generation: {e}")

    # ── EXERCISES ──────────────────────────────────────────────

    def get_exercise(self, plan_id: int, day_number: int) -> Optional[Dict]:
        """Returns cached exercise for a plan day, or None if not yet generated."""
        try:
            r = self.client.table("exercises")                 .select("id, title, description, language, starter_code, solution, hints, topic, difficulty, expected_output")                 .eq("plan_id", plan_id)                 .eq("day_number", day_number)                 .single()                 .execute()
            return r.data
        except Exception:
            return None

    def save_exercise(self, plan_id: int, coder_id: int, day_number: int,
                      exercise: Dict) -> Optional[int]:
        """Inserts exercise; on conflict (plan_id, day_number) does nothing and returns existing id."""
        try:
            r = self.client.table("exercises").upsert({
                "plan_id":        plan_id,
                "coder_id":       coder_id,
                "day_number":     day_number,
                "title":          exercise.get("title", ""),
                "description":    exercise.get("description", ""),
                "language":       exercise.get("language", "sql"),
                "starter_code":   exercise.get("starter_code", ""),
                "solution":       exercise.get("solution", ""),
                "hints":          exercise.get("hints", []),
                "topic":          exercise.get("topic", ""),
                "difficulty":     exercise.get("difficulty", "intermediate"),
                "expected_output": exercise.get("expected_output", ""),
            }, on_conflict="plan_id,day_number").execute()
            return r.data[0]["id"] if r.data else None
        except Exception as e:
            logger.error(f"Failed to save exercise: {e}")
            return None

    def save_submission(self, exercise_id: int, coder_id: int, code: str) -> Optional[int]:
        try:
            r = self.client.table("exercise_submissions").insert({
                "exercise_id":    exercise_id,
                "coder_id":       coder_id,
                "code_submitted": code,
            }).execute()
            return r.data[0]["id"] if r.data else None
        except Exception as e:
            logger.error(f"Failed to save submission: {e}")
            return None


    # ── RESOURCES (RAG) ────────────────────────────────────────

    def save_resource(self, module_id, title, storage_path, file_name,
                      preview_text, embedding, uploaded_by, clan_id=None) -> int | None:
        try:
            r = self.client.table("resources").insert({
                "module_id":    module_id,
                "title":        title,
                "storage_path": storage_path,
                "file_name":    file_name,
                "preview_text": preview_text,
                "embedding":    embedding,   # list[float] → Supabase convierte a vector
                "uploaded_by":  uploaded_by,
                "clan_id":      clan_id,
                "is_active":    True,
            }).execute()
            return r.data[0]["id"] if r.data else None
        except Exception as e:
            logger.error(f"Failed to save resource: {e}")
            return None

    def search_resources(self, embedding: list, module_id: int = 0,
                         clan_id: str = None, limit: int = 3) -> list:
        """
        Llama a la función pgvector search_resources definida en la migración.
        """
        try:
            r = self.client.rpc("search_resources", {
                "query_embedding":  embedding,
                "target_module_id": module_id,
                "target_clan_id":   clan_id,
                "match_count":      limit,
            }).execute()
            return r.data or []
        except Exception as e:
            logger.warning(f"search_resources RPC failed: {e}")
            return []

    def delete_resource(self, resource_id: int, uploaded_by: int) -> bool:
        try:
            self.client.table("resources")                 .update({"is_active": False})                 .eq("id", resource_id)                 .eq("uploaded_by", uploaded_by)                 .execute()
            return True
        except Exception as e:
            logger.warning(f"delete_resource failed: {e}")
            return False

    def get_resources_by_module(self, module_id: int) -> list:
        """Lista todos los recursos activos de un módulo (para el TL dashboard)."""
        try:
            r = self.client.table("resources")                 .select("id, title, file_name, preview_text, uploaded_at")                 .eq("module_id", module_id)                 .eq("is_active", True)                 .order("uploaded_at", desc=True)                 .execute()
            return r.data or []
        except Exception as e:
            logger.warning(f"get_resources_by_module failed: {e}")
            return []



db_manager = SupabaseManager()
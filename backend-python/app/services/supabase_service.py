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


db_manager = SupabaseManager()
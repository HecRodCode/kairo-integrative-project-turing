"""
app/services/supabase_service.py
Singleton Supabase client — SERVICE_ROLE key bypasses RLS.
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

    # ── USERS / CODERS ─────────────────────────────────────────

    def get_coder(self, coder_id: int) -> Optional[Dict]:
        try:
            r = self.client.table("users") \
                .select("id, full_name, email, clan, current_module_id, learning_style_cache") \
                .eq("id", coder_id).single().execute()
            return r.data
        except Exception as e:
            logger.warning(f"Coder {coder_id} not found: {e}")
            return None

    # ── SOFT SKILLS ────────────────────────────────────────────

    def get_soft_skills(self, coder_id: int) -> Optional[Dict]:
        try:
            r = self.client.table("soft_skills_assessment") \
                .select("*").eq("coder_id", coder_id).single().execute()
            return r.data
        except Exception as e:
            logger.warning(f"Soft skills not found for coder {coder_id}: {e}")
            return None

    # ── MODULES + WEEKS ────────────────────────────────────────

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
        """
        Returns week rows for a module ordered by week_number.
        Used by prompt_builder to give the LLM the module structure.
        """
        try:
            r = self.client.table("weeks") \
                .select("week_number, name, description, difficulty_level") \
                .eq("module_id", module_id) \
                .order("week_number") \
                .execute()
            return r.data or []
        except Exception as e:
            logger.warning(f"Weeks not found for module {module_id}: {e}")
            return []

    def get_topics(self, module_id: int) -> List[str]:
        """
        Returns topic names for a module.
        Used by prompt_builder and focus cards to give context on what topics exist.
        """
        try:
            r = self.client.table("topics") \
                .select("name, category") \
                .eq("module_id", module_id) \
                .execute()
            return [t["name"] for t in (r.data or [])]
        except Exception as e:
            logger.warning(f"Topics not found for module {module_id}: {e}")
            return []

    # ── MOODLE PROGRESS ────────────────────────────────────────

    def get_moodle_progress(self, coder_id: int) -> Optional[Dict]:
        """
        Returns the latest moodle_progress row for a coder.
        Used by analytical plan to detect struggling topics and score trends.
        """
        try:
            r = self.client.table("moodle_progress") \
                .select("current_week, average_score, struggling_topics, weeks_completed, updated_at") \
                .eq("coder_id", coder_id) \
                .order("updated_at", desc=True) \
                .limit(1) \
                .execute()
            return r.data[0] if r.data else None
        except Exception as e:
            logger.warning(f"moodle_progress not found for coder {coder_id}: {e}")
            return None

    # ── PLANS ──────────────────────────────────────────────────

    def deactivate_plans(self, coder_id: int) -> None:
        try:
            self.client.table("complementary_plans") \
                .update({"is_active": False}) \
                .eq("coder_id", coder_id) \
                .eq("is_active", True) \
                .execute()
            logger.info(f"Deactivated previous plans for coder {coder_id}")
        except Exception as e:
            logger.warning(f"Could not deactivate plans for coder {coder_id}: {e}")

    def save_plan(
        self,
        coder_id: int,
        module_id: int,
        plan: Dict,
        soft_skills_snapshot: Optional[Dict] = None,
        moodle_status_snapshot: Optional[Dict] = None,
        targeted_soft_skill: Optional[str] = None,
    ) -> Optional[int]:
        try:
            r = self.client.table("complementary_plans").insert({
                "coder_id":               coder_id,
                "module_id":              module_id,
                "plan_content":           plan,
                "soft_skills_snapshot":   soft_skills_snapshot,
                "moodle_status_snapshot": moodle_status_snapshot,
                "targeted_soft_skill":    targeted_soft_skill,
                "is_active":              True,
            }).execute()
            plan_id = r.data[0]["id"] if r.data else None
            logger.info(f"Plan saved: id={plan_id} for coder {coder_id}")
            return plan_id
        except Exception as e:
            logger.error(f"Failed to save plan: {e}")
            return None

    def save_plan_activities(self, plan_id: int, plan: Dict) -> int:
        """
        Populates plan_activities from the generated plan JSON.
        One row per day × activity type (technical + soft_skill) = up to 40 rows per plan.

        This brings plan_activities to life — TL can query real activity data per coder.
        Called immediately after save_plan() in roadmap.py.
        """
        weeks = plan.get("weeks", [])
        rows  = []

        for week in weeks:
            week_num = week.get("week_number", 1)
            for day_obj in week.get("days", []):
                day_num = day_obj.get("day", 1)
                tech    = day_obj.get("technical_activity", {})
                soft    = day_obj.get("soft_skill_activity", {})

                if tech:
                    rows.append({
                        "plan_id":                plan_id,
                        "day_number":             day_num,
                        "title":                  tech.get("title", f"Actividad técnica día {day_num}"),
                        "description":            tech.get("description", ""),
                        "estimated_time_minutes": tech.get("duration_minutes", 45),
                        "activity_type":          "technical",
                        "skill_focus":            week.get("focus", ""),
                    })

                if soft:
                    rows.append({
                        "plan_id":                plan_id,
                        "day_number":             day_num,
                        "title":                  soft.get("title", f"Habilidad blanda día {day_num}"),
                        "description":            soft.get("description", ""),
                        "estimated_time_minutes": soft.get("duration_minutes", 20),
                        "activity_type":          "soft_skill",
                        "skill_focus":            soft.get("skill", plan.get("targeted_soft_skill", "")),
                    })

        if not rows:
            logger.warning(f"save_plan_activities: no rows to insert for plan {plan_id}")
            return 0

        # Delete stale rows from a previous generation of this plan
        self.client.table("plan_activities").delete().eq("plan_id", plan_id).execute()

        result = self.client.table("plan_activities").insert(rows).execute()
        count  = len(result.data) if result.data else 0
        logger.info(f"plan_activities: inserted {count} rows for plan {plan_id}")
        return count

    # ── EXERCISES ──────────────────────────────────────────────

    def get_exercise(self, plan_id: int, day_number: int) -> Optional[Dict]:
        """
        Returns cached exercise for a plan day if it exists.
        Avoids regenerating the same exercise on every page load.
        """
        try:
            r = self.client.table("exercises") \
                .select("id, title, description, language, starter_code, solution, hints, topic, difficulty, expected_output") \
                .eq("plan_id", plan_id) \
                .eq("day_number", day_number) \
                .single() \
                .execute()
            return r.data
        except Exception:
            return None

    def save_exercise(
        self,
        plan_id: int,
        coder_id: int,
        day_number: int,
        exercise: Dict,
    ) -> Optional[int]:
        """
        Upserts an exercise for a plan day.
        UNIQUE(plan_id, day_number) ensures no duplicate exercises per day.
        """
        try:
            r = self.client.table("exercises").upsert({
                "plan_id":         plan_id,
                "coder_id":        coder_id,
                "day_number":      day_number,
                "title":           exercise.get("title", ""),
                "description":     exercise.get("description", ""),
                "language":        exercise.get("language", "sql"),
                "starter_code":    exercise.get("starter_code", ""),
                "solution":        exercise.get("solution", ""),
                "hints":           exercise.get("hints", []),
                "topic":           exercise.get("topic", ""),
                "difficulty":      exercise.get("difficulty", "intermediate"),
                "expected_output": exercise.get("expected_output", ""),
            }, on_conflict="plan_id,day_number").execute()
            return r.data[0]["id"] if r.data else None
        except Exception as e:
            logger.error(f"Failed to save exercise: {e}")
            return None

    def save_submission(self, exercise_id: int, coder_id: int, code: str) -> Optional[int]:
        """
        Saves a coder's code submission for a given exercise.
        TL can query exercise_submissions to review coder work.
        """
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

    def search_resources_by_text(
        self,
        topic: str,
        clan_id: str,
        module_id: Optional[int] = None,
        limit: int = 3,
    ) -> List[Dict]:
        """
        Text-based fallback search for resources when Python embedding search
        is not available. Filters by clan so coders only see their TL's resources.

        Used by /search-resources endpoint when embedding service is unavailable.
        """
        try:
            query = self.client.table("resources") \
                .select("id, title, file_name, preview_text, storage_path, module_id, uploaded_at") \
                .eq("clan_id", clan_id) \
                .eq("is_active", True) \
                .ilike("title", f"%{topic}%") \
                .limit(limit)

            if module_id:
                query = query.eq("module_id", module_id)

            r = query.execute()

            # If title search returns nothing, try preview_text
            if not r.data:
                query2 = self.client.table("resources") \
                    .select("id, title, file_name, preview_text, storage_path, module_id, uploaded_at") \
                    .eq("clan_id", clan_id) \
                    .eq("is_active", True) \
                    .ilike("preview_text", f"%{topic}%") \
                    .limit(limit)

                if module_id:
                    query2 = query2.eq("module_id", module_id)

                r = query2.execute()

            return [
                {**row, "similarity": 0.75}  # Fixed score for text-match results
                for row in (r.data or [])
            ]
        except Exception as e:
            logger.warning(f"search_resources_by_text failed: {e}")
            return []

    def get_resources_for_clan(
        self,
        clan_id: str,
        module_id: Optional[int] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Returns all active resources for a clan, optionally filtered by module.
        Used as last-resort fallback when topic search returns nothing.
        """
        try:
            query = self.client.table("resources") \
                .select("id, title, file_name, preview_text, storage_path, module_id, uploaded_at") \
                .eq("clan_id", clan_id) \
                .eq("is_active", True) \
                .order("uploaded_at", desc=True) \
                .limit(limit)

            if module_id:
                query = query.eq("module_id", module_id)

            r = query.execute()
            return [
                {**row, "similarity": 0.5}
                for row in (r.data or [])
            ]
        except Exception as e:
            logger.warning(f"get_resources_for_clan failed: {e}")
            return []

    # ── AI REPORTS ─────────────────────────────────────────────

    def save_ai_report(
        self,
        target_type: str,
        target_id: int,
        summary_text: str,
        risk_level: Optional[str],
        recommendations: Optional[str],
        cohort_id: Optional[str] = None,
        clan_id: Optional[str] = None,
    ) -> Optional[int]:
        """
        Saves an AI-generated report for a coder or clan.
        target_type: 'coder' | 'clan'
        risk_level: 'low' | 'medium' | 'high' | 'critical'
        """
        try:
            r = self.client.table("ai_reports").insert({
                "target_type":    target_type,
                "target_id":      target_id,
                "summary_text":   summary_text,
                "risk_level":     risk_level,
                "recommendations": recommendations,
                "cohort_id":      cohort_id,
                "clan_id":        clan_id,
                "viewed_by_tl":   False,
            }).execute()
            return r.data[0]["id"] if r.data else None
        except Exception as e:
            logger.error(f"Failed to save ai_report: {e}")
            return None

    # ── LOGGING ────────────────────────────────────────────────

    def log_generation(
        self,
        coder_id: Optional[int],
        agent_type: str,
        input_payload: Dict,
        output_payload: Dict,
        execution_time_ms: int = 0,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        try:
            self.client.table("ai_generation_log").insert({
                "coder_id":          coder_id,
                "agent_type":        agent_type,
                "input_payload":     input_payload,
                "output_payload":    output_payload,
                "model_name":        os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
                "execution_time_ms": execution_time_ms,
                "success":           success,
                "error_message":     error_message,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log generation: {e}")


db_manager = SupabaseManager()
-- Migration 006: Add composite and partial indexes for high-frequency queries
-- Date: 2026-03-15

CREATE INDEX IF NOT EXISTS idx_users_clan_role
  ON users(clan, role);

CREATE INDEX IF NOT EXISTS idx_risk_active
  ON risk_flags(coder_id, resolved)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_plans_coder_active
  ON complementary_plans(coder_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_feedback_coder_unread_partial
  ON tl_feedback(coder_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_assignments_scope_clan_active
  ON assignments(scope, clan_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exercises_plan_day
  ON exercises(plan_id, day_number);

-- Migration 002: Add raw_answers column to soft_skills_assessment
-- Reason: softSkills.js model inserts raw_answers (JSONB) but the column
--         did not exist in the original schema, causing INSERT failures.

ALTER TABLE soft_skills_assessment
  ADD COLUMN IF NOT EXISTS raw_answers JSONB;

COMMENT ON COLUMN soft_skills_assessment.raw_answers
  IS 'Full onboarding answers array [{questionId, optionId, score}] for audit/re-processing';

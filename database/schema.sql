-- ============================================
-- KAIRO - PLATAFORMA DE APRENDIZAJE PERSONALIZADO
-- Base de Datos PostgreSQL 
-- Motor: PostgreSQL 14+ (Supabase)
-- Versión: 3.0 - LIMPIA Y ORDENADA
-- Última actualización: Marzo 2026
-- ============================================

-- ============================================
-- LIMPIEZA INICIAL (Si es primera vez o reset)
-- ============================================
-- Descomenta estas líneas si necesitas hacer un reset completo:
/*
DROP TABLE IF EXISTS ai_generation_log CASCADE;
DROP TABLE IF EXISTS ai_reports CASCADE;
DROP TABLE IF EXISTS risk_flags CASCADE;
DROP TABLE IF EXISTS evidence_submissions CASCADE;
DROP TABLE IF EXISTS tl_feedback CASCADE;
DROP TABLE IF EXISTS activity_progress CASCADE;
DROP TABLE IF EXISTS plan_activities CASCADE;
DROP TABLE IF EXISTS complementary_plans CASCADE;
DROP TABLE IF EXISTS coder_struggling_topics CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS moodle_progress CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS soft_skills_assessment CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS ai_agent_enum CASCADE;
DROP TYPE IF EXISTS report_target_enum CASCADE;
DROP TYPE IF EXISTS risk_level_enum CASCADE;
DROP TYPE IF EXISTS feedback_type_enum CASCADE;
DROP TYPE IF EXISTS activity_type_enum CASCADE;
DROP TYPE IF EXISTS learning_style_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS priority_level_enum CASCADE;
*/

-- ============================================
-- TIPOS ENUM (Define valores posibles)
-- ============================================

CREATE TYPE role_enum AS ENUM ('coder', 'tl');

CREATE TYPE learning_style_enum AS ENUM ('visual', 'auditory', 'kinesthetic', 'mixed');

CREATE TYPE activity_type_enum AS ENUM ('guided', 'semi_guided', 'autonomous');

CREATE TYPE feedback_type_enum AS ENUM ('weekly', 'activity', 'general');

CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high');

CREATE TYPE report_target_enum AS ENUM ('coder', 'clan', 'cohort');

CREATE TYPE ai_agent_enum AS ENUM ('learning_plan', 'report_generator', 'risk_detector');

CREATE TYPE priority_level_enum AS ENUM ('low', 'medium', 'high');

-- ============================================
-- 1. USUARIOS - Coders y Team Leaders
-- ============================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role role_enum NOT NULL,
  clan_id VARCHAR(50),
  first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_clan_id ON users(clan_id);

COMMENT ON TABLE users IS 'Todos los usuarios del sistema (coders y team leaders)';
COMMENT ON COLUMN users.clan_id IS 'Clan del coder: Turing, Tesla, McCarthy. Permite al TL filtrar por clan.';

-- ============================================
-- 2. EVALUACIÓN DE HABILIDADES BLANDAS
-- ============================================

CREATE TABLE soft_skills_assessment (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL UNIQUE,
  autonomy INT NOT NULL CHECK (autonomy BETWEEN 1 AND 5),
  time_management INT NOT NULL CHECK (time_management BETWEEN 1 AND 5),
  problem_solving INT NOT NULL CHECK (problem_solving BETWEEN 1 AND 5),
  communication INT NOT NULL CHECK (communication BETWEEN 1 AND 5),
  teamwork INT NOT NULL CHECK (teamwork BETWEEN 1 AND 5),
  learning_style learning_style_enum NOT NULL,
  assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_soft_skills_coder ON soft_skills_assessment(coder_id);

COMMENT ON TABLE soft_skills_assessment IS 'Evaluación inicial de habilidades blandas de cada coder';

-- ============================================
-- 3. MÓDULOS DEL BOOTCAMP
-- ============================================

CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  total_weeks INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE modules IS 'Módulos académicos del bootcamp (Backend, Frontend, etc.)';

-- ============================================
-- 4. PROGRESO ACADÉMICO (Moodle)
-- ============================================

CREATE TABLE moodle_progress (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL,
  module_id INT NOT NULL,
  current_week INT NOT NULL,
  weeks_completed JSONB DEFAULT '[]'::jsonb,
  struggling_topics TEXT[] DEFAULT '{}',
  average_score DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (coder_id, module_id),
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_moodle_coder ON moodle_progress(coder_id);
CREATE INDEX idx_moodle_score ON moodle_progress(average_score);

COMMENT ON TABLE moodle_progress IS 'Seguimiento del progreso académico en Moodle';

-- ============================================
-- 5. TEMAS POR MÓDULO
-- ============================================

CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  module_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_topics_module ON topics(module_id);
CREATE INDEX idx_topics_category ON topics(category);

COMMENT ON TABLE topics IS 'Temas específicos dentro de cada módulo';

-- ============================================
-- 6. TEMAS CON DIFICULTAD (Relación N:M)
-- ============================================

CREATE TABLE coder_struggling_topics (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL,
  topic_id INT NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (coder_id, topic_id),
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX idx_struggling_coder ON coder_struggling_topics(coder_id);

COMMENT ON TABLE coder_struggling_topics IS 'Temas donde los coders reportan dificultad';

-- ============================================
-- 7. PLANES PERSONALIZADOS (Las 6 Cards)
-- ============================================

CREATE TABLE complementary_plans (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL,
  module_id INT NOT NULL,
  plan_content JSONB NOT NULL,
  priority_level priority_level_enum DEFAULT 'medium',
  soft_skills_snapshot JSONB,
  moodle_status_snapshot JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_plans_coder ON complementary_plans(coder_id);
CREATE INDEX idx_plans_active ON complementary_plans(is_active);
CREATE INDEX idx_plans_priority ON complementary_plans(priority_level);

COMMENT ON TABLE complementary_plans IS 'Planes de estudio personalizados generados por IA (las 6 Cards)';
COMMENT ON COLUMN complementary_plans.priority_level IS '2 High, 2 Medium, 2 Low. Ordena las cards por importancia.';

-- ============================================
-- 8. ACTIVIDADES DIARIAS DEL PLAN
-- ============================================

CREATE TABLE plan_activities (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL,
  day_number INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  estimated_time_minutes INT,
  activity_type activity_type_enum,
  skill_focus VARCHAR(100),
  FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_plan ON plan_activities(plan_id);
CREATE INDEX idx_activities_day ON plan_activities(day_number);

COMMENT ON TABLE plan_activities IS 'Actividades específicas dentro de cada plan';

-- ============================================
-- 9. PROGRESO DE ACTIVIDADES
-- ============================================

CREATE TABLE activity_progress (
  id SERIAL PRIMARY KEY,
  activity_id INT NOT NULL,
  coder_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  reflection_text TEXT,
  time_spent_minutes INT,
  completed_at TIMESTAMP NULL,
  UNIQUE (activity_id, coder_id),
  FOREIGN KEY (activity_id) REFERENCES plan_activities(id) ON DELETE CASCADE,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_progress_activity ON activity_progress(activity_id);
CREATE INDEX idx_progress_coder ON activity_progress(coder_id);
CREATE INDEX idx_progress_completed ON activity_progress(completed);

COMMENT ON TABLE activity_progress IS 'Seguimiento de qué actividades ha completado cada coder';

-- ============================================
-- 10. EVIDENCIAS DE ACTIVIDADES
-- ============================================

CREATE TABLE evidence_submissions (
  id SERIAL PRIMARY KEY,
  activity_id INT NOT NULL,
  coder_id INT NOT NULL,
  file_url TEXT,
  link_url TEXT,
  description TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES plan_activities(id) ON DELETE CASCADE,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_activity ON evidence_submissions(activity_id);
CREATE INDEX idx_evidence_coder ON evidence_submissions(coder_id);

COMMENT ON TABLE evidence_submissions IS 'Archivos y links de evidencia subidos por coders';

-- ============================================
-- 11. RETROALIMENTACIÓN DE TEAM LEADERS
-- ============================================

CREATE TABLE tl_feedback (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL,
  tl_id INT NOT NULL,
  plan_id INT,
  feedback_text TEXT NOT NULL,
  feedback_type feedback_type_enum,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tl_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_coder ON tl_feedback(coder_id);
CREATE INDEX idx_feedback_tl ON tl_feedback(tl_id);
CREATE INDEX idx_feedback_is_read ON tl_feedback(is_read);
CREATE INDEX idx_feedback_coder_unread ON tl_feedback(coder_id, is_read);

COMMENT ON TABLE tl_feedback IS 'Mensajes y retroalimentación del TL hacia los coders';
COMMENT ON COLUMN tl_feedback.is_read IS 'false = punto rojo en la campana de notificaciones';

-- ============================================
-- 12. ALERTAS DE RIESGO
-- ============================================

CREATE TABLE risk_flags (
  id SERIAL PRIMARY KEY,
  coder_id INT NOT NULL,
  risk_level risk_level_enum NOT NULL,
  reason TEXT NOT NULL,
  auto_detected BOOLEAN DEFAULT TRUE,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_coder ON risk_flags(coder_id);
CREATE INDEX idx_risk_level ON risk_flags(risk_level);
CREATE INDEX idx_risk_resolved ON risk_flags(resolved);

COMMENT ON TABLE risk_flags IS 'Alertas automáticas para coders en riesgo (bajo score, baja autonomía, etc.)';

-- ============================================
-- 13. REPORTES PARA TEAM LEADERS
-- ============================================

CREATE TABLE ai_reports (
  id SERIAL PRIMARY KEY,
  target_type report_target_enum NOT NULL,
  target_id INT NOT NULL,
  summary_text TEXT NOT NULL,
  risk_level risk_level_enum,
  recommendations TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_by_tl BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_reports_target ON ai_reports(target_type, target_id);
CREATE INDEX idx_reports_viewed ON ai_reports(viewed_by_tl);

COMMENT ON TABLE ai_reports IS 'Reportes ejecutivos para Team Leaders generados por IA';

-- ============================================
-- 14. LOG DE GENERACIONES IA (Auditoría)
-- ============================================

CREATE TABLE ai_generation_log (
  id SERIAL PRIMARY KEY,
  coder_id INT,
  agent_type ai_agent_enum NOT NULL,
  input_payload JSONB NOT NULL,
  output_payload JSONB NOT NULL,
  model_name VARCHAR(100),
  execution_time_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_log_agent ON ai_generation_log(agent_type);
CREATE INDEX idx_log_coder ON ai_generation_log(coder_id);
CREATE INDEX idx_log_date ON ai_generation_log(generated_at);

COMMENT ON TABLE ai_generation_log IS 'Registro completo de todas las llamadas a IA (para auditoría)';

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista del Dashboard del Coder
CREATE VIEW v_coder_dashboard AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.clan_id,
  ssa.autonomy,
  ssa.time_management,
  ssa.learning_style,
  m.name AS module_name,
  mp.current_week,
  mp.average_score,
  COUNT(DISTINCT pa.id) AS total_activities,
  SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END) AS completed_activities,
  ROUND((SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END)::NUMERIC / 
         NULLIF(COUNT(DISTINCT pa.id), 0)) * 100, 2) AS completion_percentage
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, u.full_name, u.clan_id, ssa.autonomy, ssa.time_management, ssa.learning_style, m.name, mp.current_week, mp.average_score;

COMMENT ON VIEW v_coder_dashboard IS 'Resumen del progreso de cada coder para su dashboard';

-- Vista de Análisis de Riesgo
CREATE VIEW v_coder_risk_analysis AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  ssa.autonomy,
  ssa.time_management,
  mp.average_score,
  COALESCE(rf.risk_level, 'low'::risk_level_enum) AS current_risk_level,
  CASE 
    WHEN ssa.autonomy <= 2 AND mp.average_score < 70 THEN 'high'::risk_level_enum
    WHEN ssa.autonomy <= 2 OR mp.average_score < 70 THEN 'medium'::risk_level_enum
    ELSE 'low'::risk_level_enum
  END AS calculated_risk_level,
  COUNT(DISTINCT pa.id) AS total_activities,
  SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END) AS completed_activities
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN risk_flags rf ON u.id = rf.coder_id AND rf.resolved = FALSE
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, u.full_name, ssa.autonomy, ssa.time_management, mp.average_score, rf.risk_level;

COMMENT ON VIEW v_coder_risk_analysis IS 'Análisis de riesgo de cada coder para el TL';

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

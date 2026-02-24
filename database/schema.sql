-- ============================================
<<<<<<< HEAD
-- BASE DE DATOS SIMPLIFICADA
-- Proyecto: Ruta Formativa Personalizada con IA
-- Motor: PostgreSQL 12+
-- Versión: 2.1 - MÍNIMA Y EFECTIVA (CORREGIDA)
-- Fecha: Febrero 2026
-- ============================================

--  EJECUTAR PRIMERO EN LÍNEA DE COMANDOS O COMO SCRIPT SEPARADO:
-- dropdb ruta_formativa_ia;
-- createdb ruta_formativa_ia;
-- Luego ejecuta este archivo con: psql ruta_formativa_ia -f tables_pi_postgresql.sql

-- Crear tipos ENUM
=======
-- RIWI LEARNING PLATFORM - DATABASE SCHEMA
-- Motor: PostgreSQL 14+ (Supabase)
-- Versión: 3.0 - CONSOLIDADA Y COMPLETA
-- Fecha: Febrero 2026
-- ============================================

-- Limpiar base de datos
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

-- Limpiar ENUMs
DROP TYPE IF EXISTS ai_agent_enum CASCADE;
DROP TYPE IF EXISTS report_target_enum CASCADE;
DROP TYPE IF EXISTS risk_level_enum CASCADE;
DROP TYPE IF EXISTS feedback_type_enum CASCADE;
DROP TYPE IF EXISTS activity_type_enum CASCADE;
DROP TYPE IF EXISTS learning_style_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;

-- ============================================
-- CREAR ENUMS
-- ============================================

>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
CREATE TYPE role_enum AS ENUM ('coder', 'tl');

CREATE TYPE learning_style_enum AS ENUM ('visual', 'auditory', 'kinesthetic', 'mixed');

CREATE TYPE activity_type_enum AS ENUM ('guided', 'semi_guided', 'autonomous');

CREATE TYPE feedback_type_enum AS ENUM ('weekly', 'activity', 'general');

CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high');

CREATE TYPE report_target_enum AS ENUM ('coder', 'clan', 'cohort');

CREATE TYPE ai_agent_enum AS ENUM ('learning_plan', 'report_generator', 'risk_detector');

-- ============================================
-- 1. USERS (✅ CON TODOS LOS CAMPOS NECESARIOS)
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,  -- ✅ AGREGADO
    role role_enum NOT NULL,
    first_login BOOLEAN DEFAULT TRUE,  -- ✅ AGREGADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

<<<<<<< HEAD
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
=======
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'Usuarios del sistema (coders y team leaders)';
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

-- ============================================
-- 2. SOFT_SKILLS_ASSESSMENT
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

<<<<<<< HEAD
ALTER TABLE soft_skills_assessment ENABLE ROW LEVEL SECURITY;
=======
CREATE INDEX idx_soft_skills_coder ON soft_skills_assessment(coder_id);

COMMENT ON TABLE soft_skills_assessment IS 'Evaluación de habilidades blandas de los coders';
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

-- ============================================
-- 3. MODULES
-- ============================================

CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_weeks INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

<<<<<<< HEAD
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. WEEKS (Semanas) 
-- ============================================
CREATE TABLE weeks (
    id SERIAL PRIMARY KEY,
    module_id INT NOT NULL,
    week_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE (module_id, week_number),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. MOODLE_PROGRESS (Progreso académico)
=======
COMMENT ON TABLE modules IS 'Módulos académicos del bootcamp';

-- ============================================
-- 4. MOODLE_PROGRESS
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
-- ============================================

CREATE TABLE moodle_progress (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    module_id INT NOT NULL,
    current_week INT NOT NULL,
    weeks_completed JSONB DEFAULT '[]'::jsonb,
    struggling_topics TEXT[],
    average_score DECIMAL(5,2) DEFAULT 0,
    struggling_topics TEXT[] DEFAULT '{}', -- ⬅️ AGREGADO
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (coder_id, module_id),
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

<<<<<<< HEAD
ALTER TABLE moodle_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_score ON moodle_progress(average_score);

-- ============================================
-- 6. TOPICS (Temas)
=======
CREATE INDEX idx_moodle_coder ON moodle_progress(coder_id);
CREATE INDEX idx_moodle_score ON moodle_progress(average_score);

COMMENT ON TABLE moodle_progress IS 'Progreso académico de los coders (simulación Moodle)';

-- ============================================
-- 5. TOPICS
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
-- ============================================

CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    module_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

<<<<<<< HEAD
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_category ON topics(category);
=======
CREATE INDEX idx_topics_module ON topics(module_id);
CREATE INDEX idx_topics_category ON topics(category);

COMMENT ON TABLE topics IS 'Temas específicos dentro de cada módulo';
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

-- ============================================
-- 7. CODER_STRUGGLING_TOPICS (Relación N:M)
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

<<<<<<< HEAD
ALTER TABLE coder_struggling_topics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. COMPLEMENTARY_PLANS (Planes personalizados)
=======
CREATE INDEX idx_struggling_coder ON coder_struggling_topics(coder_id);

COMMENT ON TABLE coder_struggling_topics IS 'Temas con los que los coders tienen dificultades';

-- ============================================
-- 7. COMPLEMENTARY_PLANS (Planes generados por IA)
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
-- ============================================

CREATE TABLE complementary_plans (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    module_id INT NOT NULL,
<<<<<<< HEAD
    week_number INT NOT NULL, 
    plan_content TEXT NOT NULL,
=======
    plan_content JSONB NOT NULL,  -- ✅ JSON generado por la IA
    soft_skills_snapshot JSONB,   -- ✅ Snapshot de soft skills al momento de generar
    moodle_status_snapshot JSONB, -- ✅ Snapshot de estado Moodle
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
    is_active BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

<<<<<<< HEAD
ALTER TABLE complementary_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_active ON complementary_plans(is_active);

-- ============================================
-- 9. PLAN_ACTIVITIES (Actividades)
=======
CREATE INDEX idx_plans_coder ON complementary_plans(coder_id);
CREATE INDEX idx_plans_active ON complementary_plans(is_active);

COMMENT ON TABLE complementary_plans IS 'Planes de estudio personalizados generados por IA';

-- ============================================
-- 8. PLAN_ACTIVITIES
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
-- ============================================

CREATE TABLE plan_activities (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_time_minutes INT,
    activity_type activity_type_enum,
<<<<<<< HEAD
    order_index INT NOT NULL, 
    FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE CASCADE
);

ALTER TABLE plan_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_plan ON plan_activities(plan_id);

-- ============================================
-- 10. ACTIVITY_PROGRESS (Progreso de actividades)
=======
    skill_focus VARCHAR(100),  -- ✅ Para actividades de soft skills
    FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_plan ON plan_activities(plan_id);
CREATE INDEX idx_activities_day ON plan_activities(day_number);

COMMENT ON TABLE plan_activities IS 'Actividades diarias dentro de cada plan';

-- ============================================
-- 9. ACTIVITY_PROGRESS
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
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

<<<<<<< HEAD
ALTER TABLE activity_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_completed ON activity_progress(completed);

-- ============================================
-- 11. TL_FEEDBACK (Retroalimentación)
=======
CREATE INDEX idx_progress_activity ON activity_progress(activity_id);
CREATE INDEX idx_progress_coder ON activity_progress(coder_id);
CREATE INDEX idx_progress_completed ON activity_progress(completed);

COMMENT ON TABLE activity_progress IS 'Seguimiento del progreso de actividades por coder';

-- ============================================
-- 10. EVIDENCE_SUBMISSIONS (✅ NUEVO)
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
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

COMMENT ON TABLE evidence_submissions IS 'Evidencias subidas por coders para sus actividades';

-- ============================================
-- 11. TL_FEEDBACK
-- ============================================

CREATE TABLE tl_feedback (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    tl_id INT NOT NULL,
    plan_id INT,  -- ✅ OPCIONAL: asociar feedback a un plan específico
    feedback_text TEXT NOT NULL,
    feedback_type feedback_type_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tl_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE SET NULL
);

<<<<<<< HEAD
ALTER TABLE tl_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_coder ON tl_feedback(coder_id);
CREATE INDEX idx_tl ON tl_feedback(tl_id);
=======
CREATE INDEX idx_feedback_coder ON tl_feedback(coder_id);
CREATE INDEX idx_feedback_tl ON tl_feedback(tl_id);

COMMENT ON TABLE tl_feedback IS 'Retroalimentación de Team Leaders a coders';
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

-- ============================================
-- 12. RISK_FLAGS (✅ NUEVO - Para detección de riesgo)
-- ============================================

CREATE TABLE risk_flags (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    risk_level risk_level_enum NOT NULL,
    reason TEXT NOT NULL,
    auto_detected BOOLEAN DEFAULT TRUE,  -- ✅ TRUE si lo detectó la IA
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_coder ON risk_flags(coder_id);
CREATE INDEX idx_risk_level ON risk_flags(risk_level);
CREATE INDEX idx_risk_resolved ON risk_flags(resolved);

COMMENT ON TABLE risk_flags IS 'Alertas de riesgo para coders (baja autonomía, bajo score, etc)';

-- ============================================
-- 13. AI_REPORTS (✅ NUEVO - Para reportes del TL)
-- ============================================

CREATE TABLE ai_reports (
    id SERIAL PRIMARY KEY,
    target_type report_target_enum NOT NULL,
    target_id INT NOT NULL,  -- ID del coder, clan o cohort
    summary_text TEXT NOT NULL,
    risk_level risk_level_enum,
    recommendations TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_by_tl BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_reports_target ON ai_reports(target_type, target_id);
CREATE INDEX idx_reports_viewed ON ai_reports(viewed_by_tl);

COMMENT ON TABLE ai_reports IS 'Reportes ejecutivos generados por IA para Team Leaders';

-- ============================================
-- 14. AI_GENERATION_LOG (✅ NUEVO - Trazabilidad)
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

COMMENT ON TABLE ai_generation_log IS 'Log de todas las generaciones de IA (auditoría)';

-- ============================================
-- VISTAS ÚTILES
-- ============================================

CREATE VIEW v_coder_dashboard AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    ssa.autonomy,
    ssa.time_management,
    ssa.learning_style,
    m.name AS module_name,
    mp.current_week,
    mp.average_score,
    COUNT(DISTINCT pa.id) AS total_activities,
    SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END) AS completed_activities,
    ROUND((SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(DISTINCT pa.id), 0)) * 100, 2) AS completion_percentage
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, u.full_name, ssa.autonomy, ssa.time_management, ssa.learning_style, m.name, mp.current_week, mp.average_score;

COMMENT ON VIEW v_coder_dashboard IS 'Vista consolidada del dashboard de cada coder';

-- ============================================

CREATE VIEW v_coder_risk_analysis AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    ssa.autonomy,
    ssa.time_management,
    mp.average_score,
    COALESCE(rf.risk_level, 'low') AS current_risk_level,
    CASE 
        WHEN ssa.autonomy <= 2 AND mp.average_score < 70 THEN 'high'
        WHEN ssa.autonomy <= 2 OR mp.average_score < 70 THEN 'medium'
        ELSE 'low'
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
GROUP BY u.id, u.email, u.full_name, ssa.autonomy, ssa.time_management, mp.average_score, rf.risk_level
ORDER BY calculated_risk_level DESC, mp.average_score ASC;

COMMENT ON VIEW v_coder_risk_analysis IS 'Análisis de riesgo de coders para dashboard de TL';

-- ============================================
-- CONFIRMACIÓN
-- ============================================
<<<<<<< HEAD
SELECT ' Base de datos (esquema) configurada correctamente' AS status;
SELECT COUNT(*) AS number_of_tables FROM information_schema.tables 
=======

SELECT '✅ Schema consolidado creado correctamente' AS status;
SELECT COUNT(*) AS total_tables 
FROM information_schema.tables 
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
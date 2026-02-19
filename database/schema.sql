-- ============================================
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
CREATE TYPE role_enum AS ENUM ('coder', 'tl');
CREATE TYPE learning_style_enum AS ENUM ('visual', 'auditory', 'kinesthetic');
CREATE TYPE activity_type_enum AS ENUM ('guided', 'semi_guided', 'autonomous');
CREATE TYPE feedback_type_enum AS ENUM ('weekly', 'activity', 'general');

-- ============================================
-- 1. USERS (Usuarios)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role role_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. SOFT_SKILLS_ASSESSMENT (Diagnóstico)
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
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 3. MODULES (Módulos)
-- ============================================
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_weeks INT NOT NULL
);

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

-- ============================================
-- 5. MOODLE_PROGRESS (Progreso académico)
-- ============================================
CREATE TABLE moodle_progress (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    module_id INT NOT NULL,
    current_week INT NOT NULL,
    average_score DECIMAL(5,2) DEFAULT 0,
    struggling_topics TEXT[] DEFAULT '{}', -- ⬅️ AGREGADO
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (coder_id, module_id),
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_score ON moodle_progress(average_score);

-- ============================================
-- 6. TOPICS (Temas)
-- ============================================
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    module_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_category ON topics(category);

-- ============================================
-- 7. CODER_STRUGGLING_TOPICS (Relación N:M)
-- ============================================
CREATE TABLE coder_struggling_topics (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    topic_id INT NOT NULL,
    UNIQUE (coder_id, topic_id),
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- ============================================
-- 8. COMPLEMENTARY_PLANS (Planes personalizados)
-- ============================================
CREATE TABLE complementary_plans (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    module_id INT NOT NULL,
    week_number INT NOT NULL, 
    plan_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_active ON complementary_plans(is_active);

-- ============================================
-- 9. PLAN_ACTIVITIES (Actividades)
-- ============================================
CREATE TABLE plan_activities (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    day_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_time_minutes INT,
    activity_type activity_type_enum,
    order_index INT NOT NULL, 
    FOREIGN KEY (plan_id) REFERENCES complementary_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_plan ON plan_activities(plan_id);

-- ============================================
-- 10. ACTIVITY_PROGRESS (Progreso de actividades)
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

CREATE INDEX idx_completed ON activity_progress(completed);

-- ============================================
-- 11. TL_FEEDBACK (Retroalimentación)
-- ============================================
CREATE TABLE tl_feedback (
    id SERIAL PRIMARY KEY,
    coder_id INT NOT NULL,
    tl_id INT NOT NULL,
    feedback_text TEXT NOT NULL,
    feedback_type feedback_type_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tl_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_coder ON tl_feedback(coder_id);
CREATE INDEX idx_tl ON tl_feedback(tl_id);

-- ============================================
-- VISTAS
-- ============================================

CREATE VIEW v_coder_dashboard AS
SELECT 
    u.id,
    u.email,
    ssa.autonomy,
    ssa.learning_style,
    m.name AS module_name,
    mp.average_score,
    COUNT(DISTINCT pa.id) AS total_activities,
    SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END) AS completed_activities
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, ssa.autonomy, ssa.learning_style, m.name, mp.average_score;

CREATE VIEW v_coder_risk_analysis AS
SELECT 
    u.id,
    u.email,
    ssa.autonomy,
    mp.average_score,
    CASE 
        WHEN ssa.autonomy <= 2 AND mp.average_score < 70 THEN 'HIGH_RISK'
        WHEN ssa.autonomy <= 2 OR mp.average_score < 70 THEN 'MEDIUM_RISK'
        ELSE 'LOW_RISK'
    END AS risk_level
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
WHERE u.role = 'coder'
ORDER BY risk_level DESC, mp.average_score ASC;

-- ============================================
-- Confirmación
-- ============================================
SELECT ' Base de datos (esquema) configurada correctamente' AS status;
SELECT COUNT(*) AS number_of_tables FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
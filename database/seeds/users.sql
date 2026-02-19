-- ============================================
-- SEEDS - DATOS DE PRUEBA
-- ============================================

BEGIN;

-- LIMPIAR DATOS EXISTENTES
TRUNCATE TABLE ai_generation_log CASCADE;
TRUNCATE TABLE ai_reports CASCADE;
TRUNCATE TABLE risk_flags CASCADE;
TRUNCATE TABLE evidence_submissions CASCADE;
TRUNCATE TABLE tl_feedback CASCADE;
TRUNCATE TABLE activity_progress CASCADE;
TRUNCATE TABLE plan_activities CASCADE;
TRUNCATE TABLE complementary_plans CASCADE;
TRUNCATE TABLE coder_struggling_topics CASCADE;
TRUNCATE TABLE topics CASCADE;
TRUNCATE TABLE moodle_progress CASCADE;
TRUNCATE TABLE modules CASCADE;
TRUNCATE TABLE soft_skills_assessment CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- USUARIOS (passwords sin hashear para testing - EN PRODUCCIÓN USAR BCRYPT)
INSERT INTO users (email, password, full_name, role, first_login) VALUES
('tl.maria@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'María García', 'tl', FALSE),
('tl.carlos@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Carlos Rodríguez', 'tl', FALSE),
('coder.juan@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Juan Pérez', 'coder', TRUE),
('coder.ana@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Ana López', 'coder', FALSE),
('coder.pedro@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Pedro Martínez', 'coder', FALSE),
('coder.sofia@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Sofía Hernández', 'coder', FALSE),
('coder.luis@riwi.io', '$2b$10$rHj5YKLkuHJm9uM3qKxO4OqG7YVxJ5kZL5kF5kF5kF5kF5kF5kF5k', 'Luis González', 'coder', TRUE);

-- EVALUACIONES DE HABILIDADES BLANDAS
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) VALUES
(3, 2, 3, 3, 4, 3, 'kinesthetic'),
(4, 4, 4, 5, 4, 5, 'visual'),
(5, 3, 2, 3, 3, 4, 'auditory'),
(6, 5, 5, 5, 5, 5, 'visual'),
(7, 2, 3, 2, 2, 3, 'mixed');

-- MÓDULOS
INSERT INTO modules (name, description, total_weeks) VALUES
('Fundamentos de Python', 'Introducción a la programación con Python', 4),
('HTML y CSS', 'Desarrollo web frontend básico', 4),
('JavaScript', 'Programación interactiva web', 4),
('Bases de Datos', 'SQL, PostgreSQL y diseño de BD', 4);

-- PROGRESO EN MOODLE
INSERT INTO moodle_progress (coder_id, module_id, current_week, average_score, weeks_completed, struggling_topics) VALUES
(3, 4, 2, 65.0, '[1]'::jsonb, ARRAY['relaciones', 'joins']),
(4, 4, 3, 93.5, '[1,2]'::jsonb, ARRAY[]::text[]),
(5, 4, 2, 75.0, '[1]'::jsonb, ARRAY['normalización']),
(6, 4, 4, 97.0, '[1,2,3]'::jsonb, ARRAY[]::text[]),
(7, 4, 1, 45.0, '[]'::jsonb, ARRAY['sql básico', 'select', 'where']);

-- TEMAS
INSERT INTO topics (module_id, name, category) VALUES
(4, 'Relaciones entre tablas', 'SQL'),
(4, 'Consultas SQL complejas', 'SQL'),
(4, 'Normalización de bases de datos', 'Diseño'),
(4, 'Índices y optimización', 'Performance'),
(4, 'SELECT y WHERE básicos', 'SQL Fundamentos');

-- TEMAS CON DIFICULTAD
INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
(3, 1),
(3, 2),
(5, 3),
(7, 1),
(7, 2),
(7, 5);

-- FLAGS DE RIESGO (generados automáticamente)
INSERT INTO risk_flags (coder_id, risk_level, reason, auto_detected) VALUES
(3, 'medium', 'Promedio de 65% en módulo actual y autonomía baja (2/5)', TRUE),
(7, 'high', 'Promedio de 45% y múltiples habilidades blandas bajas', TRUE);

COMMIT;

SELECT '✅ Seeds cargados correctamente' AS status;
SELECT COUNT(*) as total_usuarios FROM users;
SELECT COUNT(*) as total_coders FROM users WHERE role = 'coder';
SELECT COUNT(*) as total_tls FROM users WHERE role = 'tl';
-- ============================================
<<<<<<< HEAD
-- DATOS DE PRUEBA (SEED DATA)
-- Proyecto: Ruta Formativa Personalizada con IA
-- Versión: 2.1 - SIMPLIFICADA
=======
-- SEEDS - DATOS DE PRUEBA
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6
-- ============================================

BEGIN;

<<<<<<< HEAD
-- ============================================
-- 1. USUARIOS
-- ============================================

-- Team Leaders
INSERT INTO users (email, password, role) VALUES
('tl.maria@riwi.io', 'password123', 'tl'),
('tl.carlos@riwi.io', 'password123', 'tl');

-- Coders
INSERT INTO users (email, password, role) VALUES
('coder.juan@riwi.io', 'password123', 'coder'),
('coder.ana@riwi.io', 'password123', 'coder'),
('coder.pedro@riwi.io', 'password123', 'coder'),
('coder.sofia@riwi.io', 'password123', 'coder'),
('coder.luis@riwi.io', 'password123', 'coder');

-- ============================================
-- 2. EVALUACIÓN DE HABILIDADES BLANDAS
-- ============================================

-- Juan: Baja autonomía (RIESGO ALTO)
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) 
VALUES (3, 2, 3, 3, 4, 3, 'kinesthetic');

-- Ana: Balance medio-alto
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) 
VALUES (4, 4, 4, 5, 4, 5, 'visual');

-- Pedro: Baja gestión del tiempo
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) 
VALUES (5, 3, 2, 3, 3, 4, 'auditory');

-- Sofía: Excelente en todo
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) 
VALUES (6, 5, 5, 5, 5, 5, 'visual');

-- Luis: Baja autonomía y comunicación (RIESGO)
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) 
VALUES (7, 2, 3, 2, 2, 3, 'kinesthetic');

-- ============================================
-- 3. MÓDULOS
-- ============================================
=======
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
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

INSERT INTO modules (name, description, total_weeks) VALUES
('Fundamentos de Python', 'Introducción a la programación con Python', 4),
('HTML y CSS', 'Desarrollo web frontend básico', 4),
('JavaScript', 'Programación interactiva web', 4),
('Bases de Datos', 'SQL, PostgreSQL y diseño de BD', 4);

<<<<<<< HEAD
-- ============================================
-- 4. SEMANAS
-- ============================================

-- Módulo 4: Bases de Datos
INSERT INTO weeks (module_id, week_number, name, description) VALUES
(4, 1, 'Introducción a SQL', 'Fundamentos de bases de datos relacionales'),
(4, 2, 'Relaciones entre tablas', 'Joins y relaciones 1:N y N:M'),
(4, 3, 'Consultas avanzadas', 'Funciones agregadas y subconsultas'),
(4, 4, 'Normalización y diseño', 'Diseño de bases de datos normalizadas');

-- ============================================
-- 5. PROGRESO EN MOODLE
-- ============================================

-- Juan: Módulo 4, Semana 2, promedio bajo (RIESGO)
INSERT INTO moodle_progress (coder_id, module_id, current_week, struggling_topics, average_score) VALUES
(3, 4, 2, ARRAY['Relaciones entre tablas', 'Consultas SQL complejas'], 65);

-- Ana: Módulo 4, Semana 3, excelente rendimiento
INSERT INTO moodle_progress (coder_id, module_id, current_week, struggling_topics, average_score) VALUES
(4, 4, 3, ARRAY[]::TEXT[], 93.5);

-- Pedro: Módulo 4, Semana 2, rendimiento medio
INSERT INTO moodle_progress (coder_id, module_id, current_week, struggling_topics, average_score) VALUES
(5, 4, 2, ARRAY['Normalización de bases de datos'], 75);

-- Sofía: Módulo 4, Semana 4, excelente
INSERT INTO moodle_progress (coder_id, module_id, current_week, struggling_topics, average_score) VALUES
(6, 4, 4, ARRAY[]::TEXT[], 97);

-- Luis: Módulo 4, Semana 1, bajo rendimiento (RIESGO ALTO)
INSERT INTO moodle_progress (coder_id, module_id, current_week, struggling_topics, average_score) VALUES
(7, 4, 1, ARRAY['Relaciones entre tablas', 'Consultas SQL complejas', 'Índices y optimización'], 0);

-- ============================================
-- 6. TEMAS (CATÁLOGO)
-- ============================================
=======
-- PROGRESO EN MOODLE
INSERT INTO moodle_progress (coder_id, module_id, current_week, average_score, weeks_completed, struggling_topics) VALUES
(3, 4, 2, 65.0, '[1]'::jsonb, ARRAY['relaciones', 'joins']),
(4, 4, 3, 93.5, '[1,2]'::jsonb, ARRAY[]::text[]),
(5, 4, 2, 75.0, '[1]'::jsonb, ARRAY['normalización']),
(6, 4, 4, 97.0, '[1,2,3]'::jsonb, ARRAY[]::text[]),
(7, 4, 1, 45.0, '[]'::jsonb, ARRAY['sql básico', 'select', 'where']);
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

INSERT INTO topics (module_id, name, category) VALUES
-- Módulo 4: Bases de Datos
(4, 'Relaciones entre tablas', 'SQL'),
(4, 'Consultas SQL complejas', 'SQL'),
<<<<<<< HEAD
(4, 'Normalización de bases de datos', 'SQL'),
(4, 'Índices y optimización', 'SQL'),
(4, 'Diagrama ER', 'Diseño'),
(4, 'Funciones agregadas', 'SQL'),
(4, 'Subconsultas', 'SQL');
=======
(4, 'Normalización de bases de datos', 'Diseño'),
(4, 'Índices y optimización', 'Performance'),
(4, 'SELECT y WHERE básicos', 'SQL Fundamentos');
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

-- ============================================
-- 7. TEMAS DE DIFICULTAD DEL CODER
-- ============================================

-- Juan tiene dificultad con relaciones y consultas
INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
<<<<<<< HEAD
(3, 1), -- Relaciones entre tablas
(3, 2); -- Consultas SQL complejas

-- Pedro con normalización
INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
(5, 3); -- Normalización

-- Luis con múltiples temas (RIESGO)
INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
(7, 1), -- Relaciones
(7, 2), -- Consultas complejas
(7, 4); -- Índices

-- ============================================
-- 8. PLANES COMPLEMENTARIOS
-- ============================================

-- Plan para Juan (baja autonomía)
INSERT INTO complementary_plans (coder_id, module_id, week_number, plan_content, is_active) VALUES
(3, 4, 2,
'DÍA 1: Refuerzo de Relaciones uno a muchos
Objetivo: Entender relaciones básicas practicando
Tiempo total estimado: 45 min

Ejercicio guiado (20 min):
- Crea estas 2 tablas en tu BD local:
  - usuarios (id, nombre, email)
  - publicaciones (id, usuario_id, titulo, contenido)
- Inserta 3 usuarios y 5 publicaciones
- Haz consulta: SELECT * FROM publicaciones WHERE usuario_id = 1

DÍA 2: Práctica de INNER JOIN
Objetivo: Unir tablas para ver datos relacionados
Tiempo total: 50 min

DÍA 3: LEFT JOIN vs INNER JOIN
Objetivo: Entender diferencias entre tipos de JOIN
Tiempo total: 45 min

DÍA 4: Proyecto e-commerce
Objetivo: Aplicar todo en historia de usuario
Tiempo total: 60 min

DÍA 5: Repaso y reflexión
Objetivo: Consolidar aprendizaje
Tiempo total: 30 min',
TRUE);

-- Plan para Luis (RIESGO ALTO)
INSERT INTO complementary_plans (coder_id, module_id, week_number, plan_content, is_active) VALUES
(7, 4, 1,
'PLAN INTENSIVO DE REFUERZO - SEMANA 1

DÍA 1: Conceptos fundamentales de SQL
Tiempo: 40 min
[Contenido muy guiado, paso a paso]

DÍA 2: Práctica de SELECT básico
Tiempo: 45 min
[Ejercicios con soluciones incluidas]

DÍA 3: INSERT, UPDATE, DELETE
Tiempo: 50 min
[Práctica supervisada]

DÍA 4: WHERE y filtros
Tiempo: 45 min
[Ejercicios progresivos]

DÍA 5: Repaso y proyecto integrador
Tiempo: 60 min
[Proyecto guiado completo]',
TRUE);

-- ============================================
-- 9. ACTIVIDADES DEL PLAN
-- ============================================

-- Actividades para el plan de Juan (plan_id = 1)
INSERT INTO plan_activities (plan_id, day_number, title, description, estimated_time_minutes, activity_type, order_index) VALUES
(1, 1, 'Crear tablas relacionadas', 
 'Crea tablas usuarios y publicaciones con relación 1:N',
 20, 'guided', 1),

(1, 1, 'Ejercicio semi-guiado',
 'Crea tus propias tablas: categorias y productos',
 15, 'semi_guided', 2),

(1, 2, 'Práctica de INNER JOIN',
 'Une las tablas usuarios y publicaciones para ver autor de cada post',
 25, 'guided', 1),

(1, 2, 'LEFT JOIN vs INNER JOIN',
 'Compara los resultados de diferentes tipos de JOIN',
 25, 'semi_guided', 2),

(1, 3, 'Proyecto e-commerce',
 'Aplica todo lo aprendido en la historia de usuario de Moodle',
 60, 'autonomous', 1);

-- ============================================
-- 10. PROGRESO EN ACTIVIDADES
-- ============================================

-- Juan ha completado el día 1
INSERT INTO activity_progress (activity_id, coder_id, completed, reflection_text, completed_at, time_spent_minutes) VALUES
(1, 3, TRUE, 
 'Logré crear las tablas sin problema. Al principio me confundí con la foreign key pero después entendí',
 '2026-02-14 18:30:00',
 25),

(2, 3, TRUE,
 'Este ejercicio fue más difícil. Tuve que ver el video dos veces pero al final lo hice solo',
 '2026-02-14 19:00:00',
 20);

-- Día 2 en progreso
INSERT INTO activity_progress (activity_id, coder_id, completed) VALUES
(3, 3, FALSE),
(4, 3, FALSE);

-- ============================================
-- 11. FEEDBACK DE TEAM LEADERS
-- ============================================

-- María da feedback a Juan
INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type) VALUES
(3, 1,
 'Juan, vi que completaste las actividades del día 1. ¡Muy bien! 
 
Tu reflexión muestra que estás aprendiendo. Es normal confundirse con las foreign keys al principio.

Recomendación: Antes de empezar el día 2, revisa el video sobre INNER JOIN que dejé en los recursos.

Sigue así, vas por buen camino.',
'weekly');

-- Carlos da feedback general a Luis
INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type) VALUES
(7, 2,
'Luis, noté que aún no has empezado con el plan complementario.

Te recomiendo que comiences HOY con el Día 1. Son solo 30 minutos y te va a ayudar mucho para la historia de usuario.

Si tienes dudas, escríbeme por Slack. Estoy aquí para apoyarte.

¡Vamos con todo! ',
'general');

-- María felicita a Ana
INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type) VALUES
(4, 1,
'Ana, tu rendimiento ha sido excepcional. 93.5 de promedio. 

Sigue así. Si quieres un reto adicional, te sugiero investigar sobre triggers en PostgreSQL (tema de semana 4).

¡Excelente trabajo!',
'general');

COMMIT;

-- ============================================
-- VERIFICACIÓN DE DATOS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE ' Datos de prueba insertados exitosamente';
    RAISE NOTICE ' Usuarios creados: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE ' Evaluaciones: %', (SELECT COUNT(*) FROM soft_skills_assessment);
    RAISE NOTICE ' Módulos: %', (SELECT COUNT(*) FROM modules);
    RAISE NOTICE ' Semanas: %', (SELECT COUNT(*) FROM weeks);
    RAISE NOTICE ' Progreso Moodle: %', (SELECT COUNT(*) FROM moodle_progress);
    RAISE NOTICE ' Planes activos: %', (SELECT COUNT(*) FROM complementary_plans WHERE is_active = TRUE);
    RAISE NOTICE ' Actividades: %', (SELECT COUNT(*) FROM plan_activities);
    RAISE NOTICE ' Feedbacks: %', (SELECT COUNT(*) FROM tl_feedback);
END $$;
=======
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
>>>>>>> f01f3b0882bfbaca9cd0e1a605973cf0aa353fa6

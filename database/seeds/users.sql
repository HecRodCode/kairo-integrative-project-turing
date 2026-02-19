-- ============================================
-- DATOS DE PRUEBA - VERSIÓN SIMPLIFICADA
-- PostgreSQL 12+
-- ============================================

BEGIN;

-- USUARIOS
INSERT INTO users (email, password, role) VALUES
('tl.maria@riwi.io', 'password123', 'tl'),
('tl.carlos@riwi.io', 'password123', 'tl'),
('coder.juan@riwi.io', 'password123', 'coder'),
('coder.ana@riwi.io', 'password123', 'coder'),
('coder.pedro@riwi.io', 'password123', 'coder'),
('coder.sofia@riwi.io', 'password123', 'coder'),
('coder.luis@riwi.io', 'password123', 'coder');

-- EVALUACIONES DE HABILIDADES
INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) VALUES
(3, 2, 3, 3, 4, 3, 'kinesthetic'),
(4, 4, 4, 5, 4, 5, 'visual'),
(5, 3, 2, 3, 3, 4, 'auditory'),
(6, 5, 5, 5, 5, 5, 'visual'),
(7, 2, 3, 2, 2, 3, 'kinesthetic');

-- MÓDULOS
INSERT INTO modules (name, description, total_weeks) VALUES
('Fundamentos de Python', 'Introducción a la programación con Python', 4),
('HTML y CSS', 'Desarrollo web frontend básico', 4),
('JavaScript', 'Programación interactiva web', 4),
('Bases de Datos', 'SQL, MySQL y diseño de BD', 4);

-- PROGRESO EN MOODLE
INSERT INTO moodle_progress (coder_id, module_id, current_week, average_score) VALUES
(3, 4, 2, 65),
(4, 4, 3, 93.5),
(5, 4, 2, 75),
(6, 4, 4, 97),
(7, 4, 1, 0);

-- TEMAS
INSERT INTO topics (module_id, name, category) VALUES
(4, 'Relaciones entre tablas', 'SQL'),
(4, 'Consultas SQL complejas', 'SQL'),
(4, 'Normalización de bases de datos', 'SQL'),
(4, 'Índices y optimización', 'SQL');

-- TEMAS CON DIFICULTAD
INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
(3, 1),
(3, 2),
(5, 3),
(7, 1),
(7, 2),
(7, 4);

-- PLANES COMPLEMENTARIOS
INSERT INTO complementary_plans (coder_id, module_id, plan_content, is_active) VALUES
(3, 4, 'DÍA 1: Relaciones uno a muchos
Objetivo: Entender relaciones básicas

EJERCICIO 1: Crear tablas
- usuarios (id, nombre, email)
- publicaciones (id, usuario_id, titulo, contenido)

EJERCICIO 2: Insertar datos
- 3 usuarios y 5 publicaciones

DÍA 2: INNER JOIN
Objetivo: Unir datos de dos tablas

EJERCICIO: Mostrar autor de cada publicación', TRUE),

(7, 4, 'PLAN INTENSIVO - SEMANA 1

DÍA 1: SQL Basics (30 min)
- SELECT, FROM, WHERE
- Operadores básicos

DÍA 2: INSERT y UPDATE (30 min)
- Insertar registros
- Actualizar datos

DÍA 3: DELETE y filtros (30 min)
- Eliminar registros
- Condiciones complejas

DÍA 4: Relaciones (45 min)
- Claves foráneas
- Integridad referencial

DÍA 5: Mini Proyecto (60 min)
- Aplicar todo lo aprendido', TRUE);

-- ACTIVIDADES DEL PLAN
INSERT INTO plan_activities (plan_id, day_number, title, description, estimated_time_minutes, activity_type) VALUES
(1, 1, 'Crear tablas relacionadas', 'Crea tablas usuarios y publicaciones con relación 1:N', 20, 'guided'),
(1, 1, 'Ejercicio semi-guiado', 'Crea tus propias tablas: categorias y productos', 15, 'semi_guided'),
(1, 2, 'Práctica de INNER JOIN', 'Une las tablas usuarios y publicaciones', 25, 'guided'),
(1, 3, 'Proyecto e-commerce', 'Aplica todo lo aprendido', 60, 'autonomous'),
(2, 1, 'Conceptos fundamentales SQL', 'Aprende SELECT, FROM, WHERE', 30, 'guided'),
(2, 2, 'Práctica INSERT y UPDATE', 'Ejecuta operaciones de inserción', 30, 'semi_guided');

-- PROGRESO DE ACTIVIDADES
INSERT INTO activity_progress (activity_id, coder_id, completed, reflection_text, time_spent_minutes, completed_at) VALUES
(1, 3, TRUE, 'Logré crear las tablas sin problema', 25, '2026-02-14 18:30:00'),
(2, 3, TRUE, 'Este ejercicio fue más difícil pero lo conseguí', 20, '2026-02-14 19:00:00'),
(3, 3, FALSE, NULL, NULL, NULL),
(4, 3, FALSE, NULL, NULL, NULL);

-- FEEDBACK DE TEAM LEADERS
INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type) VALUES
(3, 1, 'Juan, excelente progreso. Sigue así con el Día 2', 'weekly'),
(7, 2, 'Luis, inicia hoy mismo el plan complementario. Es importante.', 'general'),
(4, 1, 'Ana, tu rendimiento es excepcional. 95+ en todas las semanas. 🌟', 'weekly');

COMMIT;

SELECT '✅ Datos de prueba cargados' AS status;
SELECT COUNT(*) as usuarios FROM users;
SELECT COUNT(*) as actividades FROM plan_activities;

-- ============================================
-- SEEDS - Datos de Prueba
-- KAIRO - Plataforma de Aprendizaje Personalizado
-- 
-- Ejecuta este script para llenar la BD con datos de ejemplo
-- Úsalo en ambiente de development/testing
-- ============================================

BEGIN;

-- ============================================
-- USUARIOS (Team Leaders y Coders)
-- ============================================

-- Limpiar datos existentes (opcional, descomenta si necesitas reset)
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;

INSERT INTO users (email, password, full_name, role, clan_id, first_login) VALUES
  -- Team Leaders
  ('tl.maria@riwi.io', 'hashed_password_here', 'María García', 'tl', NULL, FALSE),
  ('tl.carlos@riwi.io', 'hashed_password_here', 'Carlos Rodríguez', 'tl', NULL, FALSE),
  
  -- Coders - Clan Turing
  ('juan.perez@riwi.io', 'hashed_password_here', 'Juan Pérez', 'coder', 'Turing', TRUE),
  ('ana.lopez@riwi.io', 'hashed_password_here', 'Ana López', 'coder', 'Turing', FALSE),
  
  -- Coders - Clan Tesla
  ('pedro.martinez@riwi.io', 'hashed_password_here', 'Pedro Martínez', 'coder', 'Tesla', FALSE),
  ('sofia.hernandez@riwi.io', 'hashed_password_here', 'Sofía Hernández', 'coder', 'Tesla', FALSE),
  
  -- Coders - Clan McCarthy
  ('luis.gonzalez@riwi.io', 'hashed_password_here', 'Luis González', 'coder', 'McCarthy', TRUE),
  ('maria.sanchez@riwi.io', 'hashed_password_here', 'María Sánchez', 'coder', 'McCarthy', FALSE);

-- ============================================
-- EVALUACIONES DE HABILIDADES BLANDAS
-- ============================================

INSERT INTO soft_skills_assessment (coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style) VALUES
  -- Juan (Baja autonomía = RIESGO)
  (3, 2, 3, 3, 4, 3, 'kinesthetic'),
  
  -- Ana (Equilibrio medio-alto)
  (4, 4, 4, 5, 4, 5, 'visual'),
  
  -- Pedro (Baja gestión del tiempo)
  (5, 3, 2, 3, 3, 4, 'auditory'),
  
  -- Sofía (Excelente en todo)
  (6, 5, 5, 5, 5, 5, 'visual'),
  
  -- Luis (Baja autonomía + comunicación = RIESGO)
  (7, 2, 3, 2, 2, 3, 'mixed'),
  
  -- María (Balance)
  (8, 3, 4, 4, 4, 4, 'visual');

-- ============================================
-- MÓDULOS DEL BOOTCAMP
-- ============================================

INSERT INTO modules (name, description, total_weeks) VALUES
  ('Fundamentos de Python', 'Introducción a la programación con Python', 4),
  ('HTML y CSS', 'Desarrollo web frontend básico', 4),
  ('JavaScript', 'Programación interactiva web', 4),
  ('Bases de Datos', 'SQL, PostgreSQL y diseño de BD', 4),
  ('Backend con Node.js', 'Servidores y APIs REST', 3),
  ('React', 'Frameworks frontend modernos', 4);

-- ============================================
-- TEMAS POR MÓDULO
-- ============================================

-- Temas de Python
INSERT INTO topics (module_id, name, category) VALUES
  (1, 'Variables y tipos', 'Conceptos'),
  (1, 'Listas y diccionarios', 'Estructuras'),
  (1, 'Funciones', 'Funciones'),
  (1, 'Manejo de excepciones', 'Avanzado');

-- Temas de HTML/CSS
INSERT INTO topics (module_id, name, category) VALUES
  (2, 'Etiquetas HTML', 'Conceptos'),
  (2, 'CSS Selectores', 'Estilos'),
  (2, 'Flexbox y Grid', 'Layout'),
  (2, 'Responsive Design', 'Avanzado');

-- Temas de JavaScript
INSERT INTO topics (module_id, name, category) VALUES
  (3, 'Variables y Scope', 'Conceptos'),
  (3, 'Funciones Arrow', 'Funciones'),
  (3, 'Async/Await', 'Avanzado'),
  (3, 'DOM Manipulation', 'Frontend');

-- ============================================
-- PROGRESO ACADÉMICO (Moodle)
-- ============================================

INSERT INTO moodle_progress (coder_id, module_id, current_week, weeks_completed, average_score) VALUES
  -- Juan está en semana 2 de Python, score bajo
  (3, 1, 2, '[1]'::jsonb, 65.5),
  
  -- Ana está en semana 3 de Python, score alto
  (4, 1, 3, '[1,2]'::jsonb, 88.0),
  
  -- Pedro está en semana 1 de Python
  (5, 1, 1, '[]'::jsonb, 72.0),
  
  -- Sofía completó Python, ahora en HTML
  (6, 1, 4, '[1,2,3]'::jsonb, 95.0),
  (6, 2, 2, '[1]'::jsonb, 92.5),
  
  -- Luis está atrasado en Python
  (7, 1, 1, '[]'::jsonb, 58.0);

-- ============================================
-- TEMAS CON DIFICULTAD
-- ============================================

INSERT INTO coder_struggling_topics (coder_id, topic_id) VALUES
  -- Juan lucha con ciertas cosas
  (3, 1),
  (3, 3),
  
  -- Pedro lucha con estructuras
  (5, 2),
  
  -- Luis lucha con varias cosas
  (7, 1),
  (7, 3),
  (7, 4);

-- ============================================
-- ¿QUÉ SUCEDE A PARTIR DE AQUÍ?
-- ============================================
-- 
-- Las siguientes tablas se llenan dinámicamente cuando:
-- - El TL genera planes → complementary_plans
-- - El coder completa actividades → activity_progress
-- - El TL envía mensajes → tl_feedback
-- - El sistema detecta riesgo → risk_flags
-- - La IA genera reportes → ai_reports
--
-- Para testing manual, usa los ejemplos en ENDPOINTS_GUIDE.md
--

COMMIT;

-- ============================================
-- VERIFICAR DATOS INSERTADOS
-- ============================================
/*

-- Ver usuarios creados
SELECT id, email, full_name, role, clan_id FROM users ORDER BY id;

-- Ver evaluaciones
SELECT 
  u.full_name, 
  s.autonomy, 
  s.time_management, 
  s.problem_solving,
  s.learning_style
FROM soft_skills_assessment s
JOIN users u ON s.coder_id = u.id
ORDER BY u.id;

-- Ver progreso académico
SELECT 
  u.full_name, 
  m.name, 
  mp.current_week, 
  mp.average_score
FROM moodle_progress mp
JOIN users u ON mp.coder_id = u.id
JOIN modules m ON mp.module_id = m.id
ORDER BY u.id;

-- Ver temas con dificultad
SELECT 
  u.full_name, 
  t.name, 
  t.category
FROM coder_struggling_topics cst
JOIN users u ON cst.coder_id = u.id
JOIN topics t ON cst.topic_id = t.id
ORDER BY u.id;

*/

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Políticas de Acceso
-- KAIRO - Plataforma de Aprendizaje Personalizado
-- 
-- Estas políticas controlan qué datos puede ver/editar cada tipo de usuario
-- Las ejecuta Supabase automáticamente en cada consulta
-- ============================================

-- PRIMERO: Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE soft_skills_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodle_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coder_struggling_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE complementary_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tl_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USUARIOS
-- ============================================

-- Cada coder ve su propio perfil
CREATE POLICY "users_own_profile"
  ON users FOR SELECT
  USING (id = auth.uid()::int);

-- El TL ve todos los coders
CREATE POLICY "users_tl_sees_all"
  ON users FOR SELECT
  USING (auth.jwt()->>'role' = 'tl' OR id = auth.uid()::int);

-- Cada usuario puede editar su propio perfil (menos el rol)
CREATE POLICY "users_edit_own"
  ON users FOR UPDATE
  USING (id = auth.uid()::int)
  WITH CHECK (id = auth.uid()::int);

-- ============================================
-- HABILIDADES BLANDAS
-- ============================================

-- Cada coder ve su evaluación
CREATE POLICY "skills_own_assessment"
  ON soft_skills_assessment FOR SELECT
  USING (coder_id = auth.uid()::int);

-- El TL ve evaluaciones de todos
CREATE POLICY "skills_tl_sees_all"
  ON soft_skills_assessment FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- Solo el coder puede actualizar la suya
CREATE POLICY "skills_edit_own"
  ON soft_skills_assessment FOR UPDATE
  USING (coder_id = auth.uid()::int)
  WITH CHECK (coder_id = auth.uid()::int);

-- ============================================
-- MÓDULOS (Lectura pública)
-- ============================================

-- Todos pueden leer módulos
CREATE POLICY "modules_read_all"
  ON modules FOR SELECT
  USING (true);

-- Solo TL puede crear/editar módulos
CREATE POLICY "modules_tl_only"
  ON modules FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'tl');

CREATE POLICY "modules_tl_edit"
  ON modules FOR UPDATE
  USING (auth.jwt()->>'role' = 'tl');

-- ============================================
-- PROGRESO ACADÉMICO (Moodle)
-- ============================================

-- Cada coder ve su progreso
CREATE POLICY "progress_own_record"
  ON moodle_progress FOR SELECT
  USING (coder_id = auth.uid()::int);

-- El TL ve progreso de todos
CREATE POLICY "progress_tl_sees_all"
  ON moodle_progress FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- El coder puede actualizar su progreso
CREATE POLICY "progress_edit_own"
  ON moodle_progress FOR UPDATE
  USING (coder_id = auth.uid()::int)
  WITH CHECK (coder_id = auth.uid()::int);

-- ============================================
-- TEMAS (Lectura pública)
-- ============================================

-- Todos pueden leer temas
CREATE POLICY "topics_read_all"
  ON topics FOR SELECT
  USING (true);

-- Solo TL puede crear/editar
CREATE POLICY "topics_tl_only"
  ON topics FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'tl');

-- ============================================
-- TEMAS CON DIFICULTAD
-- ============================================

-- Cada coder ve sus propios temas problemáticos
CREATE POLICY "struggles_own_topics"
  ON coder_struggling_topics FOR SELECT
  USING (coder_id = auth.uid()::int);

-- El TL ve todos los temas problemáticos
CREATE POLICY "struggles_tl_sees_all"
  ON coder_struggling_topics FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- El coder puede reportar/eliminar sus temas
CREATE POLICY "struggles_coder_manage"
  ON coder_struggling_topics FOR INSERT
  WITH CHECK (coder_id = auth.uid()::int);

CREATE POLICY "struggles_coder_delete"
  ON coder_struggling_topics FOR DELETE
  USING (coder_id = auth.uid()::int);

-- ============================================
-- PLANES PERSONALIZADOS (Las 6 Cards)
-- ============================================

-- Cada coder ve sus planes
CREATE POLICY "plans_own_plans"
  ON complementary_plans FOR SELECT
  USING (coder_id = auth.uid()::int);

-- El TL ve planes de todos
CREATE POLICY "plans_tl_sees_all"
  ON complementary_plans FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- Solo TL puede crear planes
CREATE POLICY "plans_tl_create"
  ON complementary_plans FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'tl');

-- TL puede editar planes
CREATE POLICY "plans_tl_edit"
  ON complementary_plans FOR UPDATE
  USING (auth.jwt()->>'role' = 'tl');

-- ============================================
-- ACTIVIDADES DIARIAS
-- ============================================

-- Coder ve actividades de sus planes
CREATE POLICY "activities_own_plans"
  ON plan_activities FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM complementary_plans WHERE coder_id = auth.uid()::int
    )
  );

-- TL ve todas las actividades
CREATE POLICY "activities_tl_sees_all"
  ON plan_activities FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- Solo TL crea/edita actividades
CREATE POLICY "activities_tl_create"
  ON plan_activities FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'tl');

-- ============================================
-- PROGRESO DE ACTIVIDADES
-- ============================================

-- Coder ve su progreso
CREATE POLICY "activity_progress_own"
  ON activity_progress FOR SELECT
  USING (coder_id = auth.uid()::int);

-- TL ve progreso de todos
CREATE POLICY "activity_progress_tl"
  ON activity_progress FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- Coder actualiza su progreso
CREATE POLICY "activity_progress_edit"
  ON activity_progress FOR UPDATE
  USING (coder_id = auth.uid()::int)
  WITH CHECK (coder_id = auth.uid()::int);

-- Coder marca actividades completadas
CREATE POLICY "activity_progress_insert"
  ON activity_progress FOR INSERT
  WITH CHECK (coder_id = auth.uid()::int);

-- ============================================
-- EVIDENCIAS
-- ============================================

-- Coder ve sus evidencias
CREATE POLICY "evidence_own_submissions"
  ON evidence_submissions FOR SELECT
  USING (coder_id = auth.uid()::int);

-- TL ve evidencias de todos
CREATE POLICY "evidence_tl_sees_all"
  ON evidence_submissions FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- Coder sube sus evidencias
CREATE POLICY "evidence_coder_submit"
  ON evidence_submissions FOR INSERT
  WITH CHECK (coder_id = auth.uid()::int);

-- ============================================
-- RETROALIMENTACIÓN DEL TL
-- ============================================

-- Coder ve feedback que recibe
CREATE POLICY "feedback_own_feedback"
  ON tl_feedback FOR SELECT
  USING (coder_id = auth.uid()::int);

-- TL ve feedback que envía
CREATE POLICY "feedback_tl_sends"
  ON tl_feedback FOR SELECT
  USING (tl_id = auth.uid()::int OR auth.jwt()->>'role' = 'tl');

-- Solo TL puede enviar feedback
CREATE POLICY "feedback_tl_create"
  ON tl_feedback FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'tl' AND tl_id = auth.uid()::int);

-- TL puede editar su feedback
CREATE POLICY "feedback_tl_edit"
  ON tl_feedback FOR UPDATE
  USING (tl_id = auth.uid()::int AND auth.jwt()->>'role' = 'tl');

-- Coder puede marcar como leído
CREATE POLICY "feedback_coder_mark_read"
  ON tl_feedback FOR UPDATE
  USING (coder_id = auth.uid()::int AND auth.jwt()->>'role' = 'coder');

-- ============================================
-- ALERTAS DE RIESGO
-- ============================================

-- Coder ve sus alertas
CREATE POLICY "risk_own_alerts"
  ON risk_flags FOR SELECT
  USING (coder_id = auth.uid()::int);

-- TL ve alertas de todos
CREATE POLICY "risk_tl_sees_all"
  ON risk_flags FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- ============================================
-- REPORTES DEL TL
-- ============================================

-- TL ve reportes que le generan
CREATE POLICY "reports_tl_only"
  ON ai_reports FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- ============================================
-- LOG DE IA (Solo auditoría)
-- ============================================

-- Solo para auditoría interna (normalmente deshabilitado en producción)
CREATE POLICY "ai_log_tl_only"
  ON ai_generation_log FOR SELECT
  USING (auth.jwt()->>'role' = 'tl');

-- ============================================
-- FIN - RLS CONFIGURADO
-- ============================================

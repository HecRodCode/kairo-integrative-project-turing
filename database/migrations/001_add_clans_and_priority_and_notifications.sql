-- ============================================
-- MIGRATION: Agregar soporte para Clanes, Prioridades de Cards y Notificaciones
-- Fecha: Marzo 2026
-- Propósito: Habilituar las 6 Cards y el sistema de clanes
-- ============================================

-- ============================================
-- 1. USERS: Agregar clan_id para diferenciar clanes (Turing, Tesla, McCarthy)
-- ============================================
ALTER TABLE users ADD COLUMN clan_id VARCHAR(50);

-- Crear índice para búsquedas rápidas por clan
CREATE INDEX idx_users_clan_id ON users(clan_id);

COMMENT ON COLUMN users.clan_id IS 'Identifica el clan del coder: Turing, Tesla, McCarthy. Permite al TL filtrar coders por clan.';

-- ============================================
-- 2. COMPLEMENTARY_PLANS: Crear ENUM para niveles de prioridad y agregar columna
-- ============================================
CREATE TYPE priority_level_enum AS ENUM ('low', 'medium', 'high');

ALTER TABLE complementary_plans ADD COLUMN priority_level priority_level_enum DEFAULT 'medium';

-- Crear índice para consultas de prioridad
CREATE INDEX idx_complementary_plans_priority ON complementary_plans(priority_level);

COMMENT ON COLUMN complementary_plans.priority_level IS 'Nivel de prioridad de la card (high, medium, low). Usado para mostrar 2 High, 2 Medium, 2 Low en las 6 Cards.';

-- ============================================
-- 3. TL_FEEDBACK: Agregar is_read para el sistema de notificaciones
-- ============================================
ALTER TABLE tl_feedback ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

-- Crear índice para búsquedas de notificaciones no leídas
CREATE INDEX idx_tl_feedback_is_read ON tl_feedback(is_read);
CREATE INDEX idx_tl_feedback_coder_unread ON tl_feedback(coder_id, is_read);

COMMENT ON COLUMN tl_feedback.is_read IS 'Indica si el feedback ha sido leído por el coder. false = punto rojo en la campana de notificaciones.';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

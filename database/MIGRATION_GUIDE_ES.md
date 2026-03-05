# 📋 Cambios de Base de Datos - Clanes, 6 Cards y Notificaciones

Tres cambios simples para activar las funcionalidades principales del sistema.

### 1️⃣ Tabla `users` - Agregar soporte para Clanes
**Problema:** El TL no puede filtrar coders por clan (Turing, Tesla, McCarthy).

**Solución:** Agregar columna `clan_id`

```sql
ALTER TABLE users ADD COLUMN clan_id VARCHAR(50);
CREATE INDEX idx_users_clan_id ON users(clan_id);
```

**Uso en código:** 
- Backend puede hacer: `SELECT * FROM users WHERE clan_id = 'Turing'`
- TL puede filtrar sus coders por clan en el dashboard

---

### 2️⃣ Tabla `complementary_plans` - Prioridades de las 6 Cards
**Problema:** Node.js no sabe cuáles cards son High, Medium o Low.

**Solución:** Agregar columna `priority_level` con ENUM

```sql
CREATE TYPE priority_level_enum AS ENUM ('low', 'medium', 'high');
ALTER TABLE complementary_plans ADD COLUMN priority_level priority_level_enum DEFAULT 'medium';
CREATE INDEX idx_complementary_plans_priority ON complementary_plans(priority_level);
```

**Lógica esperada:**
- 2 cards High (prioritarias, muestra primero)
- 2 cards Medium (normales)
- 2 cards Low (complementarias)

**Uso en código:**
```javascript
// Backend Node.js
const sixCards = await db.query(
  `SELECT * FROM complementary_plans 
   WHERE coder_id = ? AND is_active = true
   ORDER BY priority_level DESC
   LIMIT 6`
);
```

---

### 3️⃣ Tabla `tl_feedback` - Sistema de Notificaciones
**Problema:** La campana de notificaciones no sabe si el feedback fue leído.

**Solución:** Agregar columna `is_read` (BOOLEAN)

```sql
ALTER TABLE tl_feedback ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_tl_feedback_is_read ON tl_feedback(is_read);
CREATE INDEX idx_tl_feedback_coder_unread ON tl_feedback(coder_id, is_read);
```

**Lógica esperada:**
- `is_read = false` → Mostrar punto rojo en la campana 🔴
- `is_read = true` → Sin indicador
- Al clickear el feedback, marcar como `is_read = true`

**Uso en código:**
```javascript
// Backend: obtener notificaciones no leídas
const unread = await db.query(
  `SELECT * FROM tl_feedback 
   WHERE coder_id = ? AND is_read = false`
);

// Marcar como leído
await db.query(
  `UPDATE tl_feedback SET is_read = true WHERE id = ?`
);
```

---

## 🚀 Cómo Ejecutar

### Opción A: Usar el archivo de migración (Recomendado)

```bash
# En la terminal del servidor (Supabase o PostgreSQL)
psql -U tu_usuario -d tu_base_datos -f database/migrations/001_add_clans_and_priority_and_notifications.sql
```

### Opción B: Ejecutar manualmente en Supabase

1. Abre Supabase Dashboard → SQL Editor
2. Copia el contenido de `database/migrations/001_add_clans_and_priority_and_notifications.sql`
3. Ejecuta el script completo

### Opción C: Ejecutar línea por línea

```sql
-- 1. Agregar clan_id
ALTER TABLE users ADD COLUMN clan_id VARCHAR(50);
CREATE INDEX idx_users_clan_id ON users(clan_id);

-- 2. Agregar priority_level
CREATE TYPE priority_level_enum AS ENUM ('low', 'medium', 'high');
ALTER TABLE complementary_plans ADD COLUMN priority_level priority_level_enum DEFAULT 'medium';
CREATE INDEX idx_complementary_plans_priority ON complementary_plans(priority_level);

-- 3. Agregar is_read
ALTER TABLE tl_feedback ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_tl_feedback_is_read ON tl_feedback(is_read);
CREATE INDEX idx_tl_feedback_coder_unread ON tl_feedback(coder_id, is_read);
```

---

## ✅ Validar que los cambios funcionan

```sql
-- Verificar que las columnas existan
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'clan_id';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'complementary_plans' AND column_name = 'priority_level';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tl_feedback' AND column_name = 'is_read';
```

---

## � Notas

- Los campos nuevos tienen **valores default**, no rompen datos existentes
- Los **índices mejoran performance** en búsquedas por clan y prioridad  
- El archivo de migración está versionado: `001_add_clans...sql` para auditoría


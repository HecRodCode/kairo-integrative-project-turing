# 📚 Base de Datos - Kairo

La base de datos de Kairo usa **PostgreSQL** (en Supabase) con políticas de
seguridad RLS para controlar el acceso a datos según el rol del usuario.

## 📂 Archivos en esta carpeta

| Archivo                 | Descripción                                            |
| ----------------------- | ------------------------------------------------------ |
| `schema.sql`            | Definición completa de todas las tablas y vistas       |
| `rls_policies.sql`      | Políticas de seguridad (quién ve qué datos)            |
| `MIGRATION_GUIDE_ES.md` | Paso a paso: agregar clan_id, priority_level e is_read |
| `ENDPOINTS_GUIDE.md`    | Ejemplos de cómo consultar cada tabla                  |
| `migrations/`           | Archivos versionados de cambios a la BD                |

---

## 🚀 Primer Setup

### 1. Crear la base de datos

```bash
# En Supabase: SQL Editor → Ejecutar schema.sql
psql -U tu_usuario -d tu_db -f schema.sql
```

### 2. Activar seguridad

```bash
# En Supabase: SQL Editor → Ejecutar rls_policies.sql
psql -U tu_usuario -d tu_db -f rls_policies.sql
```

### 3. Ejecutar migraciones necesarias

```bash
# Para habilitar clanes, 6 cards y notificaciones:
psql -U tu_usuario -d tu_db -f migrations/001_add_clans_and_priority_and_notifications.sql
```

---

## 🎯 Tablas Principales

### 👥 Usuarios

- `users` - Coders y Team Leaders
- `soft_skills_assessment` - Evaluación inicial de cada coder
- Campos: autonomía, time management, problem solving, comunicación, teamwork

### 📚 Contenido Académico

- `modules` - Módulos del bootcamp
- `topics` - Temas dentro de cada módulo
- `moodle_progress` - Progreso académico de cada coder

### 🎨 Sistema de Planes Personalizados

- `complementary_plans` - Las **6 Cards** generadas por IA
  - Contiene `priority_level` (high, medium, low)
  - Ordenadas: 2 High, 2 Medium, 2 Low
- `plan_activities` - Actividades diarias dentro de cada plan
- `activity_progress` - Seguimiento: qué completó cada coder

### 💬 Comunicación y Notificaciones

- `tl_feedback` - Mensajes del TL hacia coders
  - Contiene `is_read` para saber cuándo mostrar punto rojo 🔴
- `evidence_submissions` - Evidencia subida por coders
- `risk_flags` - Alertas automáticas de riesgo

### 📊 Análisis y Reportes

- `ai_reports` - Reportes ejecutivos para el TL
- `ai_generation_log` - Auditoría de llamadas a IA

---

## 🔐 Seguridad (RLS)

Cada tabla tiene políticas que controlan:

- Qué datos ve cada usuario (coder vs TL)
- Qué datos puede editar (solo su propio contenido)
- Quién puede crear/eliminar (normalmente solo TL)

**Ejemplo:** Un coder solo ve su propio progreso, no el de otros. El TL ve a
todos.

---

## 📋 Esquema Simplificado

```
CODERS (usuarios con role='coder')
  ├── Evaluación blandas (autonomía, time management, etc)
  ├── Progreso académico (qué módulos va completando)
  ├── 6 Cards personalizadas
  │   ├── Actividades diarias
  │   └── Evidencias subidas
  └── Feedback del TL
      └── Notificaciones (is_read)

TEAM LEADERS (usuarios con role='tl')
  ├── Ven a todos los coders (pueden filtrar por clan_id)
  ├── Ven progreso de todos
  ├── Generan planes personalizados
  ├── Envían feedback/notificaciones
  └── Ven reportes de riesgo
```

---

## 🎯 Campos Clave

### clan_id (users)

- Valores: "Turing", "Tesla", "McCarthy"
- Permite al TL filtrar coders por clan
- Índice: `idx_users_clan_id`

### priority_level (complementary_plans)

- Valores: "high", "medium", "low"
- Ordena las 6 cards automáticamente
- Índice: `idx_plans_priority`

### is_read (tl_feedback)

- Boolean: true/false
- Indica si el coder leyó el mensaje
- false = punto rojo en la campana 🔴
- Índice: `idx_feedback_coder_unread`

---

## 📈 Vistas útiles

### v_coder_dashboard

Resumen del progreso de cada coder:

- Autonomía, time management, estilo de aprendizaje
- Módulo actual, semana, promedio
- Total de actividades y % completadas

### v_coder_risk_analysis

Análisis de riesgo:

- Nivel de riesgo (bajo, medio, alto)
- Autonomía vs promedio académico
- Indicadores de alerta

---

## 🔄 Cómo Las 6 Cards Funcionan

1. **IA genera planes** → Se guardan en `complementary_plans`
2. **Cada plan tiene `priority_level`**:
   - 2 cards High (prioridad máxima)
   - 2 cards Medium (prioridad normal)
   - 2 cards Low (complementarias)
3. **Frontend ordena por priority**:
   ```javascript
   ORDER BY priority_level DESC
   ```
4. **Coder ve 6 cards en su dashboard**

---

## 💬 Sistema de Notificaciones

1. **TL envía mensaje** → Crea registro en `tl_feedback` con `is_read = false`
2. **Campana muestra punto rojo** 🔴 (porque `is_read = false`)
3. **Coder lee mensaje** → Frontend actualiza `is_read = true`
4. **Punto rojo desaparece** ✅

---

## 🛠️ Queries Comunes

### Ver coders de mi clan (TL)

```sql
SELECT * FROM users
WHERE clan_id = 'Turing' AND role = 'coder';
```

### Ver las 6 cards de un coder (ordenadas)

```sql
SELECT * FROM complementary_plans
WHERE coder_id = 123 AND is_active = true
ORDER BY priority_level DESC;
```

### Ver notificaciones no leídas

```sql
SELECT * FROM tl_feedback
WHERE coder_id = 123 AND is_read = false
ORDER BY created_at DESC;
```

### Marcar notificación como leída

```sql
UPDATE tl_feedback
SET is_read = true
WHERE id = 456;
```

---

## 📚 Más Información

- **ENDPOINTS_GUIDE.md** - Ejemplos de código para consultar cada tabla
- **MIGRATION_GUIDE_ES.md** - Guía paso a paso para nuevos cambios
- **schema.sql** - Comentarios en cada tabla explicando su propósito
- **rls_policies.sql** - Definición clara de quién ve qué

---

## ⚡ Tips de Performance

- Usa los índices: búsquedas por email, clan_id, role, priority_level son
  rápidas
- Evita SELECT \* sin WHERE: especifica las columnas que necesitas
- Agrupa por coder_id cuando obtengas estadísticas
- Usa LIMIT cuando pidas muchos registros

---

## 🚨 Troubleshooting

### "Permission denied" en una tabla

→ Revisa `rls_policies.sql` para el rol del usuario

### Las 6 cards no aparecen ordenadas

→ Verifica que `priority_level` tenga un valor (default es 'medium')

### Notificaciones no aparecen

→ Asegúrate que `is_read = false` en `tl_feedback`

### No veo datos del TL

→ Verifica tu rol en la tabla `users` (debe ser 'tl')

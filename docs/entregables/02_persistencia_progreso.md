# Entregable 2 — Lógica de Persistencia de Progreso

## Documentación Técnica de Base de Datos — Kairo

### Proyecto Integrador · RIWI · Clan Turing · Marzo 2026

---

## Tabla de Contenido

1. [Lógica de Persistencia de Progreso](#1-lógica-de-persistencia-de-progreso)
2. [Vistas Materializadas](#2-vistas-materializadas)
3. [Hallazgos y Discrepancias Detectadas](#3-hallazgos-y-discrepancias-detectadas)

---

## 1. Lógica de Persistencia de Progreso

Este es el punto mas crítico de los tres entregables. La pregunta real es: ¿el
botón de "Completado" está registrando correctamente en la base de datos?

### 1.1 Flujo del Botón "Completado"

El coder hace click en "Completado" en una actividad -> el frontend envía un
`PATCH /api/coder/activities/:id/complete` -> el middleware valida sesión + rol +
onboarding -> el controller `updateActivityProgress` ejecuta un UPSERT en
`activity_progress`.

El SQL que ejecuta el controller es:

```sql
INSERT INTO activity_progress
  (activity_id, coder_id, completed, reflection_text, time_spent_minutes, completed_at)
VALUES ($1, $2, true, $3, $4, NOW())
ON CONFLICT (activity_id, coder_id)
DO UPDATE SET
  reflection_text    = EXCLUDED.reflection_text,
  time_spent_minutes = EXCLUDED.time_spent_minutes,
  completed_at       = NOW()
RETURNING *
```

**Validación del UPSERT:**

 El constraint `UNIQUE(activity_id, coder_id)` garantiza que no haya duplicados. Si el coder clickea dos veces "Completado", la segunda vez actualiza `reflection_text`, `time_spent_minutes` y `completed_at` — no crea un segundo registro. Eso está
bien.

el UPDATE no toca el campo `completed`. Si alguien quisiera "desmarcar" una actividad, este endpoint no lo
permite — siempre inserta con `completed = true`.

### 1.2 Flujo de Generación de Planes (Snapshots)

Cuando el coder completa el onboarding:

1. `POST /api/diagnostics` -> `diagnosticControllers.js` recibe las respuestas crudas
2. El controller calcula tallies VARK + ILS + Kolb → deriva soft skills (1-5) y learning style
3. Guarda en `soft_skills_assessment` via UPSERT (modelo `softSkills.js`)
4. Responde 201 al frontend inmediatamente (no bloquea)
5. **Fire-and-forget:** llama al microservicio Python `POST /generate-plan`
6. Python (`supabase_service.py`) desactiva planes anteriores -> inserta nuevo plan en `complementary_plans` con snapshots
7. Registra la generación en `ai_generation_log`

**Validación de los snapshots:** El servicio Python guarda `soft_skills_snapshot` y `moodle_status_snapshot` como JSONB. Estos snapshots capturan el estado del coder en el momento exacto de la generación. Cuando se necesite graficar la evolución de un coder, puede comparar el snapshot del plan anterior con el estado actual. El sistema debería manejarlo bien, aunque no hemos probado ese escenario todavía con datos reales masivos.

### 1.3 Persistencia del Progreso Académico (Moodle)

El modelo `moddleProgress.js` hace un UPSERT:

```sql
INSERT INTO moodle_progress (coder_id, average_score, completed_activities, current_week, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (coder_id) DO UPDATE SET ...
```

**Problema detectado:** El `ON CONFLICT` solo especifica `coder_id`, pero la tabla tiene `UNIQUE(coder_id, module_id)`. Si un coder está en dos módulos, el UPSERT podría fallar. El modelo además referencia una columna `completed_activities` que no existe en el schema — la tabla tiene `weeks_completed` (JSONB) y `struggling_topics` (TEXT[]). Esto requiere corrección, dependiendo del tipo de dato que quieran persistir.

### 1.4 Vista del Dashboard (`v_coder_dashboard`)

La vista calcula automáticamente:

- `total_activities`: count de actividades en el plan activo
- `completed_activities`: sum de las que tienen `completed = TRUE`
- `completion_percentage`: porcentaje redondeado al 2do decimal

Esto se ve claro en un caso como: un coder tiene un plan con 28 actividades (4 semanas × 7 días) y completa 14. La vista le muestra `completion_percentage = 50.00`. Si Cesar consume esta vista directamente, los datos de las gráficas deberían ser consistentes.

---

## 2. Vistas Materializadas

### 2.1 `v_coder_dashboard`

```sql
SELECT
  u.id, u.email, u.full_name, u.clan_id,
  ssa.autonomy, ssa.time_management, ssa.learning_style,
  m.name AS module_name,
  mp.current_week, mp.average_score,
  COUNT(DISTINCT pa.id) AS total_activities,
  SUM(CASE WHEN ap.completed = TRUE THEN 1 ELSE 0 END) AS completed_activities,
  ROUND((...) * 100, 2) AS completion_percentage
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = u.id
WHERE u.role = 'coder'
GROUP BY ...
```

**Joins:** `users` → `soft_skills_assessment` → `moodle_progress` → `modules` →
`complementary_plans` (solo activos) → `plan_activities` → `activity_progress`.

Es una vista de 7 JOINs. Funciona para pocos coders pero si algún día hay 200+ podría necesitar optimización. O al menos reducir el impacto, que no es lo mismo que eliminarlo.

### 2.2 `v_coder_risk_analysis`

Calcula el riesgo de cada coder con lógica:

- `autonomy <= 2 AND average_score < 70` → **HIGH**
- `autonomy <= 2 OR average_score < 70` → **MEDIUM**
- Otro caso → **LOW**

El TL puede comparar el `current_risk_level` (último `risk_flags` activo) con el
`calculated_risk_level` para ver si la detección automática coincide con la
realidad.

---

## 3. Hallazgos y Discrepancias Detectadas

Durante la revisión del código se encontraron varias discrepancias entre lo que dice el schema y lo que hace el backend. Esto es normal en un proyecto que avanza rápido con varios desarrolladores, pero hay que resolverlas antes de la entrega final.

### 3.1 Columna `raw_answers` faltante en schema.sql

**Problema:** El modelo `softSkills.js` hace INSERT/UPSERT de una columna
`raw_answers` (JSONB) que no está definida en `schema.sql`.

**Impacto:** El INSERT va a fallar en producción. Las respuestas crudas del
onboarding se pierden.

**Solución:**

```sql
ALTER TABLE soft_skills_assessment ADD COLUMN raw_answers JSONB;
```

### 3.2 Campo `clan` vs `clan_id` en users

**Problema:** El schema define `clan_id VARCHAR(50)`, pero el modelo `user.js`
usa `clan` en los INSERT y SELECT. El controller de dashboard tambien usa
`u.clan`.

**Impacto:** Queries fallan si la columna se llama `clan_id` pero el código
busca `clan`.

**Solución:** Unificar. O renombrar la columna en el schema a `clan`, o
actualizar todos los modelos y controllers para usar `clan_id`.

### 3.3 Modelo `moddleProgress.js` — Upsert incompleto

**Problema:** El ON CONFLICT es sobre `coder_id` pero el constraint real es
`UNIQUE(coder_id, module_id)`. Además referencia `completed_activities` que no
existe en la tabla.

**Impacto:** El UPSERT falla si el coder tiene progreso en más de un módulo.

**Solución:** Cambiar el ON CONFLICT a `(coder_id, module_id)` y ajustar los
campos al schema real.

### 3.4 Modelo `plan.js` referencia `training_plans`

**Problema:** El modelo usa la tabla `training_plans` que no existe en el
schema. La tabla real se llama `complementary_plans`.

**Impacto:** Todas las operaciones de este modelo fallan.

**Solución:** Reescribir las queries para usar `complementary_plans` y ajustar
los campos (`topic` no existe, `plan_content` sí).

### 3.5 Controller `coderControllers.js` referencia columnas inexistentes

**Problema:** El dashboard query referencia `u.current_module_id`,
`u.learning_style_cache`, `m.is_critical`, `targeted_soft_skill`, y la tabla
`performance_tests` / `weeks`. Ninguna de esas columnas o tablas existe en el
schema actual.

**Impacto:** El dashboard del coder no carga.

**Solución:** O bien se agregan las columnas/tablas faltantes al schema, o se
simplifica el controller para usar solo lo que existe.

### 3.6 `supabase_service.py` referencia columnas inexistentes

**Problema:** El servicio Python referencia `is_critical`,
`has_performance_test` en modules, y `targeted_soft_skill` en
complementary_plans. Además lee `weeks` que no existe como tabla.

**Impacto:** La generación de planes desde Python podría fallar al intentar leer
estas columnas.

**Solución:** Agregar las columnas faltantes o ajustar el servicio.

---

> **Documento generado por:** Miguel Calle — Database Architect  
> **Fecha:** 11 de Marzo de 2026  
> **Proyecto:** Kairo · RIWI · Clan Turing  
> **Entregable:** 2 de 3 — Lógica de Persistencia de Progreso

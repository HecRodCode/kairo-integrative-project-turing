# Entregable 1 — Modelo Relacional + Diccionario de Datos

## Documentación Técnica de Base de Datos — Kairo

### Proyecto Integrador · RIWI · Clan Turing · Marzo 2026

---

## Tabla de Contenido

1. [Modelo Relacional Completo](#1-modelo-relacional-completo)
2. [Diccionario de Datos](#2-diccionario-de-datos)
3. [Tipos Enumerados (ENUMs)](#3-tipos-enumerados-enums)
4. [Políticas de Seguridad (RLS)](#4-políticas-de-seguridad-rls)

---

## 1. Modelo Relacional Completo

La base de datos de Kairo corre sobre PostgreSQL 14+ hospedado en Supabase. Tiene 14 tablas, 2 vistas y 8 tipos enumerados. La razón de elegir Supabase es que el equipo ya tenía experiencia con el panel de administración por el módulo de bases de datos.

El esquema se divide en cuatro bloques funcionales:

**Bloque de Identidad:** `users` es la tabla central. Contiene coders y team
leaders diferenciados por el enum `role_enum`. Cada usuario tiene un `clan_id`
que agrupa por clan (Turing, Tesla, McCarthy). Hay un campo
`first_login` que controla si el coder ya completó el onboarding.

**Bloque Académico:** `modules`, `topics`, `moodle_progress` y
`coder_struggling_topics`. Esto modela la estructura del curso: módulos con
sus semanas, temas por módulo, y el progreso que viene de Moodle. Algo que hay
que tener en cuenta es que `moodle_progress` usa JSONB para `weeks_completed`,
lo cual da flexibilidad pero hace que las consultas sean un poco más complejas
de lo necesario.

**Bloque de Planes IA (las 6 Cards):** `complementary_plans`, `plan_activities`,
`activity_progress` y `evidence_submissions`. Este es el corazón del sistema. La
IA genera un plan con actividades diarias, el coder las completa y puede subir
evidencia. El punto crítico de todo esto es que
`complementary_plans.plan_content` es un JSONB que almacena toda la estructura
del plan generado por Groq —incluyendo las 6 cards con prioridad
high/medium/low.

**Bloque de Gestión TL:** `tl_feedback`, `risk_flags`, `ai_reports` y
`ai_generation_log`. Los TL envían retroalimentación, el sistema detecta coders
en riesgo automáticamente, y todo queda logueado en `ai_generation_log` para
auditoría.

A nivel de relaciones, el patrón es bastante consistente: casi todo referencia a
`users.id` como foreign key con `ON DELETE CASCADE`. Los planes referencian
tanto a `users` como a `modules`. Las actividades van dentro de planes, el
progreso va dentro de actividades. Es una jerarquía limpia, aunque en la
práctica habrá que ver cómo se comporta bajo carga real con muchos coders
generando planes simultáneamente.

---

## 2. Diccionario de Datos

### 2.1 `users` — Usuarios del Sistema

| Columna       | Tipo         | Restricciones    | Descripción                                      |
| ------------- | ------------ | ---------------- | ------------------------------------------------ |
| `id`          | SERIAL       | PK               | Identificador único autoincrementable            |
| `email`       | VARCHAR(100) | UNIQUE, NOT NULL | Correo institucional del usuario                 |
| `password`    | VARCHAR(255) | NOT NULL         | Hash bcrypt (10 rondas) de la contraseña         |
| `full_name`   | VARCHAR(150) | NOT NULL         | Nombre completo del coder o TL                   |
| `role`        | role_enum    | NOT NULL         | Rol: `coder` o `tl`                              |
| `clan_id`     | VARCHAR(50)  | NULL             | Clan al que pertenece: Turing, Tesla, McCarthy   |
| `first_login` | BOOLEAN      | DEFAULT TRUE     | Si es `true`, el frontend redirige al onboarding |
| `created_at`  | TIMESTAMP    | DEFAULT NOW()    | Fecha de creación de la cuenta                   |

**Índices:** `idx_users_email`, `idx_users_role`, `idx_users_clan_id`

> **Nota de implementación:** El modelo Node.js (`user.js`) usa el campo `clan`
> en vez de `clan_id`. Esto genera una discrepancia que hay que resolver — se
> detalla en el documento de Hallazgos (Entregable 2, sección 5).

### 2.2 `soft_skills_assessment` — Evaluación de Habilidades Blandas

| Columna           | Tipo                | Restricciones          | Descripción                                  |
| ----------------- | ------------------- | ---------------------- | -------------------------------------------- |
| `id`              | SERIAL              | PK                     | ID de la evaluación                          |
| `coder_id`        | INT                 | FK → users(id), UNIQUE | Un assessment por coder                      |
| `autonomy`        | INT                 | CHECK(1-5), NOT NULL   | Nivel de autonomía derivado del quiz         |
| `time_management` | INT                 | CHECK(1-5), NOT NULL   | Gestión del tiempo                           |
| `problem_solving` | INT                 | CHECK(1-5), NOT NULL   | Resolución de problemas                      |
| `communication`   | INT                 | CHECK(1-5), NOT NULL   | Comunicación efectiva                        |
| `teamwork`        | INT                 | CHECK(1-5), NOT NULL   | Trabajo en equipo                            |
| `learning_style`  | learning_style_enum | NOT NULL               | Estilo: visual, auditory, kinesthetic, mixed |
| `assessed_at`     | TIMESTAMP           | DEFAULT NOW()          | Fecha de evaluación                          |

**Índice:** `idx_soft_skills_coder`

Para ponerlo en términos concretos: el coder contesta 20 preguntas basadas en
VARK + ILS (Felder-Silverman) + Kolb. El `diagnosticControllers.js` toma las
respuestas crudas, calcula tallies por etiqueta (V, A, R, K, ACT, REF, SNS, INT,
etc.) y deriva los scores de 1 a 5 para cada soft skill usando mapeos
psicológicos. El modelo `softSkills.js` hace un UPSERT — si el coder repite el
quiz, se actualizan todos los campos.

Algo que vale la pena detenerse aquí un momento: el modelo Node.js inserta una
columna `raw_answers` (JSONB) que **no existe en el schema.sql actual**. Eso va
a fallar en producción si no se agrega la columna. Lo documenté en el documento
de Hallazgos (Entregable 2, sección 5).

### 2.3 `modules` — Módulos del Bootcamp

| Columna       | Tipo         | Restricciones | Descripción                         |
| ------------- | ------------ | ------------- | ----------------------------------- |
| `id`          | SERIAL       | PK            | ID del modulo                       |
| `name`        | VARCHAR(100) | NOT NULL      | Nombre: "Backend", "Frontend", etc. |
| `description` | TEXT         | NULL          | Descripción del módulo              |
| `total_weeks` | INT          | NOT NULL      | Duración en semanas                 |
| `created_at`  | TIMESTAMP    | DEFAULT NOW() | Fecha de creación                   |

No tiene índices adicionales más allá del PK. En principio es una tabla pequeña
(6-8 módulos máximo), así que no es crítico.

### 2.4 `moodle_progress` — Progreso Académico

| Columna             | Tipo         | Restricciones    | Descripción                           |
| ------------------- | ------------ | ---------------- | ------------------------------------- |
| `id`                | SERIAL       | PK               | ID del registro                       |
| `coder_id`          | INT          | FK → users(id)   | Coder al que pertenece                |
| `module_id`         | INT          | FK → modules(id) | Módulo que está cursando              |
| `current_week`      | INT          | NOT NULL         | Semana actual del coder en ese módulo |
| `weeks_completed`   | JSONB        | DEFAULT '[]'     | Array JSON con semanas completadas    |
| `struggling_topics` | TEXT[]       | DEFAULT '{}'     | Array PostgreSQL de temas difíciles   |
| `average_score`     | DECIMAL(5,2) | DEFAULT 0        | Promedio de calificaciones            |
| `updated_at`        | TIMESTAMP    | DEFAULT NOW()    | Última actualización                  |

**Constraint:** UNIQUE(coder_id, module_id) — un registro por combinación
coder-módulo. **Índices:** `idx_moodle_coder`, `idx_moodle_score`

El modelo `moddleProgress.js` (sí, tiene un typo en el nombre del archivo —
"moddle" en vez de "moodle") hace un UPSERT basado en `coder_id`, pero la tabla
tiene el constraint UNIQUE sobre `(coder_id, module_id)`. Esa diferencia importa
porque el ON CONFLICT del modelo no especifica `module_id`, al menos en este
prototipo.

### 2.5 `topics` — Temas por Módulo

| Columna     | Tipo         | Restricciones              | Descripción                               |
| ----------- | ------------ | -------------------------- | ----------------------------------------- |
| `id`        | SERIAL       | PK                         | ID del tema                               |
| `module_id` | INT          | FK → modules(id), NOT NULL | Modulo al que pertenece                   |
| `name`      | VARCHAR(200) | NOT NULL                   | Nombre del tema                           |
| `category`  | VARCHAR(100) | NULL                       | Categoría (ej: "fundamentos", "avanzado") |

**Índices:** `idx_topics_module`, `idx_topics_category`

### 2.6 `coder_struggling_topics` — Temas con Dificultad

| Columna       | Tipo      | Restricciones             | Descripción                  |
| ------------- | --------- | ------------------------- | ---------------------------- |
| `id`          | SERIAL    | PK                        | ID del registro              |
| `coder_id`    | INT       | FK → users(id), NOT NULL  | Coder que reporta dificultad |
| `topic_id`    | INT       | FK → topics(id), NOT NULL | Tema con dificultad          |
| `reported_at` | TIMESTAMP | DEFAULT NOW()             | Cuando se reportó            |

**Constraint:** UNIQUE(coder_id, topic_id) — un coder no puede reportar el mismo
tema dos veces. **Índice:** `idx_struggling_coder`

Esta tabla es la relación N:M entre coders y topics. Parece redundante con el
campo `struggling_topics` de `moodle_progress`, pero la diferencia es que esta
tabla conecta con temas reales del catálogo (con FK a topics), mientras que el
TEXT[] de moodle_progress son strings libres. Dependiendo del tipo de consulta
que necesite Cesar para las gráficas, una u otra será mas útil.

### 2.7 `complementary_plans` — Planes IA (Las 6 Cards)

| Columna                  | Tipo                | Restricciones              | Descripción                                  |
| ------------------------ | ------------------- | -------------------------- | -------------------------------------------- |
| `id`                     | SERIAL              | PK                         | ID del plan                                  |
| `coder_id`               | INT                 | FK → users(id), NOT NULL   | Coder dueño del plan                         |
| `module_id`              | INT                 | FK → modules(id), NOT NULL | Módulo asociado al plan                      |
| `plan_content`           | JSONB               | NOT NULL                   | Estructura completa del plan generado por IA |
| `priority_level`         | priority_level_enum | DEFAULT 'medium'           | Prioridad: low, medium, high                 |
| `soft_skills_snapshot`   | JSONB               | NULL                       | Estado de soft skills al momento de generar  |
| `moodle_status_snapshot` | JSONB               | NULL                       | Estado académico al momento de generar       |
| `is_active`              | BOOLEAN             | DEFAULT TRUE               | Solo un plan activo por coder a la vez       |
| `generated_at`           | TIMESTAMP           | DEFAULT NOW()              | Fecha de generación                          |

**Índices:** `idx_plans_coder`, `idx_plans_active`, `idx_plans_priority`

Y aquí viene la parte interesante: los snapshots (`soft_skills_snapshot` y
`moodle_status_snapshot`) son fotos del estado del coder al momento de generarse
el plan. Esto permite comparar "cómo estaba cuando se generó" vs "cómo está
ahora". Es un patron de diseño que no es la decision mas elegante pero es la que
podemos implementar este semestre sin complicar las queries demasiado.

El servicio Python (`supabase_service.py`) desactiva todos los planes activos
antes de insertar uno nuevo. Solo un plan es `is_active = true` a la vez.

### 2.8 `plan_activities` — Actividades Diarias

| Columna                  | Tipo               | Restricciones                          | Descripción                                       |
| ------------------------ | ------------------ | -------------------------------------- | ------------------------------------------------- |
| `id`                     | SERIAL             | PK                                     | ID de la actividad                                |
| `plan_id`                | INT                | FK → complementary_plans(id), NOT NULL | Plan al que pertenece                             |
| `day_number`             | INT                | NOT NULL                               | Día de la actividad (1-28 para plan de 4 semanas) |
| `title`                  | VARCHAR(200)       | NOT NULL                               | Titulo de la actividad                            |
| `description`            | TEXT               | NULL                                   | Descripción detallada                             |
| `estimated_time_minutes` | INT                | NULL                                   | Tiempo estimado en minutos                        |
| `activity_type`          | activity_type_enum | NULL                                   | guided, semi_guided, autonomous                   |
| `skill_focus`            | VARCHAR(100)       | NULL                                   | Habilidad que refuerza                            |

**Índices:** `idx_activities_plan`, `idx_activities_day`

### 2.9 `activity_progress` — Progreso de Actividades

| Columna              | Tipo      | Restricciones                      | Descripción                            |
| -------------------- | --------- | ---------------------------------- | -------------------------------------- |
| `id`                 | SERIAL    | PK                                 | ID del progreso                        |
| `activity_id`        | INT       | FK → plan_activities(id), NOT NULL | Actividad completada                   |
| `coder_id`           | INT       | FK → users(id), NOT NULL           | Coder que completó                     |
| `completed`          | BOOLEAN   | DEFAULT FALSE                      | Si la actividad está completada        |
| `reflection_text`    | TEXT      | NULL                               | Reflexión del coder sobre la actividad |
| `time_spent_minutes` | INT       | NULL                               | Tiempo real invertido                  |
| `completed_at`       | TIMESTAMP | NULL                               | Fecha/hora de completado               |

**Constraint:** UNIQUE(activity_id, coder_id) — un coder completa cada actividad
una sola vez. **Índices:** `idx_progress_activity`, `idx_progress_coder`,
`idx_progress_completed`

Esta tabla es la que recibe el click del botón "Completado". Se analiza en
detalle en el Entregable 2 (Lógica de Persistencia).

### 2.10 `evidence_submissions` — Evidencias

| Columna        | Tipo      | Restricciones                      | Descripción                          |
| -------------- | --------- | ---------------------------------- | ------------------------------------ |
| `id`           | SERIAL    | PK                                 | ID de la evidencia                   |
| `activity_id`  | INT       | FK → plan_activities(id), NOT NULL | Actividad asociada                   |
| `coder_id`     | INT       | FK → users(id), NOT NULL           | Coder que sube la evidencia          |
| `file_url`     | TEXT      | NULL                               | URL del archivo subido               |
| `link_url`     | TEXT      | NULL                               | Link externo (GitHub, CodePen, etc.) |
| `description`  | TEXT      | NULL                               | Descripción de la evidencia          |
| `submitted_at` | TIMESTAMP | DEFAULT NOW()                      | Fecha de envío                       |

**Índices:** `idx_evidence_activity`, `idx_evidence_coder`

### 2.11 `tl_feedback` — Retroalimentación del TL

| Columna         | Tipo               | Restricciones                      | Descripción                            |
| --------------- | ------------------ | ---------------------------------- | -------------------------------------- |
| `id`            | SERIAL             | PK                                 | ID del feedback                        |
| `coder_id`      | INT                | FK → users(id), NOT NULL           | Coder que recibe el feedback           |
| `tl_id`         | INT                | FK → users(id), NOT NULL           | TL que envía                           |
| `plan_id`       | INT                | FK → complementary_plans(id), NULL | Plan asociado (opcional)               |
| `feedback_text` | TEXT               | NOT NULL                           | Texto del mensaje                      |
| `feedback_type` | feedback_type_enum | NULL                               | weekly, activity, general              |
| `is_read`       | BOOLEAN            | DEFAULT FALSE                      | `false` = punto rojo en notificaciones |
| `created_at`    | TIMESTAMP          | DEFAULT NOW()                      | Fecha de envío                         |

**Índices:** `idx_feedback_coder`, `idx_feedback_tl`, `idx_feedback_is_read`,
`idx_feedback_coder_unread`

### 2.12 `risk_flags` — Alertas de Riesgo

| Columna         | Tipo            | Restricciones            | Descripción                               |
| --------------- | --------------- | ------------------------ | ----------------------------------------- |
| `id`            | SERIAL          | PK                       | ID de la alerta                           |
| `coder_id`      | INT             | FK → users(id), NOT NULL | Coder en riesgo                           |
| `risk_level`    | risk_level_enum | NOT NULL                 | low, medium, high                         |
| `reason`        | TEXT            | NOT NULL                 | Razón de la alerta                        |
| `auto_detected` | BOOLEAN         | DEFAULT TRUE             | Si fue detectado automaticamente o manual |
| `detected_at`   | TIMESTAMP       | DEFAULT NOW()            | Fecha de detección                        |
| `resolved`      | BOOLEAN         | DEFAULT FALSE            | Si el TL ya resolvió la alerta            |
| `resolved_at`   | TIMESTAMP       | NULL                     | Fecha de resolución                       |

**Índices:** `idx_risk_coder`, `idx_risk_level`, `idx_risk_resolved`

### 2.13 `ai_reports` — Reportes para TL

| Columna           | Tipo               | Restricciones | Descripción                       |
| ----------------- | ------------------ | ------------- | --------------------------------- |
| `id`              | SERIAL             | PK            | ID del reporte                    |
| `target_type`     | report_target_enum | NOT NULL      | coder, clan, cohort               |
| `target_id`       | INT                | NOT NULL      | ID del target (coder, clan, etc.) |
| `summary_text`    | TEXT               | NOT NULL      | Resumen ejecutivo generado por IA |
| `risk_level`      | risk_level_enum    | NULL          | Nivel de riesgo general           |
| `recommendations` | TEXT               | NULL          | Recomendaciones de la IA          |
| `generated_at`    | TIMESTAMP          | DEFAULT NOW() | Fecha de generación               |
| `viewed_by_tl`    | BOOLEAN            | DEFAULT FALSE | Si el TL ya vio el reporte        |

**Índices:** `idx_reports_target`, `idx_reports_viewed`

### 2.14 `ai_generation_log` — Log de Auditoría IA

| Columna             | Tipo          | Restricciones        | Descripción                                    |
| ------------------- | ------------- | -------------------- | ---------------------------------------------- |
| `id`                | SERIAL        | PK                   | ID del log                                     |
| `coder_id`          | INT           | FK → users(id), NULL | Coder asociado                                 |
| `agent_type`        | ai_agent_enum | NOT NULL             | learning_plan, report_generator, risk_detector |
| `input_payload`     | JSONB         | NOT NULL             | Lo que se le envió a la IA                     |
| `output_payload`    | JSONB         | NOT NULL             | Lo que respondió la IA                         |
| `model_name`        | VARCHAR(100)  | NULL                 | Nombre del modelo (llama-3.3-70b)              |
| `execution_time_ms` | INT           | NULL                 | Tiempo de ejecución en milisegundos            |
| `success`           | BOOLEAN       | DEFAULT TRUE         | Si la generación fue exitosa                   |
| `error_message`     | TEXT          | NULL                 | Mensaje de error si falló                      |
| `generated_at`      | TIMESTAMP     | DEFAULT NOW()        | Fecha de generación                            |

**Índices:** `idx_log_agent`, `idx_log_coder`, `idx_log_date`

---

## 3. Tipos Enumerados (ENUMs)

| Nombre                | Valores                                              | Usado en                                         |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `role_enum`           | `coder`, `tl`                                        | `users.role`                                     |
| `learning_style_enum` | `visual`, `auditory`, `kinesthetic`, `mixed`         | `soft_skills_assessment.learning_style`          |
| `activity_type_enum`  | `guided`, `semi_guided`, `autonomous`                | `plan_activities.activity_type`                  |
| `feedback_type_enum`  | `weekly`, `activity`, `general`                      | `tl_feedback.feedback_type`                      |
| `risk_level_enum`     | `low`, `medium`, `high`                              | `risk_flags.risk_level`, `ai_reports.risk_level` |
| `report_target_enum`  | `coder`, `clan`, `cohort`                            | `ai_reports.target_type`                         |
| `ai_agent_enum`       | `learning_plan`, `report_generator`, `risk_detector` | `ai_generation_log.agent_type`                   |
| `priority_level_enum` | `low`, `medium`, `high`                              | `complementary_plans.priority_level`             |

Se eligieron ENUMs en vez de tablas de lookup principalmente porque el equipo ya
tiene base en PostgreSQL por materias anteriores y los ENUMs mantienen la
integridad sin necesidad de JOINs adicionales. Una solución más robusta con
tablas de referencia permitiría agregar valores sin migración, pero para el
alcance del semestre los ENUMs son suficientes.

---

## 4. Políticas de Seguridad (RLS)

Row Level Security está habilitado en las 14 tablas. El patron general es:

| Rol   | SELECT                 | INSERT                                | UPDATE                         | DELETE                         |
| ----- | ---------------------- | ------------------------------------- | ------------------------------ | ------------------------------ |
| Coder | Solo sus propios datos | Solo sus propios registros            | Solo sus propios registros     | Solo `coder_struggling_topics` |
| TL    | Ve todos los datos     | Puede crear módulos, feedback, planes | Puede editar módulos, feedback | —                              |

**Políticas notables:**

- `feedback_coder_mark_read`: permite al coder hacer UPDATE en `tl_feedback`
  solo para cambiar `is_read`. Sin esta política, las notificaciones quedarían
  siempre como no leídas.
- `activity_progress_insert`: el coder puede insertar registros de progreso
  (marcar actividades como completadas).
- `ai_log_tl_only`: solo el TL ve los logs de IA. En producción podría
  deshabilitarse por rendimiento.
- `plans_tl_create`: solo el TL puede insertar planes. Esto es porque el
  servicio Python usa la `SERVICE_ROLE` key que bypasea RLS.

---

> **Documento generado por:** Miguel Calle — Database Architect  
> **Fecha:** 11 de Marzo de 2026  
> **Proyecto:** Kairo · RIWI · Clan Turing  
> **Entregable:** 1 de 3 — Modelo Relacional + Diccionario de Datos

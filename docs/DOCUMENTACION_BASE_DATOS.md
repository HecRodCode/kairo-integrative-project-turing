# DOCUMENTACIÓN DEL MODELO DE BASE DE DATOS
## Proyecto: Ruta Formativa Personalizada con IA

---

## 📋 TABLA DE CONTENIDO

1. [Descripción General](#descripción-general)
2. [Arquitectura del Modelo](#arquitectura-del-modelo)
3. [Entidades Principales](#entidades-principales)
4. [Relaciones entre Entidades](#relaciones-entre-entidades)
5. [Diccionario de Datos](#diccionario-de-datos)
6. [Índices y Optimizaciones](#índices-y-optimizaciones)
7. [Diagramas ER](#diagramas-er)
8. [Scripts de Creación](#scripts-de-creación)

---

## DESCRIPCIÓN GENERAL

### Contexto del Proyecto

Este modelo de base de datos soporta una aplicación web educativa que genera rutas formativas personalizadas mediante inteligencia artificial. El sistema permite:

- Diagnóstico de habilidades blandas de estudiantes (coders)
- Seguimiento del progreso académico en Moodle
- Generación automática de planes complementarios personalizados
- Seguimiento de actividades y reflexiones
- Retroalimentación de Team Leaders (TL)

### Tecnología

- **Motor de Base de Datos:** PostgreSQL 14+
- **Justificación:** Soporte nativo para JSONB, arrays, y consultas complejas necesarias para el sistema de IA

---

## ARQUITECTURA DEL MODELO

El modelo se organiza en **5 grupos funcionales:**

### 1. **Gestión de Usuarios**
- `users`
- `soft_skills_assessment`
- `activity_progress`

### 2. **Estructura de Contenidos**
- `modules`
- `weeks`
- `topics`

### 3. **Seguimiento Académico**
- `moodle_progress`
- `coder_struggling_topics`

### 4. **Planes Complementarios**
- `complementary_plans`
- `plan_activities`

### 5. **Feedback y Mentoría**
- `tl_feedback`

---

## ENTIDADES PRINCIPALES

### 1. USERS (Usuarios del Sistema)

**Propósito:** Almacenar información de autenticación y perfil básico de usuarios.

**Roles soportados:**
- `coder`: Estudiantes que reciben rutas formativas
- `tl`: Team Leaders que supervisan y dan feedback

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| email | VARCHAR(100) | Email único del usuario (UK) |
| password | VARCHAR(255) | Contraseña hasheada |
| role | VARCHAR(20) | Rol del usuario (coder/tl) |
| first_login | BOOLEAN | Indica si es el primer acceso |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

**Relaciones:**
- 1:N con `soft_skills_assessment`
- 1:N con `moodle_progress`
- 1:N con `complementary_plans`
- 1:N con `coder_struggling_topics`
- 1:N con `tl_feedback` (como coder y como tl)
- 1:N con `activity_progress`

---

### 2. SOFT_SKILLS_ASSESSMENT (Evaluación de Habilidades Blandas)

**Propósito:** Almacenar el diagnóstico inicial de habilidades blandas del coder.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| coder_id | INT | Referencia a users (FK) |
| autonomy | INT | Nivel de autonomía (1-5) |
| time_management | INT | Gestión del tiempo (1-5) |
| problem_solving | INT | Resolución de problemas (1-5) |
| communication | INT | Comunicación (1-5) |
| teamwork | INT | Trabajo en equipo (1-5) |
| learning_style | VARCHAR(50) | Estilo de aprendizaje |
| assessed_at | TIMESTAMP | Fecha de evaluación |

**Valores válidos para learning_style:**
- `visual`
- `auditory`
- `kinesthetic`

**Relaciones:**
- N:1 con `users` (coder)

---

### 3. MODULES (Módulos del Programa Formativo)

**Propósito:** Catálogo de módulos del programa educativo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| module_number | INT | Número del módulo (1, 2, 3...) |
| name | VARCHAR(100) | Nombre del módulo |
| description | TEXT | Descripción detallada |
| total_weeks | INT | Total de semanas del módulo |
| order_index | INT | Orden de presentación |

**Ejemplo de datos:**
```sql
-- Módulo 1: Fundamentos Python
-- Módulo 2: HTML y CSS
-- Módulo 3: JavaScript
-- Módulo 4: Bases de Datos
```

**Relaciones:**
- 1:N con `weeks`
- 1:N con `topics`
- 1:N con `moodle_progress`
- 1:N con `complementary_plans`
- 1:N con `coder_struggling_topics`

---

### 4. WEEKS (Semanas dentro de cada Módulo)

**Propósito:** Detallar el contenido de cada semana dentro de un módulo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| module_id | INT | Referencia a modules (FK) |
| week_number | INT | Número de semana (1, 2, 3...) |
| name | VARCHAR(100) | Nombre de la semana |
| description | TEXT | Descripción del contenido |
| user_story | TEXT | Historia de usuario a desarrollar |
| topics | JSONB | Temas cubiertos en formato JSON |

**Ejemplo de topics (JSONB):**
```json
{
  "main_topics": [
    "Relaciones uno a muchos",
    "Relaciones muchos a muchos",
    "Joins en SQL"
  ],
  "secondary_topics": [
    "Subconsultas",
    "Índices"
  ]
}
```

**Relaciones:**
- N:1 con `modules`

---

### 5. MOODLE_PROGRESS (Progreso en Moodle)

**Propósito:** Seguimiento del avance del coder en la plataforma Moodle.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| coder_id | INT | Referencia a users (FK) |
| module_id | INT | Referencia a modules (FK) |
| current_week | INT | Semana actual del coder |
| weeks_completed | JSONB | Detalle de semanas completadas |
| struggling_topics | TEXT[] | Array de temas con dificultad |
| average_score | DECIMAL(5,2) | Promedio general (0-100) |
| updated_at | TIMESTAMP | Última actualización |

**Ejemplo de weeks_completed (JSONB):**
```json
{
  "week_1": {
    "score": 75,
    "completed": true,
    "completion_date": "2026-02-10"
  },
  "week_2": {
    "score": 82,
    "completed": true,
    "completion_date": "2026-02-17"
  },
  "week_3": {
    "score": null,
    "completed": false,
    "completion_date": null
  }
}
```

**Relaciones:**
- N:1 con `users` (coder)
- N:1 con `modules`

---

### 6. TOPICS (Catálogo de Temas)

**Propósito:** Catálogo de temas específicos que pueden causar dificultad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| module_id | INT | Referencia a modules (FK) |
| name | VARCHAR(200) | Nombre del tema |
| description | TEXT | Descripción del tema |
| category | VARCHAR(100) | Categoría del tema |

**Ejemplos de categorías:**
- `SQL`
- `HTML/CSS`
- `JavaScript`
- `Python`
- `Git`

**Relaciones:**
- N:1 con `modules`
- N:M con `users` (a través de `coder_struggling_topics`)

---

### 7. CODER_STRUGGLING_TOPICS (Temas de Dificultad del Coder)

**Propósito:** Tabla intermedia que relaciona coders con temas donde tienen dificultad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| coder_id | INT | Referencia a users (FK) |
| topic_id | INT | Referencia a topics (FK) |
| module_id | INT | Referencia a modules (FK) |
| reported_at | TIMESTAMP | Fecha del reporte |

**Relaciones:**
- N:1 con `users` (coder)
- N:1 con `topics`
- N:1 con `modules`

---

### 8. COMPLEMENTARY_PLANS (Planes Complementarios)

**Propósito:** Planes de aprendizaje personalizados generados por IA.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| coder_id | INT | Referencia a users (FK) |
| module_id | INT | Referencia a modules (FK) |
| week_number | INT | Semana del plan |
| plan_content | TEXT | Contenido completo del plan (generado por IA) |
| soft_skills_snapshot | JSONB | Estado de habilidades al momento de generar |
| moodle_status_snapshot | JSONB | Estado de Moodle al momento de generar |
| generated_at | TIMESTAMP | Fecha de generación |
| is_active | BOOLEAN | Indica si es el plan activo actual |

**Ejemplo de soft_skills_snapshot (JSONB):**
```json
{
  "autonomy": 2,
  "time_management": 3,
  "problem_solving": 3,
  "communication": 4,
  "teamwork": 3,
  "learning_style": "kinesthetic"
}
```

**Ejemplo de moodle_status_snapshot (JSONB):**
```json
{
  "current_week": 2,
  "average_score": 75.5,
  "struggling_topics": [
    "Relaciones entre tablas",
    "Consultas SQL complejas"
  ]
}
```

**Relaciones:**
- N:1 con `users` (coder)
- N:1 con `modules`
- 1:N con `plan_activities`
- 1:N con `tl_feedback`

---

### 9. PLAN_ACTIVITIES (Actividades del Plan)

**Propósito:** Actividades diarias dentro de un plan complementario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| plan_id | INT | Referencia a complementary_plans (FK) |
| day_number | INT | Número de día (1-5) |
| title | VARCHAR(200) | Título de la actividad |
| description | TEXT | Descripción detallada |
| estimated_time_minutes | INT | Tiempo estimado en minutos |
| activity_type | VARCHAR(50) | Tipo de actividad |
| resources | JSONB | Recursos sugeridos |
| order_index | INT | Orden dentro del día |

**Valores válidos para activity_type:**
- `guided`: Actividad guiada paso a paso
- `semi_guided`: Actividad con orientación parcial
- `autonomous`: Actividad autónoma

**Ejemplo de resources (JSONB):**
```json
[
  {
    "type": "video",
    "url": "https://youtube.com/watch?v=...",
    "duration": "5min",
    "title": "Intro a Relaciones SQL"
  },
  {
    "type": "article",
    "url": "https://...",
    "title": "Documentación oficial"
  }
]
```

**Relaciones:**
- N:1 con `complementary_plans`
- 1:1 con `activity_progress`

---

### 10. ACTIVITY_PROGRESS (Progreso de Actividades)

**Propósito:** Seguimiento del progreso en cada actividad del plan.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| activity_id | INT | Referencia a plan_activities (FK) |
| coder_id | INT | Referencia a users (FK) |
| completed | BOOLEAN | Estado de completitud |
| reflection_text | TEXT | Reflexión escrita por el coder |
| evidence_url | VARCHAR(500) | URL de evidencia |
| evidence_type | VARCHAR(50) | Tipo de evidencia |
| completed_at | TIMESTAMP | Fecha de completitud |
| time_spent_minutes | INT | Tiempo real invertido |

**Valores válidos para evidence_type:**
- `text`: Texto escrito
- `link`: Enlace externo (GitHub, etc.)
- `file`: Archivo adjunto

**Relaciones:**
- N:1 con `plan_activities`
- N:1 con `users` (coder)

---

### 11. TL_FEEDBACK (Feedback de Team Leader)

**Propósito:** Retroalimentación de los Team Leaders a los coders.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Identificador único (PK) |
| coder_id | INT | Referencia a users (FK) - receptor |
| tl_id | INT | Referencia a users (FK) - autor |
| plan_id | INT | Referencia a complementary_plans (FK) |
| feedback_text | TEXT | Contenido del feedback |
| feedback_type | VARCHAR(50) | Tipo de feedback |
| created_at | TIMESTAMP | Fecha de creación |

**Valores válidos para feedback_type:**
- `weekly`: Feedback semanal general
- `activity`: Feedback sobre actividad específica
- `general`: Comentario general de mentoría

**Relaciones:**
- N:1 con `users` (coder - receptor)
- N:1 con `users` (tl - autor)
- N:1 con `complementary_plans`

---

## RELACIONES ENTRE ENTIDADES

### Relaciones 1:N (Uno a Muchos)

| Tabla Padre | Tabla Hija | Descripción |
|-------------|------------|-------------|
| users | soft_skills_assessment | Un usuario puede tener múltiples evaluaciones |
| users | moodle_progress | Un usuario tiene progreso en múltiples módulos |
| users | complementary_plans | Un usuario puede tener múltiples planes |
| users | coder_struggling_topics | Un usuario reporta múltiples temas de dificultad |
| users | activity_progress | Un usuario registra progreso en múltiples actividades |
| modules | weeks | Un módulo contiene múltiples semanas |
| modules | topics | Un módulo tiene múltiples temas |
| modules | moodle_progress | Un módulo es seguido por múltiples usuarios |
| modules | complementary_plans | Un módulo genera múltiples planes |
| complementary_plans | plan_activities | Un plan tiene múltiples actividades |
| complementary_plans | tl_feedback | Un plan recibe múltiples feedbacks |
| plan_activities | activity_progress | Una actividad puede ser realizada por múltiples usuarios |

### Relaciones N:M (Muchos a Muchos)

| Tabla 1 | Tabla Intermedia | Tabla 2 | Descripción |
|---------|------------------|---------|-------------|
| users (coders) | coder_struggling_topics | topics | Los coders pueden tener dificultad en múltiples temas, y un tema puede ser difícil para múltiples coders |

### Relaciones Especiales

**TL_FEEDBACK - Doble Relación con USERS:**
- `coder_id` → Usuario que RECIBE el feedback (role = 'coder')
- `tl_id` → Usuario que DA el feedback (role = 'tl')

---

## ÍNDICES Y OPTIMIZACIONES

### Índices Únicos (UK)

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Índices de Búsqueda

```sql
-- Búsquedas por coder
CREATE INDEX idx_soft_skills_coder ON soft_skills_assessment(coder_id);
CREATE INDEX idx_moodle_progress_coder ON moodle_progress(coder_id);
CREATE INDEX idx_complementary_plans_coder ON complementary_plans(coder_id);
CREATE INDEX idx_activity_progress_coder ON activity_progress(coder_id);
CREATE INDEX idx_tl_feedback_coder ON tl_feedback(coder_id);

-- Búsquedas por estado
CREATE INDEX idx_complementary_plans_active ON complementary_plans(is_active);
CREATE INDEX idx_activity_progress_completed ON activity_progress(completed);

-- Búsquedas por relaciones
CREATE INDEX idx_plan_activities_plan ON plan_activities(plan_id);
CREATE INDEX idx_activity_progress_activity ON activity_progress(activity_id);
CREATE INDEX idx_tl_feedback_tl ON tl_feedback(tl_id);

-- Búsquedas compuestas
CREATE INDEX idx_moodle_progress_coder_module ON moodle_progress(coder_id, module_id);
CREATE INDEX idx_complementary_plans_coder_active ON complementary_plans(coder_id, is_active);
```

### Índices JSONB

```sql
-- Para búsquedas dentro de campos JSONB
CREATE INDEX idx_moodle_weeks_completed ON moodle_progress USING GIN (weeks_completed);
CREATE INDEX idx_complementary_plans_skills ON complementary_plans USING GIN (soft_skills_snapshot);
CREATE INDEX idx_plan_activities_resources ON plan_activities USING GIN (resources);
```

---

## TRIGGERS Y FUNCIONES

### Trigger para Updated_at

```sql
-- Función genérica para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar a tablas relevantes
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moodle_progress_updated_at 
    BEFORE UPDATE ON moodle_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Trigger para Calcular Average Score

```sql
-- Función para calcular promedio automáticamente
CREATE OR REPLACE FUNCTION calculate_average_score()
RETURNS TRIGGER AS $$
DECLARE
    total_score NUMERIC := 0;
    week_count INTEGER := 0;
    week_data JSONB;
BEGIN
    -- Iterar sobre weeks_completed
    FOR week_data IN SELECT value FROM jsonb_each(NEW.weeks_completed)
    LOOP
        IF (week_data->>'completed')::BOOLEAN = TRUE THEN
            total_score := total_score + (week_data->>'score')::NUMERIC;
            week_count := week_count + 1;
        END IF;
    END LOOP;
    
    -- Calcular promedio
    IF week_count > 0 THEN
        NEW.average_score := total_score / week_count;
    ELSE
        NEW.average_score := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moodle_average_score
    BEFORE INSERT OR UPDATE ON moodle_progress
    FOR EACH ROW EXECUTE FUNCTION calculate_average_score();
```

### Trigger para Desactivar Planes Antiguos

```sql
-- Función para desactivar planes anteriores al crear uno nuevo
CREATE OR REPLACE FUNCTION deactivate_old_plans()
RETURNS TRIGGER AS $$
BEGIN
    -- Desactivar planes anteriores del mismo coder y módulo
    UPDATE complementary_plans 
    SET is_active = FALSE 
    WHERE coder_id = NEW.coder_id 
      AND module_id = NEW.module_id 
      AND id != NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_previous_plans
    AFTER INSERT ON complementary_plans
    FOR EACH ROW EXECUTE FUNCTION deactivate_old_plans();
```

---

## VISTAS RECOMENDADAS

### Vista: Coder Dashboard

```sql
CREATE VIEW v_coder_dashboard AS
SELECT 
    u.id AS coder_id,
    u.email,
    ssa.autonomy,
    ssa.time_management,
    ssa.learning_style,
    mp.module_id,
    m.name AS module_name,
    mp.current_week,
    mp.average_score,
    cp.id AS active_plan_id,
    cp.week_number AS plan_week,
    COUNT(DISTINCT pa.id) AS total_activities,
    COUNT(DISTINCT CASE WHEN ap.completed = TRUE THEN ap.id END) AS completed_activities,
    ROUND(
        (COUNT(DISTINCT CASE WHEN ap.completed = TRUE THEN ap.id END)::NUMERIC / 
         NULLIF(COUNT(DISTINCT pa.id), 0)) * 100, 2
    ) AS completion_percentage
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN modules m ON mp.module_id = m.id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, ssa.autonomy, ssa.time_management, ssa.learning_style,
         mp.module_id, m.name, mp.current_week, mp.average_score, cp.id, cp.week_number;
```

### Vista: TL Overview

```sql
CREATE VIEW v_tl_coders_overview AS
SELECT 
    u.id AS coder_id,
    u.email,
    ssa.autonomy,
    ssa.time_management,
    CASE 
        WHEN ssa.autonomy = (SELECT MIN(autonomy) FROM soft_skills_assessment WHERE coder_id = u.id)
        THEN 'autonomy'
        WHEN ssa.time_management = (SELECT MIN(time_management) FROM soft_skills_assessment WHERE coder_id = u.id)
        THEN 'time_management'
        ELSE 'other'
    END AS weakest_skill,
    mp.average_score,
    COUNT(DISTINCT ap.id) FILTER (WHERE ap.completed = TRUE) AS activities_completed,
    COUNT(DISTINCT ap.id) AS total_activities,
    MAX(ap.completed_at) AS last_activity_date
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, ssa.autonomy, ssa.time_management, mp.average_score;
```

### Vista: Coders en Riesgo

```sql
CREATE VIEW v_coder_risk_analysis AS
SELECT 
    u.id AS coder_id,
    u.email,
    ssa.autonomy,
    ssa.time_management,
    mp.average_score,
    CASE 
        WHEN ssa.autonomy <= 2 AND mp.average_score < 70 THEN 'HIGH_RISK'
        WHEN ssa.autonomy <= 2 OR mp.average_score < 70 THEN 'MEDIUM_RISK'
        ELSE 'LOW_RISK'
    END AS risk_level,
    COUNT(DISTINCT cst.id) AS struggling_topics_count
FROM users u
LEFT JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN coder_struggling_topics cst ON u.id = cst.coder_id
WHERE u.role = 'coder'
GROUP BY u.id, u.email, ssa.autonomy, ssa.time_management, mp.average_score
ORDER BY risk_level DESC, mp.average_score ASC;
```

---

## SCRIPTS DE CREACIÓN

### Script Completo de Creación de Tablas

Ver archivo: `create_tables.sql`

### Script de Datos de Prueba

Ver archivo: `seed_data.sql`

---

## NOTAS ADICIONALES

### Consideraciones de Seguridad

1. **Contraseñas:** Siempre hasheadas con bcrypt (cost factor 10+)
2. **Validación de Roles:** Validar rol en backend antes de operaciones
3. **Sanitización:** Escapar inputs antes de JSONB para evitar inyección

### Consideraciones de Rendimiento

1. **JSONB vs Tablas:** JSONB se usa para datos flexibles y no frecuentemente consultados
2. **Paginación:** Implementar LIMIT/OFFSET en queries grandes
3. **Caché:** Considerar Redis para vistas frecuentes como dashboards

### Escalabilidad Futura

Posibles extensiones del modelo:

- Tabla `notifications` para sistema de alertas
- Tabla `achievements` para gamificación
- Tabla `messages` para chat TL-Coder
- Tabla `resources` para biblioteca de materiales
- Particionamiento de `activity_progress` por fecha

---

## INFORMACIÓN DEL PROYECTO

**Versión del Modelo:** 1.0  
**Última Actualización:** Febrero 2026  
**Desarrollado por:** Equipo Riwi - Proyecto Integrador  
**Contacto:** [miguel.montoya@riwi.io](mailto:miguel.montoya@riwi.io)

---

## APÉNDICE: CONSULTAS ÚTILES

### Obtener Coder con Menor Autonomía

```sql
SELECT u.email, ssa.autonomy
FROM users u
JOIN soft_skills_assessment ssa ON u.id = ssa.coder_id
WHERE u.role = 'coder'
ORDER BY ssa.autonomy ASC
LIMIT 10;
```

### Obtener Plan Activo de un Coder

```sql
SELECT cp.*, m.name AS module_name
FROM complementary_plans cp
JOIN modules m ON cp.module_id = m.id
WHERE cp.coder_id = 1 AND cp.is_active = TRUE;
```

### Obtener Actividades Pendientes

```sql
SELECT pa.title, pa.day_number, pa.estimated_time_minutes
FROM plan_activities pa
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.coder_id = 1
WHERE ap.id IS NULL
ORDER BY pa.day_number, pa.order_index;
```

### Coders con Progreso Lento

```sql
SELECT u.email, mp.average_score, COUNT(ap.id) as activities_completed
FROM users u
JOIN moodle_progress mp ON u.id = mp.coder_id
LEFT JOIN complementary_plans cp ON u.id = cp.coder_id AND cp.is_active = TRUE
LEFT JOIN plan_activities pa ON cp.id = pa.plan_id
LEFT JOIN activity_progress ap ON pa.id = ap.activity_id AND ap.completed = TRUE
WHERE u.role = 'coder'
GROUP BY u.id, u.email, mp.average_score
HAVING COUNT(ap.id) < 3
ORDER BY mp.average_score ASC;
```

---

**FIN DE LA DOCUMENTACIÓN**

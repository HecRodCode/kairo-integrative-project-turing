# 🌱 Seeds - Datos de Prueba

Esta carpeta contiene scripts SQL para llenar la base de datos con datos de
ejemplo para testing y desarrollo.

## 📄 Archivos

| Archivo     | Descripción                                                 |
| ----------- | ----------------------------------------------------------- |
| `users.sql` | Usuarios, evaluaciones, módulos, temas y progreso académico |

## 🚀 Cómo usar

### Opción 1: En Supabase

1. Abre Supabase Dashboard → SQL Editor
2. Copia todo el contenido de `users.sql`
3. Ejecuta el script

### Opción 2: Desde terminal

```bash
psql -U tu_usuario -d tu_db -f seeds/users.sql
```

### Opción 3: Parcial (descomenta secciones)

Si ya tienes datos y solo quieres agregar más:

- Descomenta la sección que necesites
- Comenta el `TRUNCATE` al inicio si quieres preservar datos existentes

## 📊 Qué se crea

### 👥 8 Usuarios

- 2 Team Leaders (María y Carlos)
- 6 Coders distribuidos en 3 clanes:
  - **Clan Turing**: Juan, Ana
  - **Clan Tesla**: Pedro, Sofía
  - **Clan McCarthy**: Luis, María

### 📈 Evaluaciones de Habilidades

Cada coder tiene una evaluación inicial de:

- Autonomía (1-5)
- Gestión del tiempo (1-5)
- Problem solving (1-5)
- Comunicación (1-5)
- Trabajo en equipo (1-5)
- Estilo de aprendizaje (visual, auditory, kinesthetic, mixed)

### 📚 6 Módulos Completos

- Fundamentos de Python (4 semanas)
- HTML y CSS (4 semanas)
- JavaScript (4 semanas)
- Bases de Datos (4 semanas)
- Backend con Node.js (3 semanas)
- React (4 semanas)

### 🎯 Temas por Módulo

Cada módulo tiene 4 temas con categorías (Conceptos, Estructuras, Funciones,
Avanzado, etc.)

### 📊 Progreso Académico

- Coders en diferentes semanas
- Scores variados (58-95)
- Algunos completaron módulos, otros están en curso

### ⚠️ Temas con Dificultad

- Juan: problemas con variables y funciones
- Pedro: problemas con estructuras de datos
- Luis: problemas generales (en riesgo)

## 🎯 Casos de Prueba

| Usuario | Situación                | Propósito                  |
| ------- | ------------------------ | -------------------------- |
| Juan    | Baja autonomía (2)       | Detectar riesgo automático |
| Ana     | Balance (4-5)            | Caso normal                |
| Pedro   | Baja time management (2) | Alerta específica          |
| Sofía   | Excelente (5)            | Caso exitoso               |
| Luis    | Muy bajo (2)             | RIESGO ALTO                |

## 📋 Notas

- **Passwords**: Los datos usan plaintext para testing. En producción usa bcrypt
- **IDs**: Los usuarios tendrán IDs 1-8 en orden de inserción
- **Clan_id**: Nuevo campo para filtrar por clan
- **First_login**: Algunos true, otros false para testing de onboarding

## ✅ Verificar que funcionó

Descomenta la sección "VERIFICAR DATOS INSERTADOS" al final del archivo y
ejecuta las queries.

O en Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM users;           -- Debe ser 8
SELECT COUNT(*) FROM modules;         -- Debe ser 6
SELECT COUNT(*) FROM soft_skills_assessment;  -- Debe ser 6
```

## 🔄 Resetear Datos

Si necesitas empezar de nuevo:

```sql
-- OPCIÓN 1: Solo usuarios (borra en cascada)
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- OPCIÓN 2: Toda la BD
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

-- Luego ejecuta users.sql otra vez
```

## 📝 Agregar Más Datos

Para agregar más usuarios o módulos:

```sql
INSERT INTO users (email, password, full_name, role, clan_id) VALUES
  ('nuevo.coder@riwi.io', 'hash', 'Nuevo Coder', 'coder', 'Turing');

INSERT INTO modules (name, description, total_weeks) VALUES
  ('Angular', 'Angular framework avanzado', 3);
```

---

**Recuerda**: Los seeds son solo para development. En producción, los datos
vienen de formularios y la IA.

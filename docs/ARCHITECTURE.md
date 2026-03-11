# Kairo — Architecture Documentation
## Database Design & Integration Diagrams

---

## 1. ERD — Entity Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        varchar email
        varchar password
        varchar full_name
        role_enum role
        varchar clan_id
        boolean first_login
        timestamp created_at
    }

    soft_skills_assessment {
        int id PK
        int coder_id FK
        int autonomy
        int time_management
        int problem_solving
        int communication
        int teamwork
        learning_style_enum learning_style
        timestamp assessed_at
    }

    moodle_progress {
        int id PK
        int coder_id FK
        int module_id FK
        int current_week
        jsonb weeks_completed
        text[] struggling_topics
        decimal average_score
        timestamp updated_at
    }

    modules {
        int id PK
        varchar name
        text description
        int total_weeks
        timestamp created_at
    }

    topics {
        int id PK
        int module_id FK
        varchar name
        varchar category
    }

    coder_struggling_topics {
        int id PK
        int coder_id FK
        int topic_id FK
        timestamp reported_at
    }

    complementary_plans {
        int id PK
        int coder_id FK
        int module_id FK
        jsonb plan_content
        priority_level_enum priority_level
        jsonb soft_skills_snapshot
        jsonb moodle_status_snapshot
        boolean is_active
        timestamp generated_at
    }

    plan_activities {
        int id PK
        int plan_id FK
        int day_number
        varchar title
        text description
        int estimated_time_minutes
        activity_type_enum activity_type
        varchar skill_focus
    }

    activity_progress {
        int id PK
        int activity_id FK
        int coder_id FK
        boolean completed
        text reflection_text
        int time_spent_minutes
        timestamp completed_at
    }

    evidence_submissions {
        int id PK
        int activity_id FK
        int coder_id FK
        text file_url
        text link_url
        text description
        timestamp submitted_at
    }

    tl_feedback {
        int id PK
        int coder_id FK
        int tl_id FK
        int plan_id FK
        text feedback_text
        feedback_type_enum feedback_type
        boolean is_read
        timestamp created_at
    }

    risk_flags {
        int id PK
        int coder_id FK
        risk_level_enum risk_level
        text reason
        boolean auto_detected
        boolean resolved
        timestamp detected_at
    }

    ai_reports {
        int id PK
        report_target_enum target_type
        int target_id
        text summary_text
        risk_level_enum risk_level
        boolean viewed_by_tl
        timestamp generated_at
    }

    ai_generation_log {
        int id PK
        int coder_id FK
        ai_agent_enum agent_type
        jsonb input_payload
        jsonb output_payload
        boolean success
        timestamp generated_at
    }

    %% Relaciones 1:1
    users ||--o| soft_skills_assessment : "completa una vez"

    %% Relaciones 1:N
    users ||--o{ moodle_progress : "tiene progreso en"
    users ||--o{ complementary_plans : "recibe planes"
    users ||--o{ coder_struggling_topics : "reporta dificultad en"
    users ||--o{ activity_progress : "lleva progreso de"
    users ||--o{ evidence_submissions : "sube evidencia"
    users ||--o{ risk_flags : "puede tener alertas"
    users ||--o{ tl_feedback : "recibe feedback (coder)"
    users ||--o{ tl_feedback : "envía feedback (tl)"
    users ||--o{ ai_generation_log : "genera IA para"

    modules ||--o{ moodle_progress : "contiene progreso"
    modules ||--o{ complementary_plans : "origen de planes"
    modules ||--o{ topics : "contiene temas"

    topics ||--o{ coder_struggling_topics : "referenciado por"

    complementary_plans ||--o{ plan_activities : "tiene actividades (1:N)"
    complementary_plans ||--o{ tl_feedback : "puede recibir feedback"

    plan_activities ||--o{ activity_progress : "seguimiento por coder"
    plan_activities ||--o{ evidence_submissions : "acepta evidencias"
```

### Relaciones clave

| Relación | Tipo | Descripción |
|----------|------|-------------|
| `users` → `soft_skills_assessment` | **1:1** | Un coder tiene una sola evaluación |
| `complementary_plans` → `plan_activities` | **1:N** | Una card tiene múltiples actividades diarias |
| `users` → `complementary_plans` | **1:N** | Un coder puede tener hasta 6 plans activos |
| `users` (TL) → `tl_feedback` | **1:N** | Un TL envía múltiples feedbacks |
| `moodle_progress` → `complementary_plans` | Indirecto | El progreso bajo desencadena la generación de plans |

---

## 2. Data Flow Diagram — IA Integration

Muestra cómo el sistema detecta debilidades y genera planes personalizados.

```mermaid
flowchart TD
    MP[("📊 moodle_progress\n(average_score, struggling_topics)")]
    SSA[("🧠 soft_skills_assessment\n(autonomy, learning_style, ...)")]
    CST[("⚠️ coder_struggling_topics\n(topic_id)")]

    TRIGGER["🔍 Detección de Debilidad\n(score < 70 O autonomy ≤ 2)"]

    PYTHON["🐍 Backend Python\n(Groq API / IA)"]
    PROMPT["📝 Prompt Builder\n(combina weak topics +\nlearning style +\nmodule context)"]

    PLANS[("🎨 complementary_plans\n(priority_level: high/medium/low)")]
    ACTS[("📅 plan_activities\n(actividades por día)")]

    FRONTEND["🖥️ Frontend Dashboard\n(Coder ve sus 6 Cards)"]
    CARD_H["🔴 2 Cards HIGH\n(urgentes)"]
    CARD_M["🟡 2 Cards MEDIUM\n(importantes)"]
    CARD_L["🟢 2 Cards LOW\n(complementarias)"]

    LOG[("📋 ai_generation_log\n(auditoría de IA)")]

    MP --> TRIGGER
    SSA --> TRIGGER
    CST --> TRIGGER

    TRIGGER --> PYTHON
    PYTHON --> PROMPT
    PROMPT --> PYTHON

    PYTHON --> PLANS
    PYTHON --> LOG

    PLANS --> ACTS
    PLANS --> FRONTEND

    FRONTEND --> CARD_H
    FRONTEND --> CARD_M
    FRONTEND --> CARD_L
```

### Paso a paso

| Paso | Qué pasa | Tabla involucrada |
|------|----------|-------------------|
| **1** | Sistema detecta `average_score < 70` o `autonomy ≤ 2` | `moodle_progress`, `soft_skills_assessment` |
| **2** | Se identifican `struggling_topics` del coder | `coder_struggling_topics` |
| **3** | Python recibe contexto completo (módulo, estilo, temas débiles) | — |
| **4** | Groq genera plan personalizado con prioridades | — |
| **5** | Se guardan 6 plans con `priority_level` (2H/2M/2L) | `complementary_plans` |
| **6** | Cada plan genera actividades diarias | `plan_activities` |
| **7** | Frontend muestra las 6 Cards al coder | — |
| **8** | Toda la operación queda en auditoría | `ai_generation_log` |

---

## 3. User Flow — Navigation Map

### Flujo del Coder

```mermaid
flowchart TD
    LOGIN["🔐 Login\n(auth)"] --> FIRST{"¿first_login = true?"}

    FIRST -->|"Sí"| ONBOARD["📝 Onboarding\n(Quiz → 20 preguntas)"]
    FIRST -->|"No"| DASH_C["🏠 Dashboard Coder"]

    ONBOARD --> SAVE_SSA[("💾 Guardar\nsoft_skills_assessment")]
    SAVE_SSA --> DASH_C

    DASH_C --> CARDS["🎨 Ver 6 Cards\n(complementary_plans\nordenas por priority_level)"]
    DASH_C --> PROGRESS["📈 Mi Progreso\n(moodle_progress)"]
    DASH_C --> NOTIF["🔔 Notificaciones\n(tl_feedback donde is_read=false)"]
    DASH_C --> PROFILE["👤 Mi Perfil\n(soft_skills_assessment)"]

    CARDS --> CARD_DETAIL["📋 Detalle de Card\n(plan_activities por día)"]
    CARD_DETAIL --> COMPLETE["✅ Marcar actividad\n(activity_progress)"]
    CARD_DETAIL --> EVIDENCE["📤 Subir evidencia\n(evidence_submissions)"]

    NOTIF --> READ_NOTIF["📨 Leer mensaje\n(is_read = true)"]
```

### Flujo del Team Leader

```mermaid
flowchart TD
    LOGIN_TL["🔐 Login TL"] --> DASH_TL["📊 Dashboard Global\n(métricas de todos los coders)"]

    DASH_TL --> CLAN_FILTER["👥 Filtro por Clan\n(users WHERE clan_id = 'Turing'\nou 'Tesla' o 'McCarthy')"]

    CLAN_FILTER --> CODERS_LIST["📋 Lista de Coders del Clan\n(con scores y alertas)"]

    CODERS_LIST --> CODER_SELECT["🔍 Selección de Coder\n(ver perfil completo)"]

    CODER_SELECT --> VIEW_SSA["🧠 Ver Habilidades Blandas\n(soft_skills_assessment)"]
    CODER_SELECT --> VIEW_PROGRESS["📈 Ver Progreso Académico\n(moodle_progress)"]
    CODER_SELECT --> VIEW_PLANS["🎨 Ver sus 6 Cards\n(complementary_plans)"]
    CODER_SELECT --> SEND_FEEDBACK["💬 Enviar Feedback\n(INSERT tl_feedback)"]
    CODER_SELECT --> VIEW_RISK["⚠️ Ver Alertas\n(risk_flags)"]

    SEND_FEEDBACK --> NOTIF_CODER["🔔 Coder recibe notificación\n(is_read = false → 🔴)"]
    VIEW_RISK --> GEN_REPORT["📊 Generar Reporte\n(ai_reports)"]

    DASH_TL --> ANALYTICS["📉 Analytics Generales\n(v_coder_risk_analysis)"]
```

### Flujo de Notificaciones

```mermaid
sequenceDiagram
    participant TL as 👨‍💼 Team Leader
    participant DB as 🗄️ tl_feedback
    participant FE as 🖥️ Frontend Coder
    participant Coder as 👩‍💻 Coder

    TL->>DB: INSERT feedback (is_read = false)
    DB-->>FE: Evento en tiempo real (Supabase Realtime)
    FE->>FE: Mostrar punto rojo 🔴 en campana
    Coder->>FE: Click en campana
    FE->>DB: SELECT WHERE is_read = false
    DB-->>FE: Lista de mensajes
    FE-->>Coder: Muestra mensajes
    Coder->>FE: Lee mensaje
    FE->>DB: UPDATE is_read = true
    FE->>FE: Quita punto rojo ✅
```

---

## 4. Database Architecture Summary

```mermaid
graph TB
    subgraph USERS["👥 Gestión de Usuarios"]
        U[users]
        SSA[soft_skills_assessment]
        U -->|"1:1"| SSA
    end

    subgraph ACADEMIC["📚 Progreso Académico"]
        MOD[modules]
        TOP[topics]
        MP[moodle_progress]
        CST[coder_struggling_topics]
        MOD -->|"1:N"| TOP
        MOD -->|"1:N"| MP
        TOP -->|"N:M"| CST
    end

    subgraph PLANS["🎨 Planes Personalizados (6 Cards)"]
        CP[complementary_plans]
        PA[plan_activities]
        AP[activity_progress]
        EV[evidence_submissions]
        CP -->|"1:N"| PA
        PA -->|"1:N"| AP
        PA -->|"1:N"| EV
    end

    subgraph COMMS["💬 Comunicación"]
        TLF[tl_feedback]
        RF[risk_flags]
    end

    subgraph AI["🤖 IA & Reportes"]
        AIR[ai_reports]
        AIG[ai_generation_log]
    end

    U -->|"triggers"| ACADEMIC
    ACADEMIC -->|"informa a"| PLANS
    PLANS -->|"notifica via"| COMMS
    ACADEMIC -->|"detecta riesgo"| AI
    AI -->|"genera en"| PLANS
```

---

## ENUMs Reference

| ENUM | Valores |
|------|---------|
| `role_enum` | `coder`, `tl` |
| `learning_style_enum` | `visual`, `auditory`, `kinesthetic`, `mixed` |
| `activity_type_enum` | `guided`, `semi_guided`, `autonomous` |
| `feedback_type_enum` | `weekly`, `activity`, `general` |
| `risk_level_enum` | `low`, `medium`, `high` |
| `priority_level_enum` | `low`, `medium`, `high` |
| `report_target_enum` | `coder`, `clan`, `cohort` |
| `ai_agent_enum` | `learning_plan`, `report_generator`, `risk_detector` |

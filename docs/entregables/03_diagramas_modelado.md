# Deliverable 3 — Modeling Diagrams

## Database Technical Documentation — Kairo

### Integrative Project · RIWI · Clan Turing · March 2026

---

## Table of Contents

1. [Full Entity-Relationship Diagram](#1-full-entity-relationship-diagram)
2. [System Component Diagram](#2-system-component-diagram)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Tools Used](#4-tools-used)

---

## 1. Full Entity-Relationship Diagram

The following Mermaid ER diagram represents the complete production schema. Copy this code into [mermaid.live](https://mermaid.live) to render the full diagram.

### Block 1 — Identity & Academic

```mermaid
erDiagram
    users {
        int id PK
        varchar email UK
        varchar password
        varchar full_name
        role_enum role
        varchar clan FK
        boolean first_login
        boolean otp_verified
        int current_module_id FK
        varchar learning_style_cache
        boolean is_active
        int kairo_score
        timestamp created_at
    }
    clans {
        varchar id PK
        varchar name
    }
    user_profiles {
        int user_id PK_FK
        varchar phone
        varchar location
        text bio
        text github_url
        text linkedin_url
        jsonb skills
    }
    modules {
        int id PK
        varchar name
        int total_weeks
        boolean is_critical
        boolean has_performance_test
    }
    weeks {
        int id PK
        int module_id FK
        int week_number
        varchar name
        varchar difficulty_level
    }
    topics {
        int id PK
        int module_id FK
        varchar name
        varchar category
    }
    moodle_progress {
        int id PK
        int coder_id FK
        int module_id FK
        int current_week
        jsonb weeks_completed
        array struggling_topics
        numeric average_score
    }
    otp_verifications {
        int id PK
        varchar user_email FK
        varchar otp_code
        timestamp expires_at
        boolean is_used
    }

    users }o--|| clans : "belongs to"
    users ||--o| user_profiles : "has profile"
    users }o--|| modules : "studying"
    users ||--o{ otp_verifications : "verified by"
    modules ||--o{ weeks : "contains"
    modules ||--o{ topics : "covers"
    users ||--o{ moodle_progress : "tracks"
    modules ||--o{ moodle_progress : "measured in"
```

### Block 2 — AI Plans & Exercises

```mermaid
erDiagram
    complementary_plans {
        int id PK
        int coder_id FK
        int module_id FK
        jsonb plan_content
        jsonb soft_skills_snapshot
        jsonb moodle_status_snapshot
        varchar targeted_soft_skill
        boolean is_active
        jsonb completed_days
    }
    plan_activities {
        int id PK
        int plan_id FK
        int day_number
        varchar title
        activity_type_enum activity_type
        varchar skill_focus
    }
    activity_progress {
        int id PK
        int activity_id FK
        int coder_id FK
        boolean completed
        text reflection_text
        timestamp completed_at
    }
    exercises {
        int id PK
        int plan_id FK
        int coder_id FK
        int day_number
        varchar language
        text starter_code
        text solution
        jsonb hints
        varchar difficulty
    }
    exercise_submissions {
        int id PK
        int exercise_id FK
        int coder_id FK
        text code_submitted
        text tl_feedback_text
        timestamp reviewed_at
        int reviewed_by FK
    }
    evidence_submissions {
        int id PK
        int activity_id FK
        int coder_id FK
        text file_url
        text link_url
    }

    complementary_plans ||--o{ plan_activities : "breaks into"
    plan_activities ||--o{ activity_progress : "tracked by"
    plan_activities ||--o{ evidence_submissions : "evidenced by"
    complementary_plans ||--o{ exercises : "generates"
    exercises ||--o{ exercise_submissions : "solved in"
```

### Block 3 — Analytics & Feedback

```mermaid
erDiagram
    soft_skills_assessment {
        int id PK
        int coder_id FK_UK
        smallint autonomy
        smallint time_management
        smallint problem_solving
        smallint communication
        smallint teamwork
        learning_style_enum learning_style
        jsonb raw_answers
    }
    score_events {
        int id PK
        int coder_id FK
        varchar event_type
        int points
        int reference_id
        timestamp created_at
    }
    risk_flags {
        int id PK
        int coder_id FK
        risk_level_enum risk_level
        text reason
        boolean auto_detected
        boolean resolved
    }
    tl_feedback {
        int id PK
        int coder_id FK
        int tl_id FK
        int plan_id FK
        text feedback_text
        feedback_type_enum feedback_type
        boolean is_read
    }
    notifications {
        int id PK
        int user_id FK
        varchar title
        text message
        varchar type
        boolean is_read
    }
    resources {
        int id PK
        int module_id FK
        varchar title
        text storage_path
        text preview_text
        int uploaded_by FK
        varchar clan_id FK
        boolean is_active
    }
    performance_tests {
        int id PK
        int coder_id FK
        int module_id FK
        numeric score
        performance_status status
    }
    ai_generation_log {
        int id PK
        int coder_id FK
        ai_agent_enum agent_type
        jsonb input_payload
        jsonb output_payload
        varchar model_name
        int execution_time_ms
        boolean success
    }
```

---

## 2. System Component Diagram

This diagram shows the complete data flow between all system layers.

```mermaid
graph TB
    subgraph FE["🌐 Frontend — kairoriwi.com"]
        direction TB
        AUTH_UI[auth/login.html\nauth/register.html]
        ONB_UI[onboarding UI\nsoft skills quiz]
        CODER_UI[coder/dashboard.html\ncoder/IAtrainer.html]
        TL_UI[tl/dashboard.html\nTL analytics + submissions]
        NOTIF[notificationsSSE.js\nreal-time bell + toast]
    end

    subgraph NODE["⚙️ Node.js API — Railway :3000"]
        direction TB
        AUTH_C[authControllers\nOTP · OAuth · sessions]
        CODER_C[coderControllers\ndashboard · plan · completeDay]
        TL_C[tlControllers\nclan · submissions · ranking]
        EX_C[exerciseControllers\ngenerate · submit]
        RES_C[resourceControllers\nupload · search RAG]
        NOTIF_C[notificationControllers\nSSE stream · CRUD]
        SCORE_SVC[scoringService\nawardPoints · risk flags]
        NOTIF_SVC[notificationService\nSSE client manager]
        PY_SVC[pythonApiService\ncallPythonApi]
    end

    subgraph PY["🧠 Python AI — Railway :8000"]
        direction TB
        ROADMAP[POST /generate-plan\nrouters/roadmap.py]
        EXERCISES[POST /generate-exercise\nrouters/exercises.py]
        CARDS[POST /generate-focus-cards\nrouters/cards.py]
        CHAT[POST /chat/ask\nrouters/chat.py]
        RAG[POST /search-resources\nrouters/resources_search.py]
        GROQ[Groq SDK\nllama-3.3-70b-versatile]
        SUPA_PY[supabase_service.py\nSERVICE_ROLE key]
        PROMPT[prompt_builder.py\ninterpretive + analytical]
    end

    subgraph DB["🗄️ PostgreSQL — Supabase"]
        direction LR
        USERS[(users\nclans)]
        PLANS[(complementary_plans\nplan_activities)]
        PROGRESS[(activity_progress\nexercises\nexercise_submissions)]
        SCORES[(score_events\nrisk_flags)]
        RESOURCES[(resources\nnotifications)]
        SOFT[(soft_skills_assessment\nmoodle_progress)]
    end

    subgraph STORAGE["📦 Supabase Storage"]
        BUCKET[activity-resources bucket\nTL PDF files]
    end

    AUTH_UI -->|POST /api/auth/*| AUTH_C
    ONB_UI -->|POST /api/diagnostics| CODER_C
    CODER_UI -->|GET /api/coder/dashboard| CODER_C
    CODER_UI -->|POST /api/coder/exercise/generate| EX_C
    TL_UI -->|GET /api/tl/dashboard| TL_C
    TL_UI -->|POST /api/tl/submissions/:id/review| TL_C
    NOTIF -->|GET /api/notifications/stream SSE| NOTIF_C

    CODER_C -->|SELECT/UPDATE| PLANS
    CODER_C -->|INSERT| PROGRESS
    TL_C -->|SELECT clan data| USERS
    TL_C --> SCORE_SVC
    EX_C --> PY_SVC
    RES_C --> STORAGE
    SCORE_SVC -->|INSERT score_events| SCORES
    SCORE_SVC -->|UPDATE kairo_score| USERS
    NOTIF_SVC -->|INSERT + SSE push| RESOURCES

    PY_SVC -->|POST /generate-plan| ROADMAP
    PY_SVC -->|POST /generate-exercise| EXERCISES
    ROADMAP --> PROMPT
    PROMPT --> GROQ
    GROQ -->|JSON plan| SUPA_PY
    SUPA_PY -->|INSERT complementary_plans| PLANS
    SUPA_PY -->|INSERT plan_activities| PLANS
    SUPA_PY -->|SELECT| SOFT
    RAG -->|ILIKE search| RESOURCES
```

---

## 3. Data Flow Diagrams

### 3.1 Complete Onboarding → First Plan Flow

```mermaid
sequenceDiagram
    participant C as Coder
    participant FE as Frontend
    participant NODE as Node.js
    participant PY as Python AI
    participant DB as PostgreSQL

    C->>FE: Fill registration form
    FE->>NODE: POST /auth/register
    NODE->>DB: INSERT users (first_login=true, kairo_score=50)
    NODE-->>C: Send OTP email via Resend

    C->>FE: Enter OTP code
    FE->>NODE: POST /auth/verify-otp
    NODE->>DB: UPDATE otp_verifications (is_used=true)
    NODE-->>C: Redirect to /onboarding

    C->>FE: Answer 30 diagnostic questions
    FE->>NODE: POST /diagnostics
    NODE->>NODE: Calculate VARK + ILS tallies → soft skill scores 1-5
    NODE->>DB: UPSERT soft_skills_assessment
    NODE->>DB: UPDATE users SET first_login=false
    NODE-->>C: 201 OK — redirect to dashboard

    NODE->>+PY: POST /generate-plan (fire-and-forget)
    PY->>DB: SELECT soft_skills_assessment
    PY->>DB: SELECT modules WHERE id = current_module_id
    PY->>DB: SELECT weeks WHERE module_id = ...
    PY->>DB: SELECT topics WHERE module_id = ...
    PY->>DB: UPDATE complementary_plans SET is_active=false (previous plans)
    PY->>DB: INSERT complementary_plans (plan_content JSONB, snapshots)
    PY->>DB: INSERT plan_activities (up to 40 rows parsed from JSONB)
    PY->>DB: INSERT ai_generation_log
    PY-->>-NODE: 200 OK

    C->>FE: Open AI Trainer (polling)
    FE->>NODE: GET /coder/plan (every 4s)
    NODE->>DB: SELECT complementary_plans WHERE is_active=true
    NODE-->>FE: Plan data → render 20-day view
```

### 3.2 Kairo Score System Flow

```mermaid
flowchart LR
    subgraph ACTIONS["Coder Actions"]
        A1[Complete plan day]
        A2[Submit code exercise]
        A3[Complete all 20 days]
        A4[3+ days no activity]
    end

    subgraph TL_ACTIONS["TL Actions"]
        B1[Review submission]
    end

    subgraph SCORING["scoringService.js"]
        C1["awardPoints(coderId, 'day_complete')\n+5 pts"]
        C2["awardPoints(coderId, 'exercise_submit')\n+8 pts"]
        C3["awardPoints(coderId, 'plan_complete')\n+50 pts BONUS"]
        C4["awardPoints(coderId, 'inactivity')\n-3 pts/day"]
        C5["awardPoints(coderId, 'tl_approved')\n+15 pts"]
    end

    subgraph DB_OPS["Database Operations"]
        D1["INSERT score_events\n(append-only audit log)"]
        D2["UPDATE users\nSET kairo_score = GREATEST(0, score + points)"]
        D3{score < 20?}
        D4["INSERT risk_flags\nauto_detected = true"]
    end

    A1 --> C1
    A2 --> C2
    A3 --> C3
    A4 --> C4
    B1 --> C5

    C1 & C2 & C3 & C4 & C5 --> D1
    D1 --> D2
    D2 --> D3
    D3 -->|YES| D4
    D3 -->|NO| END([Done])
```

### 3.3 TL Dashboard Data Flow

```mermaid
flowchart TD
    TL[TL opens dashboard] --> DASH[GET /api/tl/dashboard]

    DASH --> Q1["SELECT users + moodle_progress\n+ soft_skills_assessment\n+ risk_flags\nWHERE clan = TL clan"]

    Q1 --> OVERVIEW["Calculate overview:\n- totalCoders\n- completedOnboarding\n- highRiskCoders\n- clanAvgScore from kairo_score"]

    OVERVIEW --> RENDER[Render clan table\nwith skill bars + status]

    DASH --> Q2[GET /api/tl/submissions]
    Q2 --> Q2SQL["SELECT exercise_submissions\nJOIN exercises\nJOIN users\nWHERE user.clan = TL clan\nORDER BY submitted_at DESC"]

    Q2SQL --> SUBLIST[Render submission list\none row per submission\nwith Revisar código button]

    DASH --> Q3[GET /api/tl/ranking]
    Q3 --> Q3SQL["Clan ranking:\nRANK() OVER (ORDER BY kairo_score DESC)\nWHERE clan = $1\n\nGlobal top 10:\nRANK() OVER (ORDER BY kairo_score DESC)\nLIMIT 10"]

    Q3SQL --> RANKING[Render dual ranking\nClan + Global]
```

### 3.4 SSE Notification System

```mermaid
sequenceDiagram
    participant C as Coder Browser
    participant NODE as Node.js SSE
    participant MAP as clients Map
    participant TL as TL Action

    C->>NODE: GET /api/notifications/stream
    NODE->>MAP: addClient(userId, res)
    NODE-->>C: data: {"type":"CONNECTED"}\n\n
    loop Every 25 seconds
        NODE-->>C: : ping\n\n (heartbeat)
    end

    TL->>NODE: POST /tl/submissions/:id/review
    NODE->>NODE: reviewSubmission() → awardPoints() → notifyUser()
    NODE->>DB: INSERT notifications
    NODE->>MAP: sendToUser(coder_id, payload)
    NODE-->>C: data: {"type":"NEW_NOTIFICATION", "data": {...}}\n\n

    C->>C: notificationsSSE.js receives event
    C->>C: updateBell(+1) → showVisualToast()
    C->>C: window.dispatchEvent('kairo-notification')
    C->>C: Dashboard reloads relevant data

    C->>NODE: Tab closed / navigate away
    C->>NODE: Connection closes
    NODE->>MAP: removeClient(userId, res)
    NODE->>MAP: clearInterval(heartbeat)
```

---

## 4. Tools Used

| Diagram           | Tool         | URL                                          | Export Format |
| ----------------- | ------------ | -------------------------------------------- | ------------- |
| ER Diagrams       | Mermaid      | [mermaid.live](https://mermaid.live)         | SVG / PNG     |
| Component Diagram | Mermaid      | [mermaid.live](https://mermaid.live)         | SVG / PNG     |
| Sequence Diagrams | Mermaid      | [mermaid.live](https://mermaid.live)         | SVG / PNG     |
| Alternative ER    | dbdiagram.io | [dbdiagram.io](https://dbdiagram.io)         | PNG / PDF     |
| Architecture      | Draw.io      | [app.diagrams.net](https://app.diagrams.net) | SVG / PNG     |

### How to regenerate diagrams

**Using mermaid.live:**

1. Go to [mermaid.live](https://mermaid.live)
2. Paste any of the Mermaid code blocks from this document
3. Click "Download PNG" or "Download SVG"

**Using dbdiagram.io for ER:**

1. Go to [dbdiagram.io](https://dbdiagram.io)
2. Import the DDL from the live Supabase schema export
3. Relationships are inferred from FOREIGN KEY constraints
4. Export as PDF or PNG

**Using Draw.io for architecture:**

1. Go to [app.diagrams.net](https://app.diagrams.net)
2. Extras → Edit Diagram → paste Mermaid code
3. Export as SVG with transparent background

---

> **Document version:** 2.0 — Updated March 2026  
> **Author:** Miguel Calle — Database Architect  
> **Project:** Kairo · Riwi Bootcamp · Clan Turing  
> **Deliverable:** 3 of 3 — Modeling Diagrams

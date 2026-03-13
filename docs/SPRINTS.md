# Sprint Planning — Azure DevOps

## Kairo — Plataforma de Aprendizaje Personalizado

**Metodología:** Scrum  
**Duración de Sprint:** 2 semanas  
**Equipo:** Clan Turing

---

## Épicas del Proyecto

| ID  | Épica           | Descripción                                        |
| --- | --------------- | -------------------------------------------------- |
| E1  | Core Platform   | Autenticación, roles, onboarding, CRUD de usuarios |
| E2  | Learning System | 6 Cards, planes de IA, actividades y progreso      |
| E3  | TL Dashboard    | Dashboard global, filtro por clan, reportes        |
| E4  | Notifications   | Feedback del TL, campana de notificaciones         |
| E5  | AI Integration  | Integración con Python/Groq, generación de planes  |

---

## Sprint 1 — Base

**Objetivo:** Sistema funcional con autenticación, roles y onboarding completo  
**Duración:** Semanas 1–2  
**Épicas:** E1

```
Sprint 1 Board
├── DOING
├── TO DO
│   ├── [US-F01] Setup inicial del proyecto (Supabase + Node.js + Python)
│   ├── [US-F02] Crear tabla users con role_enum y clan_id
│   ├── [US-F03] Implementar registro e inicio de sesión (JWT)
│   ├── [US-F04] Middleware de autenticación por rol (coder / TL)
│   ├── [US-F05] Onboarding: ruta condicional si first_login = true
│   ├── [US-02]  Quiz de 20 preguntas → guardar en soft_skills_assessment
│   ├── [US-F06] Determinar learning_style según respuestas del quiz
│   ├── [US-F07] CRUD de users (perfil, edición de datos)
│   └── [US-F08] Políticas RLS: coders solo ven sus datos, TL ve todos
└── DONE
```

**Criterios de salida del Sprint 1:**

- [ ] Un coder puede registrarse e iniciar sesión
- [ ] Al primer login, se muestra el quiz de onboarding
- [ ] Al completar el quiz, se guarda `soft_skills_assessment`
- [ ] `first_login` cambia a `false` después del quiz
- [ ] Un TL puede loguearse y ver el listado de coders
- [ ] RLS habilitado: coders no pueden ver datos de otros coders
- [ ] Tests de autenticación pasando

---

## Sprint 2 — Core

**Objetivo:** Las 6 Cards funcionando y Dashboard del TL activo  
**Duración:** Semanas 3–4  
**Épicas:** E2, E3, E5

```
Sprint 2 Board
├── DOING
├── TO DO
│   ├── [US-F09]  Módulos y temas en BD (seed data)
│   ├── [US-F10]  Endpoint para registrar moodle_progress del coder
│   ├── [US-F11]  Endpoint de detección de riesgo (score < 70, autonomy ≤ 2)
│   ├── [US-F12]  Integración Python: recibir contexto del coder
│   ├── [US-F13]  Prompt builder: generar plan según weak_topics + learning_style
│   ├── [US-F14]  Guardar planes en complementary_plans con priority_level
│   ├── [US-F15]  Guardar actividades en plan_activities
│   ├── [US-01]   Frontend: Dashboard Coder muestra las 6 Cards ordenadas
│   ├── [US-03]   Frontend: marcar actividad como completada
│   ├── [US-05]   Frontend: Dashboard TL con filtro por clan_id
│   ├── [US-F16]  Vista v_coder_dashboard en BD (resumen de progreso)
│   └── [US-F17]  Vista v_coder_risk_analysis (tabla de riesgo)
└── DONE
```

**Criterios de salida del Sprint 2:**

- [ ] Python genera un plan real usando Groq API
- [ ] Plan se guarda con `priority_level` (2H + 2M + 2L)
- [ ] Coder ve sus 6 Cards ordenadas en el Dashboard
- [ ] Cada Card muestra sus actividades por día
- [ ] TL puede filtrar coders por `clan_id`
- [ ] TL ve `average_score` de cada coder
- [ ] `v_coder_risk_analysis` muestra coders en riesgo
- [ ] Tests de endpoints de planes pasando

---

## Sprint 3 — Polish

**Objetivo:** Notificaciones, evidencias, reportes PDF y despliegue  
**Duración:** Semanas 5–6  
**Épicas:** E4, E5 (reportes)

```
Sprint 3 Board
├── DOING
├── TO DO
│   ├── [US-06]   TL puede enviar feedback a coder / clan entero
│   ├── [US-F18]  Frontend: campana de notificaciones (is_read = false → 🔴)
│   ├── [US-F19]  Marcar notification como leída (UPDATE is_read = true)
│   ├── [US-04]   Subir evidencia: file_url o link_url en evidence_submissions
│   ├── [US-07]   IA genera risk_flags automáticamente (risk_detector agent)
│   ├── [US-F20]  Generar ai_reports en PDF para el TL
│   ├── [US-F21]  Analytics: Chart de progreso del clan (Python chart_generator)
│   ├── [US-F22]  Deploy: Supabase (BD), Render/Railway (Node + Python)
│   ├── [US-F23]  Variables de entorno y secrets para producción
│   └── [US-F24]  Tests E2E críticos: registro → quiz → cards → notificación
└── DONE
```

**Criterios de salida del Sprint 3:**

- [ ] TL puede enviar mensaje a un coder o a todo su clan
- [ ] Coder ve punto rojo en campana cuando hay mensajes nuevos
- [ ] Al leer el mensaje, desaparece el punto rojo
- [ ] Coder puede subir evidencias
- [ ] Sistema detecta y registra riesgos automáticamente
- [ ] TL puede generar/ver reportes
- [ ] App desplegada en producción
- [ ] URL pública funcionando

---

## Backlog Completo

| ID          | Historia                        | Épica | Story Points | Sprint | Estado   |
| ----------- | ------------------------------- | ----- | :----------: | :----: | -------- |
| US-F01      | Setup inicial del proyecto      | E1    |      3       |   1    | ⬜ To Do |
| US-F02      | Tabla users + clan_id + RLS     | E1    |      2       |   1    | ⬜ To Do |
| US-F03      | Registro e inicio de sesión     | E1    |      5       |   1    | ⬜ To Do |
| US-F04      | Middleware de autenticación     | E1    |      3       |   1    | ⬜ To Do |
| US-F05      | Ruta de onboarding condicional  | E1    |      2       |   1    | ⬜ To Do |
| **_US-02_** | Quiz 20 preguntas → soft_skills | E1    |      8       |   1    | ⬜ To Do |
| US-F06      | Calcular learning_style         | E1    |      3       |   1    | ⬜ To Do |
| US-F07      | CRUD perfil de usuario          | E1    |      3       |   1    | ⬜ To Do |
| US-F08      | Políticas RLS completas         | E1    |      3       |   1    | ⬜ To Do |
| US-F09      | Módulos y temas en BD           | E2    |      2       |   2    | ⬜ To Do |
| US-F10      | Registrar moodle_progress       | E2    |      3       |   2    | ⬜ To Do |
| US-F11      | Detección automática de riesgo  | E3    |      5       |   2    | ⬜ To Do |
| US-F12      | Integración Python context      | E5    |      5       |   2    | ⬜ To Do |
| US-F13      | Prompt builder para IA          | E5    |      8       |   2    | ⬜ To Do |
| US-F14      | Guardar complementary_plans     | E2    |      5       |   2    | ⬜ To Do |
| US-F15      | Guardar plan_activities         | E2    |      3       |   2    | ⬜ To Do |
| **_US-01_** | Frontend: 6 Cards Dashboard     | E2    |      8       |   2    | ⬜ To Do |
| **_US-03_** | Marcar actividad completada     | E2    |      5       |   2    | ⬜ To Do |
| **_US-05_** | TL Dashboard + filtro clan      | E3    |      8       |   2    | ⬜ To Do |
| US-F16      | Vista v_coder_dashboard         | E3    |      2       |   2    | ⬜ To Do |
| US-F17      | Vista v_coder_risk_analysis     | E3    |      2       |   2    | ⬜ To Do |
| **_US-06_** | TL feedback a coder/clan        | E4    |      5       |   3    | ⬜ To Do |
| US-F18      | Frontend campana notificaciones | E4    |      5       |   3    | ⬜ To Do |
| US-F19      | Marcar notificación como leída  | E4    |      2       |   3    | ⬜ To Do |
| **_US-04_** | Subir evidencia (file/link)     | E2    |      3       |   3    | ⬜ To Do |
| **_US-07_** | IA genera risk_flags            | E5    |      5       |   3    | ⬜ To Do |
| US-F20      | Generar ai_reports PDF          | E5    |      8       |   3    | ⬜ To Do |
| US-F21      | Analytics chart del clan        | E3    |      5       |   3    | ⬜ To Do |
| US-F22      | Despliegue en producción        | E1    |      5       |   3    | ⬜ To Do |
| US-F23      | Variables de entorno            | E1    |      2       |   3    | ⬜ To Do |
| US-F24      | Tests E2E críticos              | E1    |      5       |   3    | ⬜ To Do |

**Total Story Points:** ~138 puntos  
**Promedio por Sprint:** ~46 puntos

---

## Definition of Done

Un item del backlog está **Done** cuando:

1. ✅ Código en rama `develop` (no en `main` hasta final del Sprint)
2. ✅ Funcionalidad probada manualmente
3. ✅ Sin errores en consola
4. ✅ SQL migration ejecutada si aplica
5. ✅ Código revisado por otro miembro del equipo (PR aprobado)
6. ✅ Variables sensibles en `.env` (no en el código)

---

## Team & Roles

| Rol                    | Responsabilidad                           |
| ---------------------- | ----------------------------------------- |
| **Frontend Dev**       | HTML/CSS/JS, Vistas del Coder y TL        |
| **Backend Node Dev**   | API REST, auth, controladores, BD         |
| **Backend Python Dev** | Integración Groq, IA, análisis y reportes |
| **Fullstack / DB**     | Supabase, RLS, migraciones, seeds         |

---

## Azure DevOps Quick Setup

### Crear Épicas

```
1. Ir a Azure DevOps → Boards → Backlogs
2. Crear Work Items tipo "Epic":
   - E1: Core Platform
   - E2: Learning System
   - E3: TL Dashboard
   - E4: Notifications
   - E5: AI Integration
```

### Crear Sprints

```
1. Ir a Project Settings → Boards → Team → Iterations
2. Crear:
   - Sprint 1: Sem 1-2 (Base)
   - Sprint 2: Sem 3-4 (Core)
   - Sprint 3: Sem 5-6 (Polish)
```

### Crear User Stories

```
1. En cada Épica, crear Work Items tipo "User Story"
2. Asignar Story Points, Sprint y responsable
3. Tags sugeridos: "backend", "frontend", "database", "ai", "test"
```

### Tablero Kanban por Sprint

```
Columnas recomendadas:
| Backlog | To Do | In Progress | In Review | Done |
```

---

## Prioridad para el MVP

Si el tiempo es corto, el orden mínimo para tener algo funcional:

```
1. Sprint 1 completo (auth + onboarding) ← SIN ESTO NADA FUNCIONA
2. US-F10 + US-F12 + US-F13 + US-F14 (pipeline de IA básico)
3. US-01 (ver las 6 cards en frontend)
4. US-05 (TL puede ver sus coders)
5. US-06 + US-F18 (notificaciones básicas)
```

---

## Notas para el Equipo

- Las migraciones de BD están en `database/migrations/`
- Los datos de prueba están en `database/seeds/users.sql`
- La arquitectura completa está en `docs/ARCHITECTURE.md`
- Las user stories detalladas están en `docs/USER_STORIES.md`
- Siempre crear rama feature desde `develop`, no desde `main`
- Nombres de rama: `feature/us-01-six-cards`, `fix/is-read-update`, etc.

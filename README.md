# 🧠 Kairo — AI-Powered Learning Platform for Riwi Bootcamp

> Kairo is an intelligent educational ecosystem that transforms academic data and soft skills assessments into dynamic, personalized 4-week learning paths. Built for Riwi's intensive 11-month bootcamp, it ensures no Coder is left behind.

---

## 🌐 Live Demo

| Service       | URL                                                                     |
| ------------- | ----------------------------------------------------------------------- |
| Frontend      | https://kairoriwi.com                                                   |
| Node.js API   | https://kairo-integrative-project-turing-production.up.railway.app      |
| Python AI API | https://kairo-integrative-project-turing-production-b3f6.up.railway.app |

---

## 🎯 Project Vision

Riwi's bootcamp moves at a fast pace. Kairo bridges the gap between the program's intensity and each student's individual learning pace by:

- Analyzing **Moodle academic data** and **soft skills assessments** to generate personalized plans
- Giving **Team Leaders (TL)** a real-time analytics dashboard to detect at-risk students before academic failure
- Providing **Coders** with a 20-day AI-generated study plan with daily exercises and TL feedback
- Running a **Kairo Score** system that gamifies engagement and tracks activity on the platform

---

## 📂 Repository Structure

```
kairo-integrative-project-turing/
├── backend-node/          # Express.js API Gateway — auth, business logic, SSE
├── backend-python/        # FastAPI AI Microservice — LLM inference, plan generation
├── frontend/              # Vanilla JS MPA — Coder & TL interfaces
├── database/              # SQL schemas, migrations, seed scripts
└── docs/                  # Architecture diagrams and technical documentation
```

---

## 🛠 Tech Stack

### Frontend

- **HTML5 / CSS3 / Vanilla JavaScript** (ES Modules, no frameworks)
- **Font Awesome 6** — icons
- **Monaco Editor** — in-browser code editor for exercises
- **jsPDF** — client-side PDF report generation

### Backend — Node.js

- **Express.js** — API Gateway, routing, middleware
- **Passport.js** — OAuth (Google, GitHub) + local session auth
- **pg (node-postgres)** — PostgreSQL connection pool
- **Resend** — transactional email (OTP verification)
- **Supabase Storage** — PDF resource file storage
- **express-session + connect-pg-simple** — persistent sessions
- **Server-Sent Events (SSE)** — real-time notifications

### Backend — Python

- **FastAPI** — AI microservice framework
- **Groq SDK** — LLM inference (llama-3.3-70b-versatile)
- **Supabase Python client** — database access bypassing RLS
- **sentence-transformers** — semantic embeddings (optional, falls back gracefully)
- **pdfplumber** — PDF text extraction for RAG
- **uvicorn** — ASGI server

### Database

- **PostgreSQL via Supabase** — primary data store
- **Custom ENUMs** — `role_enum`, `risk_level_enum`, `ai_agent_enum`, `performance_status`

### Infrastructure

- **Railway** — cloud deployment (separate services for Node + Python)
- **Supabase** — PostgreSQL + Storage + Auth bypass via service key

---

## 👥 Team

| Name             | Role                                     |
| ---------------- | ---------------------------------------- |
| Héctor Rios      | Backend Lead & Documentation             |
| Miguel Calle     | Database Architect                       |
| Duvan Piedrahita | Frontend Engineer — Coder Experience     |
| Cesar Rios       | Frontend Engineer — TL Analytics & UX/UI |
| Camilo Guenge    | QA Engineer & AI Specialist              |

---

## 🚀 Quick Start

See individual READMEs for detailed setup:

- [`backend-node/README.md`](./backend-node/README.md)
- [`backend-python/README.md`](./backend-python/README.md)
- [`frontend/README.md`](./frontend/README.md)

### TL;DR — Local Development

```bash
# Terminal 1 — Node.js API
cd backend-node && npm install && npm run dev

# Terminal 2 — Python AI
cd backend-python && python3 -m venv env && source env/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — Frontend
# Open frontend/src/views/auth/login.html with VS Code Live Server on port 5500
```

---

## 🏗 Architecture Overview

```
Browser (Vanilla JS)
       │
       │ HTTPS
       ▼
 Node.js API (Express)          ◄──── Supabase PostgreSQL
       │                              Supabase Storage
       │ HTTP (internal Railway)
       ▼
 Python AI (FastAPI)            ◄──── Groq LLM API
       │                              Supabase (service key)
       ▼
  plan_content (JSONB)
  exercises (cached)
  score_events
```

### Key Data Flow

1. **Onboarding**: Coder registers → OTP email → soft skills diagnostic → plan auto-generated
2. **AI Plan**: Node calls Python `/generate-plan` → Groq LLM → 20-day JSONB plan saved in `complementary_plans`
3. **Daily Loop**: Coder opens AI Trainer → renders day from plan → completes activities → `+5 pts Kairo Score`
4. **Exercise Flow**: Coder clicks "Ejercicio del día" → Python generates/returns cached exercise → Monaco editor → submit → TL reviews → `+15 pts`
5. **TL Dashboard**: Real-time clan overview → soft skills averages → risk flags → submission review → Kairo Score ranking
6. **Notifications**: SSE stream per user → heartbeat every 25s (Railway idle timeout fix) → badge synced from DB on page load

---

## 🗄 Database Schema Highlights

| Table                    | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `users`                  | All users with `role_enum` (coder/tl/admin), `kairo_score` (default 50) |
| `complementary_plans`    | AI-generated 20-day plans as JSONB                                      |
| `plan_activities`        | Parsed activities per day (populated from plan JSONB)                   |
| `activity_progress`      | Tracks which activities each coder completed                            |
| `exercises`              | Cached AI exercises per plan day                                        |
| `exercise_submissions`   | Coder code submissions for TL review                                    |
| `score_events`           | Immutable log of every point change                                     |
| `risk_flags`             | Auto-detected and manual risk alerts per coder                          |
| `notifications`          | SSE notification queue                                                  |
| `resources`              | TL-uploaded PDFs for RAG search                                         |
| `soft_skills_assessment` | Onboarding diagnostic results                                           |

---

## 🔐 Security Notes

- Sessions use `httpOnly` + `sameSite: 'lax'` cookies stored in PostgreSQL
- OTP codes expire in 10 minutes, limited to 5 attempts
- OAuth (Google/GitHub) never exposes passwords — `createOAuth()` skips bcrypt
- All TL endpoints verify clan ownership before returning coder data
- SSE stream: `sendToUser(userId)` only accesses `clients.get(userId)` — no cross-user data leakage
- Resources filtered by `clan_id` — coders only see their TL's PDFs

---

## 📄 License

Internal project for Riwi Bootcamp — Cohort 6, Clan Turing. Not for public redistribution.

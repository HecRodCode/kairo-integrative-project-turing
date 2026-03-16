# backend-node — Kairo API Gateway

Express.js REST API. Handles all authentication, business logic, session management, real-time notifications (SSE), and file storage. Acts as the orchestrator between the frontend and the Python AI microservice.

---

## 📁 Structure

```
backend-node/
├── src/
│   ├── config/
│   │   ├── database.js          # pg Pool — Supabase PostgreSQL
│   │   ├── passport.js          # Google + GitHub OAuth strategies
│   │   └── supabase.js          # Supabase Storage client
│   ├── controllers/
│   │   ├── authControllers.js   # register, login, OTP, OAuth callbacks
│   │   ├── coderControllers.js  # dashboard, plan, completeDay, requestPlan
│   │   ├── exerciseControllers.js # generateExercise, submitExercise
│   │   ├── tlControllers.js     # TL dashboard, submissions, ranking, scoring
│   │   ├── resourceControllers.js # upload PDF, list, download, RAG search
│   │   └── notificationControllers.js # SSE stream, CRUD notifications
│   ├── middlewares/
│   │   └── authMiddlewares.js   # isAuthenticated, hasRole, checkOnboarding
│   ├── models/
│   │   └── user.js              # create, createOAuth, findById, findByEmail
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── coderRoutes.js       # /api/coder/*
│   │   ├── tlRoutes.js          # /api/tl/*
│   │   ├── notificationRoutes.js # /api/notifications/*
│   │   └── exerciseRoutes.js    # /api/exercise/* (proxied to Python)
│   ├── services/
│   │   ├── notificationService.js # SSE client manager + notifyUser()
│   │   ├── scoringService.js    # awardPoints, getScoreHistory, inactivity
│   │   ├── pythonApiService.js  # callPythonApi, callPythonApiGet
│   │   └── email.service.js     # Resend OTP emails
│   └── utils/
│       ├── helpers.js
│       └── validators.js
└── server.js                    # Express app entrypoint
```

---

## ⚙️ Environment Variables

Create `backend-node/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Sessions
SESSION_SECRET=your_long_random_secret_min_32_chars

# Database — Supabase Pooler (port 6543 for production)
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_db_password
DATABASE_URL=postgresql://postgres.your_ref:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres

# Supabase (for Storage)
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_ANON_KEY=eyJ...your_anon_key

# Frontend CORS — comma-separated for multiple origins
FRONTEND_URL=http://127.0.0.1:5500,http://localhost:5500

# Python AI microservice — NO trailing slash
PYTHON_API_URL=http://localhost:8000

# OAuth — Google
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret

# OAuth — GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret

# Email — Resend
RESEND_API_KEY=re_your_resend_key
SMTP_FROM=Kairo <onboarding@resend.dev>

# Production only (set by Railway automatically)
# RAILWAY_PUBLIC_DOMAIN=your-service.up.railway.app
```

---

## 🚀 Running Locally

```bash
cd backend-node
npm install
npm run dev       # nodemon with --experimental-vm-modules
```

Expected output:

```
🚀 KAIRO API GATEWAY STARTED SUCCESSFULLY
   PORT     : 3000
   ENV      : development
   DB       : connected
```

---

## 🔑 API Routes Summary

### Auth — `/api/auth`

| Method | Path               | Description                               |
| ------ | ------------------ | ----------------------------------------- |
| POST   | `/register`        | Register with email + password, sends OTP |
| POST   | `/verify-otp`      | Verify OTP code                           |
| POST   | `/login`           | Email + password login                    |
| POST   | `/logout`          | Destroy session                           |
| GET    | `/google`          | Initiate Google OAuth                     |
| GET    | `/google/callback` | Google OAuth callback                     |
| GET    | `/github`          | Initiate GitHub OAuth                     |
| GET    | `/github/callback` | GitHub OAuth callback                     |
| GET    | `/check`           | Returns current session user              |

### Coder — `/api/coder` _(requires auth + role=coder + onboarding complete)_

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/dashboard`                      | Full dashboard data in one call      |
| GET    | `/plan`                           | Active plan with completed days      |
| POST   | `/plan/request`                   | Request new AI plan generation       |
| POST   | `/plan/:planId/day/:day/complete` | Mark day complete (+5 pts)           |
| POST   | `/exercise/generate`              | Generate or retrieve cached exercise |
| POST   | `/exercise/:id/submit`            | Submit code solution (+8 pts)        |
| GET    | `/resources`                      | List TL resources for coder's clan   |
| POST   | `/resources/search`               | RAG search TL resources by topic     |
| GET    | `/resource/:id/download`          | Get signed URL for resource PDF      |

### TL — `/api/tl` _(requires auth + role=tl)_

| Method | Path                      | Description                                          |
| ------ | ------------------------- | ---------------------------------------------------- |
| GET    | `/dashboard`              | Clan overview, stats, soft skills averages           |
| POST   | `/feedback`               | Send feedback to a coder                             |
| GET    | `/submissions`            | All code submissions from clan                       |
| POST   | `/submissions/:id/review` | Review submission + send feedback (+15 pts to coder) |
| GET    | `/coder/:id/score`        | Score history for a specific coder                   |
| GET    | `/ranking`                | Clan ranking + global top 10                         |
| POST   | `/resource/upload`        | Upload PDF resource (multipart/form-data)            |
| GET    | `/resource/list`          | List uploaded resources                              |
| DELETE | `/resource/:id`           | Soft-delete resource                                 |

### Notifications — `/api/notifications` _(requires auth)_

| Method | Path      | Description                                |
| ------ | --------- | ------------------------------------------ |
| GET    | `/stream` | SSE stream — keep-alive with 25s heartbeat |
| GET    | `/`       | List notifications + unread count          |
| POST   | `/read`   | Mark all as read                           |
| DELETE | `/:id`    | Delete specific notification               |

---

## 🏆 Kairo Score System

Points are awarded automatically via `scoringService.js`:

| Event             | Points | Triggered by                   |
| ----------------- | ------ | ------------------------------ |
| `day_complete`    | +5     | Coder marks a plan day as done |
| `exercise_submit` | +8     | Coder submits code exercise    |
| `tl_approved`     | +15    | TL reviews a submission        |
| `plan_complete`   | +50    | Coder completes all 20 days    |
| `inactivity`      | -3/day | Cron: 3+ days without activity |

All changes are logged in `score_events` for full auditability.  
Score floors at 0 (never negative).  
Auto risk flag created if score drops below 20.

---

## 🔔 SSE Notifications

The notification system uses Server-Sent Events for real-time delivery:

- Each user gets their own SSE connection on `GET /api/notifications/stream`
- A 25-second heartbeat (`: ping`) keeps Railway connections alive (30s idle timeout)
- `sendToUser(userId, payload)` only sends to the exact user — no cross-user leakage
- On page load, the badge syncs from the DB and auto-marks unread as read

---

## 🗄 Database Connection

Uses `pg.Pool` with Supabase Transaction Pooler (port 6543) for production.  
Connection string format:

```
postgresql://postgres.[ref]:[password]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

Set `DB_PORT=6543` in production (not the default 5432).

---

## 🚢 Railway Deployment

1. Set **Root Directory** to `backend-node` in Railway service settings
2. Add all environment variables listed above
3. Set `NODE_ENV=production`
4. `RAILWAY_PUBLIC_DOMAIN` is auto-set by Railway — used for dynamic OAuth callbacks
5. `FRONTEND_URL` must include all allowed origins (comma-separated)

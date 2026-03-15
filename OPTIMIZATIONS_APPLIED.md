# Optimizations Applied

Date: 2026-03-15
Branch: `deploy/code-optimization`

This document summarizes the optimization work applied to the project, how each optimization works, and what it improves.

## Scope

- Backend Node.js
- Backend Python
- Database (migrations)
- Frontend
- Runtime/security baseline

## 1) Backend Node.js optimizations

### 1.1 Compression + security headers
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - `compression` middleware enabled (`level: 6`)
  - `helmet` middleware enabled (safe defaults, CSP disabled for compatibility)
- How it works:
  - Compression reduces response size before sending data to clients.
  - Helmet sets standard protective HTTP headers.
- What it improves:
  - Lower transfer size and faster JSON delivery on slower networks.
  - Better baseline protection against common browser-based attack vectors.

### 1.2 Logging by environment
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - Morgan uses `combined` in production and `dev` in development.
- How it works:
  - Production logs become structured and easier to parse by log platforms.
- What it improves:
  - Better observability and diagnostics in production.

### 1.3 Body size hardening
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - `express.json` and `urlencoded` limits reduced from `5mb` to `100kb`.
- How it works:
  - Rejects unexpectedly large request bodies earlier.
- What it improves:
  - Reduced memory pressure and better resilience to body-flood style abuse.

### 1.4 Session store pruning
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - `pruneSessionInterval` enabled in `connect-pg-simple` store.
- How it works:
  - Expired sessions are periodically removed from the DB.
- What it improves:
  - Prevents unbounded growth in `session` table and keeps session lookups efficient.

### 1.5 Environment validation at startup
- Files:
  - `backend-node/src/config/env.js` (new)
  - `backend-node/src/server.js`
  - `backend-node/.env.example` (new)
- What was applied:
  - Central env validation function with production strictness.
  - Updated env template with real required variables.
- How it works:
  - Startup validates critical variables and fails fast in production when missing.
- What it improves:
  - Faster troubleshooting and fewer runtime misconfiguration failures.

### 1.6 Session secret enforcement
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - Production startup now fails if `SESSION_SECRET` is missing.
- How it works:
  - Prevents insecure fallback in production.
- What it improves:
  - Session signing security posture.

### 1.7 PostgreSQL pool tuning for production
- Files:
  - `backend-node/src/config/database.js`
- What was applied:
  - Production-aware pool sizing/timeouts (`max`, `connectionTimeoutMillis`, `statement_timeout`).
- How it works:
  - Uses conservative settings better aligned to managed DB/pooler behavior.
- What it improves:
  - More stable behavior under load and faster failure on degraded DB conditions.

### 1.8 Python API URL centralization
- Files:
  - `backend-node/src/config/runtime.js` (new)
  - `backend-node/src/controllers/coderControllers.js`
  - `backend-node/src/controllers/diagnosticControllers.js`
  - `backend-node/src/controllers/exerciseControllers.js`
  - `backend-node/src/controllers/iaControllers.js`
  - `backend-node/src/services/pythonApiService.js`
- What was applied:
  - Single runtime source for `PYTHON_API_URL`.
- How it works:
  - Controllers/services import one constant instead of redefining URL defaults.
- What it improves:
  - Lower config drift risk and simpler maintenance.

### 1.9 Python API circuit breaker (lightweight)
- Files:
  - `backend-node/src/services/pythonApiService.js`
- What was applied:
  - Health-check cache, fail-fast when Python unavailable, internal unhealthy state reset.
- How it works:
  - Service probes `/health` with short timeout and caches status briefly.
  - If unhealthy, requests fail early with controlled `503`.
- What it improves:
  - Lower tail latency and reduced request pile-ups when Python is down or cold-starting.

### 1.10 SSE connection cap (server)
- Files:
  - `backend-node/src/services/notificationService.js`
- What was applied:
  - Max SSE connections per user (`MAX_CONNECTIONS_PER_USER = 3`).
- How it works:
  - Oldest user connection is closed when limit is exceeded.
- What it improves:
  - Prevents resource abuse from many open tabs and keeps memory/socket usage bounded.

### 1.11 Mutating request origin validation
- Files:
  - `backend-node/src/server.js`
- What was applied:
  - Added `validateMutatingOrigin` middleware for non-GET requests.
- How it works:
  - For mutating methods, rejects requests with disallowed `Origin` header.
- What it improves:
  - Additional CSRF-hardening layer on top of CORS policy.

### 1.12 Query roundtrip reduction in resource upload
- Files:
  - `backend-node/src/controllers/resourceControllers.js`
- What was applied:
  - Combined TL clan/name fetch into one query in `uploadResource`.
- How it works:
  - Avoids repeated user lookups during same request path.
- What it improves:
  - Lower DB roundtrips and better endpoint latency.

### 1.13 Pagination for high-traffic list endpoints
- Files:
  - `backend-node/src/controllers/assignmentControllers.js`
  - `backend-node/src/controllers/notificationControllers.js`
- What was applied:
  - Optional `page`/`limit` with defaults and pagination metadata.
  - Notifications unread count now computed from DB aggregate, not only current page subset.
- How it works:
  - Queries use `LIMIT/OFFSET` and return `pagination` object.
- What it improves:
  - Better scalability as data grows and more accurate unread counters.

## 2) Backend Python optimizations

### 2.1 Shared client access in routers
- Files:
  - `backend-python/app/services/clients.py` (new)
  - `backend-python/app/routers/cards.py`
  - `backend-python/app/routers/reports.py`
- What was applied:
  - Centralized Groq/Supabase client retrieval.
- How it works:
  - Routers avoid creating fresh clients in each handler.
- What it improves:
  - Lower per-request setup overhead and cleaner code reuse.

### 2.2 Non-blocking AI call path
- Files:
  - `backend-python/app/services/ia_services.py`
- What was applied:
  - Blocking Groq SDK call moved into `asyncio.to_thread`.
- How it works:
  - Heavy synchronous API call runs in thread pool, not directly in event loop.
- What it improves:
  - Better FastAPI concurrency under simultaneous requests.

### 2.3 Enum-safe agent logging
- Files:
  - `backend-python/app/services/supabase_service.py`
  - `backend-python/app/routers/roadmap.py`
  - `backend-python/app/routers/exercises.py`
  - `backend-node/src/controllers/iaControllers.js`
- What was applied:
  - Agent types normalized to DB-compatible values.
- How it works:
  - Avoids invalid enum inserts in `ai_generation_log`.
- What it improves:
  - Logging reliability and fewer failed writes.

## 3) Database optimizations

### 3.1 Composite/partial index migration
- Files:
  - `database/migrations/006_add_performance_indexes.sql` (new)
- What was applied:
  - Added indexes for frequent filter/join patterns:
    - `users(clan, role)`
    - `risk_flags(coder_id, resolved) WHERE resolved=false`
    - `complementary_plans(coder_id, is_active) WHERE is_active=true`
    - `tl_feedback(coder_id) WHERE is_read=false`
    - `assignments(scope, clan_id) WHERE is_active=true`
    - `exercises(plan_id, day_number)`
- How it works:
  - Enables better query plans and narrower index scans.
- What it improves:
  - Lower latency in dashboards, notifications, assignments, and exercise retrieval.

## 4) Frontend optimizations

### 4.1 Better auth cache/timeouts
- Files:
  - `frontend/src/core/auth/auth-service.js`
  - `frontend/src/core/utils/fetchCache.js`
- What was applied:
  - Improved `AUTH_CHECK` TTL.
  - Added timeout support in cached fetches.
  - Added `CACHE_TTL` presets.
- How it works:
  - Prevents hanging fetches and avoids unnecessary repeated calls.
- What it improves:
  - Faster page transitions and more robust behavior on flaky networks.

### 4.2 Dashboard init parallelization
- Files:
  - `frontend/assets/js/dashboardCoder.js`
- What was applied:
  - Avatar and dashboard load now run in parallel.
  - Assignment notifications no longer force full dashboard reload.
- How it works:
  - Uses `Promise.all` during init and narrows reload triggers.
- What it improves:
  - Faster perceived load and less backend pressure from unnecessary refreshes.

### 4.3 Bounded SSE reconnect loop (client)
- Files:
  - `frontend/src/core/notificationsSSE.js`
- What was applied:
  - Added max retry attempts and retry counter reset on successful connect.
  - Notifications dropdown now requests paginated data (`limit=10`).
- How it works:
  - Stops infinite reconnection loops in persistent outage scenarios.
- What it improves:
  - Better resilience and less noisy retry traffic.

### 4.4 Reduced CLS in sidebar logos
- Files:
  - `frontend/src/views/coder/IAtrainer.html`
  - `frontend/src/views/coder/dashboard.html`
  - `frontend/src/views/coder/assignment.html`
  - `frontend/src/views/tl/dashboard.html`
  - `frontend/src/views/tl/group.html`
  - `frontend/src/views/tl/assignment.html`
- What was applied:
  - Added explicit `width`, `height`, and `loading="lazy"` to sidebar logos.
- How it works:
  - Browser can reserve layout space before image download.
- What it improves:
  - Lower layout shifts and smoother first render.

## Validation run

Smoke checks executed after optimization passes:
- JavaScript syntax checks with `node --check` on modified files.
- Python compile check with `python -m compileall` on modified service(s).
- Workspace diagnostics using editor error scan.

Result: no errors reported in final validation.

## Notes

- Pagination is backward-compatible (defaults applied when `page`/`limit` are not provided).
- Some architectural optimizations from the audit (job queue, materialized views, full error-response standardization) are intentionally left for a dedicated, larger refactor phase.

# frontend — Kairo User Interface

Vanilla JavaScript Multi-Page Application (MPA) serving both Coders and Team Leaders. No frameworks — pure HTML5, CSS3, and ES Modules.

---

## 📁 Structure

```
frontend/
├── assets/
│   ├── css/
│   │   ├── global.css           # Design system tokens, themes (dark/light)
│   │   ├── dashboardCoder.css
│   │   ├── dashboardTL.css
│   │   ├── iaTrainer.css
│   │   └── ...
│   ├── js/
│   │   ├── dashboardCoder.js    # Coder dashboard — stats, progress, feedback
│   │   ├── dashboardTL.js       # TL dashboard — clan view, submissions, ranking
│   │   ├── aiTrainer.js         # AI Trainer — plan viewer, exercises, RAG resources
│   │   └── ...
│   └── img/
│       └── logo.png
└── src/
    ├── core/
    │   ├── config.js            # API_BASE — auto-detects local vs production
    │   ├── notificationsSSE.js  # SSE client, badge sync, toast notifications
    │   └── auth/
    │       ├── session.js       # guards (requireAuth, requireCompleted, etc.)
    │       ├── auth-ui.js       # login/register form handlers
    │       └── validation.js    # password strength, email format
    └── views/
        ├── auth/
        │   ├── login.html
        │   ├── register.html
        │   └── verify-otp.html
        ├── coder/
        │   ├── dashboard.html
        │   ├── IAtrainer.html
        │   ├── assignment.html
        │   └── profile.html
        └── tl/
            ├── dashboard.html
            └── assignment.html
```

---

## 🎨 Design System

All styles flow from `global.css` CSS custom properties:

```css
/* Dark theme (default) */
--bg-body: #050505 --bg-card: rgba(10, 10, 10, 0.85) --text-main: #ffffff
  --text-muted: #94a3b8 --accent: #a855f7 --accent-dim: rgba(168, 85, 247, 0.15)
  --accent-border: rgba(168, 85, 247, 0.4) --color-success: #10b981
  --color-warning: #f59e0b --color-error: #ef4444
  /* Light theme overrides via [data-theme='light'] */;
```

Theme persists in `localStorage` as `kairo_theme`.

---

## 🔐 Auth Guards

`src/core/auth/session.js` exports `guards` for route protection:

| Guard                 | Use case                                             |
| --------------------- | ---------------------------------------------------- |
| `requireAuth()`       | Any authenticated page                               |
| `requireGuest()`      | Login/register — redirects away if already logged in |
| `requireOnboarding()` | Onboarding flow — requires `first_login = true`      |
| `requireCompleted()`  | Dashboard pages — requires `first_login = false`     |

Each guard reads from a session cache in `sessionStorage` and verifies against `GET /api/auth/check`.

---

## 📡 Real-time Notifications

`notificationsSSE.js` manages the SSE connection:

- Connects to `GET /api/notifications/stream` after auth
- Syncs unread count from DB on connect (eliminates ghost badges on refresh)
- Auto-marks notifications as read when dropdown is opened
- Reconnects with exponential backoff (8s → 16s → 32s → max 60s)
- Pauses reconnection when tab is hidden (saves resources)
- Dispatches `kairo-notification` window events for dashboard to listen to

---

## 🧠 AI Trainer

The AI Trainer (`aiTrainer.js`) is the most complex view:

- Displays the active 20-day plan with week tabs and day dots
- Renders technical + soft skill activities per day
- Opens Monaco Editor modal for coding exercises
- Searches TL resources via RAG (`POST /api/coder/resources/search`)
- Tracks completion state in `completedDays` JSONB
- Shows performance day banner on day 20

### Plan States

| State              | When shown                       |
| ------------------ | -------------------------------- |
| `state-generating` | Plan requested, polling every 4s |
| `state-no-plan`    | No active plan exists            |
| `state-active`     | Plan loaded and ready            |

---

## 🖥 Running Locally

The frontend is static — no build step required.

**Option 1 — VS Code Live Server (recommended)**

1. Install the Live Server extension
2. Right-click `frontend/src/views/auth/login.html`
3. Select "Open with Live Server"
4. Runs on `http://127.0.0.1:5500`

**Option 2 — npx serve**

```bash
npx serve frontend -p 5500
```

Make sure `backend-node/.env` includes `http://127.0.0.1:5500` in `FRONTEND_URL`.

---

## 🌐 Production

The frontend is deployed as a static site at `https://kairoriwi.com`.

`src/core/config.js` auto-detects the environment:

```js
export const API_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://kairo-integrative-project-turing-production.up.railway.app/api';
```

---

## 📱 Responsive Design

All views include a `bottom-nav` for mobile and a `sidebar` for desktop.  
Breakpoints: `768px` (tablet) and `480px` (mobile).

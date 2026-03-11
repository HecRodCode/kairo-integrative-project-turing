# 🚀 Riwi Learning Platform: AI-Powered Personalized Growth

The **Riwi Learning Platform** is an intelligent ecosystem designed to bridge the gap between intensive bootcamps and individual learning paces. By leveraging a hybrid architecture of Node.js and Python, the platform transforms academic data and soft skills assessments into dynamic, personalized 4-week growth paths.

## 🎯 The Vision

Riwi's intensive 11-month program moves at a lightning pace. This platform ensures no Coder is left behind by analyzing technical performance and soft skills to build a curriculum that adapts to the human, not just the code.

## 💡 Key Solution Pillars

- **Adaptive Learning:** Generates custom 4-week study plans based on Moodle data and self-assessments.
- **Holistic Growth:** Integrates soft skills (emotional intelligence, communication) directly into technical reinforcement tasks.
- **Proactive Mentorship:** Provides Team Leaders (TL) with an analytics dashboard to identify at-risk students before academic failure occurs.
- **Hybrid Intelligence:** Uses Node.js for robust orchestration and Python/FastAPI for advanced local AI processing.

---

## 📂 High-Level Project Structure

The repository is organized into independent modules that work together as a distributed system:

- **`/backend-node`**: The core API Gateway (Express.js). Responsible for business logic, security, user authentication, and serving EJS templates.
- **`/backend-python`**: AI & Data Science microservice (FastAPI). Specialized in local LLM inference and predictive analytics.
- **`/frontend`**: The user interface (Multi-Page Application) serving both Coders and Team Leaders via Vanilla JS and Bootstrap 5.
- **`/database`**: Contains SQL schemas and DDL scripts, including custom enumerated types for roles, risk levels, and AI agents.
- **`/docs`**: Centralized documentation including architecture diagrams and project management assets.

> _Note: Each directory contains its own `README.md` with specific implementation details and internal logic documentation._

---

## 🛠 Tech Stack

### 🖥️ Frontend

- **HTML5 / CSS3 / JavaScript (Vanilla):** Core structure and interactivity.
- **Bootstrap 5:** Responsive layout and rapid UI components.
- **EJS (Embedded JavaScript Templates):** Server-side rendering to inject educational paths directly into the HTML.

### ⚙️ Backend (Hybrid Architecture)

- **Node.js + Express:** Main server managing users, authentication, and business logic.
- **Python + FastAPI:** AI Microservice connecting directly to the local model.

### 🧠 Artificial Intelligence

- **Model:** Qwen2.5-7B-Instruct (groq).
- **Orchestrator:** LangChain (Managing prompts and JSON output validation).

### 🗄️ Database

- **PostgreSQL (Supabase):** Storage for user profiles, technical foundations, and AI-generated learning plans.
- **Custom Logic:** Uses specialized enumerated types (e.g., `role_enum`, `risk_level_enum`, `ai_agent_enum`) to maintain data integrity.

---

## 🛠️ Setup & Execution Guide

To ensure the **Kairo** ecosystem functions correctly, both backend engines must be active simultaneously. Node.js acts as the **System Orchestrator**, while Python serves as the **AI Brain**.

### 1. Environment Configuration (`.env`)

You must create specific environment files in the root of their respective directories. **Note:** These files contain sensitive keys and should never be committed to version control.

#### 📁 `backend-node/.env`

Controls database connectivity, authentication, and frontend permissions.

```env

# SERVER CONFIGURATION
PORT=3000
NODE_ENV=development

# SECURITY & SESSIONS
SESSION_SECRET=your_session_secret

# DATABASE (POSTGRESQL - SUPABASE)
DB_HOST=your_host
DB_PORT=5432
DB_NAME=your_name
DB_USER=postgres.your_user
DB_PASSWORD=your_password
DATABASE_URL=your_database_url

# SUPABASE CONFIG
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# FRONTEND CONNECTION
FRONTEND_URL=http://127.0.0.1:5500/frontend

# PYTHON CONNECTION
PYTHON_API_URL=http://localhost:8000

# SOCIAL AUTH - GITHUB
GITHUB_CLIENT_ID=your_client
GITHUB_CLIENT_SECRET=your_client_secret

# SOCIAL AUTH - GOOGLE
GOOGLE_CLIENT_ID=your_client
GOOGLE_CLIENT_SECRET=your_client_secret

# AUTHENTICATION RESEND
RESEND_API_KEY=your_resend_key

# API KEY AI
RIWI_IA_KEY=your_ia_key

```

---

#### 📁 `Backend-python/.en`

```env

# PYTHON CONFIGURATION
PORT=8000
ENV=development

# OPENIA
OPENAI_API_KEY=your_api_key

# MODEL IA
MODEL_NAME=your_model

# SUPABASE CONFIG
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# BACKEND NODE PORT
NODE_URL=http://localhost:3000

# FRONTEND PORT
FRONTEND_URL=http://localhost:5500

```

### 2. Spinning Up the Engines

Open three independent terminal instances in your Ubuntu environment and execute the following commands in order:

#### Terminal A: The Orchestrator (Node.js)

- cd backend-node
- npm install
- npm run dev

  `Verification: Look for the message 🚀 KAIRO API GATEWAY STARTED SUCCESSFULLY`

#### Terminal B: The AI Brain (Python FastAPI)

Processes data and generates personalized learning plans.

- Linux

```Bash
1. cd backend-python
2. python3 -m venv env
3. source env/bin/activate
4. pip install -r requirements.txt
5. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- macOS

```Terminal
1. cd backend-python
2. python3 -m venv env
3. source env/bin/activate
4. pip install -r requirements.txt
5. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Windows

```PowerShell
1. cd backend-python
2. python -m venv env
3. env\Scripts\Activate.ps1
4. pip install -r requirements.txt
5. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`Verification: Look for INFO: Supabase client initialized and the Uvicorn link at port 8000`

#### Terminal C: The Interface (Frontend)

- **Recommended: Use VS Code Live Server (Port 5500)**
- Or use `npx serve -p 5500`

---

## 👥 The Team

- Héctor Rios: Backend Lead & Documentation
- Miguel Calle: Database Architect
- Duvan Piedrahita: Frontend Engineer (Coder Experience)
- Cesar Rios: Frontend Engineer (TL Analytics) & UX/UI
- Camilo Guenge: QA Engineer & AI Specialist

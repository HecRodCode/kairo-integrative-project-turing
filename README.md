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

## 🏁 Quick Start

### 1. Prerequisites

- Node.js 24+ | Python 3.10+ | PostgreSQL 14+
- **Ollama:** Installed locally with the `qwen2.5` model.

### 2. Environment Setup

You must create a `.env` file in both `backend-node/` and `backend-python/` folders based on the provided examples.

### 3. Execution

To run the full environment, you need three terminal instances:

```bash
# Terminal 1: Node.js API
cd backend-node && npm run dev

# Terminal 2: Python AI Microservice
cd backend-python && uvicorn app.main:app --reload

# Terminal 3: Frontend
# Use VSCode Live Server or any static server on /index.html
```

---

## 👥 The Team
- Héctor Rios: Backend Lead & Documentation
- Miguel Calle: Database Architect
- Duvan Piedrahita: Frontend Engineer (Coder Experience)
- Cesar Rios: Frontend Engineer (TL Analytics) & UX/UI
- Camilo Guenge: QA Engineer & AI Specialist
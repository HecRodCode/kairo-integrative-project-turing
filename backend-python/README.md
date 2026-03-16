# backend-python — Kairo AI Microservice

FastAPI microservice responsible for all AI operations: generating personalized 20-day learning plans, creating daily code exercises, serving focus cards, and handling resource search (RAG). Powered by Groq's `llama-3.3-70b-versatile`.

---

## 📁 Structure

```
backend-python/
├── app/
│   ├── routers/
│   │   ├── roadmap.py           # POST /generate-plan
│   │   ├── exercises.py         # POST /generate-exercise, /exercise/{id}/submit
│   │   ├── cards.py             # POST /generate-focus-cards
│   │   ├── chat.py              # POST /chat/ask
│   │   ├── reports.py           # POST /generate-report
│   │   └── resources_search.py  # POST /search-resources (RAG)
│   ├── services/
│   │   ├── ia_services.py       # Groq inference layer, JSON parsing, fallbacks
│   │   ├── supabase_service.py  # Supabase singleton (service key, bypasses RLS)
│   │   ├── prompt_builder.py    # Interpretive + analytical plan prompts
│   │   ├── embedding_service.py # sentence-transformers (optional, graceful fallback)
│   │   └── resource_catalog.py  # ~60 verified URLs per module/learning style
│   └── models/                  # Pydantic request/response schemas
├── main.py                      # FastAPI app entrypoint, CORS, router registration
├── requirements.txt
├── nixpacks.toml                # Railway build config
└── .python-version              # Forces Python 3.11 on Railway
```

---

## ⚙️ Environment Variables

Create `backend-python/.env`:

```env
# Server
PORT=8000
ENV=development

# AI — Groq
GROQ_API_KEY=gsk_your_groq_api_key
MODEL_NAME=llama-3.3-70b-versatile

# Database — Supabase (service key bypasses RLS)
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your_service_role_key

# CORS origins
NODE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5500
```

---

## 🚀 Running Locally

```bash
cd backend-python

# Create virtual environment
python3 -m venv env
source env/bin/activate          # macOS/Linux
# env\Scripts\Activate.ps1     # Windows

pip install -r requirements.txt

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:

```
INFO: Supabase client initialized.
INFO: [Embeddings] Model all-MiniLM-L6-v2 loaded (384 dims)   # optional
INFO: Uvicorn running on http://0.0.0.0:8000
```

API docs available at: `http://localhost:8000/docs`

---

## 🔌 Endpoints

| Method | Path                    | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/health`               | Health check — model status, version |
| POST   | `/generate-plan`        | Generate 20-day personalized plan    |
| POST   | `/generate-exercise`    | Generate or return cached exercise   |
| POST   | `/exercise/{id}/submit` | Save coder code submission           |
| POST   | `/generate-focus-cards` | Generate 6 prioritized focus cards   |
| POST   | `/chat/ask`             | AI tutor for coder questions         |
| POST   | `/generate-report`      | Generate TL analytics report         |
| POST   | `/search-resources`     | RAG search TL resources by topic     |

---

## 🧠 AI Plan Generation

The `/generate-plan` endpoint supports two plan types:

### Interpretive Plan

Used on first login. Based solely on the coder's soft skills assessment.

- Analyzes 5 soft skills scores (autonomy, time management, problem solving, communication, teamwork)
- Selects the weakest skill as `targeted_soft_skill`
- Adapts activity style to the coder's `learning_style` (visual/auditory/kinesthetic/read_write/mixed)
- Generates 4 weeks × 5 days = 20 days of activities

### Analytical Plan

Used for re-generation. Incorporates Moodle performance data.

- Auto-fetches `moodle_progress` if caller doesn't send it
- Targets `struggling_topics` from the current module
- Adjusts difficulty based on `average_score` trends

### Plan JSON Structure

```json
{
  "plan_type": "interpretive",
  "targeted_soft_skill": "problem_solving",
  "learning_style_applied": "mixed",
  "summary": "Plan description...",
  "weeks": [
    {
      "week_number": 1,
      "focus": "Week theme",
      "days": [
        {
          "day": 1,
          "technical_activity": {
            "title": "Activity title",
            "description": "What to do",
            "duration_minutes": 45,
            "difficulty": "intermediate",
            "resources": ["https://..."]
          },
          "soft_skill_activity": {
            "title": "Soft skill title",
            "description": "What to practice",
            "duration_minutes": 20,
            "skill": "problem_solving",
            "reflection_prompt": "Reflection question"
          }
        }
      ]
    }
  ]
}
```

---

## 💾 Exercise Caching

Exercises are cached in the `exercises` table with `UNIQUE(plan_id, day_number)`.  
On the first request for a day: Groq generates the exercise → saved to DB.  
On subsequent requests: returned from cache — no LLM call needed.

Fallback: If Groq fails or returns invalid JSON, a safe starter-code exercise is returned so the UI never crashes.

---

## 🔍 Resource Search (RAG)

`POST /search-resources` finds TL-uploaded PDFs relevant to the day's topic:

1. **Text search** — ILIKE on `resources.title` and `resources.preview_text`
2. **Module fallback** — Returns any resource from the clan for the current module
3. **Privacy** — Always filtered by `clan_id` — coders only see their TL's resources

Semantic search (sentence-transformers + pgvector) is implemented but optional — the service starts without it if torch/transformers are unavailable.

---

## 🚢 Railway Deployment

1. Set **Root Directory** to `backend-python` in Railway service settings
2. Ensure `.python-version` contains `3.11`
3. Add all environment variables listed above
4. Railway auto-detects FastAPI and uses:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. `torch` and `sentence-transformers` are excluded from `requirements.txt` in production — the embedding service falls back gracefully

---

## ⚠️ Critical Notes

- `PYTHON_API_URL` in Node's `.env` must NOT have a trailing slash — causes `//generate-plan` 404
- The service key in `SUPABASE_SERVICE_KEY` bypasses Row Level Security — never expose it client-side
- All LLM responses use `response_format: {"type": "json_object"}` — enforces JSON output from Groq
- `_extract_json()` in `ia_services.py` handles markdown fence stripping as fallback

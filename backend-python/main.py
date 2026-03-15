"""
Kairo AI Microservice — main.py v2.3.0

Routers:
  POST /generate-plan         → roadmap.py
  POST /generate-focus-cards  → cards.py
  POST /chat/ask              → chat.py
  POST /generate-report       → reports.py
  POST /generate-exercise     → exercises.py
  POST /exercise/{id}/submit  → exercises.py
  POST /search-resources      → resources_search.py
  GET  /health                → infrastructure
  GET  /                      → infrastructure
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import roadmap, cards, chat, reports, exercises, resources_search
from app.services.embedding_service import model_ready

load_dotenv()

logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("kairo-ai-service")


def _build_origins() -> list[str]:
    """
    Builds the CORS allowed origins list.
    Always includes local dev origins.
    Reads NODE_URL and FRONTEND_URL from env for production.
    """
    base = [
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
    ]
    for env_var in ["NODE_URL", "FRONTEND_URL"]:
        val = os.getenv(env_var, "").strip()
        if val and val != "*" and val.startswith("http"):
            # Add both http and https variants to cover misconfiguration
            base.append(val)
            if val.startswith("http://"):
                base.append(val.replace("http://", "https://"))
            elif val.startswith("https://"):
                base.append(val.replace("https://", "http://"))

    return list(dict.fromkeys(base))  # deduplicate while preserving order


@asynccontextmanager
async def lifespan(app: FastAPI):
    origins = _build_origins()
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  Kairo AI Service v2.3.0  |  starting up")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(f"  LLM model    : {os.getenv('MODEL_NAME', 'llama-3.3-70b-versatile')}")
    logger.info(f"  Embeddings   : {'✓ all-MiniLM-L6-v2 (384d)' if model_ready() else '✗ not loaded'}")
    logger.info(f"  Environment  : {os.getenv('ENV', 'development')}")
    logger.info(f"  CORS origins : {origins}")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    yield
    logger.info("Kairo AI Service shutting down cleanly.")


app = FastAPI(
    title       = "Kairo AI Service",
    description = (
        "AI microservice for Riwi — personalized learning plans, "
        "exercises, resources RAG, focus cards, and TL reports."
    ),
    version  = "2.3.0",
    lifespan = lifespan,
    docs_url = "/docs",
    redoc_url= "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = _build_origins(),
    allow_credentials = True,
    allow_methods     = ["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers     = ["Content-Type", "Authorization"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(roadmap.router)           # POST /generate-plan
app.include_router(cards.router)             # POST /generate-focus-cards
app.include_router(chat.router)              # POST /chat/ask
app.include_router(reports.router)           # POST /generate-report
app.include_router(exercises.router)         # POST /generate-exercise
                                             # POST /exercise/{id}/submit
app.include_router(resources_search.router)  # POST /search-resources

# ── Infrastructure ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Infrastructure"])
async def health_check():
    """
    Health check endpoint called by Node.js GET /api/ai/health
    and Railway health check probe.
    """
    return {
        "status":      "online",
        "service":     "Kairo AI Engine",
        "version":     "2.3.0",
        "model":       os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
        "embeddings":  "all-MiniLM-L6-v2 (384d)" if model_ready() else "unavailable",
        "environment": os.getenv("ENV", "development"),
        "endpoints": [
            "POST /generate-plan",
            "POST /generate-focus-cards",
            "POST /chat/ask",
            "POST /generate-report",
            "POST /generate-exercise",
            "POST /exercise/{id}/submit",
            "POST /search-resources",
        ],
    }


@app.get("/", tags=["Infrastructure"])
async def root():
    return {
        "message": "Kairo AI Microservice — online",
        "docs":    "/docs",
        "version": "2.3.0",
    }

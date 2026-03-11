"""
Kairo AI Microservice — main.py
Entry point for FastAPI. Registers all routers and configures middleware.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import roadmap, cards, chat, reports, exercises

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("kairo-ai-service")


def _build_origins() -> list[str]:
    base = [
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ]
    for env_var in ["NODE_URL", "FRONTEND_URL"]:
        val = os.getenv(env_var)
        if val and val != "*" and val.startswith("http"):
            base.append(val)
    return list(dict.fromkeys(base))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  Kairo AI Service v2.1  |  starting")
    logger.info(f"  Model   : {os.getenv('MODEL_NAME', 'llama-3.3-70b-versatile')}")
    logger.info(f"  Env     : {os.getenv('ENV', 'development')}")
    logger.info(f"  Origins : {_build_origins()}")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    yield
    logger.info("Kairo AI Service shutting down.")


app = FastAPI(
    title="Kairo AI Service",
    description="AI microservice for Riwi bootcamp — plans, exercises, cards, and TL reports.",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_build_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(roadmap.router)    # POST /generate-plan
app.include_router(cards.router)      # POST /generate-focus-cards
app.include_router(chat.router)       # POST /chat/ask
app.include_router(reports.router)    # POST /generate-report, GET /generate-pdf/{clan}
app.include_router(exercises.router)  # POST /generate-exercise, POST /exercise/{id}/submit

# ── Infrastructure ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Infrastructure"])
async def health_check():
    return {
        "status":      "online",
        "service":     "Kairo AI Engine",
        "model":       os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
        "environment": os.getenv("ENV", "development"),
    }

@app.get("/", tags=["Infrastructure"])
async def root():
    return {"message": "Kairo AI Microservice", "docs": "/docs", "version": "2.1.0"}
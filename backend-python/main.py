"""
Riwi Learning Platform - AI Microservice
Main entry point for the FastAPI application. 
Orchestrates routers, middleware, and global configurations.
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import our domain-specific routers
from app.routers import roadmap, chat

# Load environment variables (API Keys, URLs, Model names)
load_dotenv()

# Professional logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("riwi-ai-service")

app = FastAPI(
    title="Riwi AI Service",
    description="Dedicated microservice for AI-driven personalized learning paths and student support.",
    version="1.0.0"
)

"""
CORS Configuration
Enables secure communication between the Frontend (React/Next.js) 
and the Node.js API Gateway.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Common Vite/React port
        "http://127.0.0.1:5173",
        # Add your production domain here in the future
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Registration ---
# We include the roadmap generator and the specialized AI chat
app.include_router(roadmap.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")

"""
Monitoring & Health Checks
Endpoints to verify service status and configuration.
"""

@app.get("/health", tags=["Infrastructure"])
async def health_check():
    """
    Returns the current operational status of the service.
    Useful for container health checks and CI/CD monitoring.
    """
    return {
        "status": "online",
        "service": "Riwi AI Engine",
        "engine_config": {
            "model": os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            "environment": os.getenv("ENV", "development")
        }
    }

@app.get("/", tags=["Infrastructure"])
async def root():
    """Redirects or provides a welcome message for the API."""
    return {
        "message": "Welcome to Riwi AI Microservice",
        "documentation": "/docs",
        "version": "1.0.0"
    }

# Initialization hook
@app.on_event("startup")
async def startup_event():
    logger.info("Riwi AI Service is starting up...")
    logger.info(f"Target LLM Model: {os.getenv('MODEL_NAME')}")
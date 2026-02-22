"""
Riwi Learning Platform - AI Microservice
Handles specialized LLM operations and personalized study plan generation.
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

from app.routers import ia_router

# Load environment variables before service initialization
load_dotenv()

app = FastAPI(
    title="Riwi AI Service",
    description="Microservice dedicated to AI-driven personalized learning paths",
    version="1.0.0"
)

# 

"""
Cross-Origin Resource Sharing (CORS) Configuration
Permits communication from the Node.js API Gateway and the local Frontend server.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Client and Template Initializations
templates = Jinja2Templates(directory="templates")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Domain-specific Router Registration
app.include_router(ia_router)

"""
Debug & Testing Modules
Dedicated endpoints for internal verification and LLM behavior testing.
"""

class Message(BaseModel):
    message: str

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serves the interactive debug chat interface."""
    return templates.TemplateResponse("chat.html", {"request": request})

@app.post("/api/chat")
async def chat_ai(message: Message):
    """Provides a direct gateway to the LLM for connectivity verification."""
    response = groq_client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "qwen-2.5-32b-instruct"),
        messages=[{"role": "user", "content": message.message}],
        temperature=0.7
    )
    return {"response": response.choices[0].message.content}

"""
Infrastructure Monitoring
Global health checks to verify microservice status and model configuration.
"""

@app.get("/health")
async def global_health():
    """Returns the operational status of the AI service."""
    return {
        "status": "active",
        "service": "Riwi AI Service",
        "model_engine": os.getenv("MODEL_NAME"),
        "active_routers": ["/api/ia", "/api/chat"],
        "documentation": "/docs"
    }
"""
app/routers/chat.py
BUG FIX #7: OpenAI → Groq (llama-3.3-70b-versatile)
"""
import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

logger = logging.getLogger("kairo-chat")
router = APIRouter(prefix="/chat", tags=["AI Tutor"])

class ChatRequest(BaseModel):
    message:  str
    coder_id: int | None = None

@router.post("/ask")
async def ask_tutor(req: ChatRequest):
    """
    Simple AI tutor for coder questions.
    Called by the frontend chat widget directly or via Node proxy.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Kairo, an expert coding tutor at Riwi bootcamp. "
                        "You help students with programming questions in a concise, "
                        "motivating, and practical way. "
                        "Always give a short answer first, then explain if needed. "
                        "Use simple language. Max 3 paragraphs."
                    ),
                },
                {"role": "user", "content": req.message},
            ],
            max_tokens=600,
            temperature=0.7,
        )

        return {"reply": response.choices[0].message.content}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="AI tutor temporarily unavailable")
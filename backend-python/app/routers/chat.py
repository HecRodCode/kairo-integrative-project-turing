from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
import os

router = APIRouter(prefix="/chat", tags=["AI Tutor"])

class ChatRequest(BaseModel):
    message: str

@router.post("/ask")
async def ask_tutor(request: ChatRequest):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    response = client.chat.completions.create(
        model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
        messages=[
            {"role": "system", "content": "Eres un tutor experto de Riwi. Ayudas a estudiantes de programación de forma concisa y motivadora."},
            {"role": "user", "content": request.message}
        ]
    )
    
    return {"reply": response.choices[0].message.content}
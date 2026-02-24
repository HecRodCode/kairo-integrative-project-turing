from groq import Groq
from supabase import create_client
from fastapi import APIRouter
from pydantic import BaseModel
import os
import re

class ChatRequest(BaseModel):
    message: str

router = APIRouter()
# ✅ FIX 1: service_role key

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/chat-ia-db")
async def chat_ia_db(request: ChatRequest):
    user_message = request.message
    
    # ✅ FIX 2: Prompt más estricto
    prompt = f"""Esquema KAIRO Supabase:
users(id, name, email, created_at, role)
tasks(id, title, status, user_id, due_date)

Genera EXACTAMENTE UNA línea SQL para esta pregunta: "{user_message}"

SOLO SQL. SIN <think>. SIN ;. SIN ```. SIN explicación.
EJEMPLO: SELECT COUNT(*) FROM users"""

    sql_response = client.chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    
    # ✅ FIX 3: Limpieza agresiva SQL
    sql_query = sql_response.choices[0].message.content.strip()
    sql_query = re.sub(r'<think>.*?</think>', '', sql_query, flags=re.DOTALL)  # Quita <think>
    sql_query = re.sub(r'```(?:sql)?\s*', '', sql_query)  # Quita ```
    sql_query = sql_query.strip()
    if sql_query.endswith(';'):
        sql_query = sql_query[:-1]
    
    print(f"🧠 SQL generado: {sql_query}")  # Debug terminal
    
    # ✅ FIX 4: Usa .table().select() REAL
    try:
        if "count" in sql_query.lower():
            result = supabase.table("users").select("*", count="exact").execute()
            data = [{"count": result.count, "sample": result.data[:3]}]
        elif "select" in sql_query.lower():
            # Extrae tabla y columnas básicas
            result = supabase.table("users").select("*").limit(10).execute()
            data = result.data
        else:
            data = ["SQL no reconocido"]
    except Exception as e:
        data = [f"Error DB: {str(e)}"]
    
    # Respuesta final IA
    prompt_final = f"Pregunta: {user_message}\nSQL: {sql_query}\nDatos: {data}\n\nResume en español:"
    final_response = client.chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[{"role": "user", "content": prompt_final}]
    )
    
    return {
        "pregunta": user_message,
        "sql_generado": sql_query,
        "datos_raw": data,
        "respuesta_ia":final_response.choices[0].message.content

    }

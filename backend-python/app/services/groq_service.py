import os
import json
from typing import Dict
from dotenv import load_dotenv
from groq import Groq
from app.models.plan_request import GeneratePlanRequest
from app.services.prompt_builder import build_personalized_prompt

load_dotenv()

# Configuración de Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_NAME = os.getenv("MODEL_NAME", "qwen-2.5-32b-instruct")

async def generate_plan_with_groq(request: GeneratePlanRequest) -> Dict:
    """
    Genera un plan personalizado usando Groq con Qwen2.5-32B
    
    Args:
        request: Datos completos del coder
    
    Returns:
        Dict con el plan de 4 semanas
    """
    
    try:
        # 1. Construir el prompt
        prompt = build_personalized_prompt(request)
        
        # 2. Llamar a Groq
        chat_completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un experto diseñador de currículos educativos. Respondes SOLO con JSON válido, sin texto adicional."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=4000,
            top_p=0.9,
        )
        
        # 3. Extraer respuesta
        generated_text = chat_completion.choices[0].message.content
        
        # 4. Parsear JSON de la respuesta
        plan = extract_json_from_text(generated_text)
        
        if not plan:
            # Si la IA no devolvió JSON válido, usar plan por defecto
            print("⚠️ IA no generó JSON válido, usando plan por defecto")
            return get_default_plan(request)
        
        return plan
        
    except Exception as e:
        print(f"❌ Error en Groq: {str(e)}")
        # Retornar plan por defecto en caso de error
        return get_default_plan(request)


def extract_json_from_text(text: str) -> Dict:
    """
    Extrae JSON válido de la respuesta de la IA
    
    A veces la IA devuelve texto + JSON, esta función lo limpia
    """
    try:
        # Intentar parsear directamente
        return json.loads(text)
    except:
        # Buscar JSON en el texto
        start = text.find('{')
        end = text.rfind('}') + 1
        
        if start != -1 and end != 0:
            try:
                json_str = text[start:end]
                return json.loads(json_str)
            except:
                pass
    
    return None


def get_default_plan(request: GeneratePlanRequest) -> Dict:
    """
    Plan de respaldo si la IA falla
    """
    weakest_skill = min(
        [
            ("autonomy", request.soft_skills.autonomy),
            ("time_management", request.soft_skills.time_management),
            ("problem_solving", request.soft_skills.problem_solving),
        ],
        key=lambda x: x[1]
    )[0]
    
    return {
        "weeks": [
            {
                "week_number": 1,
                "focus": "Fundamentos y nivelación",
                "days": [
                    {
                        "day": 1,
                        "technical_activity": {
                            "title": "Repaso de conceptos básicos",
                            "description": f"Revisar los temas: {', '.join(request.moodle_status.struggling_topics[:3]) if request.moodle_status.struggling_topics else 'fundamentos de programación'}",
                            "duration_minutes": 45,
                            "difficulty": "beginner",
                            "resources": ["Documentación oficial", "Tutoriales interactivos"]
                        },
                        "soft_skill_activity": {
                            "title": "Planificación diaria",
                            "skill": weakest_skill,
                            "description": "Crear un cronograma de estudio para la semana",
                            "duration_minutes": 20,
                            "reflection_prompt": "¿Qué obstáculos identificaste al planificar?"
                        }
                    }
                ]
            }
        ]
    }
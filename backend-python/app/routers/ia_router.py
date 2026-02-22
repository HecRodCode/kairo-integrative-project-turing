from fastapi import APIRouter, HTTPException
from app.models.plan_request import GeneratePlanRequest, PlanResponse
from app.services.groq_service import generate_plan_with_groq
import os

router = APIRouter(prefix="/api/ia", tags=["IA"])


@router.post("/generate-plan", response_model=PlanResponse)
async def generate_plan(request: GeneratePlanRequest):
    """
    Genera un plan personalizado de 4 semanas usando IA (Groq/Qwen2.5-32B)
    
    Parámetros:
    - request: Datos completos del coder (perfil, soft skills, estado Moodle)
    
    Retorna:
    - JSON con el plan de 4 semanas
    """
    try:
        # Generar el plan usando Groq
        plan = await generate_plan_with_groq(request)
        
        return PlanResponse(
            success=True,
            plan=plan,
            metadata={
                "coder_id": request.coder.id,
                "module": request.moodle_status.module_number,
                "model": os.getenv("MODEL_NAME", "qwen-2.5-32b-instruct")
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating plan: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Verifica que el servicio de IA está funcionando"""
    
    groq_status = "connected" if os.getenv("GROQ_API_KEY") else "no_api_key"
    
    return {
        "status": "ok",
        "message": "AI Service is running",
        "groq": groq_status,
        "model": os.getenv("MODEL_NAME", "qwen-2.5-32b-instruct")
    }
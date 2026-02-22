from app.models.plan_request import GeneratePlanRequest

def build_personalized_prompt(request: GeneratePlanRequest) -> str:
    """
    Construye un prompt personalizado basado en los datos del coder
    """
    
    # Analizar cuál es la habilidad más débil
    skills = {
        "autonomy": request.soft_skills.autonomy,
        "time_management": request.soft_skills.time_management,
        "problem_solving": request.soft_skills.problem_solving,
        "communication": request.soft_skills.communication,
        "teamwork": request.soft_skills.teamwork
    }
    
    weakest_skill = min(skills, key=skills.get)
    weakest_score = skills[weakest_skill]
    
    # Construir el prompt
    prompt = f"""Eres un experto diseñador de currículos educativos para bootcamps de desarrollo de software.

PERFIL DEL ESTUDIANTE:
- Nombre: {request.coder.full_name}
- Estilo de aprendizaje: {request.soft_skills.learning_style}
- Módulo actual: {request.moodle_status.module_number}
- Semana actual: {request.moodle_status.current_week}

EVALUACIÓN DE HABILIDADES BLANDAS (Escala 1-5):
- Autonomía: {request.soft_skills.autonomy}/5
- Gestión del tiempo: {request.soft_skills.time_management}/5
- Resolución de problemas: {request.soft_skills.problem_solving}/5
- Comunicación: {request.soft_skills.communication}/5
- Trabajo en equipo: {request.soft_skills.teamwork}/5

ÁREA MÁS DÉBIL: {weakest_skill.replace('_', ' ').title()} ({weakest_score}/5)

DIFICULTADES TÉCNICAS:
{', '.join(request.moodle_status.struggling_topics) if request.moodle_status.struggling_topics else 'Ninguna reportada'}

INTERESES ADICIONALES:
{', '.join(request.additional_topics) if request.additional_topics else 'Ninguno'}

TAREA:
Crea un plan de aprendizaje personalizado de 4 semanas que:
1. Aborde las debilidades técnicas mencionadas
2. Desarrolle la habilidad blanda más débil a través de ejercicios prácticos
3. Se adapte al estilo de aprendizaje del estudiante ({request.soft_skills.learning_style})
4. Incluya actividades diarias (30-45 min técnicas + 15-20 min habilidad blanda)

CRÍTICO: Debes responder SOLO con JSON válido en este formato exacto (sin texto adicional):
{{
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Descripción breve del objetivo principal de la semana",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Nombre de la actividad",
            "description": "Pasos detallados a seguir",
            "duration_minutes": 45,
            "difficulty": "beginner",
            "resources": ["recurso1", "recurso2"]
          }},
          "soft_skill_activity": {{
            "title": "Nombre de la actividad",
            "skill": "{weakest_skill}",
            "description": "Ejercicio práctico específico",
            "duration_minutes": 20,
            "reflection_prompt": "¿Qué aprendiste hoy?"
          }}
        }}
      ]
    }}
  ]
}}

IMPORTANTE: El plan debe tener 4 semanas completas, cada semana con 5 días (lunes a viernes), generando un total de 20 días de actividades.

Genera el plan ahora:"""
    
    return prompt
"""
app/services/prompt_builder.py
Builds the personalized prompt from assembled context dict.

learning_style is the MASTER VARIABLE — drives activity format and resource type.
All data comes from Supabase (fetched by roadmap.py via supabase_service).
"""

from typing import Dict


# ── Learning style → pedagogical instructions ──────────────────
STYLE_INSTRUCTIONS = {
    "visual": {
        "label": "Visual",
        "tech_format": (
            "Prioriza actividades de creación de diagramas, mapas mentales y esquemas. "
            "Sugiere tutoriales en video (YouTube, Platzi, freeCodeCamp). "
            "Incluye referencias a visualizaciones interactivas cuando existan. "
            "Usa comparaciones visuales: tablas, antes/después, flujos."
        ),
        "soft_format": (
            "Usa ejercicios de representación visual: dibuja tu proceso de aprendizaje, "
            "crea un mapa mental de tus metas de la semana."
        ),
    },
    "kinesthetic": {
        "label": "Kinestésico",
        "tech_format": (
            "Prioriza retos de código, debugging de bugs reales y construcción de mini-proyectos. "
            "Cada actividad debe terminar con algo funcional: un script, un componente, una consulta. "
            "Incluye ejercicios de refactorización y experimentación. "
            "Sugiere plataformas prácticas: Replit, CodePen, SQLFiddle."
        ),
        "soft_format": (
            "Usa dinámicas activas: reto del día, técnica Pomodoro aplicada, bitácora de logros."
        ),
    },
    "reading": {
        "label": "Lector/Escritor",
        "tech_format": (
            "Sugiere documentación técnica oficial: MDN, Python Docs, W3Schools, PostgreSQL Docs. "
            "Incluye artículos técnicos de Medium o Dev.to sobre el tema. "
            "Propón actividades de escritura: explicar un concepto con tus propias palabras, "
            "crear un README o resumen del tema."
        ),
        "soft_format": (
            "Usa journaling técnico: escribe qué aprendiste, qué te costó, qué harías diferente."
        ),
    },
    "auditory": {
        "label": "Auditivo",
        "tech_format": (
            "Sugiere podcasts técnicos, explicaciones orales grabadas y videoconferencias. "
            "Propón actividades de enseñanza verbal: explícale el tema a alguien más (rubber duck debugging). "
            "Incluye recursos de YouTube con explicaciones detalladas en español."
        ),
        "soft_format": (
            "Usa afirmaciones verbales, discusión de metas en voz alta, o grabación de reflexiones."
        ),
    },
    "mixed": {
        "label": "Mixto",
        "tech_format": (
            "Combina recursos: tutoriales en video + documentación escrita + ejercicios prácticos. "
            "Alterna entre lectura, práctica y visualización para reforzar cada concepto."
        ),
        "soft_format": (
            "Usa una combinación de journaling, mini-proyectos y reflexión verbal."
        ),
    },
}

def _get_style(learning_style: str) -> Dict:
    """Normalize learning_style value and return instructions."""
    s = (learning_style or "mixed").lower().strip()
    # Normalize common variations
    if s in ("v", "visual"):                          return STYLE_INSTRUCTIONS["visual"]
    if s in ("k", "kinesthetic", "kinestésico"):      return STYLE_INSTRUCTIONS["kinesthetic"]
    if s in ("r", "reading", "read", "lectura"):      return STYLE_INSTRUCTIONS["reading"]
    if s in ("a", "auditory", "auditivo", "aural"):   return STYLE_INSTRUCTIONS["auditory"]
    return STYLE_INSTRUCTIONS["mixed"]


def build_prompt(context: Dict) -> str:
    """
    context keys:
      coder_name, soft_skills (dict), module (dict), weeks (list),
      topic, struggling_topics (list), additional_topics (list)
    """
    ss      = context.get("soft_skills", {})
    module  = context.get("module", {})
    weeks   = context.get("weeks", [])

    learning_style = ss.get("learning_style", "mixed")
    style = _get_style(learning_style)

    # ── Skill analysis ──────────────────────────────────────────
    skills = {
        "autonomy":        ss.get("autonomy", 3),
        "time_management": ss.get("time_management", 3),
        "problem_solving": ss.get("problem_solving", 3),
        "communication":   ss.get("communication", 3),
        "teamwork":        ss.get("teamwork", 3),
    }
    weakest_skill = min(skills, key=skills.get)
    weakest_score = skills[weakest_skill]

    # ── Adaptation rules (soft skills) ──────────────────────────
    adaptations = []
    if skills["autonomy"] < 3:
        adaptations.append("Incluye instrucciones paso a paso muy detalladas (autonomía baja).")
    if skills["time_management"] < 3:
        adaptations.append("Divide cada actividad en bloques de tiempo explícitos (ej: 15 min lectura + 30 min práctica).")
    if skills["problem_solving"] < 3:
        adaptations.append("Agrega ejercicios de lógica y debugging con pistas progresivas.")
    if skills["communication"] < 3:
        adaptations.append("Incluye una actividad de documentación o explicación escrita/verbal por semana.")
    if skills["teamwork"] < 3:
        adaptations.append("Sugiere actividades de revisión entre pares o ejercicios colaborativos.")
    adaptation_block = "\n".join(f"  - {a}" for a in adaptations) if adaptations else "  - Sin adaptaciones adicionales requeridas."

    # ── Module context ──────────────────────────────────────────
    module_name      = module.get("name", "Módulo actual")
    module_objective = module.get("description", "Desarrollar competencias en programación.")
    total_weeks      = module.get("total_weeks", 3)
    is_critical      = module.get("is_critical", False)

    weeks_block = "\n".join(
        f"  Semana {w.get('week_number','?')}: {w.get('name','')} — {w.get('description','')} [{w.get('difficulty_level','medium')}]"
        for w in weeks
    ) if weeks else f"  {total_weeks} semanas de contenido + prueba de desempeño"

    struggling = ", ".join(context.get("struggling_topics", [])) or "Ninguno reportado"
    additional = ", ".join(context.get("additional_topics", [])) or "Ninguno"
    topic      = context.get("topic", module_name)

    return f"""
### ROL
Eres un Arquitecto Educativo Senior en Riwi, un bootcamp de programación de alto rendimiento en Colombia.
Tu objetivo es generar un plan de aprendizaje COMPLEMENTARIO de 4 semanas que REFUERCE (no reemplace) el curso oficial en Moodle de Riwi.

---
### MÓDULO ACTUAL — CURRÍCULO OFICIAL DE RIWI
- Módulo: {module_name}
- Objetivo del módulo: {module_objective}
- Total de semanas en Moodle: {total_weeks}
- Módulo crítico (ritmo avanzado): {'Sí' if is_critical else 'No'}
- Tema a reforzar: {topic}

### ESTRUCTURA OFICIAL DE SEMANAS EN MOODLE
{weeks_block}

---
### PERFIL DEL ESTUDIANTE
- Nombre: {context.get('coder_name', 'Estudiante')}
- **Estilo de aprendizaje: {style['label']}** ← VARIABLE MAESTRA
- Autonomía: {skills['autonomy']}/5
- Gestión del tiempo: {skills['time_management']}/5
- Resolución de problemas: {skills['problem_solving']}/5
- Comunicación: {skills['communication']}/5
- Trabajo en equipo: {skills['teamwork']}/5
- **Habilidad más débil: {weakest_skill.replace('_',' ').upper()} (Puntaje: {weakest_score}/5)**

---
### CONTEXTO ACADÉMICO
- Temas con dificultades (prioridad alta): {struggling}
- Intereses adicionales: {additional}

---
### REGLAS DE ADAPTACIÓN POR ESTILO DE APRENDIZAJE ({style['label'].upper()})
ACTIVIDADES TÉCNICAS:
  {style['tech_format']}

ACTIVIDADES DE HABILIDADES BLANDAS:
  {style['soft_format']}

### REGLAS DE ADAPTACIÓN POR HABILIDADES BLANDAS
{adaptation_block}

---
### INSTRUCCIONES DE GENERACIÓN
1. Crea exactamente 4 semanas, 5 días por semana (20 días en total).
2. Cada día: 1 Actividad Técnica (45 min) + 1 Actividad de Habilidad Blanda (20 min).
3. Las actividades técnicas deben reforzar los temas de **{module_name}** y priorizar los temas con dificultades.
4. El formato y recursos de cada actividad deben adaptarse al estilo **{style['label']}**.
5. Las actividades de habilidades blandas deben mejorar progresivamente **{weakest_skill}**.
6. Semana 4, Día 5 = Simulación de Prueba de Desempeño específica del módulo **{module_name}**.
7. Ritmo: {'Avanzado y riguroso' if is_critical else 'Progresivo y fundacional'}.
8. Idioma: Todo en español.

---
### OUTPUT — JSON ESTRICTO (sin texto antes ni después de las llaves)
{{
  "targeted_soft_skill": "{weakest_skill}",
  "learning_style_applied": "{style['label']}",
  "summary": "2 oraciones describiendo este plan personalizado y su objetivo",
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Tema de la semana alineado a {module_name}",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Título concreto",
            "description": "Pasos accionables específicos del tema de {module_name}",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["Recurso específico adaptado al estilo {style['label']}"]
          }},
          "soft_skill_activity": {{
            "title": "Título de la actividad blanda",
            "skill": "{weakest_skill}",
            "description": "Ejercicio práctico para mejorar {weakest_skill}",
            "duration_minutes": 20,
            "reflection_prompt": "Pregunta abierta para que el estudiante reflexione"
          }}
        }}
      ]
    }}
  ]
}}
"""
""" app/services/prompt_builder.py """

from typing import Dict, List, Tuple

# ── Learning style → pedagogical instructions ────────────────────────────────
STYLE_INSTRUCTIONS = {
    "visual": {
        "label": "Visual",
        "tech_format": (
            "Prioriza diagramas, mapas mentales y esquemas visuales. "
            "Sugiere tutoriales en video (YouTube, Platzi, freeCodeCamp). "
            "Usa comparaciones visuales: tablas lado a lado, flujos de proceso, antes/después. "
            "Cada actividad debe producir un artefacto visual: diagrama ER, mapa conceptual, wireframe."
        ),
        "soft_format": (
            "Usa representación visual: dibuja tu proceso de aprendizaje, "
            "crea un tablero Kanban personal, mapea visualmente tus metas de la semana."
        ),
    },
    "kinesthetic": {
        "label": "Kinestésico",
        "tech_format": (
            "Prioriza retos de código, debugging de bugs reales y mini-proyectos funcionales. "
            "Cada actividad debe terminar con algo que corra: un script, una consulta, un componente. "
            "Usa Replit, SQLFiddle, CodePen. El coder escribe código desde el minuto 1, nunca solo lee."
        ),
        "soft_format": (
            "Usa dinámicas activas: reto del día cronometrado, técnica Pomodoro aplicada al tema, "
            "bitácora de logros concretos (qué construí hoy, no qué leí)."
        ),
    },
    "reading": {
        "label": "Lector/Escritor",
        "tech_format": (
            "Sugiere documentación oficial: MDN, Python Docs, PostgreSQL Docs, W3Schools. "
            "Incluye artículos de Medium o Dev.to. "
            "Propón escritura técnica: resume el concepto con tus propias palabras, "
            "crea un README, escribe un mini-tutorial como si se lo explicaras a alguien."
        ),
        "soft_format": (
            "Usa journaling técnico estructurado: qué aprendiste, qué te costó, qué cambiarías. "
            "Lleva un diario de progreso semanal con entradas de 5 minutos por día."
        ),
    },
    "auditory": {
        "label": "Auditivo",
        "tech_format": (
            "Sugiere podcasts técnicos y videos con explicaciones orales detalladas en español. "
            "Propón rubber duck debugging: explica el problema en voz alta antes de resolverlo. "
            "Incluye actividades de enseñanza verbal: explica el tema a un compañero o grábate."
        ),
        "soft_format": (
            "Reflexión verbal: grábate describiendo tu semana, discute tus metas en voz alta, "
            "practica explicar tus decisiones técnicas como si fuera una mini-presentación."
        ),
    },
    "mixed": {
        "label": "Mixto",
        "tech_format": (
            "Combina en cada actividad: video corto de contexto + documentación escrita + ejercicio práctico. "
            "Alterna lectura, práctica y visualización para reforzar cada concepto desde múltiples ángulos."
        ),
        "soft_format": (
            "Combina journaling breve + mini-proyecto concreto + reflexión verbal o visual."
        ),
    },
}

SKILL_LABELS = {
    "autonomy":        "Autonomía",
    "time_management": "Gestión del Tiempo",
    "problem_solving": "Resolución de Problemas",
    "communication":   "Comunicación",
    "teamwork":        "Trabajo en Equipo",
}

# Specific exercise guide per skill — used to populate the daily 20-min slot
SKILL_EXERCISES = {
    "autonomy": (
        "Actividades sin guía explícita: el coder investiga, decide y ejecuta solo. "
        "Ej: 'investiga cómo resolver X usando solo la documentación oficial', "
        "'construye Y sin ver tutoriales, solo con docs'."
    ),
    "time_management": (
        "Actividades con bloques de tiempo definidos y límites estrictos. "
        "Ej: 'resuelve este ejercicio en exactamente 25 min (Pomodoro)', "
        "'planifica las tareas del día siguiente en 10 min antes de cerrar'."
    ),
    "problem_solving": (
        "Debugging, análisis de errores y desafíos lógicos con pistas progresivas. "
        "Ej: 'encuentra los bugs en este código sin ver la solución', "
        "'describe los pasos de tu proceso de resolución antes de escribir código'."
    ),
    "communication": (
        "Documentación y explicación técnica escrita o verbal. "
        "Ej: 'escribe el README de tu ejercicio de hoy en 5 min', "
        "'explica este concepto en 3 oraciones como si fuera para alguien sin conocimientos técnicos'."
    ),
    "teamwork": (
        "Revisión entre pares y colaboración activa. "
        "Ej: 'revisa el código de un compañero y escríbele feedback concreto', "
        "'trabaja en pair programming durante 20 min en el ejercicio del día'."
    ),
}

# ── Internal helpers ──────────────────────────────────────────────────────────
def _get_style(learning_style: str) -> Dict:
    s = (learning_style or "mixed").lower().strip()
    if s in ("v", "visual"):                         return STYLE_INSTRUCTIONS["visual"]
    if s in ("k", "kinesthetic", "kinestésico"):     return STYLE_INSTRUCTIONS["kinesthetic"]
    if s in ("r", "reading", "read", "lectura"):     return STYLE_INSTRUCTIONS["reading"]
    if s in ("a", "auditory", "auditivo", "aural"):  return STYLE_INSTRUCTIONS["auditory"]
    return STYLE_INSTRUCTIONS["mixed"]

def _get_weakest_skill(skills: Dict) -> Tuple[str, int]:
    """Returns (skill_key, score) for the lowest-scoring soft skill."""
    return min(skills.items(), key=lambda x: x[1])

def _weeks_block(weeks: List[Dict]) -> str:
    if not weeks:
        return "  Sin información de semanas disponible."
    return "\n".join(
        f"  Semana {w.get('week_number','?')}: {w.get('name','')} — "
        f"{w.get('description','')} [{w.get('difficulty_level','medium')}]"
        for w in weeks
    )

def _skills_portrait(skills: Dict, weakest_key: str) -> str:
    return "\n".join(
        f"  - {SKILL_LABELS[k]}: {v}/5{'  ← HABILIDAD MÁS DÉBIL' if k == weakest_key else ''}"
        for k, v in skills.items()
    )

def _adaptations_block(skills: Dict) -> str:
    rules = []
    if skills["autonomy"] < 3:
        rules.append("Instrucciones muy detalladas paso a paso (autonomía baja).")
    if skills["time_management"] < 3:
        rules.append("Divide cada actividad en bloques de tiempo explícitos.")
    if skills["problem_solving"] < 3:
        rules.append("Incluye pistas progresivas en los ejercicios de lógica.")
    if skills["communication"] < 3:
        rules.append("Agrega micro-actividad de escritura o explicación en cada día.")
    if skills["teamwork"] < 3:
        rules.append("Incluye al menos una actividad colaborativa por semana.")
    if not rules:
        return "  · Sin adaptaciones adicionales requeridas."
    return "\n".join(f"  · {r}" for r in rules)


def _detect_trend(weeks_completed: List[Dict]) -> str:
    scores = [w.get("average_score", 0) for w in weeks_completed if w.get("average_score")]
    if len(scores) < 2:
        return "Sin historial suficiente para detectar tendencia."
    delta = scores[-1] - scores[-2]
    if delta > 5:
        return f"Mejora sostenida (+{delta:.1f} puntos vs semana anterior). Mantener ritmo y aumentar dificultad."
    if delta < -5:
        return f"Caída de rendimiento ({delta:.1f} puntos). Refuerzo urgente en temas débiles."
    return f"Rendimiento estable (variación de {delta:+.1f} puntos). Consolidar conceptos y avanzar gradualmente."


def _score_analysis(score: float) -> str:
    if score >= 85:
        return f"{score:.1f}/100 — Excelente. Aumentar dificultad y profundidad de las actividades."
    if score >= 70:
        return f"{score:.1f}/100 — Sólido. Consolidar y avanzar al siguiente nivel."
    if score >= 50:
        return f"{score:.1f}/100 — Medio. Refuerzo focalizado en los temas con dificultades."
    return f"{score:.1f}/100 — Bajo. Plan de recuperación intensivo: más guía, más práctica básica."


# ── Public API ────────────────────────────────────────────────────────────────
def build_interpretive_prompt(context: Dict) -> str:
    """
    FIRST PLAN — generated right after onboarding completes.

    Required context keys:
      coder_name   : str
      soft_skills  : dict   (from soft_skills_assessment)
      module       : dict   (from modules table)
      weeks        : list   (from weeks table for this module)
      current_week : int    (from moodle_progress.current_week, default 1)
    """
    ss     = context.get("soft_skills", {})
    module = context.get("module", {})
    weeks  = context.get("weeks", [])

    style = _get_style(ss.get("learning_style", "mixed"))

    skills = {
        "autonomy":        ss.get("autonomy", 3),
        "time_management": ss.get("time_management", 3),
        "problem_solving": ss.get("problem_solving", 3),
        "communication":   ss.get("communication", 3),
        "teamwork":        ss.get("teamwork", 3),
    }
    weakest_key, weakest_score = _get_weakest_skill(skills)
    weakest_label = SKILL_LABELS[weakest_key]

    current_week = context.get("current_week", 1)
    module_name  = module.get("name", "Módulo actual")
    module_desc  = module.get("description", "Desarrollar competencias en programación.")
    is_critical  = module.get("is_critical", False)

    return f"""
### ROL
Eres Kairo, el Arquitecto Educativo de Riwi — un bootcamp de programación de alto rendimiento en Colombia.
Acabas de recibir los resultados del diagnóstico inicial de un nuevo coder.
Tu tarea: generar un Plan Complementario INTERPRETATIVO de 4 semanas que traduzca su perfil único en un camino de aprendizaje concreto.

Este plan COMPLEMENTA (no reemplaza) el currículo oficial en Moodle.
El coder está actualmente en la Semana {current_week} del módulo.

---
### MÓDULO OFICIAL
- Módulo: {module_name}
- Objetivo: {module_desc}
- Ritmo avanzado: {"Sí" if is_critical else "No"}
- Semana actual en Moodle: {current_week}

### SEMANAS DEL MÓDULO
{_weeks_block(weeks)}

---
### ADN DEL CODER — RESULTADOS DEL DIAGNÓSTICO INICIAL
- Nombre: {context.get("coder_name", "Estudiante")}
- Estilo de aprendizaje: **{style["label"]}** ← VARIABLE MAESTRA que define el formato de TODAS las actividades
- Habilidades blandas:
{_skills_portrait(skills, weakest_key)}

---
### REGLAS DE ADAPTACIÓN — ACTIVIDADES TÉCNICAS (Estilo {style["label"].upper()})
{style["tech_format"]}

### REGLAS DE ADAPTACIÓN — ACTIVIDADES DE HABILIDADES BLANDAS
{style["soft_format"]}

### REGLAS ADICIONALES POR PUNTUACIÓN
{_adaptations_block(skills)}

---
### ACTIVIDAD DIARIA OBLIGATORIA DE 20 MIN — FORTALECER: {weakest_label.upper()} ({weakest_score}/5)
{SKILL_EXERCISES[weakest_key]}

---
### INSTRUCCIONES DE GENERACIÓN
1. Genera exactamente 4 semanas, 5 días por semana (20 días en total).
2. Cada día = 1 Actividad Técnica (45 min, formato {style["label"]}) + 1 Actividad de Habilidad Blanda (20 min, foco en {weakest_label}).
3. Las actividades técnicas refuerzan {module_name} comenzando desde la Semana {current_week} del módulo oficial.
4. Tono INTERPRETATIVO: "basado en cómo aprendes y tus resultados iniciales, vamos a trabajar así..."
5. Semana 4 Día 5 = Simulación de Prueba de Desempeño de {module_name}.
6. Sé específico: herramientas reales, pasos concretos, recursos verificables.
7. Idioma: español colombiano, tono motivador y directo.

---
### OUTPUT — JSON ESTRICTO (sin texto antes ni después)
{{
  "plan_type": "interpretive",
  "targeted_soft_skill": "{weakest_key}",
  "learning_style_applied": "{style["label"]}",
  "summary": "2 oraciones que describan este plan y por qué está diseñado así para este coder específico",
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Tema técnico de la semana alineado a {module_name}",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Título concreto y accionable",
            "description": "Pasos específicos adaptados al estilo {style["label"]}",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["Recurso real adaptado al estilo {style["label"]}"]
          }},
          "soft_skill_activity": {{
            "title": "Título del ejercicio de {weakest_label}",
            "skill": "{weakest_key}",
            "description": "Ejercicio práctico y concreto para mejorar {weakest_label}",
            "duration_minutes": 20,
            "reflection_prompt": "Pregunta abierta para que el coder reflexione al terminar"
          }}
        }}
      ]
    }}
  ]
}}
"""


def build_analytical_prompt(context: Dict) -> str:
    """
    SUBSEQUENT PLANS — generated every Monday based on last week's data.

    Required context keys (same as interpretive PLUS):
      current_week      : int    current week number in the module
      average_score     : float  last week's moodle_progress.average_score
      struggling_topics : list   topics where coder struggled last week
      weeks_completed   : list   full history from moodle_progress.weeks_completed
    """
    ss     = context.get("soft_skills", {})
    module = context.get("module", {})
    weeks  = context.get("weeks", [])

    style = _get_style(ss.get("learning_style", "mixed"))

    skills = {
        "autonomy":        ss.get("autonomy", 3),
        "time_management": ss.get("time_management", 3),
        "problem_solving": ss.get("problem_solving", 3),
        "communication":   ss.get("communication", 3),
        "teamwork":        ss.get("teamwork", 3),
    }
    weakest_key, weakest_score = _get_weakest_skill(skills)
    weakest_label = SKILL_LABELS[weakest_key]

    current_week      = context.get("current_week", 2)
    average_score     = context.get("average_score", 0)
    struggling_topics = context.get("struggling_topics", [])
    weeks_completed   = context.get("weeks_completed", [])

    module_name = module.get("name", "Módulo actual")
    module_desc = module.get("description", "Desarrollar competencias en programación.")
    is_critical = module.get("is_critical", False)

    struggling_block = (
        "\n".join(f"  · {t}" for t in struggling_topics)
        if struggling_topics else "  · Sin temas problemáticos reportados."
    )

    # Last 3 weeks of history
    recent = (weeks_completed or [])[-3:]
    history_block = (
        "\n".join(
            f"  Sem {e.get('week','?')}: score={e.get('average_score','?')} | "
            f"dificultades={', '.join(e.get('struggling_topics', [])) or 'ninguna'}"
            for e in recent
        ) if recent else "  Sin historial previo."
    )

    return f"""
### ROL
Eres Kairo, el Arquitecto Educativo de Riwi.
Tienes en frente los datos de rendimiento de la semana pasada de un coder activo.
Tu tarea: generar un Plan Complementario ANALÍTICO de 4 semanas que corrija los problemas detectados y consolide el progreso.

Este plan COMPLEMENTA el currículo oficial en Moodle. El coder inicia ahora la Semana {current_week}.

---
### ANÁLISIS DE LA SEMANA PASADA
- Score semanal: {_score_analysis(average_score)}
- Tendencia histórica: {_detect_trend(weeks_completed)}
- Temas con dificultades detectadas:
{struggling_block}

### HISTORIAL RECIENTE (últimas 3 semanas)
{history_block}

---
### MÓDULO OFICIAL
- Módulo: {module_name}
- Objetivo: {module_desc}
- Semana actual: {current_week}
- Ritmo avanzado: {"Sí" if is_critical else "No"}

### SEMANAS DEL MÓDULO
{_weeks_block(weeks)}

---
### ADN DEL CODER — PERFIL PERMANENTE DEL ONBOARDING
- Nombre: {context.get("coder_name", "Estudiante")}
- Estilo de aprendizaje: **{style["label"]}** ← VARIABLE MAESTRA
- Habilidades blandas:
{_skills_portrait(skills, weakest_key)}

---
### REGLAS DE ADAPTACIÓN — ACTIVIDADES TÉCNICAS (Estilo {style["label"].upper()})
{style["tech_format"]}

### ACTIVIDAD DIARIA OBLIGATORIA DE 20 MIN — FORTALECER: {weakest_label.upper()} ({weakest_score}/5)
{SKILL_EXERCISES[weakest_key]}

---
### INSTRUCCIONES DE GENERACIÓN
1. Genera exactamente 4 semanas, 5 días por semana (20 días en total).
2. Cada día = 1 Actividad Técnica (45 min) + 1 Actividad de Habilidad Blanda (20 min, foco en {weakest_label}).
3. La SEMANA 1 del plan aborda DIRECTAMENTE los temas con dificultades: {", ".join(struggling_topics) or "ninguno reportado"}.
4. Si score < 70: más guía, pasos detallados, actividades de recuperación explícitas.
5. Si score >= 85: aumenta dificultad, agrega retos de profundidad.
6. Tono ANALÍTICO: "la semana pasada detectamos X, esta semana lo atacamos así..."
7. Semana 4 Día 5 = Simulación de Prueba de Desempeño de {module_name}.
8. Sé específico: herramientas reales, pasos concretos, recursos verificables.
9. Idioma: español colombiano, tono directo y motivador.

---
### OUTPUT — JSON ESTRICTO (sin texto antes ni después)
{{
  "plan_type": "analytical",
  "targeted_soft_skill": "{weakest_key}",
  "learning_style_applied": "{style["label"]}",
  "summary": "2 oraciones: qué detectaste la semana pasada y cómo este plan lo aborda",
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Tema técnico — prioriza los temas con dificultades si los hay",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Título concreto",
            "description": "Pasos específicos adaptados al estilo {style["label"]} y al nivel de rendimiento detectado",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["Recurso real y específico"]
          }},
          "soft_skill_activity": {{
            "title": "Título del ejercicio de {weakest_label}",
            "skill": "{weakest_key}",
            "description": "Ejercicio práctico concreto para mejorar {weakest_label}",
            "duration_minutes": 20,
            "reflection_prompt": "Pregunta abierta para reflexionar al terminar"
          }}
        }}
      ]
    }}
  ]
}}
"""

# ── MODULE → LANGUAGE MAPPING ────────────────────────────────────────────────
MODULE_LANGUAGE = {
    "python":          "python",
    "html":            "html",
    "html/css":        "html",
    "css":             "html",
    "javascript":      "javascript",
    "js":              "javascript",
    "base de datos":   "sql",
    "bases de datos":  "sql",
    "sql":             "sql",
    "database":        "sql",
}

def _detect_language(module_name: str) -> str:
    """Derives Monaco editor language from module name."""
    name = (module_name or "").lower().strip()
    for key, lang in MODULE_LANGUAGE.items():
        if key in name:
            return lang
    return "sql"

# ── EXERCISE PROMPT ───────────────────────────────────────────────────────────
def build_exercise_prompt(context: Dict) -> str:
    """
    Generates a single coding exercise for a specific plan day.
    Adapts difficulty, format, and hints to the coder's profile.

    Required context keys:
      topic          : str   (technical_activity.title del día)
      description    : str   (technical_activity.description del día)
      language       : str   (sql | python | javascript | html)
      difficulty     : str   (beginner | intermediate | advanced)
      learning_style : str
      module_name    : str
      coder_name     : str
      week_number    : int
      day_number     : int
      soft_skills    : dict  (para adaptar hints según habilidades)
    """
    ss        = context.get("soft_skills", {})
    style     = _get_style(context.get("learning_style", "mixed"))
    language  = context.get("language", "sql")
    difficulty= context.get("difficulty", "intermediate")
    topic     = context.get("topic", "tema del módulo")
    desc      = context.get("description", "")
    module    = context.get("module_name", "Módulo actual")
    day       = context.get("day_number", 1)
    week      = context.get("week_number", 1)
    name      = context.get("coder_name", "Estudiante")

    # Adaptar número de hints a autonomía del coder
    autonomy = ss.get("autonomy", 3)
    hint_count = 3 if autonomy <= 2 else 2 if autonomy == 3 else 1

    lang_instructions = {
        "sql": (
            "El ejercicio debe usar sintaxis PostgreSQL estándar. "
            "starter_code debe incluir el esquema CREATE TABLE o WITH necesario para que sea autocontenido. "
            "solution debe ser una query válida y ejecutable."
        ),
        "python": (
            "El ejercicio debe ser autocontenido: no dependencias externas. "
            "starter_code incluye la firma de la función y docstring. "
            "solution completa la función con implementación real."
        ),
        "javascript": (
            "Vanilla JS, sin frameworks. starter_code incluye la función con comentarios guía. "
            "solution completa la lógica con código limpio y legible."
        ),
        "html": (
            "HTML5 + CSS inline o en <style>. starter_code incluye estructura base. "
            "solution completa el diseño solicitado."
        ),
    }.get(language, "")

    style_adaptation = {
        "visual":       "El enunciado debe usar analogías visuales y describir el resultado esperado visualmente.",
        "kinesthetic":  "El enunciado arranca directo al código: 'Escribe X que haga Y'. Sin teoría.",
        "reading":      "El enunciado puede incluir contexto y referencias breves a documentación.",
        "auditory":     "El enunciado describe el problema como si se lo explicaras a alguien en voz alta.",
        "mixed":        "El enunciado combina contexto breve + descripción del resultado esperado.",
    }.get(style["label"].lower(), "")

    return f"""
### ROL
Eres Kairo, el evaluador técnico de Riwi. Tu tarea: generar UN ejercicio de código
práctico y evaluable para el Día {day} (Semana {week}) del plan de {name}.

---
### CONTEXTO DEL DÍA
- Módulo: {module}
- Semana del plan: {week}  |  Día: {day}
- Actividad técnica del día: {topic}
- Descripción de la actividad: {desc}
- Lenguaje: {language.upper()}
- Dificultad: {difficulty}
- Estilo de aprendizaje: {style["label"]}

---
### REGLAS DE LENGUAJE ({language.upper()})
{lang_instructions}

### ADAPTACIÓN AL ESTILO DE APRENDIZAJE
{style_adaptation}

### ADAPTACIÓN A HABILIDADES BLANDAS
- Autonomía del coder: {autonomy}/5 → incluir exactamente {hint_count} hints ({"detallados y progresivos" if autonomy <= 2 else "concisos" if autonomy == 3 else "solo el primero, el resto lo descubre solo"}).
- Resolución de problemas: {ss.get("problem_solving", 3)}/5 → {"incluir comentarios guía en starter_code" if ss.get("problem_solving", 3) <= 2 else "starter_code limpio sin pistas en comentarios"}.

---
### INSTRUCCIONES
1. El ejercicio debe cubrir exactamente el tema: "{topic}".
2. starter_code debe ser código real que el coder puede ejecutar/modificar inmediatamente.
3. solution debe ser la solución completa y correcta.
4. hints: {hint_count} pistas progresivas (la primera obvia, la última casi revela la solución).
5. expected_output: descripción textual del resultado correcto (no necesariamente el valor exacto).
6. El ejercicio debe ser resolvible en 20-30 minutos.
7. Idioma del enunciado: español colombiano.

---
### OUTPUT — JSON ESTRICTO
{{
  "title": "Título del ejercicio — específico y accionable",
  "description": "Enunciado completo del ejercicio adaptado al estilo {style["label"]}. Incluye el contexto y lo que se espera lograr.",
  "language": "{language}",
  "difficulty": "{difficulty}",
  "topic": "{topic}",
  "starter_code": "código inicial que el coder modifica — autocontenido y ejecutable",
  "solution": "solución completa y correcta",
  "expected_output": "descripción del resultado esperado cuando la solución es correcta",
  "hints": [
    "Hint 1: el más obvio",
    "Hint 2: más específico",
    "Hint 3: casi revela la respuesta"
  ]
}}
"""
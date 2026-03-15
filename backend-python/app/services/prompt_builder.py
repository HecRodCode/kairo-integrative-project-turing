"""
app/services/prompt_builder.py
IMPROVED: Resources now come from verified catalog, never invented by the LLM.
Performance test day has specific instructions and resources.
Prompts are more specific and less generic.
"""

from typing import Dict, List, Tuple
from app.services.resource_catalog import (
    get_resources_for_module,
    get_performance_test_resources,
    format_resources_for_prompt,
)

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

# IMPROVED: Builds a per-week resource block so the LLM uses real URLs
def _build_verified_resources_block(module_name: str, style_label: str, weeks: List[Dict]) -> str:
    """
    Generates a block of verified resources per week topic.
    The LLM is instructed to pick from these — never invent.
    """
    lines = ["RECURSOS VERIFICADOS POR SEMANA (usa EXACTAMENTE estas URLs, no inventes otras):"]
    for week in weeks[:4]:
        week_num = week.get("week_number", "?")
        resources = get_resources_for_module(module_name, style_label, count=3)
        formatted  = "\n    ".join(
            f'- {r["title"]}: {r["url"]}' for r in resources
        )
        lines.append(f"\n  Semana {week_num}:\n    {formatted}")
    return "\n".join(lines)

def _build_performance_day_resources(module_name: str) -> str:
    """Resources specifically for Week 4 Day 5 performance simulation."""
    resources = get_performance_test_resources(module_name)
    return "\n".join(f'  - {r["title"]}: {r["url"]}' for r in resources)


# ── Public API ────────────────────────────────────────────────────────────────

def build_interpretive_prompt(context: Dict) -> str:
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
    coder_name   = context.get("coder_name", "Estudiante")

    # IMPROVED: Build verified resource catalog for this module + style
    verified_resources = _build_verified_resources_block(module_name, style["label"], weeks)
    perf_resources     = _build_performance_day_resources(module_name)

    return f"""
### ROL
Eres Kairo, el Arquitecto Educativo de Riwi — bootcamp de programación de alto rendimiento en Colombia.
Acabas de recibir el diagnóstico inicial de {coder_name}.
Tu tarea: generar un Plan Complementario INTERPRETATIVO de 4 semanas personalizado para este coder.

Este plan COMPLEMENTA (no reemplaza) el currículo oficial en Moodle.
El coder está en la Semana {current_week} del módulo oficial.

---
### MÓDULO OFICIAL
- Módulo: {module_name}
- Objetivo: {module_desc}
- Ritmo avanzado: {"Sí — actividades más exigentes y menos guía" if is_critical else "No — ritmo normal"}
- Semana actual en Moodle: {current_week}

### SEMANAS DEL MÓDULO
{_weeks_block(weeks)}

---
### ADN DE {coder_name.upper()} — RESULTADOS DEL DIAGNÓSTICO
- Estilo de aprendizaje: **{style["label"]}** ← define el FORMAT de TODAS las actividades técnicas
- Habilidades blandas:
{_skills_portrait(skills, weakest_key)}

---
### REGLAS DE FORMATO — ACTIVIDADES TÉCNICAS (estilo {style["label"].upper()})
{style["tech_format"]}

### REGLAS DE FORMATO — ACTIVIDADES DE HABILIDADES BLANDAS
{style["soft_format"]}

### ADAPTACIONES ADICIONALES POR PUNTUACIÓN
{_adaptations_block(skills)}

---
### ACTIVIDAD DIARIA DE 20 MIN — FORTALECER: {weakest_label.upper()} ({weakest_score}/5)
{SKILL_EXERCISES[weakest_key]}

---
### REGLA CRÍTICA DE RECURSOS — LEE ESTO ANTES DE GENERAR
PROHIBIDO inventar URLs. Solo puedes usar las URLs de la lista siguiente.
Si una URL no aplica al tema del día, elige la más relevante de la lista.
Usar una URL inventada o no existente es un error crítico que arruina el plan.

{verified_resources}

---
### SEMANA 4 DÍA 5 — SIMULACIÓN DE PRUEBA DE DESEMPEÑO (OBLIGATORIO)
El último día del plan es SIEMPRE una simulación de prueba de {module_name}.
Este día es especial: no tiene actividad de habilidad blanda normal.
En su lugar, usa esta estructura específica:
- technical_activity.title: "Simulación de Prueba de Desempeño — {module_name}"
- technical_activity.description: "Resuelve los siguientes ejercicios bajo condiciones de prueba real: sin ayuda externa, con tiempo limitado a 45 minutos. Al terminar, compara tus respuestas con la solución y evalúa tu nivel de preparación."
- technical_activity.difficulty: "advanced"
- technical_activity.resources: (usa los siguientes recursos verificados)
{perf_resources}
- soft_skill_activity.title: "Autoevaluación post-prueba"
- soft_skill_activity.description: "Reflexiona sobre tu desempeño: ¿qué temas dominaste? ¿cuáles necesitas reforzar? Escribe un plan de acción concreto para las áreas débiles."
- soft_skill_activity.reflection_prompt: "¿Qué ejercicio te resultó más difícil y por qué? ¿Qué cambiarías en tu preparación si pudieras empezar de nuevo?"

---
### INSTRUCCIONES DE GENERACIÓN
1. Genera exactamente 4 semanas, 5 días por semana (20 días en total).
2. Cada día = 1 Actividad Técnica (45 min, formato {style["label"]}) + 1 Actividad de Habilidad Blanda (20 min, foco en {weakest_label}).
3. Las actividades técnicas avanzan progresivamente desde la Semana {current_week} del módulo.
4. Semana 1: conceptos base del módulo actual. Semana 2-3: profundización. Semana 4: integración y prueba.
5. Tono INTERPRETATIVO: "basado en cómo aprendes y tus resultados, vamos a trabajar así..."
6. Sé específico: pasos concretos, herramientas reales, ejercicios accionables en 45 minutos.
7. Varía las actividades — no repitas el mismo tipo de ejercicio dos días seguidos.
8. Idioma: español colombiano, tono motivador y directo.
9. SOLO usa las URLs del catálogo de recursos verificados de arriba.

---
### OUTPUT — JSON ESTRICTO (sin texto antes ni después, sin markdown)
{{
  "plan_type": "interpretive",
  "targeted_soft_skill": "{weakest_key}",
  "learning_style_applied": "{style["label"]}",
  "summary": "2 oraciones específicas sobre {coder_name}: qué detectó el diagnóstico y cómo este plan lo aborda",
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Tema técnico específico de {module_name} para la semana 1",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Título concreto y accionable — NO genérico",
            "description": "Pasos específicos en formato {style["label"]}. Mínimo 3 pasos concretos.",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["URL exacta del catálogo verificado"]
          }},
          "soft_skill_activity": {{
            "title": "Nombre del ejercicio de {weakest_label}",
            "skill": "{weakest_key}",
            "description": "Ejercicio concreto y específico — no vago, con pasos claros",
            "duration_minutes": 20,
            "reflection_prompt": "Pregunta abierta específica al tema del día"
          }}
        }}
      ]
    }}
  ]
}}
"""


def build_analytical_prompt(context: Dict) -> str:
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
    weakest_label   = SKILL_LABELS[weakest_key]
    current_week    = context.get("current_week", 2)
    average_score   = context.get("average_score", 0)
    struggling      = context.get("struggling_topics", [])
    weeks_completed = context.get("weeks_completed", [])
    module_name     = module.get("name", "Módulo actual")
    module_desc     = module.get("description", "")
    is_critical     = module.get("is_critical", False)
    coder_name      = context.get("coder_name", "Estudiante")

    struggling_block = (
        "\n".join(f"  · {t}" for t in struggling)
        if struggling else "  · Sin temas problemáticos reportados."
    )
    recent = (weeks_completed or [])[-3:]
    history_block = (
        "\n".join(
            f"  Sem {e.get('week','?')}: score={e.get('average_score','?')} | "
            f"dificultades={', '.join(e.get('struggling_topics', [])) or 'ninguna'}"
            for e in recent
        ) if recent else "  Sin historial previo."
    )

    # IMPROVED: Verified resources
    verified_resources = _build_verified_resources_block(module_name, style["label"], weeks)
    perf_resources     = _build_performance_day_resources(module_name)

    # IMPROVED: Specific recovery guidance based on score
    recovery_guidance = ""
    if average_score < 50:
        recovery_guidance = (
            f"ALERTA: Score muy bajo ({average_score:.1f}). "
            "Semana 1 debe ser de RECUPERACIÓN TOTAL: conceptos base, muchos ejemplos, "
            "pasos muy detallados. No avances hasta consolidar lo fundamental."
        )
    elif average_score < 70:
        recovery_guidance = (
            f"Score medio ({average_score:.1f}). "
            "Semana 1 refuerza exactamente los temas con dificultades. "
            "Semana 2 consolida. Semanas 3-4 avanzan con mayor profundidad."
        )
    else:
        recovery_guidance = (
            f"Buen score ({average_score:.1f}). "
            "Aumenta progresivamente la dificultad. "
            "Menos guía, más autonomía, retos más complejos."
        )

    return f"""
### ROL
Eres Kairo, el Arquitecto Educativo de Riwi.
Tienes los datos de rendimiento de la semana pasada de {coder_name}.
Genera un Plan Complementario ANALÍTICO de 4 semanas que corrija los problemas detectados.

---
### ANÁLISIS DE LA SEMANA PASADA
- Score: {_score_analysis(average_score)}
- Tendencia: {_detect_trend(weeks_completed)}
- Temas con dificultades:
{struggling_block}
- Guía de recuperación: {recovery_guidance}

### HISTORIAL (últimas 3 semanas)
{history_block}

---
### MÓDULO OFICIAL
- Módulo: {module_name} | Semana actual: {current_week}
- Objetivo: {module_desc}
- Ritmo avanzado: {"Sí" if is_critical else "No"}

### SEMANAS DEL MÓDULO
{_weeks_block(weeks)}

---
### ADN DE {coder_name.upper()} — PERFIL PERMANENTE
- Estilo: **{style["label"]}** ← VARIABLE MAESTRA
- Habilidades blandas:
{_skills_portrait(skills, weakest_key)}

---
### REGLAS DE FORMATO
{style["tech_format"]}

### ACTIVIDAD DIARIA — {weakest_label.upper()} ({weakest_score}/5)
{SKILL_EXERCISES[weakest_key]}

---
### REGLA CRÍTICA DE RECURSOS
PROHIBIDO inventar URLs. Solo puedes usar las URLs verificadas del catálogo siguiente.

{verified_resources}

---
### SEMANA 4 DÍA 5 — SIMULACIÓN DE PRUEBA DE DESEMPEÑO
Igual que el plan interpretivo: día especial de simulación con recursos verificados.
- technical_activity.title: "Simulación de Prueba de Desempeño — {module_name}"
- technical_activity.resources:
{perf_resources}
- soft_skill_activity: autoevaluación post-prueba (reflexión sobre el desempeño)

---
### INSTRUCCIONES
1. Exactamente 4 semanas × 5 días = 20 días.
2. Semana 1 DEBE atacar directamente: {", ".join(struggling) or "los temas del módulo actual"}.
3. Progresión: Semana 1 recupera → Semana 2 consolida → Semana 3 profundiza → Semana 4 integra y simula.
4. Tono ANALÍTICO: "la semana pasada detectamos X, esta semana lo atacamos con Y..."
5. ⚠️ SOLO URLs del catálogo verificado.
6. Idioma: español colombiano, tono directo.

---
### OUTPUT — JSON ESTRICTO
{{
  "plan_type": "analytical",
  "targeted_soft_skill": "{weakest_key}",
  "learning_style_applied": "{style["label"]}",
  "summary": "2 oraciones: qué detectaste la semana pasada y cómo este plan específico lo resuelve para {coder_name}",
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Recuperación en: {', '.join(struggling[:2]) if struggling else 'temas del módulo'}",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "Título específico al tema con dificultad detectada",
            "description": "Pasos concretos adaptados al score {average_score:.0f}/100 y estilo {style['label']}",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["URL exacta del catálogo"]
          }},
          "soft_skill_activity": {{
            "title": "Ejercicio de {weakest_label}",
            "skill": "{weakest_key}",
            "description": "Ejercicio concreto",
            "duration_minutes": 20,
            "reflection_prompt": "Pregunta específica al tema del día"
          }}
        }}
      ]
    }}
  ]
}}
"""


# ── Exercise prompt — unchanged except resource rule ─────────────────────────
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
    name = (module_name or "").lower().strip()
    for key, lang in MODULE_LANGUAGE.items():
        if key in name:
            return lang
    return "sql"


def build_exercise_prompt(context: Dict) -> str:
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
    autonomy  = ss.get("autonomy", 3)
    hint_count = 3 if autonomy <= 2 else 2 if autonomy == 3 else 1

    # IMPROVED: Exercise for performance simulation day (day 20 or day 5 of week 4)
    is_perf_day = (day == 20) or (week == 4 and day % 5 == 0)
    perf_instructions = ""
    if is_perf_day:
        perf_instructions = """
ESTE ES EL EJERCICIO DE SIMULACIÓN DE PRUEBA DE DESEMPEÑO.
Debe ser más largo y complejo que los ejercicios normales.
Combina múltiples conceptos del módulo en un solo ejercicio integrador.
El starter_code debe incluir un escenario realista completo.
No dar pistas fáciles — simula condiciones reales de evaluación.
"""

    lang_instructions = {
        "sql": (
            "El ejercicio debe usar sintaxis PostgreSQL estándar. "
            "starter_code debe incluir el esquema CREATE TABLE o WITH necesario para ser autocontenido. "
            "solution debe ser una query válida y ejecutable."
        ),
        "python": (
            "Autocontenido, sin dependencias externas. "
            "starter_code incluye la firma de la función y docstring. "
            "solution completa la función."
        ),
        "javascript": (
            "Vanilla JS. starter_code incluye la función con comentarios guía. "
            "solution completa la lógica."
        ),
        "html": (
            "HTML5 + CSS inline o en <style>. starter_code incluye estructura base. "
            "solution completa el diseño."
        ),
    }.get(language, "")

    style_adaptation = {
        "visual":      "El enunciado usa analogías visuales y describe el resultado esperado visualmente.",
        "kinesthetic": "El enunciado arranca directo: 'Escribe X que haga Y'. Sin teoría previa.",
        "reading":     "El enunciado incluye contexto técnico y referencias a conceptos clave.",
        "auditory":    "El enunciado describe el problema como si se lo explicaras a alguien en voz alta.",
        "mixed":       "El enunciado combina contexto breve + descripción del resultado esperado.",
    }.get(style["label"].lower(), "")

    return f"""
### ROL
Eres Kairo, evaluador técnico de Riwi.
Genera UN ejercicio de código para el Día {day} (Semana {week}) de {name}.
{perf_instructions}
---
### CONTEXTO
- Módulo: {module} | Semana: {week} | Día: {day}
- Actividad técnica: {topic}
- Descripción: {desc}
- Lenguaje: {language.upper()} | Dificultad: {difficulty}
- Estilo: {style["label"]}

### REGLAS DE LENGUAJE ({language.upper()})
{lang_instructions}

### ADAPTACIÓN AL ESTILO
{style_adaptation}

### ADAPTACIÓN A HABILIDADES BLANDAS
- Autonomía {autonomy}/5 → {hint_count} hints ({"detallados y progresivos" if autonomy <= 2 else "concisos" if autonomy == 3 else "solo uno, el resto lo descubre"}).
- Resolución de problemas {ss.get("problem_solving", 3)}/5 → {"comentarios guía en starter_code" if ss.get("problem_solving", 3) <= 2 else "starter_code limpio"}.

---
### INSTRUCCIONES
1. El ejercicio cubre exactamente: "{topic}".
2. starter_code es ejecutable inmediatamente.
3. solution es completa y correcta.
4. {hint_count} hints progresivos (primera obvio, última casi revela la solución).
5. Resolvible en {"40-50" if is_perf_day else "20-30"} minutos.
6. Idioma: español colombiano.

---
### OUTPUT — JSON ESTRICTO
{{
  "title": "Título específico del ejercicio",
  "description": "Enunciado completo adaptado al estilo {style["label"]}",
  "language": "{language}",
  "difficulty": "{difficulty}",
  "topic": "{topic}",
  "starter_code": "código inicial autocontenido y ejecutable",
  "solution": "solución completa y correcta",
  "expected_output": "descripción del resultado esperado",
  "hints": ["hint 1 obvio", "hint 2 más específico", "hint 3 casi revela la solución"]
}}
"""
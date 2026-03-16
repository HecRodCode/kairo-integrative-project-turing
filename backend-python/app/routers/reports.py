"""
app/routers/reports.py
BUG FIX #7: OpenAI → Groq (llama-3.3-70b-versatile)
PDF generation uses fpdf2 (pure Python, no system dependencies).
"""

import os
import io
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from supabase import create_client
from fpdf import FPDF

logger = logging.getLogger("kairo-reports")
router = APIRouter(tags=["TL Reports"])

def _get_clients():
    return (
        Groq(api_key=os.getenv("GROQ_API_KEY")),
        create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    )

# ════════════════════════════════════════
# AI REPORT GENERATION
# ════════════════════════════════════════

class ReportRequest(BaseModel):
    clan:                  str
    tl_id:         Optional[int] = None 
    total_coders:          int
    average_score:         float
    high_risk_count:       int
    top_struggling_topics: list[str] = []
    soft_skills_summary:   dict = {}

@router.post("/generate-report")
async def generate_report(req: ReportRequest):
    """
    Called by Node.js: POST /generate-report
    Generates an AI analytical report for a clan and saves to ai_reports.
    """
    groq_client, supabase = _get_clients()

    try:
        prompt = f"""
Eres un analista de datos educativo para el bootcamp de programación Riwi.
Escribe un informe profesional para el Team Leader del clan '{req.clan}'.

DATOS:
- Total de coders: {req.total_coders}
- Puntaje promedio: {req.average_score:.1f}/100
- Coders en riesgo alto/crítico: {req.high_risk_count}
- Temas con más dificultad: {', '.join(req.top_struggling_topics) if req.top_struggling_topics else 'Ninguno reportado'}
- Promedios de habilidades blandas: {json.dumps(req.soft_skills_summary) if req.soft_skills_summary else 'No disponible'}

Escribe 3 secciones:
1. Resumen del estado actual
2. Principales riesgos y preocupaciones
3. Recomendaciones concretas (3-5 acciones)

Responde SOLO con JSON válido, sin markdown, sin backticks:
{{
    "report_title": "Clan {req.clan} - Informe de Rendimiento",
    "generated_date": "{datetime.now().strftime('%d de %B de %Y')}",
    "risk_level": "low|medium|high|critical",
    "summary": "párrafo sobre el estado actual",
    "risks": "párrafo sobre los riesgos",
    "recommendations": "párrafo sobre lo que debe hacer el TL",
    "action_items": ["acción 1", "acción 2", "acción 3"]
}}
"""

        completion = groq_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": "Eres un analista educativo. Responde solo con JSON válido, sin markdown."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=1000,
            temperature=0.6,
        )

        raw = completion.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        report = json.loads(raw)

        # Save to ai_reports
        supabase.table("ai_reports").insert({
            "target_type":     "clan",
            "target_id":       req.tl_id,
            "summary_text":    report.get("summary", ""),
            "risk_level":      report.get("risk_level", "medium"),
            "recommendations": report.get("recommendations", ""),
            "clan_id":         req.clan,
            "viewed_by_tl":    False,
        }).execute()

        # Log generation
        supabase.table("ai_generation_log").insert({
            "agent_type":     "report_generator",
            "input_payload":  {"clan": req.clan, "total_coders": req.total_coders},
            "output_payload": report,
            "model_name":     os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            "success":        True,
        }).execute()

        return {"success": True, "report": report}

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════
# PDF GENERATION
# ════════════════════════════════════════

@router.get("/generate-pdf/{clan}")
async def generate_clan_pdf(clan: str):
    """
    Called by Node.js: GET /generate-pdf/{clan}
    No AI needed here - pure data + PDF build.
    """
    _, supabase = _get_clients()

    try:
        coders_result = supabase.table("users") \
            .select("id, full_name, email, first_login") \
            .eq("clan", clan) \
            .eq("role", "coder") \
            .execute()

        coders = coders_result.data or []
        if not coders:
            raise HTTPException(status_code=404, detail=f"No coders found in clan '{clan}'")

        coder_ids = [c["id"] for c in coders]

        skills_result = supabase.table("soft_skills_assessment") \
            .select("coder_id, autonomy, time_management, problem_solving, communication, teamwork, learning_style") \
            .in_("coder_id", coder_ids) \
            .execute()
        skills_map = {s["coder_id"]: s for s in (skills_result.data or [])}

        progress_result = supabase.table("moodle_progress") \
            .select("coder_id, average_score, current_week") \
            .in_("coder_id", coder_ids) \
            .execute()
        progress_map = {p["coder_id"]: p for p in (progress_result.data or [])}

        ai_report_result = supabase.table("ai_reports") \
            .select("summary_text, risk_level, recommendations") \
            .eq("clan_id", clan) \
            .order("generated_at", desc=True) \
            .limit(1) \
            .execute()
        ai_report = ai_report_result.data[0] if ai_report_result.data else None


        pdf_bytes = _build_pdf(clan, coders, skills_map, progress_map,ai_report)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=clan_{clan}_report.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════
# PDF GENERATION
# ════════════════════════════════════════

def _sanitize(text: str) -> str:
    return (str(text)
        .replace('\u2014', '-')   # em dash -
        .replace('\u2013', '-')   # en dash -
        .replace('\u201c', '"')   # "
        .replace('\u201d', '"')   # "
        .replace('\u2018', "'")   # '
        .replace('\u2019', "'")   # '
        .replace('\u2026', '...')  # ellipsis …
    )


def _build_pdf(clan: str, coders: list, skills_map: dict, progress_map: dict, ai_report: dict = None) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── PALETA DE COLORES ──
    PURPLE_DARK  = (69, 10, 150)
    PURPLE_MID   = (109, 40, 217)
    PURPLE_LIGHT = (237, 233, 254)
    GRAY_DARK    = (30, 30, 30)
    GRAY_MID     = (80, 80, 80)
    GRAY_LIGHT   = (245, 245, 247)
    WHITE        = (255, 255, 255)
    RED_SOFT     = (185, 28, 28)
    GREEN_SOFT   = (21, 128, 61)

    # ══════════════════════════════
    # HEADER PRINCIPAL
    # ══════════════════════════════
    pdf.set_fill_color(*PURPLE_DARK)
    pdf.rect(0, 0, 210, 38, 'F')

    pdf.set_xy(10, 8)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 10, "KAIRO", ln=False)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(200, 180, 255)
    pdf.set_xy(10, 20)
    pdf.cell(0, 6, "Intelligent Learning Analytics Platform", ln=True)

    # Línea decorativa morada
    pdf.set_fill_color(*PURPLE_MID)
    pdf.rect(0, 38, 210, 3, 'F')

    # Título del reporte
    pdf.set_xy(10, 46)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*GRAY_DARK)
    pdf.cell(0, 9, _sanitize(f"Performance Report - Clan {clan.upper()}"), ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY_MID)
    pdf.cell(0, 5, f"Generated by Kairo AI   |   {datetime.now().strftime('%B %d, %Y  %H:%M')}", ln=True)
    pdf.ln(6)

    # ══════════════════════════════
    # RESUMEN GENERAL (tarjetas)
    # ══════════════════════════════
    scores   = [progress_map.get(c["id"], {}).get("average_score", 0) for c in coders]
    avg      = sum(scores) / len(scores) if scores else 0
    assessed = sum(1 for c in coders if c["id"] in skills_map)
    at_risk  = sum(1 for s in scores if s < 50)

    def _stat_card(x, y, label, value, color):
        pdf.set_fill_color(*color)
        pdf.rect(x, y, 57, 22, 'F')
        pdf.set_xy(x + 3, y + 3)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(*WHITE)
        pdf.cell(51, 8, str(value), ln=True)
        pdf.set_xy(x + 3, y + 12)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(220, 210, 255)
        pdf.cell(51, 6, label)

    y_cards = pdf.get_y()
    _stat_card(10,  y_cards, "Total Coders",          len(coders),        PURPLE_MID)
    _stat_card(70,  y_cards, "Average Score",          f"{avg:.1f}/100",   (79, 70, 229))
    _stat_card(130, y_cards, "Diagnostics Completed",  f"{assessed}/{len(coders)}", (124, 58, 237))

    pdf.ln(28)

    # ══════════════════════════════
    # SECCIÓN: PERFILES DE CODERS
    # ══════════════════════════════
    pdf.set_fill_color(*PURPLE_LIGHT)
    pdf.set_draw_color(*PURPLE_MID)
    pdf.rect(10, pdf.get_y(), 190, 10, 'F')
    pdf.set_xy(13, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*PURPLE_DARK)
    pdf.cell(0, 6, "PERFILES DE CODERS", ln=True)
    pdf.ln(4)

    for i, coder in enumerate(coders):
        cid      = coder["id"]
        ss       = skills_map.get(cid, {})
        progress = progress_map.get(cid, {})
        score    = progress.get("average_score", None)

        # Fondo alterno
        if i % 2 == 0:
            pdf.set_fill_color(*GRAY_LIGHT)
            pdf.rect(10, pdf.get_y(), 190, 36 if ss else 26, 'F')

        # Barra lateral morada
        pdf.set_fill_color(*PURPLE_MID)
        pdf.rect(10, pdf.get_y(), 3, 36 if ss else 26, 'F')

        start_y = pdf.get_y()

        # Nombre
        pdf.set_xy(16, start_y + 3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*PURPLE_DARK)
        pdf.cell(100, 6, _sanitize(coder["full_name"]), ln=False)

        # Score badge
        if score is not None:
            badge_color = GREEN_SOFT if score >= 70 else (202, 138, 4) if score >= 50 else RED_SOFT
            pdf.set_fill_color(*badge_color)
            pdf.set_text_color(*WHITE)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_xy(160, start_y + 3)
            pdf.cell(38, 6, f"Score: {score}/100", fill=True, align='C', ln=True)
        else:
            pdf.ln(6)

        # Email y semana
        pdf.set_xy(16, start_y + 11)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.cell(0, 5, _sanitize(f"Email: {coder['email']}   |   Week: {progress.get('current_week', 'N/A')}"), ln=True)

        # Soft skills
        if ss:
            pdf.set_xy(16, start_y + 18)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*PURPLE_DARK)
            pdf.cell(0, 5, "Soft Skills:", ln=False)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*GRAY_MID)
            skills_text = (
                f"  Autonomy: {ss.get('autonomy','?')}  "
                f"Time Mgmt: {ss.get('time_management','?')}  "
                f"Problem Solving: {ss.get('problem_solving','?')}  "
                f"Communication: {ss.get('communication','?')}  "
                f"Teamwork: {ss.get('teamwork','?')}"
            )
            pdf.cell(0, 5, _sanitize(skills_text), ln=True)

            pdf.set_xy(16, start_y + 25)
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(124, 58, 237)
            pdf.cell(0, 5, _sanitize(f"Learning style: {ss.get('learning_style', 'N/A')}"), ln=True)
        else:
            pdf.set_xy(16, start_y + 18)
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(*RED_SOFT)
            pdf.cell(0, 5, "Diagnostic not completed.", ln=True)

        pdf.ln(6)

    # ══════════════════════════════
    # SECCIÓN: AI ANALYSIS
    # ══════════════════════════════
    if ai_report:
        pdf.set_fill_color(*PURPLE_LIGHT)
        pdf.rect(10, pdf.get_y(), 190, 10, 'F')
        pdf.set_xy(13, pdf.get_y() + 2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*PURPLE_DARK)
        pdf.cell(0, 6, "ANALISIS IA", ln=True)   
        pdf.ln(4)

        risk_colors = {
            "low":      (21, 128, 61),
            "medium":   (202, 138, 4),
            "high":     (185, 28, 28),
            "critical": (109, 10, 10)
        }
        risk = ai_report.get("risk_level", "medium")
        pdf.set_fill_color(*risk_colors.get(risk, (80, 80, 80)))
        pdf.set_text_color(*WHITE)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(50, 7, f"Risk Level: {risk.upper()}", fill=True, align='C', ln=True)
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GRAY_DARK)
        pdf.cell(0, 6, "Resumen:", ln=True)  
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.multi_cell(190, 5, _sanitize(ai_report.get("summary_text", "")))
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GRAY_DARK)
        pdf.cell(0, 6, "Recomendaciones:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.multi_cell(190, 5, _sanitize(ai_report.get("recommendations", "")))
        pdf.ln(6)


    # ══════════════════════════════
    # FOOTER
    # ══════════════════════════════
    pdf.set_y(-18)
    pdf.set_fill_color(*PURPLE_DARK)
    pdf.rect(0, pdf.get_y(), 210, 18, 'F')
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(180, 160, 230)
    pdf.cell(0, 18, f"  Kairo AI Platform  |  Confidential Report  |  {datetime.now().strftime('%Y')}  |  Clan {clan.upper()}", align='C')

    return bytes(pdf.output())


# ════════════════════════════════════════
# AI REPORT GENERATION - CODER
# ════════════════════════════════════════

class CoderReportRequest(BaseModel):
    coder_id: int

@router.post("/generate-report-coder")
async def generate_report_coder(req: CoderReportRequest):
    """
    POST /generate-report-coder
    Genera un informe de IA personalizado para un coder y lo guarda en ai_reports.
    """
    groq_client, supabase = _get_clients()

    try:
        # ── Consultar datos del coder ──
        coder_result = supabase.table("users") \
            .select("id, full_name, email, clan") \
            .eq("id", req.coder_id) \
            .single() \
            .execute()

        if not coder_result.data:
            raise HTTPException(status_code=404, detail=f"Coder con id '{req.coder_id}' no encontrado")

        coder = coder_result.data

        # ── Consultar habilidades blandas ──
        skills_result = supabase.table("soft_skills_assessment") \
            .select("autonomy, time_management, problem_solving, communication, teamwork, learning_style") \
            .eq("coder_id", req.coder_id) \
            .execute()
        skills = skills_result.data[0] if skills_result.data else None

        # ── Consultar progreso en Moodle ──
        progress_result = supabase.table("moodle_progress") \
            .select("average_score, current_week, struggling_topics") \
            .eq("coder_id", req.coder_id) \
            .execute()
        progress = progress_result.data[0] if progress_result.data else None

        # ── Consultar flags de riesgo ──
        risk_result = supabase.table("risk_flags") \
            .select("risk_level, reason, detected_at") \
            .eq("coder_id", req.coder_id) \
            .eq("resolved", False) \
            .execute()
        risk_flags = risk_result.data or []

        # ── Construir prompt ──
        skills_text = (
            f"Autonomía: {skills.get('autonomy')}/5, "
            f"Gestión del tiempo: {skills.get('time_management')}/5, "
            f"Resolución de problemas: {skills.get('problem_solving')}/5, "
            f"Comunicación: {skills.get('communication')}/5, "
            f"Trabajo en equipo: {skills.get('teamwork')}/5, "
            f"Estilo de aprendizaje: {skills.get('learning_style')}"
        ) if skills else "No disponible"

        progress_text = (
            f"Puntaje promedio: {progress.get('average_score')}/100, "
            f"Semana actual: {progress.get('current_week')}, "
            f"Temas con dificultad: {progress.get('struggling_topics', [])}"
        ) if progress else "No disponible"

        risk_text = (
            ", ".join([f"{r['risk_level']}: {r['reason']}" for r in risk_flags])
        ) if risk_flags else "Sin alertas activas"

        prompt = f"""
Eres un analista educativo especializado del bootcamp de programación Riwi.
Genera un informe detallado y personalizado para el coder '{coder['full_name']}' del clan '{coder['clan']}'.

DATOS DEL CODER:
- Nombre: {coder['full_name']}
- Clan: {coder['clan']}
- Progreso académico: {progress_text}
- Habilidades blandas: {skills_text}
- Alertas de riesgo activas: {risk_text}

Escribe un informe en 3 secciones considerando TODOS los datos disponibles:
1. Estado actual del coder (académico y habilidades blandas)
2. Riesgos identificados y áreas de mejora
3. Plan de acción personalizado (3-5 recomendaciones específicas para este coder)

Sé específico y menciona los datos reales del coder en el análisis.

Responde SOLO con JSON válido, sin markdown, sin backticks:
{{
    "report_title": "Informe de Rendimiento - {coder['full_name']}",
    "generated_date": "{datetime.now().strftime('%d de %B de %Y')}",
    "risk_level": "low|medium|high|critical",
    "summary": "párrafo detallado sobre el estado actual del coder",
    "risks": "párrafo sobre riesgos y áreas de mejora identificadas",
    "recommendations": "párrafo con plan de acción personalizado para el coder",
    "action_items": ["acción específica 1", "acción específica 2", "acción específica 3"]
}}
"""

        completion = groq_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": "Eres un analista educativo experto. Responde solo con JSON válido, sin markdown."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=1200,
            temperature=0.6,
        )

        raw = completion.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        report = json.loads(raw)

        # ── Guardar en ai_reports ──
        supabase.table("ai_reports").insert({
            "target_type":     "coder",
            "target_id":       req.tl_id or 0,
            "summary_text":    report.get("summary", ""),
            "risk_level":      report.get("risk_level", "medium"),
            "recommendations": report.get("recommendations", ""),
            "clan_id":         coder.get("clan"),
            "viewed_by_tl":    False,
        }).execute()

        # ── Log ──
        supabase.table("ai_generation_log").insert({
            "agent_type":     "report_generator",
            "input_payload":  {"coder_id": req.coder_id, "full_name": coder['full_name']},
            "output_payload": report,
            "model_name":     os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            "success":        True,
        }).execute()

        return {"success": True, "report": report}

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="La IA devolvió JSON inválido")
    except Exception as e:
        logger.error(f"Coder report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


        # ════════════════════════════════════════
# PDF GENERATION - CODER
# ════════════════════════════════════════

@router.get("/generate-pdf-coder/{coder_id}")
async def generate_coder_pdf(coder_id: int):
    """
    GET /generate-pdf-coder/{coder_id}
    Consulta Supabase y genera PDF personalizado para el coder.
    """
    _, supabase = _get_clients()

    try:
        # ── Datos del coder ──
        coder_result = supabase.table("users") \
            .select("id, full_name, email, clan") \
            .eq("id", coder_id) \
            .single() \
            .execute()

        if not coder_result.data:
            raise HTTPException(status_code=404, detail=f"Coder '{coder_id}' no encontrado")

        coder = coder_result.data

        # ── Habilidades blandas ──
        skills_result = supabase.table("soft_skills_assessment") \
            .select("autonomy, time_management, problem_solving, communication, teamwork, learning_style") \
            .eq("coder_id", coder_id) \
            .execute()
        skills = skills_result.data[0] if skills_result.data else None

        # ── Progreso ──
        progress_result = supabase.table("moodle_progress") \
            .select("average_score, current_week, struggling_topics") \
            .eq("coder_id", coder_id) \
            .execute()
        progress = progress_result.data[0] if progress_result.data else None

        # ── Alertas de riesgo ──
        risk_result = supabase.table("risk_flags") \
            .select("risk_level, reason, detected_at") \
            .eq("coder_id", coder_id) \
            .eq("resolved", False) \
            .execute()
        risk_flags = risk_result.data or []

        # ── Reporte IA más reciente ──
        ai_report_result = supabase.table("ai_reports") \
            .select("summary_text, risk_level, recommendations") \
            .eq("target_id", coder_id) \
            .eq("target_type", "coder") \
            .order("generated_at", desc=True) \
            .limit(1) \
            .execute()
        ai_report = ai_report_result.data[0] if ai_report_result.data else None

        pdf_bytes = _build_pdf_coder(coder, skills, progress, risk_flags, ai_report)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=informe_coder_{coder_id}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Coder PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _build_pdf_coder(coder: dict, skills: dict, progress: dict, risk_flags: list, ai_report: dict = None) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── PALETA DE COLORES ──
    PURPLE_DARK  = (69, 10, 150)
    PURPLE_MID   = (109, 40, 217)
    PURPLE_LIGHT = (237, 233, 254)
    GRAY_DARK    = (30, 30, 30)
    GRAY_MID     = (80, 80, 80)
    GRAY_LIGHT   = (245, 245, 247)
    WHITE        = (255, 255, 255)
    RED_SOFT     = (185, 28, 28)
    GREEN_SOFT   = (21, 128, 61)
    YELLOW_SOFT  = (202, 138, 4)

    # ══════════════════════════════
    # HEADER
    # ══════════════════════════════
    pdf.set_fill_color(*PURPLE_DARK)
    pdf.rect(0, 0, 210, 38, 'F')

    pdf.set_xy(10, 8)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 10, "KAIRO", ln=False)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(200, 180, 255)
    pdf.set_xy(10, 20)
    pdf.cell(0, 6, "Intelligent Learning Analytics Platform", ln=True)

    pdf.set_fill_color(*PURPLE_MID)
    pdf.rect(0, 38, 210, 3, 'F')

    pdf.set_xy(10, 46)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*GRAY_DARK)
    pdf.cell(0, 9, _sanitize(f"Informe de Rendimiento - {coder['full_name']}"), ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY_MID)
    pdf.cell(0, 5, f"Generado por Kairo AI   |   {datetime.now().strftime('%d de %B de %Y  %H:%M')}   |   Clan: {_sanitize(coder.get('clan', 'N/A').upper())}", ln=True)
    pdf.ln(6)

    # ══════════════════════════════
    # TARJETAS DE ESTADÍSTICAS
    # ══════════════════════════════
    score = progress.get("average_score", 0) if progress else 0
    week  = progress.get("current_week", "N/A") if progress else "N/A"
    score_color = GREEN_SOFT if score >= 70 else YELLOW_SOFT if score >= 50 else RED_SOFT

    def _stat_card(x, y, label, value, color):
        pdf.set_fill_color(*color)
        pdf.rect(x, y, 57, 22, 'F')
        pdf.set_xy(x + 3, y + 3)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(*WHITE)
        pdf.cell(51, 8, str(value), ln=True)
        pdf.set_xy(x + 3, y + 12)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(220, 210, 255)
        pdf.cell(51, 6, label)

    y_cards = pdf.get_y()
    _stat_card(10,  y_cards, "Puntaje Promedio",   f"{score}/100",  score_color)
    _stat_card(70,  y_cards, "Semana Actual",       str(week),       PURPLE_MID)
    _stat_card(130, y_cards, "Alertas Activas",     len(risk_flags), RED_SOFT if risk_flags else GREEN_SOFT)
    pdf.ln(28)

    # ══════════════════════════════
    # INFORMACIÓN PERSONAL
    # ══════════════════════════════
    pdf.set_fill_color(*PURPLE_LIGHT)
    pdf.rect(10, pdf.get_y(), 190, 10, 'F')
    pdf.set_xy(13, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*PURPLE_DARK)
    pdf.cell(0, 6, "INFORMACION DEL CODER", ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_MID)
    pdf.cell(0, 6, _sanitize(f"Nombre:  {coder['full_name']}"), ln=True)
    pdf.cell(0, 6, _sanitize(f"Email:   {coder['email']}"), ln=True)
    pdf.cell(0, 6, _sanitize(f"Clan:    {coder.get('clan', 'N/A')}"), ln=True)
    pdf.ln(6)

    # ══════════════════════════════
    # HABILIDADES BLANDAS
    # ══════════════════════════════
    pdf.set_fill_color(*PURPLE_LIGHT)
    pdf.rect(10, pdf.get_y(), 190, 10, 'F')
    pdf.set_xy(13, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*PURPLE_DARK)
    pdf.cell(0, 6, "HABILIDADES BLANDAS", ln=True)
    pdf.ln(4)

    if skills:
        skill_items = [
            ("Autonomia",              skills.get("autonomy", "N/A")),
            ("Gestion del tiempo",     skills.get("time_management", "N/A")),
            ("Resolucion de problemas",skills.get("problem_solving", "N/A")),
            ("Comunicacion",           skills.get("communication", "N/A")),
            ("Trabajo en equipo",      skills.get("teamwork", "N/A")),
        ]
        for label, value in skill_items:
            # Barra de progreso
            bar_width = 80
            filled = int((int(value) / 5) * bar_width) if str(value).isdigit() else 0
            y_bar = pdf.get_y() + 1

            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*GRAY_DARK)
            pdf.cell(70, 7, f"{label}:", ln=False)

            pdf.set_fill_color(220, 220, 220)
            pdf.rect(80, y_bar, bar_width, 4, 'F')
            pdf.set_fill_color(*PURPLE_MID)
            pdf.rect(80, y_bar, filled, 4, 'F')

            pdf.set_xy(165, pdf.get_y())
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*PURPLE_DARK)
            pdf.cell(20, 7, f"{value}/5", ln=True)

        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(124, 58, 237)
        pdf.cell(0, 6, _sanitize(f"Estilo de aprendizaje: {skills.get('learning_style', 'N/A')}"), ln=True)
    else:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*RED_SOFT)
        pdf.cell(0, 6, "Diagnostico no completado.", ln=True)

    pdf.ln(6)

    # ══════════════════════════════
    # ALERTAS DE RIESGO
    # ══════════════════════════════
    if risk_flags:
        pdf.set_fill_color(*PURPLE_LIGHT)
        pdf.rect(10, pdf.get_y(), 190, 10, 'F')
        pdf.set_xy(13, pdf.get_y() + 2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*PURPLE_DARK)
        pdf.cell(0, 6, "ALERTAS DE RIESGO", ln=True)
        pdf.ln(4)

        risk_colors = {
            "low":      GREEN_SOFT,
            "medium":   YELLOW_SOFT,
            "high":     RED_SOFT,
            "critical": (109, 10, 10)
        }
        for flag in risk_flags:
            color = risk_colors.get(flag.get("risk_level", "medium"), GRAY_MID)
            pdf.set_fill_color(*color)
            pdf.set_text_color(*WHITE)
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(25, 6, flag.get("risk_level", "").upper(), fill=True, align='C', ln=False)
            pdf.set_text_color(*GRAY_DARK)
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(0, 6, f"  {_sanitize(flag.get('reason', ''))}", ln=True)
        pdf.ln(4)

    # ══════════════════════════════
    # ANÁLISIS IA
    # ══════════════════════════════
    if ai_report:
        pdf.set_fill_color(*PURPLE_LIGHT)
        pdf.rect(10, pdf.get_y(), 190, 10, 'F')
        pdf.set_xy(13, pdf.get_y() + 2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*PURPLE_DARK)
        pdf.cell(0, 6, "ANALISIS IA", ln=True)
        pdf.ln(4)

        risk_badge_colors = {
            "low":      GREEN_SOFT,
            "medium":   YELLOW_SOFT,
            "high":     RED_SOFT,
            "critical": (109, 10, 10)
        }
        risk = ai_report.get("risk_level", "medium")
        pdf.set_fill_color(*risk_badge_colors.get(risk, GRAY_MID))
        pdf.set_text_color(*WHITE)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(50, 7, f"Nivel de Riesgo: {risk.upper()}", fill=True, align='C', ln=True)
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GRAY_DARK)
        pdf.cell(0, 6, "Resumen:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.multi_cell(190, 5, _sanitize(ai_report.get("summary_text", "")))
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GRAY_DARK)
        pdf.cell(0, 6, "Recomendaciones:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.multi_cell(190, 5, _sanitize(ai_report.get("recommendations", "")))
        pdf.ln(6)

    # ══════════════════════════════
    # FOOTER
    # ══════════════════════════════
    pdf.set_y(-18)
    pdf.set_fill_color(*PURPLE_DARK)
    pdf.rect(0, pdf.get_y(), 210, 18, 'F')
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(180, 160, 230)
    pdf.cell(0, 18, f"  Kairo AI Platform  |  Informe Confidencial  |  {datetime.now().strftime('%Y')}  |  {_sanitize(coder['full_name'])}", align='C')

    return bytes(pdf.output())

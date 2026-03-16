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
    tl_id:                 int
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
You are an educational data analyst for Riwi coding bootcamp.
Write a professional report for the Team Leader of clan '{req.clan}'.

DATA:
- Total coders: {req.total_coders}
- Average score: {req.average_score:.1f}/100
- High/critical risk coders: {req.high_risk_count}
- Top struggling topics: {', '.join(req.top_struggling_topics) if req.top_struggling_topics else 'None reported'}
- Soft skills averages: {json.dumps(req.soft_skills_summary) if req.soft_skills_summary else 'Not available'}

Write 3 sections:
1. Current state summary
2. Main risks and concerns
3. Concrete recommendations (3-5 action items)

Return ONLY valid JSON with no markdown, no backticks:
{{
    "report_title": "Clan {req.clan} - Performance Report",
    "generated_date": "{datetime.now().strftime('%B %d, %Y')}",
    "risk_level": "low|medium|high|critical",
    "summary": "paragraph about current state",
    "risks": "paragraph about risks",
    "recommendations": "paragraph about what the TL should do",
    "action_items": ["item 1", "item 2", "item 3"]
}}
"""

        completion = groq_client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": "You are an educational analyst. Respond only with valid JSON, no markdown."},
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
    pdf.cell(0, 6, "CODER PROFILES", ln=True)
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
        pdf.cell(0, 6, "AI ANALYSIS", ln=True)
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
        pdf.cell(0, 6, "Summary:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_MID)
        pdf.multi_cell(190, 5, _sanitize(ai_report.get("summary_text", "")))
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GRAY_DARK)
        pdf.cell(0, 6, "Recommendations:", ln=True)
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

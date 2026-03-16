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
    "report_title": "Clan {req.clan} — Performance Report",
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
    No AI needed here — pure data + PDF build.
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

        pdf_bytes = _build_pdf(clan, coders, skills_map, progress_map)

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


def _build_pdf(clan: str, coders: list, skills_map: dict, progress_map: dict) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_fill_color(109, 40, 217)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 14, f"  Clan {clan.upper()} — Performance Report", fill=True, ln=True)

    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, f"  Generated by Kairo AI · {datetime.now().strftime('%B %d, %Y')}", ln=True)
    pdf.ln(6)

    scores = [progress_map.get(c["id"], {}).get("average_score", 0) for c in coders]
    avg    = sum(scores) / len(scores) if scores else 0
    assessed = sum(1 for c in coders if c["id"] in skills_map)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 8, "Overview", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"Total coders: {len(coders)}", ln=True)
    pdf.cell(0, 7, f"Average score: {avg:.1f}/100", ln=True)
    pdf.cell(0, 7, f"Diagnostics completed: {assessed}/{len(coders)}", ln=True)
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Coder Profiles", ln=True)
    pdf.ln(2)

    for coder in coders:
        cid      = coder["id"]
        ss       = skills_map.get(cid, {})
        progress = progress_map.get(cid, {})

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(109, 40, 217)
        pdf.cell(0, 8, coder["full_name"], ln=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(0, 6, f"Email: {coder['email']}", ln=True)
        pdf.cell(0, 6,
            f"Avg score: {progress.get('average_score', 'N/A')}  |  "
            f"Week: {progress.get('current_week', 'N/A')}", ln=True)

        if ss:
            pdf.cell(0, 6,
                f"Soft skills — Autonomy: {ss.get('autonomy','?')}  "
                f"Time Mgmt: {ss.get('time_management','?')}  "
                f"Problem Solving: {ss.get('problem_solving','?')}  "
                f"Communication: {ss.get('communication','?')}  "
                f"Teamwork: {ss.get('teamwork','?')}",
                ln=True
            )
            pdf.cell(0, 6, f"Learning style: {ss.get('learning_style', 'N/A')}", ln=True)
        else:
            pdf.set_text_color(200, 50, 50)
            pdf.cell(0, 6, "Diagnostic not completed.", ln=True)
            pdf.set_text_color(60, 60, 60)

        pdf.ln(4)
        pdf.set_draw_color(220, 220, 220)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

    return bytes(pdf.output())

"""
app/routers/resources.py

POST /process-resource  — Node llama aquí después de subir el PDF a Storage.
                          Python descarga el PDF, extrae texto, genera embedding,
                          guarda en tabla resources.

POST /search-resources  — Coder busca recursos por topic del día.
                          Genera embedding del topic, hace búsqueda vectorial,
                          retorna top 3 con signed URLs + preview.
"""

import io
import logging
import httpx
from fastapi   import APIRouter, HTTPException
from pydantic  import BaseModel
from typing    import Optional, List

from app.services.embedding_service import embed_text, model_ready
from app.services.supabase_service  import db_manager

logger = logging.getLogger("kairo-resources")
router = APIRouter(tags=["Resources"])

BUCKET = "activity-resources"


# ── DTOs ─────────────────────────────────────────────────────────────────────

class ProcessResourceRequest(BaseModel):
    storage_path: str          # path en el bucket, ej: "module-4/nombre.pdf"
    file_name:    str
    title:        str
    module_id:    Optional[int] = None
    clan_id:      Optional[str] = None
    uploaded_by:  int          # tl_id


class SearchResourcesRequest(BaseModel):
    topic:     str
    module_id: Optional[int] = None
    clan_id:   Optional[str]  = None
    limit:     int            = 3


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_pdf_text(pdf_bytes: bytes, max_chars: int = 3000) -> str:
    """
    Extrae texto del PDF usando pdfplumber.
    Retorna hasta max_chars caracteres (para no sobrepasar el contexto del embedding).
    """
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t.strip())
                if sum(len(p) for p in text_parts) >= max_chars:
                    break
        return "\n".join(text_parts)[:max_chars]
    except Exception as e:
        logger.error(f"[Resources] PDF extraction failed: {e}")
        return ""


def _get_preview(text: str, chars: int = 600) -> str:
    """Primeros `chars` caracteres del texto extraído, limpiados."""
    if not text:
        return ""
    preview = text[:chars].strip()
    # Cortar en el último punto para no dejar una oración partida
    last_dot = preview.rfind(".")
    return preview[:last_dot + 1] if last_dot > chars // 2 else preview


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/process-resource")
async def process_resource(req: ProcessResourceRequest):
    """
    Flujo:
      1. Descargar PDF desde Supabase Storage usando signed URL
      2. Extraer texto con pdfplumber
      3. Generar embedding con sentence-transformers
      4. Guardar en tabla resources
    """
    if not model_ready():
        raise HTTPException(
            status_code=503,
            detail="Embedding model not available. Run: pip install sentence-transformers"
        )

    # ── 1. Signed URL para descargar ─────────────────────────────────────────
    try:
        signed = db_manager.client \
            .storage.from_(BUCKET) \
            .create_signed_url(req.storage_path, 300)  # 5 min
        download_url = signed.get("signedURL") or signed.get("signedUrl")
        if not download_url:
            raise ValueError("No signed URL returned")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage URL error: {e}")

    # ── 2. Descargar PDF ──────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(download_url)
            resp.raise_for_status()
            pdf_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PDF download failed: {e}")

    # ── 3. Extraer texto ──────────────────────────────────────────────────────
    full_text = _extract_pdf_text(pdf_bytes)
    if not full_text.strip():
        logger.warning(f"[Resources] PDF has no extractable text: {req.file_name}")

    preview_text = _get_preview(full_text)

    # ── 4. Embedding ──────────────────────────────────────────────────────────
    # Embedimos título + texto para mejor representación semántica
    embed_input = f"{req.title}\n\n{full_text[:1500]}"
    embedding   = embed_text(embed_input)

    if not embedding:
        raise HTTPException(status_code=500, detail="Embedding generation failed")

    # ── 5. Guardar en DB ──────────────────────────────────────────────────────
    resource_id = db_manager.save_resource(
        module_id    = req.module_id,
        title        = req.title,
        storage_path = req.storage_path,
        file_name    = req.file_name,
        preview_text = preview_text,
        embedding    = embedding,
        uploaded_by  = req.uploaded_by,
        clan_id      = req.clan_id,
    )

    logger.info(
        f"[Resources] Processed | id={resource_id} | "
        f"title='{req.title}' | chars={len(full_text)} | module={req.module_id}"
    )

    return {
        "success":     True,
        "resource_id": resource_id,
        "preview":     preview_text,
        "char_count":  len(full_text),
    }


@router.post("/search-resources")
async def search_resources(req: SearchResourcesRequest):
    """
    Búsqueda semántica por topic del día.
    Retorna top `limit` recursos con signed URL (1h) + preview text.
    """
    if not model_ready():
        return {"success": True, "resources": [], "reason": "model_unavailable"}

    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="topic no puede estar vacío")

    # ── Embedding del topic ───────────────────────────────────────────────────
    query_embedding = embed_text(req.topic)
    if not query_embedding:
        return {"success": True, "resources": [], "reason": "embedding_failed"}

    # ── Búsqueda vectorial via pgvector ───────────────────────────────────────
    results = db_manager.search_resources(
        embedding  = query_embedding,
        module_id  = req.module_id or 0,
        clan_id    = req.clan_id,
        limit      = req.limit,
    )

    if not results:
        return {"success": True, "resources": [], "reason": "no_results"}

    # ── Generar signed URLs (1 hora) ──────────────────────────────────────────
    enriched = []
    for r in results:
        try:
            signed = db_manager.client \
                .storage.from_(BUCKET) \
                .create_signed_url(r["storage_path"], 3600)
            url = signed.get("signedURL") or signed.get("signedUrl", "")
        except Exception:
            url = ""

        enriched.append({
            "id":           r["id"],
            "title":        r["title"],
            "file_name":    r["file_name"],
            "preview_text": r.get("preview_text", ""),
            "similarity":   round(float(r.get("similarity", 0)), 3),
            "download_url": url,
        })

    logger.info(
        f"[Resources] Search | topic='{req.topic[:40]}' | "
        f"module={req.module_id} | found={len(enriched)}"
    )

    return {"success": True, "resources": enriched}
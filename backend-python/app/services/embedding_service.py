"""
app/services/embedding_service.py
"""

import logging
from typing import List

logger = logging.getLogger("kairo-embeddings")

# ── Carga única del modelo ────────────────────────────────────────────────────
try:
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer("all-MiniLM-L6-v2")
    logger.info("[Embeddings] Model all-MiniLM-L6-v2 loaded (384 dims)")
except Exception as e:
    _model = None
    logger.error(f"[Embeddings] Failed to load model: {e}")


def embed_text(text: str) -> List[float]:
    """
    Convierte un string en un vector de 384 floats.
    Retorna lista vacía si el modelo no está disponible.
    """
    if _model is None:
        logger.error("[Embeddings] Model not available — returning empty vector")
        return []
    try:
        # normalize_embeddings=True → cosine similarity == dot product
        vector = _model.encode(text, normalize_embeddings=True)
        return vector.tolist()
    except Exception as e:
        logger.error(f"[Embeddings] embed_text failed: {e}")
        return []


def model_ready() -> bool:
    return _model is not None
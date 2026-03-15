"""
app/routers/resources_search.py
POST /search-resources

"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict

from app.services.supabase_service  import db_manager
from app.services.embedding_service import embed_text, model_ready

logger = logging.getLogger("kairo-resources")
router = APIRouter(tags=["Resources RAG"])


class SearchResourcesRequest(BaseModel):
    topic:     str
    clan_id:   str
    module_id: Optional[int] = None
    limit:     int            = 3
    coder_id:  Optional[int] = None


@router.post("/search-resources")
async def search_resources(req: SearchResourcesRequest):
    if not req.topic or not req.clan_id:
        return {"success": True, "resources": []}

    resources: List[Dict] = []

    # Try text search first (works without embeddings)
    resources = db_manager.search_resources_by_text(
        topic     = req.topic,
        clan_id   = req.clan_id,
        module_id = req.module_id,
        limit     = req.limit,
    )

    # Last resort: return any resources from the clan for this module
    if not resources and req.module_id:
        resources = db_manager.get_resources_for_clan(
            clan_id   = req.clan_id,
            module_id = req.module_id,
            limit     = req.limit,
        )

    logger.info(
        f"[Resources] clan={req.clan_id} topic='{req.topic[:40]}' "
        f"→ {len(resources)} results"
    )

    return {"success": True, "resources": resources}
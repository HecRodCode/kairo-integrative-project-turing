"""
app/services/clients.py
Shared singleton-style clients for routers that need Groq and Supabase.
"""

import os
from groq import Groq

from app.services.supabase_service import db_manager

_groq_client = None


def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def get_supabase_client():
    return db_manager.client

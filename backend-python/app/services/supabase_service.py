import os
import logging
from typing import Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Initialize logging
logger = logging.getLogger(__name__)
load_dotenv()

# Singleton-pattern Supabase Client
class SupabaseManager:
    """
    Handles all interactions with the Supabase database.
    Uses the Service Role Key to bypass RLS and store roadmap data.
    """
    def __init__(self):
        url: str = os.getenv("SUPABASE_URL")
        key: str = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not url or not key:
            logger.error("Supabase credentials missing in .env file.")
            raise ValueError("Missing Supabase configuration.")
            
        self.client: Client = create_client(url, key)

    async def save_roadmap(self, coder_id: str, roadmap_data: Dict[str, Any]) -> bool:
        """
        Inserts a newly generated roadmap into the 'learning_paths' table.
        Returns True if successful, False otherwise.
        """
        try:
            # We assume a table named 'learning_paths' exists in your schema
            data = {
                "coder_id": coder_id,
                "roadmap_json": roadmap_data,
                "status": "active",
                "version": "1.0"
            }
            
            result = self.client.table("learning_paths").insert(data).execute()
            
            if len(result.data) > 0:
                logger.info(f"Roadmap successfully saved to Supabase for coder: {coder_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to save roadmap to Supabase: {str(e)}")
            return False

# Export an instance to be used across the app
db_manager = SupabaseManager()
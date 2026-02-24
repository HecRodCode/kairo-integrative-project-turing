from pydantic import BaseModel, Field
from typing import List, Optional
from .coder_profile import CoderProfile, SoftSkills, MoodleStatus

class GeneratePlanRequest(BaseModel):
    """Petición completa para generar un plan"""
    coder: CoderProfile
    soft_skills: SoftSkills = Field(..., alias="softSkills")
    moodle_status: MoodleStatus = Field(..., alias="moodleStatus")
    additional_topics: List[str] = Field(default=[], alias="additionalTopics")

    class Config:
        populate_by_name = True


class PlanResponse(BaseModel):
    """Respuesta con el plan generado"""
    success: bool
    plan: dict
    metadata: dict
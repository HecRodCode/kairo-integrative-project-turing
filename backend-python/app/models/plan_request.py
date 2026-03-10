"""
app/models/plan_request.py
Request and response models for plan generation.

FIX: Migrated from Pydantic v1 (class Config) to Pydantic v2 (model_config).
"""

from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import List, Optional
from .coder_profile import CoderProfile, SoftSkills, MoodleStatus


class GeneratePlanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    coder:             CoderProfile
    soft_skills:       SoftSkills   = Field(..., alias="softSkills")
    moodle_status:     MoodleStatus = Field(..., alias="moodleStatus")
    additional_topics: List[str]    = Field(default=[], alias="additionalTopics")


class PlanResponse(BaseModel):
    """Standard response wrapper for plan generation endpoints."""
    success:  bool
    plan:     dict
    metadata: dict
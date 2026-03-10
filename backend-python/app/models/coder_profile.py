"""
app/models/coder_profile.py
Data models for coder profile, soft skills, and academic status.

FIX: Migrated from Pydantic v1 (class Config) to Pydantic v2 (model_config).
     Without this, aliases like 'timeManagement' silently fail at parse time.
"""

from pydantic import BaseModel, Field, model_validator
from pydantic import ConfigDict
from typing import List, Dict


class CoderProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id:        int
    email:     str
    full_name: str = Field(..., alias="fullName")


class SoftSkills(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    autonomy:        int = Field(..., ge=1, le=5)
    time_management: int = Field(..., ge=1, le=5, alias="timeManagement")
    problem_solving: int = Field(..., ge=1, le=5, alias="problemSolving")
    communication:   int = Field(..., ge=1, le=5)
    teamwork:        int = Field(..., ge=1, le=5)
    learning_style:  str = Field(..., alias="learningStyle")


class MoodleStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    module_number:     int        = Field(..., alias="moduleNumber")
    current_week:      int        = Field(..., alias="currentWeek")
    struggling_topics: List[str]  = Field(default=[], alias="strugglingTopics")
    moodle_progress:   Dict       = Field(default={}, alias="moodleProgress")
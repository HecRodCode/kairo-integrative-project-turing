from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class CoderProfile(BaseModel):
    """Perfil básico del coder"""
    id: int
    email: str
    full_name: str = Field(..., alias="fullName")

    class Config:
        populate_by_name = True


class SoftSkills(BaseModel):
    """Habilidades blandas (1-5)"""
    autonomy: int = Field(ge=1, le=5)
    time_management: int = Field(ge=1, le=5, alias="timeManagement")
    problem_solving: int = Field(ge=1, le=5, alias="problemSolving")
    communication: int = Field(ge=1, le=5)
    teamwork: int = Field(ge=1, le=5)
    learning_style: str = Field(..., alias="learningStyle")

    class Config:
        populate_by_name = True


class MoodleStatus(BaseModel):
    """Estado académico en Moodle"""
    module_number: int = Field(..., alias="moduleNumber")
    current_week: int = Field(..., alias="currentWeek")
    struggling_topics: List[str] = Field(default=[], alias="strugglingTopics")
    moodle_progress: Dict = Field(default={}, alias="moodleProgress")

    class Config:
        populate_by_name = True
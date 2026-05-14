"""
Pydantic models — the single source of truth for the CV data shape.
The frontend TypeScript types mirror these exactly.
"""
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator

# LLMs sometimes return null for list fields instead of [].
# This validator coerces None → [] before Pydantic validates the type.
_ListStr = Annotated[list[str], BeforeValidator(lambda v: [] if v is None else v)]


class PersonalInfo(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class WorkExperience(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    duration_months: int | None = None
    location: str | None = None
    responsibilities: _ListStr = []
    achievements: _ListStr = []


class Education(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    graduation_year: int | None = None
    gpa: float | None = None


class SpokenLanguage(BaseModel):
    language: str
    level: str  # native / fluent / conversational / basic


class Skills(BaseModel):
    technical: _ListStr = []
    languages: _ListStr = []   # programming languages
    tools: _ListStr = []
    soft_skills: _ListStr = []


class PersonalProject(BaseModel):
    """
    NEW in v1.1 — personal / side projects mentioned in the CV.
    Often the most revealing signal in a candidate's profile.
    """
    name: str | None = None
    description: str | None = None
    technologies: _ListStr = []
    url: str | None = None
    year: int | None = None


class ConfidenceScores(BaseModel):
    """
    The LLM rates its own certainty (0.0–1.0) for key fields.
    """
    full_name: float = 0.0
    email: float = 0.0
    total_experience_years: float = 0.0
    skills: float = 0.0


class ParsedCV(BaseModel):
    personal_info: PersonalInfo = PersonalInfo()
    professional_summary: str | None = None
    total_experience_years: int | None = None
    skills: Skills = Skills()
    work_experience: list[WorkExperience] = []
    education: list[Education] = []
    certifications: _ListStr = []
    spoken_languages: list[SpokenLanguage] = []
    personal_projects: list[PersonalProject] = []
    confidence_scores: ConfidenceScores = ConfidenceScores()


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    chars_extracted: int
    status: str = "pending"


class JobState(BaseModel):
    filename: str
    raw_text: str
    chars: int


# ─── Phase 2 models ──────────────────────────────────────────────────────────

class CandidateRecord(BaseModel):
    id: str
    filename: str
    uploaded_at: str
    parsed_cv: ParsedCV
    tokens_used: int | None = None
    latency_ms: int | None = None


class CandidateListItem(BaseModel):
    """Lightweight projection used for the /candidates list page."""
    id: str
    filename: str
    uploaded_at: str
    full_name: str | None = None
    top_role: str | None = None
    tokens_used: int | None = None
    latency_ms: int | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    history: list[ChatMessage] = []
    message: str


class ChatResponse(BaseModel):
    response: str


# ─── Phase 3 models ──────────────────────────────────────────────────────────

class JobDescription(BaseModel):
    id: str
    title: str
    description: str
    created_at: str


class JobCreate(BaseModel):
    title: str
    description: str


class CandidateMatch(BaseModel):
    candidate_id: str
    score: float
    excerpt: str
    full_name: str | None = None
    top_role: str | None = None
    filename: str


class SearchRequest(BaseModel):
    query: str
    top_n: int = 5


class SearchResponse(BaseModel):
    results: list[CandidateMatch]

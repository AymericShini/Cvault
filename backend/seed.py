"""
Dev seed script — inserts a fake candidate without calling Groq.

Usage (from backend/):
    uv run python seed.py
"""
import asyncio
import json
from uuid import uuid4

from src.db.database import init_db
from src.db.candidates import save_candidate
from src.harness import pipeline as pipeline_harness

FAKE_CV_TEXT = """
Sophie Marchand
Lead Software Engineer — Paris, France
sophie.marchand@email.com | +33 6 12 34 56 78
linkedin.com/in/sophiemarchand | github.com/sophiemarchand

SUMMARY
Full-stack engineer with 8 years building B2B SaaS products. Deep expertise in
TypeScript, React, and Python backends. Led teams of up to 6 engineers.

EXPERIENCE
Lead Software Engineer — Databox, Paris (2021–present)
- Redesigned the data pipeline reducing ingestion latency by 60%
- Mentored 4 junior engineers, introduced weekly design-review process
- Shipped real-time dashboard feature used by 3,000+ customers

Software Engineer — Meetic, Paris (2018–2021)
- Built recommendation engine in Python (scikit-learn) improving match rate by 22%
- Migrated monolithic Rails app to microservices (Node.js + FastAPI)

Junior Developer — Freelance (2016–2018)
- Delivered 12 client projects: e-commerce sites, internal dashboards

EDUCATION
Master of Science in Computer Science — INSA Lyon, 2016

SKILLS
Languages: TypeScript, Python, SQL, Rust (learning)
Frameworks: React, Next.js, FastAPI, Node.js
Tools: PostgreSQL, Redis, Docker, Kubernetes, Grafana
Soft skills: Team leadership, technical mentoring, project scoping

CERTIFICATIONS
AWS Certified Solutions Architect – Associate (2022)
Google Cloud Professional Data Engineer (2023)

LANGUAGES
French (native), English (fluent), Spanish (conversational)

PROJECTS
OpenMetrics — open-source Prometheus exporter for SaaS APIs
github.com/sophiemarchand/openmetrics | 2022
"""

FAKE_PARSED_CV = {
    "personal_info": {
        "full_name": "Sophie Marchand",
        "email": "sophie.marchand@email.com",
        "phone": "+33 6 12 34 56 78",
        "location": "Paris, France",
        "linkedin_url": "linkedin.com/in/sophiemarchand",
        "github_url": "github.com/sophiemarchand",
    },
    "professional_summary": (
        "Full-stack engineer with 8 years building B2B SaaS products. "
        "Deep expertise in TypeScript, React, and Python backends. Led teams of up to 6 engineers."
    ),
    "total_experience_years": 8,
    "skills": {
        "technical": ["React", "Next.js", "FastAPI", "Node.js", "scikit-learn"],
        "languages": ["TypeScript", "Python", "SQL", "Rust"],
        "tools": ["PostgreSQL", "Redis", "Docker", "Kubernetes", "Grafana"],
        "soft_skills": ["Team leadership", "Technical mentoring", "Project scoping"],
    },
    "work_experience": [
        {
            "company": "Databox",
            "title": "Lead Software Engineer",
            "start_date": "2021-01",
            "end_date": None,
            "duration_months": 40,
            "location": "Paris, France",
            "responsibilities": [
                "Redesigned the data pipeline reducing ingestion latency by 60%",
                "Mentored 4 junior engineers, introduced weekly design-review process",
                "Shipped real-time dashboard feature used by 3,000+ customers",
            ],
            "achievements": [
                "60% reduction in pipeline latency",
                "3,000+ customers using shipped dashboard feature",
            ],
        },
        {
            "company": "Meetic",
            "title": "Software Engineer",
            "start_date": "2018-03",
            "end_date": "2021-01",
            "duration_months": 34,
            "location": "Paris, France",
            "responsibilities": [
                "Built recommendation engine in Python improving match rate by 22%",
                "Migrated monolithic Rails app to microservices (Node.js + FastAPI)",
            ],
            "achievements": ["22% improvement in match rate"],
        },
        {
            "company": "Freelance",
            "title": "Junior Developer",
            "start_date": "2016-06",
            "end_date": "2018-03",
            "duration_months": 21,
            "location": None,
            "responsibilities": ["Delivered 12 client projects: e-commerce sites, internal dashboards"],
            "achievements": [],
        },
    ],
    "education": [
        {
            "institution": "INSA Lyon",
            "degree": "Master of Science in Computer Science",
            "field": "Computer Science",
            "graduation_year": 2016,
            "gpa": None,
        }
    ],
    "certifications": [
        "AWS Certified Solutions Architect – Associate (2022)",
        "Google Cloud Professional Data Engineer (2023)",
    ],
    "spoken_languages": [
        {"language": "French", "level": "native"},
        {"language": "English", "level": "fluent"},
        {"language": "Spanish", "level": "conversational"},
    ],
    "personal_projects": [
        {
            "name": "OpenMetrics",
            "description": "Open-source Prometheus exporter for SaaS APIs",
            "technologies": ["Python", "Prometheus"],
            "url": "github.com/sophiemarchand/openmetrics",
            "year": 2022,
        }
    ],
    "confidence_scores": {
        "full_name": 0.99,
        "email": 0.99,
        "total_experience_years": 0.92,
        "skills": 0.95,
    },
}


async def main():
    await init_db()

    candidate_id = str(uuid4())
    parsed_cv_json = json.dumps(FAKE_PARSED_CV)

    await save_candidate(
        id=candidate_id,
        filename="sophie_marchand_cv.pdf",
        parsed_cv_json=parsed_cv_json,
        tokens_used=1842,
        latency_ms=1240,
    )

    pipeline_harness.ingest(candidate_id, FAKE_CV_TEXT, parsed_cv_json)

    print(f"Seeded candidate: Sophie Marchand (id={candidate_id})")
    print("Open http://localhost:3000/candidates to see her.")


asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════
PHASE 1 CORE: Context Engineering
═══════════════════════════════════════════════════════════════

v1.1 — added personal_projects, clarified soft vs hard skills.
"""
import json

# ─────────────────────────────────────────────────────────────
# SYSTEM PROMPT  (v1.1)
# ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are an expert HR data extraction specialist with 15 years of experience \
reading CVs and résumés from all industries, formats, and languages.

Your task is to extract structured information from raw CV text and return it \
as a single valid JSON object.

STRICT RULES — follow every one, no exceptions:
1. Extract ONLY information explicitly present in the CV text. Never infer, \
   assume, or fabricate information.
2. Use JSON null for any field not found in the text.
3. Normalize all output to English, even if the CV is in another language.
4. Normalize all dates to YYYY-MM format. If only a year is given, use YYYY-01.
5. Categorize skills carefully:
   - "technical"   → domain expertise (e.g. "Product Design", "Microservices")
   - "languages"   → programming languages only (Python, TypeScript, …)
   - "tools"       → platforms / frameworks (Figma, AWS, React, PostgreSQL)
   - "soft_skills" → interpersonal / behavioural (Leadership, Communication)
   Never put the same skill in two buckets.
6. Personal projects: any side projects, open-source contributions, \
   personal websites, hackathon work, or independent creations explicitly \
   mentioned. Do NOT confuse with paid work experience.
7. In confidence_scores, rate your certainty (0.0–1.0) for each key field.
8. Return ONLY the JSON object. No markdown fences, no explanation, \
   no preamble. Just the raw JSON.\
"""

# ─────────────────────────────────────────────────────────────
# OUTPUT SCHEMA
# ─────────────────────────────────────────────────────────────
_OUTPUT_SCHEMA = {
    "personal_info": {
        "full_name": "string or null",
        "email": "string or null",
        "phone": "string or null",
        "location": "city, country — string or null",
        "linkedin_url": "string or null",
        "github_url": "string or null",
    },
    "professional_summary": "2–3 sentence summary — string or null",
    "total_experience_years": "integer or null",
    "skills": {
        "technical": ["domain skills"],
        "languages": ["programming languages only"],
        "tools": ["frameworks, platforms, tools"],
        "soft_skills": ["interpersonal / behavioural skills"],
    },
    "work_experience": [
        {
            "company": "string or null",
            "title": "string or null",
            "start_date": "YYYY-MM or null",
            "end_date": "YYYY-MM or 'present' or null",
            "duration_months": "integer or null",
            "location": "string or null",
            "responsibilities": ["max 4"],
            "achievements": ["quantified — max 3"],
        }
    ],
    "education": [
        {
            "institution": "string or null",
            "degree": "string or null",
            "field": "string or null",
            "graduation_year": "integer or null",
            "gpa": "float or null",
        }
    ],
    "certifications": ["certification name + issuer + year"],
    "spoken_languages": [
        {"language": "string", "level": "native | fluent | conversational | basic"}
    ],
    "personal_projects": [
        {
            "name": "string or null",
            "description": "1–2 sentence description — string or null",
            "technologies": ["techs / tools used"],
            "url": "string or null",
            "year": "integer or null",
        }
    ],
    "confidence_scores": {
        "full_name": 0.95,
        "email": 0.99,
        "total_experience_years": 0.80,
        "skills": 0.85,
    },
}

# ─────────────────────────────────────────────────────────────
# FEW-SHOT EXAMPLE  (v1.1 — now includes a personal project)
# ─────────────────────────────────────────────────────────────
_FEW_SHOT = """
EXAMPLE INPUT:
Alice Martin — alice.martin@email.com — +33 6 12 34 56 78 — Paris, France
linkedin.com/in/alicemartin · github.com/alicemartin

Experienced Product Designer specialising in design systems and developer tools.
8 years in B2B SaaS. Strong leadership and cross-functional collaboration skills.

EXPERIENCE
Design Lead — Spotify, Paris (Jan 2022 – present)
Owned the design system used by 40 engineers across 3 product teams.
Reduced onboarding time for new designers by 60%.

Senior Product Designer — Doctolib, Paris (Mar 2019 – Dec 2021)
Led end-to-end UX for the practitioner scheduling module (2.1M users).

EDUCATION
Master Design — École Nationale Supérieure des Arts Décoratifs, 2016
Bachelor Visual Communication — Université Paris 1, 2014

PERSONAL PROJECTS
DesignLab Toolkit (2023) — Open-source design tokens library for Figma plugins,
800+ stars on GitHub. Built with TypeScript and Vue. github.com/alicem/designlab

Café Cartographie (2022) — Personal mapping site of independent Paris coffee shops.
Built with Next.js and Mapbox. cartographie.cafe

SKILLS: Figma, Prototyping, React (basic), Design Systems, Miro, Notion
LANGUAGES: French (native), English (fluent)

EXAMPLE OUTPUT:
{
  "personal_info": {
    "full_name": "Alice Martin",
    "email": "alice.martin@email.com",
    "phone": "+33 6 12 34 56 78",
    "location": "Paris, France",
    "linkedin_url": "linkedin.com/in/alicemartin",
    "github_url": "github.com/alicemartin"
  },
  "professional_summary": "Experienced Product Designer specialising in design systems and developer tools with 8 years in B2B SaaS.",
  "total_experience_years": 8,
  "skills": {
    "technical": ["Product Design", "UX Design", "Design Systems", "Prototyping"],
    "languages": ["React"],
    "tools": ["Figma", "Miro", "Notion"],
    "soft_skills": ["Leadership", "Cross-functional collaboration"]
  },
  "work_experience": [
    {
      "company": "Spotify",
      "title": "Design Lead",
      "start_date": "2022-01",
      "end_date": "present",
      "duration_months": null,
      "location": "Paris, France",
      "responsibilities": ["Owned design system used by 40 engineers across 3 product teams"],
      "achievements": ["Reduced onboarding time for new designers by 60%"]
    },
    {
      "company": "Doctolib",
      "title": "Senior Product Designer",
      "start_date": "2019-03",
      "end_date": "2021-12",
      "duration_months": 33,
      "location": "Paris, France",
      "responsibilities": ["Led end-to-end UX for practitioner scheduling module"],
      "achievements": ["Shipped to 2.1M users"]
    }
  ],
  "education": [
    {
      "institution": "École Nationale Supérieure des Arts Décoratifs",
      "degree": "Master",
      "field": "Design",
      "graduation_year": 2016,
      "gpa": null
    },
    {
      "institution": "Université Paris 1",
      "degree": "Bachelor",
      "field": "Visual Communication",
      "graduation_year": 2014,
      "gpa": null
    }
  ],
  "certifications": [],
  "spoken_languages": [
    {"language": "French", "level": "native"},
    {"language": "English", "level": "fluent"}
  ],
  "personal_projects": [
    {
      "name": "DesignLab Toolkit",
      "description": "Open-source design tokens library for Figma plugins with 800+ stars on GitHub.",
      "technologies": ["TypeScript", "Vue"],
      "url": "github.com/alicem/designlab",
      "year": 2023
    },
    {
      "name": "Café Cartographie",
      "description": "Personal mapping site of independent Paris coffee shops.",
      "technologies": ["Next.js", "Mapbox"],
      "url": "cartographie.cafe",
      "year": 2022
    }
  ],
  "confidence_scores": {
    "full_name": 0.99,
    "email": 0.99,
    "total_experience_years": 0.90,
    "skills": 0.88
  }
}
"""

MAX_CV_CHARS = 4_000


def build_user_prompt(raw_text: str) -> str:
    truncated = raw_text[:MAX_CV_CHARS]
    truncation_note = (
        f"\n[Note: CV text was truncated to {MAX_CV_CHARS} chars for this request]"
        if len(raw_text) > MAX_CV_CHARS
        else ""
    )

    return f"""\
Extract structured information from the CV below.

Follow this exact JSON schema:
{json.dumps(_OUTPUT_SCHEMA, indent=2)}

{_FEW_SHOT}

Now extract from this CV:
{truncation_note}
---
{truncated}
---

Return ONLY the JSON object.\
"""

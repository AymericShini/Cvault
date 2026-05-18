"""
Agent tools — Phase 4.

Each function is a real capability the agent can invoke.
The TOOL_DEFINITIONS list is the JSON-schema contract sent to the Groq API
so the LLM knows what to call and how to call it.

Teaching note: tools are just async Python functions.
The LLM decides *which* to call and *when* — we just execute whatever it picks.
"""
import asyncio
import json

from groq import AsyncGroq

from src.config import settings
from src.db.candidates import get_candidate as db_get_candidate
from src.harness import pipeline as pipeline_harness

# ─── JSON schemas sent to Groq (OpenAI function-calling format) ───────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_candidates",
            "description": (
                "Search the candidate database using semantic similarity. "
                "Returns the top-N matching candidates with relevance scores and a CV excerpt. "
                "Always call this first when you need to find candidates for a role or skill."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Job description, skill keywords, or role to search for.",
                    },
                    "top_n": {
                        "type": "integer",
                        "description": "Number of candidates to return (1–10).",
                    },
                },
                "required": ["query", "top_n"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_candidate_detail",
            "description": (
                "Fetch the full CV for a specific candidate by their ID. "
                "Returns work history, skills, education, and contact info. "
                "Use this after search_candidates when you need deeper insight on a specific person."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_id": {
                        "type": "string",
                        "description": "The candidate's unique ID (returned by search_candidates).",
                    },
                },
                "required": ["candidate_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_candidates",
            "description": (
                "Fetch and structure the profiles of 2–4 candidates side by side. "
                "Returns a structured comparison object — use it to reason about "
                "who best fits a role."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of 2–4 candidate IDs to compare.",
                    },
                    "criteria": {
                        "type": "string",
                        "description": "What to compare on, e.g. 'Python backend skills' or 'leadership experience'.",
                    },
                },
                "required": ["candidate_ids", "criteria"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_outreach_email",
            "description": (
                "Draft a personalised outreach email to a candidate for a specific role. "
                "Uses the candidate's actual CV details to make the email specific and relevant."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_id": {
                        "type": "string",
                        "description": "The candidate's unique ID.",
                    },
                    "job_title": {
                        "type": "string",
                        "description": "Title of the role you are recruiting for.",
                    },
                    "job_description": {
                        "type": "string",
                        "description": "Brief description of the role and key requirements.",
                    },
                },
                "required": ["candidate_id", "job_title", "job_description"],
            },
        },
    },
]


# ─── Tool implementations ─────────────────────────────────────────────────────

async def search_candidates(query: str, top_n: int = 5) -> dict:
    top_n = max(1, min(10, top_n))
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, pipeline_harness.search, query, top_n)

    if not raw:
        return {"candidates": [], "message": "No candidates found in the database."}

    results = []
    for r in raw:
        row = await db_get_candidate(r["candidate_id"])
        name = None
        if row:
            cv = json.loads(row["parsed_cv"])
            name = cv.get("personal_info", {}).get("full_name")
        results.append({
            "candidate_id": r["candidate_id"],
            "name": name,
            "score": r["score"],
            "excerpt": r["excerpt"][:250],
        })

    return {"candidates": results}


async def get_candidate_detail(candidate_id: str) -> dict:
    row = await db_get_candidate(candidate_id)
    if not row:
        return {"error": f"Candidate '{candidate_id}' not found."}

    cv = json.loads(row["parsed_cv"])
    pi = cv.get("personal_info", {})
    exp = cv.get("work_experience", [])
    edu = cv.get("education", [])
    skills = cv.get("skills", {})

    return {
        "candidate_id": candidate_id,
        "name": pi.get("full_name"),
        "email": pi.get("email"),
        "location": pi.get("location"),
        "total_experience_years": cv.get("total_experience_years"),
        "professional_summary": cv.get("professional_summary"),
        "skills": {
            "technical": skills.get("technical", [])[:10],
            "languages": skills.get("languages", []),
            "tools": skills.get("tools", [])[:10],
        },
        "work_experience": [
            {
                "title": e.get("title"),
                "company": e.get("company"),
                "start_date": e.get("start_date"),
                "end_date": e.get("end_date"),
                "responsibilities": e.get("responsibilities", [])[:2],
            }
            for e in exp[:4]
        ],
        "education": [
            {
                "degree": e.get("degree"),
                "institution": e.get("institution"),
                "graduation_year": e.get("graduation_year"),
            }
            for e in edu[:2]
        ],
    }


async def compare_candidates(candidate_ids: list[str], criteria: str = "overall suitability") -> dict:
    profiles = []
    for cid in candidate_ids[:4]:
        detail = await get_candidate_detail(cid)
        if "error" not in detail:
            all_skills = (
                detail.get("skills", {}).get("technical", [])
                + detail.get("skills", {}).get("languages", [])
                + detail.get("skills", {}).get("tools", [])
            )
            exp = detail.get("work_experience", [])
            edu = detail.get("education", [])
            profiles.append({
                "name": detail.get("name", "Unknown"),
                "candidate_id": cid,
                "experience_years": detail.get("total_experience_years"),
                "current_role": exp[0].get("title") if exp else None,
                "current_company": exp[0].get("company") if exp else None,
                "key_skills": all_skills[:10],
                "highest_degree": edu[0].get("degree") if edu else None,
                "summary": (detail.get("professional_summary") or "")[:200],
            })

    return {"criteria": criteria, "candidates": profiles}


async def draft_outreach_email(candidate_id: str, job_title: str, job_description: str) -> dict:
    detail = await get_candidate_detail(candidate_id)
    if "error" in detail:
        return detail

    name = detail.get("name", "Candidate")
    exp = detail.get("work_experience", [])
    current_role = exp[0].get("title", "") if exp else ""
    skills = (
        detail.get("skills", {}).get("technical", [])
        + detail.get("skills", {}).get("languages", [])
    )[:6]

    prompt = (
        f"Draft a short, personalised recruitment outreach email.\n\n"
        f"Candidate: {name}\n"
        f"Current/recent role: {current_role}\n"
        f"Key skills: {', '.join(skills)}\n"
        f"Summary: {detail.get('professional_summary') or 'N/A'}\n\n"
        f"Role: {job_title}\n"
        f"Description: {job_description}\n\n"
        f"Write 3–4 paragraphs. Lead with subject line. Reference the candidate's "
        f"actual background specifically. Keep it professional and concise."
    )

    client = AsyncGroq(api_key=settings.groq_api_key)
    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=600,
    )

    email_text = response.choices[0].message.content or ""
    return {"candidate_id": candidate_id, "name": name, "email_draft": email_text}


# ─── Dispatcher ───────────────────────────────────────────────────────────────

async def execute(name: str, args: dict) -> dict:
    """Route a tool call by name to the correct implementation."""
    match name:
        case "search_candidates":
            return await search_candidates(**args)
        case "get_candidate_detail":
            return await get_candidate_detail(**args)
        case "compare_candidates":
            return await compare_candidates(**args)
        case "draft_outreach_email":
            return await draft_outreach_email(**args)
        case _:
            return {"error": f"Unknown tool '{name}'."}

# CVault — AI Engineering Learning Project

CVault is an AI-powered CV reader and parser built across **four progressive phases**, each teaching a core AI engineering pillar. This document explains every phase, every key file, and every concept — with real code examples from the repo.

---

## Table of Contents

1. [What CVault Does](#what-cvault-does)
2. [Tech Stack](#tech-stack)
3. [How to Run](#how-to-run)
4. [Architecture Overview](#architecture-overview)
5. [Phase 1 — Context Engineering](#phase-1--context-engineering)
6. [Phase 2 — Harness & Orchestration](#phase-2--harness--orchestration)
7. [Phase 3 — RAG & Vector Search](#phase-3--rag--vector-search)
8. [Phase 4 — Agentic Workflow (upcoming)](#phase-4--agentic-workflow-upcoming)
9. [Data Model Contract](#data-model-contract)
10. [Key Design Decisions](#key-design-decisions)
11. [File Map](#file-map)

---

## What CVault Does

| Feature | Route |
|---------|-------|
| Upload a PDF CV and parse it into structured JSON | `/upload` |
| Browse all parsed candidates | `/candidates` |
| Chat with AI about a specific candidate | `/candidates/[id]` |
| Search candidates by job description (semantic) | `/search` |
| Save and manage reusable job descriptions | `/jobs` |
| Monitor the ingestion pipeline | `/pipeline` |

---

## Tech Stack

### Backend
- **Python 3.11** with `uv` (fast package manager, replaces pip)
- **FastAPI** — async HTTP framework
- **Groq** — LLM provider (`llama-3.3-70b-versatile`, `temperature=0.0`)
- **pypdf** — PDF text extraction
- **LlamaIndex** — orchestration harness for chat
- **SQLite + aiosqlite** — async local database
- **ChromaDB** — local vector database
- **sentence-transformers** — local embedding model (`all-MiniLM-L6-v2`)

### Frontend
- **Next.js 14** (App Router), **TypeScript**
- **CSS Modules** with CSS custom properties — no Tailwind
- Fonts: DM Sans + DM Mono via Google Fonts

---

## How to Run

```powershell
# Copy environment files and fill in your GROQ_API_KEY
cp backend/.env.example backend/.env
cp frontend/.env.localexample frontend/.env.local

# Terminal 1 — backend (first start downloads embedding model ~90MB)
cd backend
uv run uvicorn src.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
pnpm dev
```

App: `http://localhost:3000/upload` — API: `http://localhost:8000`

---

## Architecture Overview

```
User
 │
 ▼
┌─────────────────────────────────────┐
│  Next.js 14  (frontend)             │
│  /upload  /candidates  /search      │
│  /jobs    /pipeline                 │
└──────────────┬──────────────────────┘
               │ HTTP / SSE
               ▼
┌─────────────────────────────────────┐
│  FastAPI  (backend :8000)           │
│                                     │
│  POST /api/upload                   │
│  GET  /api/stream/{job_id}  ──SSE──►│
│  GET  /api/candidates               │
│  POST /api/candidates/{id}/chat     │
│  POST /api/search                   │
│  GET  /api/jobs                     │
└──┬──────────┬──────────┬────────────┘
   │          │          │
   ▼          ▼          ▼
 pypdf      Groq       SQLite          ChromaDB
(extract)  (LLM)   (candidates,      (cv_chunks
                      jobs)           collection)
```

### Request flow for CV upload

```
1. DROP PDF    →  POST /api/upload
                  pypdf extracts text → job stored in memory → returns job_id

2. SSE STREAM  →  GET /api/stream/{job_id}
                  yields 6 events in order:
                    extract  → text char count
                    prompt   → token estimate, model name
                    llm      → Groq call starts (status: running)
                    llm      → Groq call done (status: done)
                    validate → Pydantic schema check passed
                    complete → full ParsedCV JSON payload

3. POST-STREAM →  save to SQLite (candidates table)
                  chunk + embed → store in ChromaDB (cv_chunks)
```

---

## Phase 1 — Context Engineering

**Pillar:** Getting reliable, structured output from an LLM using only prompt design — no fine-tuning, no plugins.

**Key insight:** An LLM is a text completion machine. The quality of what it returns is almost entirely determined by the quality of what you send it.

### What "context engineering" means

Crafting three things carefully:

| Element | File | Purpose |
|---------|------|---------|
| System prompt | `backend/src/parsers/prompts.py` | Defines the AI's role and strict extraction rules |
| Output schema | `backend/src/parsers/prompts.py` | Tells the LLM the exact JSON shape to produce |
| Few-shot example | `backend/src/parsers/prompts.py` | Shows one input→output pair — dramatically improves accuracy |

### The system prompt

```python
# backend/src/parsers/prompts.py

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
   - "technical"   → domain expertise
   - "languages"   → programming languages only
   - "tools"       → platforms / frameworks
   - "soft_skills" → interpersonal / behavioural
8. Return ONLY the JSON object. No markdown fences, no explanation. Just JSON.\
"""
```

**Why each rule matters:**
- Rule 1 prevents hallucination — "never infer" is the single most important line
- Rule 2 forces `null` instead of omitted fields, making Pydantic validation consistent
- Rule 4 normalises dates so you never have to parse "March 2022" vs "03/2022" yourself
- Rule 8 prevents the most common failure: the model wrapping JSON in ` ```json ` fences

### The few-shot example

```python
# backend/src/parsers/prompts.py

_FEW_SHOT = """
EXAMPLE INPUT:
Alice Martin — alice.martin@email.com — Paris, France
Design Lead — Spotify, Paris (Jan 2022 – present)
...

EXAMPLE OUTPUT:
{
  "personal_info": { "full_name": "Alice Martin", ... },
  "work_experience": [
    {
      "company": "Spotify",
      "start_date": "2022-01",
      "end_date": "present",
      ...
    }
  ]
}
"""
```

One concrete example beats ten written rules. The model sees exactly what format you want — date normalisation, null handling, list structure — and mirrors it. This technique is called **few-shot prompting**.

### The user prompt assembles everything

```python
# backend/src/parsers/prompts.py

def build_user_prompt(raw_text: str) -> str:
    truncated = raw_text[:MAX_CV_CHARS]  # 4,000 char safety cap

    return f"""\
Extract structured information from the CV below.

Follow this exact JSON schema:
{json.dumps(_OUTPUT_SCHEMA, indent=2)}

{_FEW_SHOT}

Now extract from this CV:
---
{truncated}
---

Return ONLY the JSON object.\
"""
```

The full message sent to Groq is:
- `role: system` → `SYSTEM_PROMPT` (role + rules)
- `role: user` → `build_user_prompt(raw_text)` (schema + example + actual CV)

### Calling the LLM

```python
# backend/src/parsers/cv_parser.py

async def parse_cv(raw_text: str) -> tuple[ParsedCV, int, float]:
    client = AsyncGroq(api_key=settings.groq_api_key)

    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_user_prompt(raw_text)},
        ],
        temperature=0.0,   # deterministic — critical for data extraction
        max_tokens=3_000,
    )
```

`temperature=0.0` is essential here. Temperature controls how random the next token selection is. At 0, the model always picks the most probable token — same input always produces same output. For creative writing you want 0.7–1.0. For structured extraction you want 0.

### Defensive JSON extraction

Even with "Return ONLY the JSON object" in the prompt, models sometimes add text before or after. This three-stage fallback handles every real failure mode:

```python
# backend/src/parsers/cv_parser.py

def _extract_json(text: str) -> dict:
    # 1. Happy path: entire response is valid JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fences (model ignored Rule 8)
    fenced = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    fenced = re.sub(r"\s*```$", "", fenced, flags=re.MULTILINE).strip()
    try:
        return json.loads(fenced)
    except json.JSONDecodeError:
        pass

    # 3. Last resort: find the first { ... } block in the response
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ParseError(f"Model returned non-JSON. First 300 chars: {text[:300]}")
```

### Server-Sent Events (SSE) streaming

Instead of the frontend waiting 3–5 seconds in silence, the backend streams progress in real time:

```python
# backend/src/api/routes.py

@router.get("/stream/{job_id}")
async def stream_parse(job_id: str):
    async def generate():
        yield _sse({"step": "extract", "status": "done",    "detail": "2,847 chars extracted"})
        yield _sse({"step": "prompt",  "status": "done",    "detail": "~1,200 tokens"})
        yield _sse({"step": "llm",     "status": "running", "detail": "Calling llama-3.3-70b…"})

        parsed_cv, tokens, latency = await parse_cv(job.raw_text)

        yield _sse({"step": "llm",      "status": "done", ...})
        yield _sse({"step": "validate", "status": "done", ...})
        yield _sse({"step": "complete", "status": "done", "result": parsed_cv.model_dump()})

    return StreamingResponse(generate(), media_type="text/event-stream")
```

Each `yield` pushes one event to the browser immediately. The frontend uses the native `EventSource` API — no library needed. `complete` carries the full `ParsedCV` JSON in the `result` field.

### Pydantic: the validation contract

```python
# backend/src/models/cv.py

# LLMs sometimes return null for list fields instead of [].
# BeforeValidator coerces None → [] before the type check runs.
_ListStr = Annotated[list[str], BeforeValidator(lambda v: [] if v is None else v)]

class WorkExperience(BaseModel):
    company:          str | None = None
    responsibilities: _ListStr   = []
    achievements:     _ListStr   = []   # won't crash if LLM returns null
```

`ParsedCV.model_validate(parsed_dict)` either succeeds (returning a fully type-safe object) or raises a `ValidationError` with a precise error message pointing to the exact field. It acts as a strict contract between the unpredictable LLM output and the rest of your code.

---

## Phase 2 — Harness & Orchestration

**Pillar:** Structuring AI calls into composable pipelines, adding persistence, enabling conversational Q&A.

### SQLite persistence

Every parsed CV is saved immediately after the stream completes:

```python
# backend/src/db/database.py

_SCHEMA = """
CREATE TABLE IF NOT EXISTS candidates (
    id          TEXT PRIMARY KEY,   -- same UUID as the upload job_id
    filename    TEXT NOT NULL,
    parsed_cv   TEXT NOT NULL,      -- full ParsedCV stored as a JSON string
    uploaded_at TEXT NOT NULL,
    tokens_used INTEGER,
    latency_ms  INTEGER
);

CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
"""

@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row   # rows behave like dicts
        yield db
```

`aiosqlite` is the async wrapper around Python's built-in `sqlite3`. The `asynccontextmanager` pattern ensures the connection is always closed, even if an exception is raised mid-function.

**Why store JSON strings instead of individual columns?**
The `parsed_cv` column stores the entire `ParsedCV` as one JSON blob. This means:
- Adding a new field to the CV schema requires no database migration
- Pydantic re-validates on every read: `ParsedCV.model_validate_json(row["parsed_cv"])`
- Trade-off: you can't SQL-filter by individual CV fields (Phase 4 could add proper columns)

### Stateless chat design

The chat feature uses LlamaIndex's `SimpleChatEngine` as a conversation wrapper:

```python
# backend/src/harness/chat.py

def build_chat_engine(context: str, history: list[dict]) -> SimpleChatEngine:
    llm = Groq(model=settings.groq_model, temperature=0.3)

    # Re-hydrate memory from the frontend-owned history array
    memory = ChatMemoryBuffer.from_defaults(token_limit=6000)
    for msg in history:
        role = _ROLE_MAP.get(msg.get("role", "user"), MessageRole.USER)
        memory.put(ChatMessage(role=role, content=msg["content"]))

    return SimpleChatEngine.from_defaults(
        llm=llm,
        memory=memory,
        system_prompt=_SYSTEM_TEMPLATE.format(context=context),
    )
```

The server **never stores chat history**. The frontend sends the full conversation array with every request. The server re-builds the memory buffer, calls the LLM, returns one response. This is called a **stateless server** — any replica can handle any request, no session state required.

### Running sync code inside async FastAPI

LlamaIndex's engine is synchronous. FastAPI is async. Mixing them directly blocks the event loop:

```python
# backend/src/api/routes.py

def _run_chat() -> str:                    # sync function
    context = pipeline_harness.get_candidate_context(candidate_id, req.message)
    engine = chat_harness.build_chat_engine(context, history)
    return str(engine.chat(req.message))

loop = asyncio.get_event_loop()
response_text = await loop.run_in_executor(None, _run_chat)
#                                           ^^^^  None = default thread pool
```

`run_in_executor` runs the sync function in a thread pool. `await` suspends the coroutine until the thread finishes, freeing the event loop to handle other requests in the meantime. Without this, every chat request would freeze the entire server for 1–3 seconds.

---

## Phase 3 — RAG & Vector Search

**Pillar:** Retrieval-Augmented Generation — finding relevant information by meaning, not by keyword.

### The problem Phase 3 solves

Phase 2 sent the entire CV JSON to the LLM for every chat message. This works but:
- Wastes tokens on irrelevant context
- Can't search across candidates
- Hits context limits on long CVs

**RAG solution:** store documents as vectors, retrieve only what's relevant per query.

### What an embedding is

An embedding model converts a string into a list of numbers (a vector). The key property: **text with similar meaning produces vectors that are geometrically close**.

```
"Python developer with FastAPI"   → [0.12, -0.34, 0.87, ...]   384 numbers
"Backend engineer, FastAPI, REST" → [0.11, -0.31, 0.89, ...]   very close
"Graphic designer, Figma, UI"     → [0.67,  0.21, -0.43, ...]  far away
```

Cosine distance measures the angle between two vectors. Small angle = similar meaning. This is the core mechanic behind semantic search.

### Ingest — happens once per CV upload

```python
# backend/src/harness/pipeline.py

_model = SentenceTransformer("all-MiniLM-L6-v2")  # 90MB, runs on CPU, loaded once

def _chunk_text(text: str) -> list[str]:
    normalized = " ".join(text.split())  # collapse PDF whitespace artifacts
    words = normalized.split()
    chunks, start = [], 0
    while start < len(words):
        end = min(start + 150, len(words))      # 150-word window
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - 30                         # 30-word overlap
    return chunks

def ingest(candidate_id: str, cv_text: str, ...) -> None:
    chunks     = _chunk_text(cv_text)            # split into pieces
    embeddings = _model.encode(chunks).tolist()  # embed each piece → vectors
    ids        = [f"{candidate_id}_{i}" for i in range(len(chunks))]

    col = _collection()
    col.add(
        ids=ids,
        embeddings=embeddings,                   # the vectors
        documents=chunks,                        # original text stored alongside
        metadatas=[{"candidate_id": candidate_id} for _ in chunks],
    )
```

**Why 150 words with 30-word overlap?**
- `all-MiniLM-L6-v2` has a max input of 256 tokens (~190 words). Chunks must fit.
- 150 words is large enough for one full work experience entry.
- The 30-word overlap prevents a concept that spans a chunk boundary from being missed.

### Retrieve — happens per search or chat

```python
# backend/src/harness/pipeline.py

def search(query: str, top_n: int) -> list[dict]:
    query_embedding = _model.encode([query]).tolist()  # same model, embed the question

    raw = col.query(
        query_embeddings=query_embedding,
        n_results=top_n * 5,   # fetch more to allow fair aggregation across candidates
        include=["distances", "metadatas", "documents"],
    )

    # One candidate may match many chunks — keep only their BEST score
    best: dict[str, dict] = {}
    for dist, meta, doc in zip(raw["distances"][0], raw["metadatas"][0], raw["documents"][0]):
        cid   = meta["candidate_id"]
        score = round(max(0.0, 1.0 - dist), 4)  # cosine distance → similarity
        if cid not in best or score > best[cid]["score"]:
            best[cid] = {"candidate_id": cid, "score": score, "excerpt": doc[:300]}

    return sorted(best.values(), key=lambda x: x["score"], reverse=True)[:top_n]
```

**Why fetch `top_n * 5` then aggregate?**
If you only fetch 5 results for `top_n=5`, one popular candidate could fill all 5 slots with their different chunks. Fetching 25 and then taking best-per-candidate gives every candidate a fair chance at appearing.

### ChromaDB — one shared collection

All candidates share one ChromaDB collection. Each chunk carries its `candidate_id` as metadata:

```
Collection: cv_chunks
┌────────────────┬──────────────────────────┬──────────────────────┐
│ id             │ document                 │ metadata             │
├────────────────┼──────────────────────────┼──────────────────────┤
│ abc-123_0      │ "Alice Martin, Paris…"   │ candidate_id: abc    │
│ abc-123_1      │ "Design Lead at Spotify" │ candidate_id: abc    │
│ abc-123_2      │ "Skills: Figma, React…"  │ candidate_id: abc    │
│ def-456_0      │ "Bob Smith, London…"     │ candidate_id: def    │
│ def-456_1      │ "Backend eng, FastAPI…"  │ candidate_id: def    │
└────────────────┴──────────────────────────┴──────────────────────┘
```

One collection = one query searches all candidates simultaneously. For per-candidate chat retrieval, the `where` filter restricts to one person:

```python
def get_candidate_context(candidate_id: str, query: str, top_k: int = 4) -> str:
    raw = col.query(
        query_embeddings=query_embedding,
        n_results=n_results,
        where={"candidate_id": candidate_id},  # ← filter to one candidate
        include=["documents"],
    )
    return "\n\n---\n\n".join(raw["documents"][0])
```

### The full RAG loop in the chat endpoint

```python
# backend/src/api/routes.py

def _run_chat() -> str:
    # 1. RETRIEVE — find the 4 chunks most relevant to this question
    context = pipeline_harness.get_candidate_context(candidate_id, req.message)

    # Fallback: candidate uploaded before Phase 3 has no chunks yet
    if not context:
        context = row["parsed_cv"]

    # 2. AUGMENT — inject retrieved chunks into the system prompt
    # 3. GENERATE — LLM answers based only on retrieved context, not full CV
    engine = chat_harness.build_chat_engine(context, history)
    return str(engine.chat(req.message))
```

**Retrieve → Augment → Generate.** That is the complete RAG loop. The LLM sees 3–4 relevant chunks instead of 3,000 words of CV.

### The score explained

```python
score = max(0.0, 1.0 - dist)
# ChromaDB configured with hnsw:space = cosine
# dist 0.0 = identical vectors → score 1.0 = 100%
# dist 0.5 = somewhat related  → score 0.5 = 50%
# dist 1.0 = orthogonal        → score 0.0 = 0%
```

The score is **not a probability**. It is a geometric distance measurement in 384-dimensional space. But it correlates strongly with topical relevance.

### Two stores, one join

ChromaDB and SQLite know nothing about each other. They are joined in the route layer by `candidate_id`:

```python
# backend/src/api/routes.py — /api/search endpoint

raw_results = pipeline_harness.search(req.query, req.top_n)
# raw_results: [{"candidate_id": "abc", "score": 0.87, "excerpt": "..."}]

for r in raw_results:
    row = await db_get_candidate(r["candidate_id"])  # SQLite lookup by id
    cv  = ParsedCV.model_validate_json(row["parsed_cv"])
    matches.append(CandidateMatch(
        candidate_id=r["candidate_id"],
        score=r["score"],
        excerpt=r["excerpt"],
        full_name=cv.personal_info.full_name,  # from SQLite
        top_role=cv.work_experience[0].title if cv.work_experience else None,
    ))
```

**ChromaDB answers: "who is semantically similar to this query?"**
**SQLite answers: "what is their name and role?"**
They are complementary — neither replaces the other.

---

## Phase 4 — Agentic Workflow (upcoming)

Phase 3's `/search` answers: *"which candidates match this job?"* with one vector query.

Phase 4's `/match` will answer: *"who should I hire, and why?"* with a multi-step agent:

1. Run Phase 3 search → top N candidates
2. For each, query the chat endpoint with targeted questions ("Do they have team leadership experience?")
3. Synthesise a structured shortlist report with justifications and identified gaps
4. Allow the HR user to refine via follow-up questions

**The key difference:** Phase 3 = one retrieval. Phase 4 = an agent that plans, executes multiple actions, and reasons about the results.

---

## Data Model Contract

`backend/src/models/cv.py` (Pydantic) and `frontend/src/lib/types.ts` (TypeScript) define the same shape. When you modify one, you must update the other.

```python
# backend/src/models/cv.py

class ParsedCV(BaseModel):
    personal_info:           PersonalInfo
    professional_summary:    str | None       = None
    total_experience_years:  int | None       = None
    skills:                  Skills
    work_experience:         list[WorkExperience] = []
    education:               list[Education]      = []
    certifications:          _ListStr             = []
    spoken_languages:        list[SpokenLanguage] = []
    personal_projects:       list[PersonalProject] = []
    confidence_scores:       ConfidenceScores
```

```typescript
// frontend/src/lib/types.ts

export interface ParsedCV {
  personal_info:           PersonalInfo;
  professional_summary:    string | null;
  total_experience_years:  number | null;
  skills:                  Skills;
  work_experience:         WorkExperience[];
  education:               Education[];
  certifications:          string[];
  spoken_languages:        SpokenLanguage[];
  personal_projects:       PersonalProject[];
  confidence_scores:       ConfidenceScores;
}
```

---

## Key Design Decisions

### Why Groq instead of OpenAI?

Groq runs open-source models (`llama-3.3-70b`) on custom LPU hardware. Free tier, ~200 tokens/sec inference, no rate limit issues during development.

### Why sentence-transformers locally instead of an API?

Groq doesn't offer an embeddings API. OpenAI does, but adds cost and a dependency. `all-MiniLM-L6-v2` is 90MB, runs in ~50ms per batch on CPU, and is completely free. More importantly: it teaches you that **embeddings and LLMs are separate, swappable components**. You can change one without touching the other.

### Why one ChromaDB collection for all candidates?

A single `cv_chunks` collection with `candidate_id` metadata means **one query** returns results across all candidates. Per-candidate collections would require looping over all candidates — O(N) queries instead of O(1).

### Why is chat history stateless (frontend-owned)?

If the server stored chat history, you would need session management, a cache layer (Redis), and sticky routing in load balancers. By letting the frontend own the history array and send it with every request, the server stays completely stateless — any replica can handle any request.

### Why `temperature=0.0` for parsing but `0.3` for chat?

- **Parsing** (`cv_parser.py`): extracting facts requires determinism. Same CV must always produce same JSON. Temperature 0 = no randomness.
- **Chat** (`chat.py`): conversational responses benefit from slight variation to avoid robotic repetition. Temperature 0.3 = minimal controlled creativity.

### Why `BeforeValidator` for list fields?

```python
_ListStr = Annotated[list[str], BeforeValidator(lambda v: [] if v is None else v)]
```

Pydantic's `= []` default applies only when the field is **absent** from the JSON. When the LLM explicitly returns `"achievements": null`, Pydantic sees `None` and rejects it against `list[str]`. The `BeforeValidator` runs before the type check and coerces `null → []`, making the model resilient to this common LLM failure.

---

## File Map

```
backend/src/
├── main.py               FastAPI app, CORS config, lifespan (DB init at startup)
├── config.py             Reads GROQ_API_KEY + GROQ_MODEL from .env via pydantic-settings
├── api/
│   └── routes.py         All endpoints: upload, stream, candidates, chat, search, jobs
├── parsers/
│   ├── prompts.py        ★ THE HEART — system prompt, output schema, few-shot example
│   └── cv_parser.py      Groq API call, defensive JSON extraction, Pydantic validation
├── extractors/
│   └── pdf.py            pypdf wrapper, whitespace cleaning, 4,000 char cap
├── models/
│   └── cv.py             Pydantic models — single source of truth for all data shapes
├── db/
│   ├── database.py       SQLite connection manager, CREATE TABLE schema
│   └── candidates.py     CRUD functions for candidates + jobs tables
└── harness/
    ├── pipeline.py       ★ ChromaDB ingest, semantic search, per-candidate retrieval
    └── chat.py           LlamaIndex SimpleChatEngine factory (RAG-augmented context)

frontend/src/
├── app/
│   ├── upload/           PDF drop zone + SSE stream progress display
│   ├── candidates/       Candidate list page
│   ├── candidates/[id]/  Candidate detail + ChatPanel component
│   ├── search/           ★ Job description → ranked candidates with match scores
│   ├── jobs/             Save and manage reusable job descriptions
│   └── pipeline/         Ingestion pipeline stats
├── lib/
│   ├── types.ts          TypeScript mirror of Pydantic models
│   └── api.ts            fetch() wrappers for every backend endpoint
└── styles/
    └── tokens.css        All CSS custom properties (colors, spacing, typography)
```

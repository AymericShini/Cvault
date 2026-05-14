# CVault — Project Context for Claude Code

> Place this file at the project root (`D:\Dev\Cvault\CLAUDE.md`). Claude Code auto-reads it on session start.

---

## 1. What this project is

**CVault** is an AI-powered CV reader & parser. It is **primarily a learning vehicle**, secondarily a portfolio piece.

The user is learning four AI engineering pillars by building the same app in four progressive phases:

| Phase | Pillar                                   | Status      |
| ----- | ---------------------------------------- | ----------- |
| 1     | **Context Engineering**                  | ✅ COMPLETE |
| 2     | **Harness / Orchestration** (LlamaIndex) | ⏭️ NEXT     |
| 3     | **RAG** (Retrieval-Augmented Generation) | Pending     |
| 4     | **Agentic Workflow**                     | Pending     |

Each phase adds one pillar to the same codebase. Don't skip ahead — the user is learning each pillar by _building_ it, not by reading.

---

## 2. User profile

- **OS:** Windows 11
- **Location:** France (Bordeaux) — uses French keyboard, comfortable in English
- **Tooling installed:** VSCode, pnpm, Node.js, Git, Python 3.11, uv
- **API access:** Groq free tier (LLM). No Anthropic API yet. No OpenAI.
- **Experience level:** Solid web developer. New to AI/LLM engineering specifically. Knows React, TypeScript, basic Python.
- **Project root:** `D:\Dev\Cvault\`

**Teaching style the user prefers:**

- Concise. Brief answers when possible.
- Explain _why_ a decision is made, not just _what_ to do.
- Show before vs after.
- Don't over-format with bullet points. Prose is fine.
- Always discuss prerequisites & design before writing code for a new phase.

---

## 3. Stack (locked decisions — do not change without asking)

### Backend

- **Language:** Python 3.11
- **Package manager:** `uv` (not pip)
- **Framework:** FastAPI
- **LLM provider:** Groq (free tier, `llama-3.3-70b-versatile`)
- **PDF parsing:** `pypdf` (will upgrade to `unstructured` in Phase 2 if needed)
- **Models / validation:** Pydantic v2
- **Phase 2+ harness:** LlamaIndex (not LangChain — decided because the project is document-centric)
- **Phase 3 vector store:** ChromaDB (local, zero-config)
- **Phase 3 embeddings:** `sentence-transformers` (all-MiniLM-L6-v2)

### Frontend

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** **CSS Modules + CSS custom properties.** NO TAILWIND. Hand-rolled CSS only.
- **Fonts:** DM Sans (UI) + DM Mono (code/data) via Google Fonts CDN
- **Package manager:** pnpm
- **Next config:** `next.config.mjs` (not `.ts` — Next 14 incompatibility)

### Design tokens

All colors, spacing, typography live in `frontend/src/styles/tokens.css` as `:root` CSS variables. Never hardcode values in components.

### Design aesthetic

Editorial minimalism with technical edge. Off-white bg (`#F8F7F4`), near-black text, single muted teal accent (`#2A7C6F`). No gradients, no glassmorphism, no rounded-everything. Monospace for all AI outputs (logs, prompts, JSON).

---

## 4. Current state — Phase 1 complete

### What works end-to-end

1. User drops a PDF on `/upload`
2. Backend extracts text via pypdf, stores in-memory job
3. Frontend opens SSE stream, watches 4 live steps: `extract → prompt → llm → validate`
4. Backend calls Groq with carefully engineered prompt, streams events
5. Frontend renders parsed result in 2-column layout: parsed data left, PDF iframe right

### What gets extracted

Personal info, professional summary, total experience years, hard skills (technical/languages/tools), soft skills (separate), work experience timeline, education list, certifications, spoken languages, **personal projects** (added in v1.1), confidence scores (LLM self-rates 4 key fields 0.0–1.0).

### Key Phase 1 lessons already taught

- `temperature=0.0` for extraction tasks
- System prompt = role + rules; user prompt = task + schema + few-shot + data
- Few-shot example is more powerful than instructions
- Defensive JSON parsing (model sometimes wraps in markdown fences)
- Pydantic models with optional fields (LLM output is untrusted input)
- Confidence scores via LLM self-rating
- SSE for live progress streaming
- `URL.createObjectURL` + cleanup for in-browser PDF rendering

---

## 5. File structure

```
D:\Dev\Cvault\
├── backend\
│   ├── .env                          # GROQ_API_KEY=gsk_...
│   ├── .env.example
│   ├── pyproject.toml                # uv-managed deps
│   └── src\
│       ├── main.py                   # FastAPI app + CORS
│       ├── config.py                 # pydantic-settings env loader
│       ├── api\routes.py             # POST /api/upload, GET /api/stream/{id}
│       ├── extractors\pdf.py         # pypdf wrapper
│       ├── models\cv.py              # Pydantic: ParsedCV + sub-models
│       └── parsers\
│           ├── prompts.py            # SYSTEM_PROMPT + schema + few-shot — THE HEART
│           └── cv_parser.py          # AsyncGroq call + JSON extraction
│
└── frontend\
    ├── .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:8000
    ├── next.config.mjs
    ├── package.json
    ├── tsconfig.json
    └── src\
        ├── app\
        │   ├── layout.tsx            # shell with sidebar
        │   ├── globals.css           # reset + font import
        │   ├── page.tsx              # dashboard placeholder
        │   └── upload\page.tsx       # state machine: idle | processing | result
        ├── components\
        │   ├── layout\Sidebar.tsx    # nav with phase badges (disabled items)
        │   └── upload\
        │       ├── DropZone.tsx
        │       ├── ProcessingPanel.tsx   # SSE consumer, live step display
        │       └── ResultPreview.tsx     # 2-col layout, parsed left + PDF iframe right
        ├── lib\
        │   ├── api.ts                # uploadCV(), getStreamUrl()
        │   └── types.ts              # mirrors Pydantic models exactly
        └── styles\tokens.css         # all CSS custom properties
```

Every component file has a sibling `ComponentName.module.css`. CSS Modules only.

---

## 6. API contract (Phase 1)

```
POST /api/upload
  Body: multipart/form-data, field "file" (PDF, max 10MB)
  Returns: { job_id: string, filename: string, chars_extracted: int, status: "pending" }

GET /api/stream/{job_id}
  Returns: text/event-stream
  Events emitted in order:
    { step: "extract",  status: "done",    detail, duration_ms }
    { step: "prompt",   status: "done",    detail, prompt_preview, truncated }
    { step: "llm",      status: "running", detail }
    { step: "llm",      status: "done",    detail, duration_ms }
    { step: "validate", status: "done",    detail }
    { step: "complete", status: "done",    result: ParsedCV }
    { step: "error",    status: "error",   detail }       (on failure)

GET /api/health → { status, phase, active_jobs }
```

**Storage:** in-memory dict `_jobs` in `routes.py`. Replaced with persistence in Phase 2.

---

## 7. Coding conventions

### Python

- Type hints everywhere (PEP 604 union syntax: `str | None`, not `Optional[str]`)
- `async def` for I/O-bound routes
- Pydantic v2 syntax (`model_dump()`, `model_validate()`, not v1 `.dict()` / `.parse_obj()`)
- Module-level constants `UPPER_SNAKE_CASE`
- Internal helpers `_underscore_prefix`
- Comments explain _why_, not _what_

### TypeScript

- `interface` for object shapes, `type` for unions/aliases
- `'use client'` only when needed (event handlers, state, refs)
- Functional components only
- Always cleanup side effects in `useEffect` returns
- Path alias `@/*` for `src/*`
- No `any`. If forced, comment why.

### CSS

- `.module.css` per component
- Reference tokens via `var(--token-name)` — never hardcode colors/spacing
- BEM-ish naming: `.card`, `.cardHeader`, `.cardHeaderTitle`
- Group rules by section with `/* ═══ Section ═══ */` comment dividers

### Git

- Not initialized yet at user's project root (probably). If they ask, suggest committing per-phase.

---

## 8. Phase 2 — what's next

**Goal:** Refactor the parsing pipeline to use **LlamaIndex** as a proper orchestration harness, and add a candidate database + a conversational "Ask AI about this CV" feature.

**Concepts to teach:**

- What a "harness" or "orchestration framework" actually does
- LlamaIndex `IngestionPipeline` for document processing
- `ChatEngine` with `ConversationBufferMemory` for the Q&A panel
- SQLite for structured persistence (still local, still free)
- Auto-repair with output parsers (when JSON validation fails, the harness re-asks the LLM with the error)

**New features to build:**

1. SQLite persistence — store every parsed CV
2. `/candidates` page — list view + detail page per candidate
3. "Ask AI about this CV" chat panel on the candidate detail page (with conversation memory)
4. Pipeline monitor page (`/pipeline`) — live view of LlamaIndex pipeline activity (portfolio showpiece)

**Decision pending — discuss with user first:**

- Whether to keep Groq or add Anthropic API now that Phase 2 needs better reasoning for the chat panel
- Whether to use SQLite directly or via SQLAlchemy

**Do NOT start coding Phase 2 without:**

1. A prerequisite check (what packages need installing)
2. A design discussion (UI for the candidates list + chat panel)
3. User confirmation that Phase 1 fully works on their machine

---

## 9. Pedagogical principles

1. **Build first, theorize after.** Get code running, then explain _why_ it works.
2. **Show the broken version, then the fix.** This is more memorable than fix-only.
3. **Exercises matter.** End each phase with 3-5 concrete experiments the user can run in 30 seconds each.
4. **Don't hide the AI.** Make prompts visible (UI shows prompt preview). Make confidence visible. Make agent reasoning visible. This is both the learning point and the portfolio differentiator.
5. **Minimal abstractions.** Don't reach for a framework feature when raw code teaches better. We resisted using LangChain in Phase 1 specifically so the user could see raw API calls.

---

## 10. Known limitations / tech debt to address later

- **PDF extraction:** pypdf misses multi-column layouts. Phase 2 should consider `unstructured` or `pdfminer.six`.
- **No OCR:** Scanned PDFs fail with a clear error. Out of scope for now.
- **In-memory job store:** Fine for single-user dev. Phase 2 must replace with SQLite.
- **Token budget:** CV text truncated to 4000 chars. Phase 2 chunking will fix.
- **No multipage UI navigation yet:** Sidebar shows planned routes but most are disabled with "Phase N" badges.
- **No tests.** Acceptable for Phase 1 learning. Should add pytest + Playwright by Phase 3.
- **CORS is permissive** (`http://localhost:3000` only). Fine for local dev.

---

## 11. Quick commands the user knows

```powershell
# Backend (terminal 1)
cd D:\Dev\Cvault\backend
uv run uvicorn src.main:app --reload --port 8000

# Frontend (terminal 2)
cd D:\Dev\Cvault\frontend
pnpm dev
```

App at http://localhost:3000/upload

---

## 12. First thing to do when picking up this project

1. Read this file (you're doing it).
2. Skim `backend/src/parsers/prompts.py` — that's where Context Engineering lives.
3. Skim `frontend/src/components/upload/ResultPreview.tsx` — that's the most complex UI piece.
4. Ask the user: "Phase 1 works on your machine, right? Are you ready to start Phase 2 prerequisites?"

Do NOT start writing new code until the user confirms Phase 1 is functional and explicitly asks to proceed.

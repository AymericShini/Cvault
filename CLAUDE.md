# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

CVault is an AI-powered CV reader & parser. It is **primarily a learning vehicle** — the user is learning four AI engineering pillars by building the same app in four progressive phases:

| Phase | Pillar | Status |
|-------|--------|--------|
| 1 | Context Engineering | ✅ Complete |
| 2 | Harness / Orchestration (LlamaIndex) | ✅ Complete |
| 3 | RAG (ChromaDB + sentence-transformers) | ✅ Complete |
| 4 | Agentic Workflow | ⏭️ In Progress |

**Do not start coding a new phase without:** (1) a prerequisites check, (2) a design discussion, (3) user confirmation the previous phase works on their machine.

## Development Commands

```powershell
# Backend (terminal 1)
cd D:\Dev\Cvault\backend
uv run uvicorn src.main:app --reload --port 8000

# Frontend (terminal 2)
cd D:\Dev\Cvault\frontend
pnpm dev
```

App runs at `http://localhost:3000/upload`. Backend at `http://localhost:8000`.

Environment: copy `backend/.env.example` → `backend/.env` with `GROQ_API_KEY`. Copy `frontend/.env.localexample` → `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Locked Stack

### Backend
- Python 3.11, `uv` (not pip), FastAPI, Pydantic v2, Uvicorn
- LLM: Groq (`llama-3.3-70b-versatile`), `temperature=0.0`
- PDF: `pypdf` (Phase 2 may upgrade to `unstructured`)
- Phase 2+ harness: **LlamaIndex** (not LangChain — project is document-centric)
- Phase 3: ChromaDB (local), sentence-transformers (all-MiniLM-L6-v2)

### Frontend
- Next.js 14 (App Router), TypeScript, CSS Modules + CSS custom properties
- **No Tailwind.** Hand-rolled CSS only.
- Fonts: DM Sans (UI) + DM Mono (code/data) via Google Fonts CDN
- `next.config.mjs` (not `.ts` — Next 14 incompatibility)

### Design tokens
All colors, spacing, and typography live in `frontend/src/styles/tokens.css` as `:root` CSS variables. Never hardcode values in components.

Design aesthetic: editorial minimalism. Off-white bg (`#F8F7F4`), near-black text, single muted teal accent (`#2A7C6F`). No gradients, no glassmorphism. Monospace for all AI outputs (logs, prompts, JSON).

## Architecture

### Request Flow
1. User drops a PDF on `DropZone.tsx`
2. `POST /api/upload` — backend extracts text with pypdf, stores in-memory job, returns `job_id`
3. `GET /api/stream/{job_id}` — SSE stream pushes 5 steps: `extract → prompt → llm → validate → complete`
4. `ProcessingPanel.tsx` listens via `EventSource`, updates UI per step
5. `ResultPreview.tsx` renders final parsed CV in 2-column layout (data left, PDF iframe right)

### Key Files

| Path | Responsibility |
|------|---------------|
| `backend/src/parsers/prompts.py` | THE HEART — system prompt, output schema, few-shot example |
| `backend/src/parsers/cv_parser.py` | Groq call, JSON extraction, defensive markdown-fence stripping |
| `backend/src/models/cv.py` | Pydantic models — single source of truth for data shape |
| `backend/src/extractors/pdf.py` | pypdf wrapper, truncates at 4,000 chars |
| `backend/src/api/routes.py` | POST /api/upload + GET /api/stream/{id}, in-memory `_jobs` dict |
| `frontend/src/lib/types.ts` | TypeScript mirror of Pydantic models — must stay in sync |
| `frontend/src/lib/api.ts` | `uploadCV()`, `getStreamUrl()` |
| `frontend/src/styles/tokens.css` | All CSS custom properties |

### Data Model Contract
`backend/src/models/cv.py` (Pydantic) and `frontend/src/lib/types.ts` (TypeScript) define the same shape: `PersonalInfo`, `WorkExperience`, `Education`, `Skills`, `ConfidenceScores`, `ParsedCV`. When modifying one, update the other.

### In-Memory Job Store
Phase 1 uses a plain dict keyed by UUID in `routes.py`. Jobs cleaned after streaming. Replaced with SQLite in Phase 2.

## API Contract (Phase 1)

```
POST /api/upload
  Body: multipart/form-data, field "file" (PDF, max 10MB)
  Returns: { job_id, filename, chars_extracted, status: "pending" }

GET /api/stream/{job_id}
  Returns: text/event-stream
  Events: extract → prompt → llm (running) → llm (done) → validate → complete
  complete event carries: { step: "complete", status: "done", result: ParsedCV }
  Error event: { step: "error", status: "error", detail }

GET /api/health → { status, phase, active_jobs }
```

## Coding Conventions

### Python
- Type hints everywhere, PEP 604 union syntax (`str | None`, not `Optional[str]`)
- `async def` for I/O-bound routes
- Pydantic v2 syntax: `model_dump()`, `model_validate()` (not v1 `.dict()` / `.parse_obj()`)
- Module-level constants `UPPER_SNAKE_CASE`, internal helpers `_underscore_prefix`

### TypeScript
- `interface` for object shapes, `type` for unions/aliases
- `'use client'` only when needed (event handlers, state, refs)
- Functional components only. Always cleanup side effects in `useEffect` returns.
- Path alias `@/*` for `src/*`. No `any`.

### CSS
- `.module.css` per component, sibling to the component file
- Reference tokens via `var(--token-name)` — never hardcode colors/spacing
- BEM-ish naming: `.card`, `.cardHeader`, `.cardHeaderTitle`
- Section dividers: `/* ═══ Section ═══ */`

## Phase 4 — Current

Agentic Workflow. New files: `backend/src/agent/`, `backend/src/db/agent_runs.py`, `frontend/src/app/agent/`.

## Known Tech Debt

- pypdf misses multi-column PDF layouts (Phase 2: consider `unstructured`)
- CV text truncated to 4,000 chars (Phase 2: proper chunking)
- In-memory job store (Phase 2: SQLite)
- No tests (target: pytest + Playwright by Phase 3)
- No OCR — scanned PDFs fail with a clear error (out of scope)

"""
API routes — Phase 3.

Phase 1: upload + SSE stream.
Phase 2: candidates CRUD + chat.
Phase 3 adds:
  POST   /api/search                — semantic candidate search by job description
  GET    /api/jobs                  — list saved job descriptions
  POST   /api/jobs                  — save a job description
  DELETE /api/jobs/{id}             — remove a job description
"""
import asyncio
import json
import time
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from src.db.candidates import (
    delete_candidate as db_delete_candidate,
    get_candidate as db_get_candidate,
    list_candidates as db_list_candidates,
    save_candidate,
    save_job as db_save_job,
    list_jobs as db_list_jobs,
    delete_job as db_delete_job,
)
from src.extractors.pdf import extract_text, ExtractionError
from src.harness import chat as chat_harness
from src.harness import pipeline as pipeline_harness
from src.models.cv import (
    CandidateListItem,
    CandidateMatch,
    CandidateRecord,
    ChatRequest,
    ChatResponse,
    JobCreate,
    JobDescription,
    JobState,
    ParsedCV,
    SearchRequest,
    SearchResponse,
    UploadResponse,
)
from src.parsers.cv_parser import parse_cv, ParseError
from src.parsers.prompts import build_user_prompt, SYSTEM_PROMPT, MAX_CV_CHARS

router = APIRouter(prefix="/api")

# ─── In-memory job store (Phase 1 — replaced by SQLite after streaming) ──────
_jobs: dict[str, JobState] = {}


# ─── Helpers ────────────────────────────────────────────────────────────────
def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _model_name() -> str:
    from src.config import settings
    return settings.groq_model


# ─── Upload + stream (Phase 1, extended for Phase 2 persistence) ─────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_cv(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    raw_bytes = await file.read()
    if len(raw_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "File too large. Maximum size is 10 MB.")

    try:
        raw_text = extract_text(raw_bytes)
    except ExtractionError as e:
        raise HTTPException(422, str(e))

    job_id = str(uuid4())
    _jobs[job_id] = JobState(
        filename=file.filename or "unknown.pdf",
        raw_text=raw_text,
        chars=len(raw_text),
    )

    return UploadResponse(
        job_id=job_id,
        filename=file.filename or "unknown.pdf",
        chars_extracted=len(raw_text),
    )


@router.get("/stream/{job_id}")
async def stream_parse(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found. Upload a CV first.")

    job = _jobs[job_id]

    async def generate():
        try:
            # ── Step 1: Report text extraction ────────────────────────────
            yield _sse({
                "step": "extract",
                "status": "done",
                "detail": f"{job.chars:,} chars extracted from {job.filename}",
                "duration_ms": 0,
            })
            await asyncio.sleep(0.05)

            # ── Step 2: Prompt stats ───────────────────────────────────────
            user_prompt = build_user_prompt(job.raw_text)
            estimated_tokens = (len(SYSTEM_PROMPT) + len(user_prompt)) // 4
            truncated = job.chars > MAX_CV_CHARS

            yield _sse({
                "step": "prompt",
                "status": "done",
                "detail": f"~{estimated_tokens:,} tokens · model: {_model_name()}",
                "prompt_preview": SYSTEM_PROMPT[:200] + "…",
                "truncated": truncated,
                "duration_ms": 0,
            })
            await asyncio.sleep(0.05)

            # ── Step 3: LLM call ───────────────────────────────────────────
            yield _sse({
                "step": "llm",
                "status": "running",
                "detail": f"Calling {_model_name()}…",
            })

            try:
                parsed_cv, tokens_used, latency_s = await parse_cv(job.raw_text)
            except ParseError as e:
                yield _sse({"step": "error", "status": "error", "detail": str(e)})
                return

            latency_ms = int(latency_s * 1000)
            yield _sse({
                "step": "llm",
                "status": "done",
                "detail": f"{latency_ms} ms · {tokens_used:,} tokens used",
                "duration_ms": latency_ms,
            })
            await asyncio.sleep(0.05)

            # ── Step 4: Validate ───────────────────────────────────────────
            yield _sse({
                "step": "validate",
                "status": "done",
                "detail": "JSON validated against CV schema",
                "duration_ms": 0,
            })
            await asyncio.sleep(0.05)

            # ── Phase 2: Persist BEFORE complete so the write finishes
            #    before Starlette closes the generator on client disconnect.
            parsed_cv_json = json.dumps(parsed_cv.model_dump())

            await save_candidate(
                id=job_id,
                filename=job.filename,
                parsed_cv_json=parsed_cv_json,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
            )

            # LlamaIndex ingestion is sync — run in thread pool
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                pipeline_harness.ingest,
                job_id,
                job.raw_text,
                parsed_cv_json,
            )

            _jobs.pop(job_id, None)

            # ── Step 5: Complete ───────────────────────────────────────────
            yield _sse({
                "step": "complete",
                "status": "done",
                "detail": "Done",
                "result": parsed_cv.model_dump(),
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "model": _model_name(),
            })

        except Exception as e:
            yield _sse({
                "step": "error",
                "status": "error",
                "detail": f"Unexpected error: {e}",
            })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Candidates (Phase 2) ─────────────────────────────────────────────────────

@router.get("/candidates", response_model=list[CandidateListItem])
async def get_candidates():
    rows = await db_list_candidates()
    items = []
    for row in rows:
        cv = ParsedCV.model_validate_json(row["parsed_cv"])
        items.append(CandidateListItem(
            id=row["id"],
            filename=row["filename"],
            uploaded_at=row["uploaded_at"],
            full_name=cv.personal_info.full_name,
            top_role=cv.work_experience[0].title if cv.work_experience else None,
            tokens_used=row["tokens_used"],
            latency_ms=row["latency_ms"],
        ))
    return items


@router.get("/candidates/{candidate_id}", response_model=CandidateRecord)
async def get_candidate_detail(candidate_id: str):
    row = await db_get_candidate(candidate_id)
    if not row:
        raise HTTPException(404, "Candidate not found.")
    cv = ParsedCV.model_validate_json(row["parsed_cv"])
    return CandidateRecord(
        id=row["id"],
        filename=row["filename"],
        uploaded_at=row["uploaded_at"],
        parsed_cv=cv,
        tokens_used=row["tokens_used"],
        latency_ms=row["latency_ms"],
    )


@router.delete("/candidates/{candidate_id}", status_code=204)
async def remove_candidate(candidate_id: str):
    deleted = await db_delete_candidate(candidate_id)
    if not deleted:
        raise HTTPException(404, "Candidate not found.")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, pipeline_harness.remove, candidate_id)


@router.post("/candidates/{candidate_id}/chat", response_model=ChatResponse)
async def chat_with_candidate(candidate_id: str, req: ChatRequest):
    row = await db_get_candidate(candidate_id)
    if not row:
        raise HTTPException(404, "Candidate not found.")

    history = [msg.model_dump() for msg in req.history]

    def _run_chat() -> str:
        # Retrieve relevant chunks from ChromaDB; fall back to full CV JSON
        # if this candidate was uploaded before Phase 3 (no chunks yet).
        context = pipeline_harness.get_candidate_context(candidate_id, req.message)
        if not context:
            context = row["parsed_cv"]
        engine = chat_harness.build_chat_engine(context, history)
        response = engine.chat(req.message)
        return str(response)

    loop = asyncio.get_event_loop()
    response_text = await loop.run_in_executor(None, _run_chat)
    return ChatResponse(response=response_text)


# ─── Search (Phase 3) ─────────────────────────────────────────────────────────

@router.post("/search", response_model=SearchResponse)
async def search_candidates(req: SearchRequest):
    if req.top_n not in (1, 5, 10):
        raise HTTPException(400, "top_n must be 1, 5, or 10.")

    loop = asyncio.get_event_loop()
    raw_results = await loop.run_in_executor(
        None, pipeline_harness.search, req.query, req.top_n
    )

    matches: list[CandidateMatch] = []
    for r in raw_results:
        row = await db_get_candidate(r["candidate_id"])
        if not row:
            continue
        cv = ParsedCV.model_validate_json(row["parsed_cv"])
        matches.append(CandidateMatch(
            candidate_id=r["candidate_id"],
            score=r["score"],
            excerpt=r["excerpt"],
            full_name=cv.personal_info.full_name,
            top_role=cv.work_experience[0].title if cv.work_experience else None,
            filename=row["filename"],
        ))

    return SearchResponse(results=matches)


# ─── Jobs (Phase 3) ───────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[JobDescription])
async def get_jobs():
    rows = await db_list_jobs()
    return [JobDescription(**row) for row in rows]


@router.post("/jobs", response_model=JobDescription, status_code=201)
async def create_job(body: JobCreate):
    row = await db_save_job(title=body.title, description=body.description)
    return JobDescription(**row)


@router.delete("/jobs/{job_id}", status_code=204)
async def remove_job(job_id: str):
    deleted = await db_delete_job(job_id)
    if not deleted:
        raise HTTPException(404, "Job not found.")


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok", "phase": 3, "active_jobs": len(_jobs)}

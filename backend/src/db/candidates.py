"""
CRUD helpers for the candidates and jobs tables.
All functions accept/return plain dicts — Pydantic validation happens in the route layer.
"""
from datetime import datetime, timezone
from uuid import uuid4

from src.db.database import get_db


async def save_candidate(
    id: str,
    filename: str,
    parsed_cv_json: str,
    tokens_used: int | None,
    latency_ms: int | None,
) -> None:
    uploaded_at = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO candidates
                (id, filename, parsed_cv, uploaded_at, tokens_used, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (id, filename, parsed_cv_json, uploaded_at, tokens_used, latency_ms),
        )
        await db.commit()


async def list_candidates() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, filename, parsed_cv, uploaded_at, tokens_used, latency_ms "
            "FROM candidates ORDER BY uploaded_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_candidate(id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, filename, parsed_cv, uploaded_at, tokens_used, latency_ms "
            "FROM candidates WHERE id = ?",
            (id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def delete_candidate(id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM candidates WHERE id = ?", (id,))
        await db.commit()
        return cursor.rowcount > 0


# ─── Jobs CRUD ────────────────────────────────────────────────────────────────

async def save_job(title: str, description: str) -> dict:
    job_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO jobs (id, title, description, created_at) VALUES (?, ?, ?, ?)",
            (job_id, title, description, created_at),
        )
        await db.commit()
    return {"id": job_id, "title": title, "description": description, "created_at": created_at}


async def list_jobs() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, title, description, created_at FROM jobs ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def delete_job(id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM jobs WHERE id = ?", (id,))
        await db.commit()
        return cursor.rowcount > 0

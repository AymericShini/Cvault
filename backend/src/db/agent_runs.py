"""
CRUD helpers for the agent_runs table.
All functions accept/return plain dicts — Pydantic validation happens in the route layer.
"""
import json
from datetime import datetime, timezone

from src.db.database import get_db


async def create_run(run_id: str, task: str) -> None:
    created_at = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """
            INSERT OR IGNORE INTO agent_runs (id, task, status, events, created_at)
            VALUES (?, ?, 'running', '[]', ?)
            """,
            (run_id, task, created_at),
        )
        await db.commit()


async def complete_run(
    run_id: str,
    events: list[dict],
    answer: str | None,
    status: str,
    tokens_used: int | None = None,
) -> None:
    completed_at = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            """
            UPDATE agent_runs
            SET status = ?, events = ?, answer = ?, tokens_used = ?, completed_at = ?
            WHERE id = ?
            """,
            (status, json.dumps(events), answer, tokens_used, completed_at, run_id),
        )
        await db.commit()


async def list_runs(limit: int = 50) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, task, status, answer, tokens_used, created_at, completed_at "
            "FROM agent_runs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_run(run_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, task, status, events, answer, tokens_used, created_at, completed_at "
            "FROM agent_runs WHERE id = ?",
            (run_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

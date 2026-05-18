"""
SQLite connection management.

Two responsibilities:
  init_db()  — called once at startup to create tables if they don't exist
  get_db()   — async context manager that yields a live connection per call
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

DB_PATH = Path(os.getenv("DB_PATH", str(Path(__file__).parent.parent.parent / "cvault.db")))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS candidates (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    parsed_cv   TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS agent_runs (
    id           TEXT PRIMARY KEY,
    task         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'running',
    events       TEXT NOT NULL DEFAULT '[]',
    answer       TEXT,
    tokens_used  INTEGER,
    created_at   TEXT NOT NULL,
    completed_at TEXT
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        # Migration: add tokens_used to existing agent_runs tables created before this column
        try:
            await db.execute("ALTER TABLE agent_runs ADD COLUMN tokens_used INTEGER")
            await db.commit()
        except Exception:
            pass  # Column already exists


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

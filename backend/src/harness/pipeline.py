"""
CVIngestionPipeline — Phase 3: ChromaDB + sentence-transformers.

Teaching concept: RAG is a two-phase pattern.

  Ingest (offline):
    1. Chunk the raw CV text (word-boundary splits with overlap)
    2. Embed each chunk with all-MiniLM-L6-v2 (local, CPU, free)
    3. Store (text, vector, metadata) in ChromaDB — one shared collection,
       all candidates, each chunk tagged with candidate_id

  Retrieve (online):
    - search(): embed a job description, query across all candidates,
      aggregate best score per candidate → ranked list
    - get_candidate_context(): embed a chat question, query filtered
      by candidate_id → relevant chunks injected as LLM context

Why one shared collection? A single query searches all candidates at once.
Per-candidate collections would require N queries for N candidates.
"""
from pathlib import Path

from sentence_transformers import SentenceTransformer

import os
import chromadb

CHROMA_DIR = Path(os.getenv("CHROMA_DIR", str(Path(__file__).parent.parent.parent / "chroma_db")))
_COLLECTION_NAME = "cv_chunks"
_CHUNK_WORDS = 150   # max words per chunk
_CHUNK_OVERLAP = 30  # words of overlap between consecutive chunks

# Loaded once at import — slow on first startup (model download), fast after.
_model = SentenceTransformer("all-MiniLM-L6-v2")


def _client() -> chromadb.PersistentClient:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(CHROMA_DIR))


def _collection():
    # cosine space: distance 0 = identical, 1 = orthogonal, 2 = opposite
    return _client().get_or_create_collection(
        _COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def _chunk_text(text: str) -> list[str]:
    # Collapse all whitespace (PDF newlines, tabs, double spaces) to single spaces
    normalized = " ".join(text.split())
    words = normalized.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + _CHUNK_WORDS, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - _CHUNK_OVERLAP
    return chunks


def ingest(candidate_id: str, cv_text: str, parsed_cv_json: str) -> None:
    """Chunk, embed, and store a candidate's CV in ChromaDB."""
    col = _collection()

    # Remove any existing chunks for this candidate (safe re-ingest)
    existing = col.get(where={"candidate_id": candidate_id})
    if existing["ids"]:
        col.delete(ids=existing["ids"])

    chunks = _chunk_text(cv_text)
    if not chunks:
        return

    embeddings = _model.encode(chunks).tolist()
    ids = [f"{candidate_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"candidate_id": candidate_id} for _ in chunks]

    col.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)


def remove(candidate_id: str) -> None:
    """Delete all chunks for a candidate from ChromaDB."""
    try:
        col = _collection()
        existing = col.get(where={"candidate_id": candidate_id})
        if existing["ids"]:
            col.delete(ids=existing["ids"])
    except Exception:
        pass


def search(query: str, top_n: int) -> list[dict]:
    """
    Semantic search across all candidates.

    Returns up to top_n candidates sorted by descending relevance score.
    Score = 1 - cosine_distance, clamped to [0, 1].
    Each candidate's score is the best (highest) score among its chunks.
    """
    col = _collection()
    total = col.count()
    if total == 0:
        return []

    query_embedding = _model.encode([query]).tolist()
    n_results = min(top_n * 5, total)  # fetch extra to aggregate across candidates

    raw = col.query(
        query_embeddings=query_embedding,
        n_results=n_results,
        include=["distances", "metadatas", "documents"],
    )

    best: dict[str, dict] = {}
    for dist, meta, doc in zip(
        raw["distances"][0], raw["metadatas"][0], raw["documents"][0]
    ):
        cid = meta["candidate_id"]
        score = round(max(0.0, 1.0 - dist), 4)
        if cid not in best or score > best[cid]["score"]:
            best[cid] = {
                "candidate_id": cid,
                "score": score,
                "excerpt": doc[:300],
            }

    return sorted(best.values(), key=lambda x: x["score"], reverse=True)[:top_n]


def get_candidate_context(candidate_id: str, query: str, top_k: int = 4) -> str:
    """
    Retrieve the top-k most relevant CV chunks for a chat question.
    Returns chunks joined by separators, ready to inject into a system prompt.
    Returns empty string if no chunks exist for this candidate.
    """
    col = _collection()

    # Count chunks for this specific candidate before querying
    existing = col.get(where={"candidate_id": candidate_id})
    candidate_count = len(existing["ids"])
    if candidate_count == 0:
        return ""

    query_embedding = _model.encode([query]).tolist()
    n_results = min(top_k, candidate_count)

    raw = col.query(
        query_embeddings=query_embedding,
        n_results=n_results,
        where={"candidate_id": candidate_id},
        include=["documents"],
    )

    chunks = raw["documents"][0]
    return "\n\n---\n\n".join(chunks)

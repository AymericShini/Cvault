# CVault — Phase 1

## First-time setup

### 1. Backend
```
cd backend
copy .env.example .env
# Edit .env and add your GROQ_API_KEY
uv sync
```

### 2. Frontend
```
cd frontend
copy .env.local.example .env.local
pnpm install
```

## Run (two terminals)

**Terminal 1 — Backend**
```
cd backend
uv run uvicorn src.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```
cd frontend
pnpm dev
```

Open http://localhost:3000/upload

import type {
  CandidateListItem,
  CandidateRecord,
  ChatRequest,
  ChatResponse,
  JobCreate,
  JobDescription,
  SearchRequest,
  SearchResponse,
  UploadResponse,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function _json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

// ─── Upload (Phase 1) ────────────────────────────────────────────────────────

export async function uploadCV(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  return _json(await fetch(`${API_URL}/api/upload`, { method: 'POST', body: form }))
}

export function getStreamUrl(jobId: string): string {
  return `${API_URL}/api/stream/${jobId}`
}

// ─── Candidates (Phase 2) ────────────────────────────────────────────────────

export async function getCandidates(): Promise<CandidateListItem[]> {
  return _json(await fetch(`${API_URL}/api/candidates`))
}

export async function getCandidate(id: string): Promise<CandidateRecord> {
  return _json(await fetch(`${API_URL}/api/candidates/${id}`))
}

export async function deleteCandidate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/candidates/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
}

export async function sendChatMessage(
  candidateId: string,
  req: ChatRequest,
): Promise<ChatResponse> {
  return _json(
    await fetch(`${API_URL}/api/candidates/${candidateId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),
  )
}

// ─── Search (Phase 3) ────────────────────────────────────────────────────────

export async function searchCandidates(req: SearchRequest): Promise<SearchResponse> {
  return _json(
    await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),
  )
}

// ─── Jobs (Phase 3) ──────────────────────────────────────────────────────────

export async function getJobs(): Promise<JobDescription[]> {
  return _json(await fetch(`${API_URL}/api/jobs`))
}

export async function createJob(body: JobCreate): Promise<JobDescription> {
  return _json(
    await fetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
}

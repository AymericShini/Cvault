export interface PersonalInfo {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
}
export interface WorkExperience {
  company: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  location: string | null;
  responsibilities: string[];
  achievements: string[];
}
export interface Education {
  institution: string | null;
  degree: string | null;
  field: string | null;
  graduation_year: number | null;
  gpa: number | null;
}
export interface SpokenLanguage {
  language: string;
  level: string;
}
export interface Skills {
  technical: string[];
  languages: string[];
  tools: string[];
  soft_skills: string[];
}
export interface PersonalProject {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
  year: number | null;
}
export interface ConfidenceScores {
  full_name: number;
  email: number;
  total_experience_years: number;
  skills: number;
}
export interface ParsedCV {
  personal_info: PersonalInfo;
  professional_summary: string | null;
  total_experience_years: number | null;
  skills: Skills;
  work_experience: WorkExperience[];
  education: Education[];
  certifications: string[];
  spoken_languages: SpokenLanguage[];
  personal_projects: PersonalProject[];
  confidence_scores: ConfidenceScores;
}
export interface UploadResponse {
  job_id: string;
  filename: string;
  chars_extracted: number;
  status: string;
}
export type StepStatus = "pending" | "running" | "done" | "error";
export interface ProcessingStep {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
  duration_ms?: number;
}
export interface LlmStats {
  tokens_used: number;
  latency_ms: number;
  model: string;
}

export interface SSEEvent {
  step: "extract" | "prompt" | "llm" | "validate" | "complete" | "error";
  status: StepStatus;
  detail: string;
  duration_ms?: number;
  prompt_preview?: string;
  truncated?: boolean;
  result?: ParsedCV;
  tokens_used?: number;
  latency_ms?: number;
  model?: string;
}

// ─── Phase 2 types ───────────────────────────────────────────────────────────

export interface CandidateListItem {
  id: string;
  filename: string;
  uploaded_at: string;
  full_name: string | null;
  top_role: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
}

export interface CandidateRecord {
  id: string;
  filename: string;
  uploaded_at: string;
  parsed_cv: ParsedCV;
  tokens_used: number | null;
  latency_ms: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  history: ChatMessage[];
  message: string;
}

export interface ChatResponse {
  response: string;
}

// ─── Phase 3 types ───────────────────────────────────────────────────────────

export interface JobDescription {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface JobCreate {
  title: string;
  description: string;
}

export interface CandidateMatch {
  candidate_id: string;
  score: number;
  excerpt: string;
  full_name: string | null;
  top_role: string | null;
  filename: string;
}

export interface SearchRequest {
  query: string;
  top_n: 1 | 5 | 10;
}

export interface SearchResponse {
  results: CandidateMatch[];
}

// ─── Phase 4 types ───────────────────────────────────────────────────────────

export type AgentEventType = 'thought' | 'tool_call' | 'tool_result' | 'token_usage' | 'answer' | 'error'

export interface AgentEvent {
  type: AgentEventType
  content?: string
  name?: string
  args?: Record<string, unknown>
  result?: unknown
  call_id?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

// ─── Phase 5 types ───────────────────────────────────────────────────────────

export type AgentRunStatus = 'running' | 'completed' | 'error'

export interface AgentRunListItem {
  id: string
  task: string
  status: AgentRunStatus
  answer: string | null
  tokens_used: number | null
  created_at: string
  completed_at: string | null
}

export interface AgentRunDetail extends AgentRunListItem {
  events: AgentEvent[]
}

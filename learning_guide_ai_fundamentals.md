# 🧠 Learning Guide: Agentic Workflow · Harness · RAG · Context Engineering
### via a practical project: AI-Powered CV Reader & Parser

---

> **Your learning philosophy here:** Each concept builds on the previous. You won't just *read* about these — you'll *implement* them one layer at a time on the same project. By the end, you'll have a production-grade CV intelligence platform that uses all 4 pillars simultaneously.

---

## 📚 TABLE OF CONTENTS

1. [The 4 Pillars — Plain English First](#pillars)
2. [The Project: CV Reader / Parser](#project)
3. [Free Tool Stack](#stack)
4. [Roadmap: 4 Phases](#roadmap)
5. [PHASE 1 — Context Engineering (Start Here)](#phase1)
6. [What Comes Next (Phases 2–4 Preview)](#preview)

---

<a name="pillars"></a>
## 🏛️ THE 4 PILLARS — Plain English First

Before touching any code, you need a mental model for each concept. These are NOT just buzzwords — each one solves a *different, specific problem*.

---

### 1. 🧩 Context Engineering
**The problem it solves:** LLMs are stateless. They only know what you put in front of them. If you send garbage in, you get garbage out.

**What it is:**
> The discipline of *deliberately designing* what information goes into the LLM's context window — and *how* it's structured, ordered, and formatted — to maximize the quality of the output.

**The mental model:**
Think of the LLM as an extraordinary consultant who has amnesia. Before every meeting (API call), you must give them a briefing document. Context Engineering is the art of writing that briefing:
- What is your role? (System prompt)
- What is the task? (User prompt)
- What facts do they need? (Retrieved context, few-shot examples)
- What format should the answer be? (Output schema)
- What do NOT they do? (Negative constraints)

**In our CV project:**
```
"You are an expert HR analyst. 
 Given the following CV text, extract: name, skills, experience years.
 Return ONLY valid JSON. 
 CV: {raw_text}"
```
Even this simple prompt IS context engineering.

**Key sub-skills:**
- System prompt design
- Few-shot prompting (showing examples)
- Chain-of-thought prompting (ask it to reason step by step)
- Output formatting (JSON, XML, structured schemas)
- Token budget management (fitting within limits)

---

### 2. 🔧 Harness (Orchestration Frameworks)
**The problem it solves:** Calling one LLM once is easy. Building a *pipeline* with multiple steps, tools, memory, retries, and data flow — that's complex. A harness manages this complexity.

**What it is:**
> A framework that *orchestrates* LLM calls, tool usage, memory, and data flow into a coherent, reusable pipeline.

**The mental model:**
If Context Engineering is writing a great briefing document, the Harness is the *meeting room infrastructure* — the calendar, the agenda runner, the note-taker, the follow-up scheduler. It ensures everything happens in the right order with the right people.

**Popular harnesses (all free/open-source):**
| Framework | Best For | Complexity |
|-----------|----------|------------|
| **LangChain** | General pipelines, chains, agents | Medium |
| **LlamaIndex** | Document-heavy RAG pipelines | Medium |
| **Haystack** | Enterprise search + RAG | Medium-High |
| **DSPy** | Programmatic prompt optimization | High |
| **CrewAI** | Multi-agent orchestration | Medium |

**In our CV project:**
```python
# Without harness — spaghetti code
text = extract_pdf(file)
prompt = build_prompt(text)
response = call_api(prompt)
parsed = json.loads(response)
stored = save_to_db(parsed)

# With LangChain harness — structured pipeline
chain = (
    PDFLoader() 
    | TextSplitter()
    | PromptTemplate(template=CV_PROMPT)
    | Claude()
    | JsonOutputParser()
    | DatabaseSink()
)
result = chain.invoke({"file": uploaded_cv})
```

---

### 3. 📚 RAG — Retrieval-Augmented Generation
**The problem it solves:** LLMs have a frozen knowledge cutoff and a limited context window. They can't "know" your specific documents unless you inject them at runtime. RAG solves this.

**What it is:**
> A pattern where you *retrieve* relevant chunks of your own data (from a vector database) and *augment* the LLM's context with them before generating an answer.

**The mental model:**
The LLM is a brilliant analyst, but they haven't read your 10,000 CVs. RAG gives them a research assistant:
1. Research assistant receives the question: *"Find me candidates skilled in Kubernetes"*
2. Searches the CV database semantically (not just keyword matching)
3. Returns the top 5 most relevant CV chunks
4. Analyst reads those 5 chunks + your question and answers

**The RAG pipeline:**
```
[YOUR DOCUMENTS]
      ↓
  [CHUNKING]          Split docs into ~500 token pieces
      ↓
  [EMBEDDING]         Convert text → vector (list of 1536 numbers)
      ↓
[VECTOR DATABASE]     Store vectors + original text
      
--- QUERY TIME ---

  [USER QUERY]
      ↓
  [EMBED QUERY]       Convert query → same vector space
      ↓
[SIMILARITY SEARCH]   Find top-K nearest vectors
      ↓
[CONTEXT INJECTION]   Insert retrieved chunks into prompt
      ↓
   [LLM CALL]         Generate answer with context
      ↓
   [RESPONSE]
```

**In our CV project:**
- Store all parsed CVs as vectors
- Query: *"Show me Python developers with 5+ years experience in fintech"*
- RAG retrieves the 10 most semantically similar profiles
- Claude answers with specific candidate recommendations

---

### 4. 🤖 Agentic Workflow
**The problem it solves:** A single LLM call is *reactive* — ask, get answer, done. But many real tasks require *planning*, *multiple steps*, *tool use*, *decision-making*, and *self-correction*. Agents handle this.

**What it is:**
> A system where the LLM acts as a *reasoning engine* that autonomously decides *what actions to take*, *in what order*, using *tools*, until a *goal* is achieved.

**The mental model:**
The difference between a single LLM call and an agent:
- **Single call:** "What's 342 × 17?" → "5814"
- **Agent:** "Research this candidate, check their LinkedIn, compare them to our top 3 employees, write a hiring recommendation" → The agent *plans* sub-tasks, uses tools (web search, database, calculator), reasons about results, and produces a final report.

**The ReAct loop (the core pattern):**
```
GOAL: "Score this CV against the job description for Senior Backend Engineer"

Loop:
  THINK: "I need to first extract key skills from the CV"
  ACT:   call_tool(extract_skills, cv_text)
  OBSERVE: ["Python", "FastAPI", "PostgreSQL", "Docker"]
  
  THINK: "Now I need the job requirements"
  ACT:   call_tool(extract_requirements, job_description)  
  OBSERVE: ["Python", "Kubernetes", "AWS", "5+ years"]
  
  THINK: "I should check years of experience in the CV"
  ACT:   call_tool(extract_experience_years, cv_text)
  OBSERVE: 7
  
  THINK: "I have enough to score. Missing: Kubernetes, AWS. Has: Python, 7 years"
  ACT:   generate_final_score(matches, gaps)
  OBSERVE: Score: 72/100, Missing: cloud experience
  
DONE: Return structured report
```

**In our CV project:**
- Agent that receives a CV + job description
- Autonomously extracts, compares, scores, searches for more info, writes summaries
- Can call multiple tools in sequence based on what it finds

---

<a name="project"></a>
## 🎯 THE PROJECT: AI-Powered CV Reader & Parser

### What we'll build (end state):
A full-stack web application where:
1. **HR uploads CVs** (PDF/Word) via a clean interface
2. **System parses** them structurally (name, skills, experience, education)
3. **Vector search** lets you find candidates semantically ("find me a creative leader with startup experience")
4. **An agent** can autonomously score any CV against any job description

### Why this project is perfect for learning:
- **Context Engineering** → Designing the prompts that parse CVs accurately
- **Harness** → Orchestrating the multi-step parsing pipeline
- **RAG** → Storing & retrieving CVs semantically
- **Agents** → Autonomous CV scoring & matching

---

<a name="stack"></a>
## 🛠️ FREE TOOL STACK

Everything below has a free tier or is fully open-source.

### LLM (The Brain)
| Tool | Why | Free? |
|------|-----|-------|
| **Claude API** (Anthropic) | Best reasoning + long context | Free tier ($5 credit) |
| **Groq** | Blazing fast inference, Llama 3 | Very generous free tier |
| **Ollama** | 100% local, no API costs | Completely free |

→ **Recommendation for learning:** Start with **Groq** (fast, free, no credit card needed) + fall back to **Ollama** for zero-cost local experiments.

### Harness / Orchestration
| Tool | Why | Free? |
|------|-----|-------|
| **LangChain** | Industry standard, huge ecosystem | Open source |
| **LlamaIndex** | Best for document RAG | Open source |

→ **Recommendation:** **LangChain** for Phase 2, **LlamaIndex** for Phase 3 RAG.

### Vector Database
| Tool | Why | Free? |
|------|-----|-------|
| **ChromaDB** | Local, zero config, perfect for dev | Open source |
| **Qdrant** | Production-grade, local or cloud | Open source + free cloud |
| **Weaviate** | GraphQL + vector, powerful | Free tier |

→ **Recommendation:** **ChromaDB** to start (runs in-process, no setup), then **Qdrant** for production.

### Embeddings (Turning text → vectors)
| Tool | Why | Free? |
|------|-----|-------|
| **sentence-transformers** | Local, many models, no API | Completely free |
| **nomic-embed-text** (via Ollama) | Excellent quality, local | Completely free |
| **Cohere Embed** | Cloud API, very accurate | Free tier |

→ **Recommendation:** **`all-MiniLM-L6-v2`** from sentence-transformers to start. Fast and good enough.

### PDF Parsing
| Tool | Why | Free? |
|------|-----|-------|
| **pdfminer.six** | Pure Python, reliable text extraction | Open source |
| **pypdf** | Simple, widely used | Open source |
| **unstructured** | Handles messy layouts, tables | Open source |

→ **Recommendation:** **`unstructured`** — it handles real CVs with columns, tables, logos.

### Backend
- **FastAPI** (Python) — async, fast, perfect for AI APIs
- **Python 3.11+**

### Frontend
- **Next.js 14** (React) + **TailwindCSS**
- Or just plain **HTML + htmx** if you want to stay backend-focused

### Dev Environment
- **VS Code** + Python extension
- **uv** (ultra-fast Python package manager, replaces pip)
- **Docker** (optional but useful)

---

<a name="roadmap"></a>
## 🗺️ ROADMAP — 4 PHASES

```
PHASE 1: Context Engineering          [~1-2 weeks]
├── Build raw CV parser (no framework)
├── Master prompt design
├── Structured output extraction
└── Deliverable: CV → clean JSON via pure API calls

PHASE 2: Harness / Orchestration      [~1-2 weeks]  
├── Refactor with LangChain
├── Build a multi-step pipeline
├── Add memory & conversation
└── Deliverable: Conversational CV analyzer chatbot

PHASE 3: RAG                          [~2 weeks]
├── Embed & store all CVs in ChromaDB
├── Build semantic search
├── Add retrieved context to prompts
└── Deliverable: "Find me candidates who..." semantic search

PHASE 4: Agentic Workflow             [~2 weeks]
├── Build a CV scoring agent
├── Define tools (extract, compare, score, summarize)
├── Implement ReAct loop
└── Deliverable: Autonomous CV ↔ Job Description matcher
```

---

<a name="phase1"></a>
## 🚀 PHASE 1 — Context Engineering (Start Here)

### Goal
Build a CV parser from scratch using *only* direct API calls. No frameworks. No databases. Just you, your prompts, and Claude/Groq.

This forces you to understand the fundamentals before any abstraction layer hides them from you.

### What you'll learn
- How to write precise, reliable system prompts
- How to force structured JSON output from an LLM
- How to handle edge cases with prompt design
- How to measure and improve prompt quality

---

### 1.1 — Project Setup

```bash
# Create project directory
mkdir cv-intelligence && cd cv-intelligence

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv init
uv add groq anthropic pypdf unstructured python-dotenv rich

# Create .env file
echo "GROQ_API_KEY=your_key_here" > .env
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

Get your free Groq API key at: https://console.groq.com (no credit card)

---

### 1.2 — Raw PDF Extraction

```python
# src/extractors/pdf_extractor.py

from pathlib import Path
from unstructured.partition.pdf import partition_pdf

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract raw text from a PDF CV.
    unstructured handles multi-column layouts, tables, etc.
    """
    elements = partition_pdf(pdf_path)
    
    # Join all text elements with newlines
    raw_text = "\n".join([str(el) for el in elements])
    
    return raw_text

# Test it
if __name__ == "__main__":
    text = extract_text_from_pdf("samples/cv_example.pdf")
    print(text[:1000])  # Print first 1000 chars
```

---

### 1.3 — Your First Prompt (Bad Version)

Start intentionally simple — then we'll iterate and improve:

```python
# src/parsers/cv_parser_v1.py

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ["GROQ_API_KEY"])

def parse_cv_v1(raw_text: str) -> dict:
    """Version 1: Simple, naive prompt — we'll improve this"""
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Free on Groq
        messages=[
            {
                "role": "user", 
                "content": f"Extract information from this CV:\n\n{raw_text}"
            }
        ]
    )
    
    return response.choices[0].message.content

# Problems with v1:
# - No system prompt (no role definition)
# - No output format specified (will return prose, not JSON)
# - No schema for what to extract
# - No handling for missing fields
# - Will hallucinate if info is unclear
```

**Run this. Look at the output. It's inconsistent prose.** This is why Context Engineering matters.

---

### 1.4 — Improving the Prompt (Good Version)

```python
# src/parsers/cv_parser_v2.py

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ["GROQ_API_KEY"])

# ============================================================
# CONTEXT ENGINEERING: The System Prompt
# This is the "briefing document" for our amnesia consultant
# ============================================================

SYSTEM_PROMPT = """You are an expert HR data extraction specialist with 15 years 
of experience reading CVs/resumes from all industries and formats.

Your task is to extract structured information from raw CV text and return it 
as valid JSON. You must be precise and conservative:
- Extract ONLY information explicitly stated in the CV
- Never infer, guess, or hallucinate information
- Use null for any field not found in the CV
- Normalize dates to YYYY-MM format when possible

You MUST return ONLY a valid JSON object. No markdown, no explanation, no 
preamble. Just the JSON object."""

# ============================================================
# CONTEXT ENGINEERING: The Output Schema
# Defining exactly what we want makes output reliable
# ============================================================

CV_SCHEMA = {
    "personal_info": {
        "full_name": "string or null",
        "email": "string or null",
        "phone": "string or null",
        "location": "city, country or null",
        "linkedin_url": "string or null",
        "github_url": "string or null"
    },
    "professional_summary": "2-3 sentence summary or null",
    "total_experience_years": "integer or null",
    "skills": {
        "technical": ["list of technical skills"],
        "languages": ["programming languages"],
        "tools": ["tools and platforms"],
        "soft_skills": ["soft skills"]
    },
    "work_experience": [
        {
            "company": "string",
            "title": "string",
            "start_date": "YYYY-MM",
            "end_date": "YYYY-MM or 'present'",
            "duration_months": "integer",
            "location": "string or null",
            "responsibilities": ["list of key responsibilities"],
            "achievements": ["list of quantified achievements"]
        }
    ],
    "education": [
        {
            "institution": "string",
            "degree": "string",
            "field": "string",
            "graduation_year": "integer or null",
            "gpa": "float or null"
        }
    ],
    "certifications": ["list of certifications with issuer and year"],
    "languages": [
        {
            "language": "string",
            "level": "native/fluent/conversational/basic"
        }
    ]
}

# ============================================================
# CONTEXT ENGINEERING: Few-Shot Example
# Showing the model EXACTLY what we expect
# ============================================================

FEW_SHOT_EXAMPLE = """
EXAMPLE INPUT (partial CV text):
John Smith | john.smith@email.com | +33 6 12 34 56 78 | Paris, France
Senior Backend Engineer
Python · FastAPI · PostgreSQL · Docker · AWS
TechCorp (2020-01 to present): Led migration of monolith to microservices...

EXAMPLE OUTPUT:
{
  "personal_info": {
    "full_name": "John Smith",
    "email": "john.smith@email.com",
    "phone": "+33 6 12 34 56 78",
    "location": "Paris, France",
    "linkedin_url": null,
    "github_url": null
  },
  "professional_summary": null,
  "total_experience_years": 5,
  "skills": {
    "technical": ["Backend Development", "Microservices"],
    "languages": ["Python"],
    "tools": ["FastAPI", "PostgreSQL", "Docker", "AWS"],
    "soft_skills": []
  },
  ...
}
"""

def parse_cv_v2(raw_text: str) -> dict:
    """
    Version 2: Proper context engineering
    - Clear role in system prompt
    - Explicit output schema
    - Few-shot example
    - Conservative extraction instructions
    """
    
    user_prompt = f"""Extract information from the following CV text.
    
Follow this exact JSON schema:
{json.dumps(CV_SCHEMA, indent=2)}

{FEW_SHOT_EXAMPLE}

Now extract from this CV:
---
{raw_text}
---

Return ONLY the JSON object."""
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.0,  # KEY: Set to 0 for deterministic, factual extraction
        max_tokens=2000
    )
    
    raw_output = response.choices[0].message.content
    
    # Always wrap JSON parsing in try/except
    try:
        return json.loads(raw_output)
    except json.JSONDecodeError:
        # Fallback: try to extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', raw_output, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError(f"Model returned invalid JSON: {raw_output[:200]}")
```

---

### 1.5 — Testing & Measuring Quality

A crucial skill: how do you know if your prompt is *better*?

```python
# src/evaluation/prompt_evaluator.py

from dataclasses import dataclass
from typing import Optional

@dataclass
class ParseResult:
    cv_file: str
    extracted: dict
    score: float
    issues: list[str]

def evaluate_parse(extracted: dict, ground_truth: dict) -> ParseResult:
    """
    Simple evaluation: check which fields were correctly extracted.
    In real projects, you'd use an eval framework like RAGAS or PromptFoo.
    """
    score = 0
    total = 0
    issues = []
    
    # Check critical fields
    critical_fields = [
        ("personal_info.full_name", "Name extraction"),
        ("personal_info.email", "Email extraction"),
        ("total_experience_years", "Experience years"),
        ("skills.languages", "Programming languages"),
    ]
    
    for field_path, label in critical_fields:
        total += 1
        keys = field_path.split(".")
        extracted_val = extracted
        truth_val = ground_truth
        
        try:
            for k in keys:
                extracted_val = extracted_val[k]
                truth_val = truth_val[k]
            
            if str(extracted_val).lower() == str(truth_val).lower():
                score += 1
            else:
                issues.append(f"❌ {label}: got '{extracted_val}', expected '{truth_val}'")
        except (KeyError, TypeError):
            issues.append(f"❌ {label}: field missing")
    
    return ParseResult(
        cv_file="",
        extracted=extracted,
        score=score / total,
        issues=issues
    )

# Run this iteratively:
# 1. Parse 10 CVs
# 2. Check score
# 3. Identify the most common failures
# 4. Fix those in the prompt
# 5. Re-run — did score improve?
# This is prompt engineering in practice.
```

---

### 1.6 — The Simple FastAPI Endpoint

```python
# src/api/main.py

import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from extractors.pdf_extractor import extract_text_from_pdf
from parsers.cv_parser_v2 import parse_cv_v2

app = FastAPI(title="CV Intelligence API — Phase 1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/parse-cv")
async def parse_cv(file: UploadFile = File(...)):
    """Upload a CV PDF and get structured JSON back."""
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported in Phase 1")
    
    # Save temp file (unstructured needs a file path)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Step 1: Extract raw text from PDF
        raw_text = extract_text_from_pdf(tmp_path)
        
        # Step 2: Parse with Claude/Groq
        parsed_cv = parse_cv_v2(raw_text)
        
        return {
            "success": True,
            "filename": file.filename,
            "parsed": parsed_cv,
            "raw_text_length": len(raw_text)
        }
    
    except Exception as e:
        raise HTTPException(500, f"Parsing failed: {str(e)}")
    
    finally:
        os.unlink(tmp_path)

@app.get("/health")
async def health():
    return {"status": "ok", "phase": 1}

# Run with: uvicorn src.api.main:app --reload
```

---

### 1.7 — Phase 1 Exercises (Do These!)

Before moving to Phase 2, complete these exercises. They build real understanding:

**Exercise 1: Prompt Stress Testing**
Upload 5 very different CVs (different industries, formats, languages). 
What breaks? Fix it in the prompt.

**Exercise 2: Add Chain-of-Thought**
Add this to your prompt and compare quality:
```
Before returning JSON, briefly think through: 
what are the 3 most ambiguous parts of this CV?
Then extract conservatively.
```

**Exercise 3: Handle Multi-language CVs**
What happens with a French CV? Add instructions to normalize to English output.

**Exercise 4: Token Counting**
Add token counting to understand costs:
```python
# Count tokens before sending
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokens = len(tokenizer.encode(your_prompt))
print(f"Prompt tokens: {tokens}")
```

**Exercise 5: Prompt Versioning**
Create `cv_parser_v3.py` with one specific improvement. 
Run both on the same 10 CVs. Which wins? Why?

---

### 1.8 — Phase 1 Checklist

Mark off each item before moving to Phase 2:

- [ ] Can parse a PDF into raw text reliably
- [ ] System prompt clearly defines the AI's role
- [ ] Output schema forces consistent JSON structure
- [ ] `temperature=0.0` is set for deterministic extraction
- [ ] JSON parsing handles errors gracefully
- [ ] Tested on at least 5 different CVs
- [ ] Can identify why a prompt fails and fix it
- [ ] FastAPI endpoint works and returns JSON
- [ ] You understand what "context window" means in practice
- [ ] You can explain to someone else why prompt design matters

---

<a name="preview"></a>
## 👁️ PHASES 2–4 PREVIEW

### Phase 2: Harness — What you'll build

You'll refactor Phase 1 into a **LangChain pipeline** and add:
- A multi-step chain: Extract → Parse → Validate → Enrich
- Conversation memory so you can ask follow-up questions about a CV
- Automatic retry on JSON parse failures
- A chatbot interface: *"What is this candidate's strongest skill?"*

**Key new concepts:** `LangChain chains`, `LCEL (LangChain Expression Language)`, `ConversationBufferMemory`, `OutputFixingParser`

---

### Phase 3: RAG — What you'll build

You'll add a **ChromaDB vector store** and build:
- Embedding pipeline: CV JSON → vector → ChromaDB
- Semantic search endpoint: *"Find Python developers with fintech experience"*
- Hybrid search (semantic + keyword filtering)
- A *"similar candidates"* feature

**Key new concepts:** `embeddings`, `vector similarity`, `chunking strategies`, `FAISS vs ChromaDB`, `semantic vs keyword search`

---

### Phase 4: Agentic Workflow — What you'll build

You'll build an **autonomous scoring agent** that:
- Receives a CV + job description
- Plans its own analysis steps
- Uses tools (extract_skills, calculate_match_score, search_similar_candidates)
- Reasons about gaps and strengths
- Returns a structured hiring recommendation report

**Key new concepts:** `ReAct pattern`, `tool definitions`, `agent loops`, `LangChain agents`, `function calling`, `multi-agent systems with CrewAI`

---

## 💡 LEARNING PRINCIPLES

1. **Build first, understand second** — Get it working, then read why it works
2. **Break things intentionally** — Remove the system prompt. What happens? 
3. **Measure everything** — If you can't measure quality, you can't improve it
4. **Read the source code** — LangChain, ChromaDB, and the others are open source. Read them.
5. **One concept per session** — Don't mix RAG and agents until you understand each alone

---

## 📖 RECOMMENDED READING (all free)

| Resource | What it teaches |
|----------|----------------|
| [Anthropic Prompt Library](https://docs.anthropic.com/en/prompt-library) | Real prompt patterns |
| [LangChain Docs](https://python.langchain.com) | Harness fundamentals |
| [LlamaIndex Docs](https://docs.llamaindex.ai) | RAG patterns |
| [Simon Willison's Blog](https://simonwillison.net) | Practical LLM engineering |
| [Lilian Weng's Blog](https://lilianweng.github.io) | Deep dives on agents/RAG |
| [RAGAS Paper](https://arxiv.org/abs/2309.15217) | How to evaluate RAG systems |

---

*Last updated: May 2026 | Project: CV Intelligence Platform*
*Your guide: Claude (Anthropic) — ask me anything as you build*

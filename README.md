# Alumni Referral Platform

An AI-powered full-stack platform connecting engineering students with industry alumni for job referrals, career guidance, and interview preparation.

## Live Demo

> Coming soon after deployment

## Features

### Student Features

- **AI Job Search** — Natural language job search using Groq Llama 3.3 70B to extract structured filters from free-text queries
- **Match Score** — AI-powered compatibility score ring on every job card showing skill alignment
- **Semantic Skill Gap Analyser** — LLM-based cosine similarity comparing student skills vs job requirements with matched, missing, and extra skill breakdown
- **Message Writer** — AI generates 3 professional cold referral message drafts
- **Message Quality Scorer** — Scores referral messages on 5 dimensions before sending
- **Referral Acceptance Predictor** — Logistic regression model predicts likelihood of alumni accepting referral
- **RAG Career Chatbot** — Hybrid BM25 + dense retrieval career advisor grounded in Indian tech sector knowledge corpus
- **Interview Prep** — 58 company-specific questions across 10 Indian tech companies with semantic search
- **Mock Interview** — AI streaming mock interview with company-specific system prompts
- **Code Reviewer** — AI reviews code assignment submissions before sending to alumni
- **Career Roadmap** — Personalised week-by-week learning plan generator
- **Resume Analyser** — PDF resume parser that auto-populates student profile

### Alumni Features

- **AI Candidate Shortlisting** — Score incoming referral requests 0-100 with verdict, strengths, and weaknesses
- **Referral Management** — View, filter, and manage all incoming referral requests
- **Interview Scheduling** — Schedule Zoom interviews and send links directly via the platform
- **Code Review** — Review student code assignments and make accept/reject decisions

### Platform Features

- **3-Message Cold Limit** — Enforced at API level to maintain quality communication
- **Real-time Chat** — Socket.io WebSocket chat with per-referral isolated rooms
- **Role-based Dashboards** — Separate student and alumni interfaces
- **Row Level Security** — Supabase RLS ensures complete data isolation between users
- **Progressive Web App** — Installable on Android and iOS via PWA manifest

## Tech Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Frontend        | Next.js 15, TypeScript, Tailwind CSS, Supabase SSR |
| Backend         | Express.js, Node.js 20, TypeScript                 |
| Database        | Supabase PostgreSQL with Row Level Security        |
| AI Provider     | Groq API (Llama 3.3 70B)                           |
| Vector DB       | ChromaDB (local)                                   |
| Embeddings      | sentence-transformers/all-MiniLM-L6-v2             |
| Real-time       | Socket.io                                          |
| Package Manager | pnpm workspaces                                    |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Python 3.9+ (for ChromaDB)
- Supabase account (free tier)
- Groq API key (free tier — 14,400 requests/day)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/referral-platform.git
cd referral-platform
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create `backend/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
GROQ_API_KEY=your_groq_api_key
PORT=5000
FRONTEND_URL=http://localhost:3000
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Start ChromaDB

```bash
pip install chromadb
chroma run --path ./chromadb_data
```

### 5. Start the platform

```bash
# Run both frontend and backend together
pnpm dev

# Or separately
cd backend && pnpm dev   # http://localhost:5000
cd frontend && pnpm dev  # http://localhost:3000
```

## Project Structure

```
referral-platform/
├── frontend/                  # Next.js 15 app
│   ├── app/
│   │   ├── (auth)/            # Login & register pages
│   │   └── (dashboard)/       # Protected dashboard routes
│   │       ├── student/       # Student pages
│   │       └── alumni/        # Alumni pages
│   ├── components/            # Shared UI components
│   └── lib/                   # API client, Supabase helpers
├── backend/                   # Express.js API
│   └── src/
│       ├── routes/            # API route handlers
│       ├── services/          # Claude, RAG, Supabase services
│       └── middleware/        # Auth middleware
└── chromadb_data/             # ChromaDB vector store (local)
```

## API Routes

| Method | Path                       | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | /api/jobs                  | List jobs with filters         |
| POST   | /api/ai/search-jobs        | NL job search                  |
| POST   | /api/ai/match-score        | Job–student match score        |
| POST   | /api/ai/draft-message      | Generate referral messages     |
| POST   | /api/ai/message-quality    | Score message quality          |
| POST   | /api/ai/predict-acceptance | Referral acceptance prediction |
| POST   | /api/skills/gap-analysis   | Semantic skill gap analysis    |
| POST   | /api/rag/query             | RAG career chatbot             |
| POST   | /api/referral              | Send referral request          |

## Environment Variables Reference

| Variable                  | Required | Description                              |
| ------------------------- | -------- | ---------------------------------------- |
| SUPABASE_URL              | Yes      | Supabase project URL                     |
| SUPABASE_SERVICE_ROLE_KEY | Yes      | Supabase service role key (backend only) |
| SUPABASE_ANON_KEY         | Yes      | Supabase anon key                        |
| GROQ_API_KEY              | Yes      | Groq API key for LLM calls               |
| PORT                      | No       | Backend port (default: 5000)             |
| FRONTEND_URL              | Yes      | Frontend URL for CORS                    |

## AI Features Architecture

The platform uses an adapter pattern where all AI features call through `claude.ts`:
Student/Alumni Request
│
▼
Express Route
│
▼
claude.ts adapter
┌────────────────────┐
│ askClaude() │ → text response
│ askClaudeJSON<T>() │ → structured JSON
│ askClaudeChatStream│ → SSE streaming
└────────────────────┘
│
▼
Groq API (Llama 3.3 70B)

Swapping providers requires changing only `claude.ts`.

## RAG Pipeline

Student Query
│
├── BM25 sparse retrieval (keyword match)
│
└── ChromaDB dense retrieval (semantic similarity)
│
▼
RRF Fusion (k=60)
│
▼
Top-4 passages
│
▼
Groq LLM synthesis
│
▼
Grounded response

## Database Schema

| Table             | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| profiles          | Student and alumni profiles with skills, role, completeness score |
| job_postings      | Job listings with skills, seniority, company normalised           |
| referral_requests | Referral workflow + 11 ML feature fields for future XGBoost       |
| messages          | Chat messages per referral with read status                       |
| applications      | Interview pipeline with Zoom links and code submissions           |

## ML Feature Logging

Every referral request logs 11 features for future model training:

| Feature                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| skill_overlap_score          | % of job skills matched by student                  |
| alumni_response_rate         | Historical response rate of the alumni              |
| seniority_gap                | Difference between student and job seniority levels |
| alumni_days_since_active     | Days since alumni last active                       |
| student_profile_completeness | % of profile fields filled                          |
| message_length_chars         | Length of the referral message                      |
| message_attempt_number       | Which attempt this is (1, 2, or 3)                  |
| job_seniority_level          | Numeric seniority level of the job                  |
| same_team_as_job             | Whether alumni works in the same team               |
| outcome                      | 1 = accepted, 0 = rejected (set on alumni decision) |

## Evaluation Results

| RAG Metric         | Score     |
| ------------------ | --------- |
| Faithfulness       | 0.891     |
| Answer Relevancy   | 0.874     |
| Context Precision  | 0.863     |
| Context Recall     | 0.842     |
| Answer Correctness | 0.856     |
| **Mean RAGAS**     | **0.865** |

## Academic Context

This project was developed as a Major Project for Bachelor of Technology in Information Technology at V R Siddhartha Engineering College, Vijayawada (2025-26).

## License

This project is for academic purposes.

---

## License

MIT

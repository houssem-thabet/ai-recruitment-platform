# TalentAI — AI Recruitment & Talent Management Platform

> **"Find the right talent. Hire with intelligence."**

**TalentAI** is a production-oriented, full-stack **AI Recruitment & Talent Management Platform** built for **Candidates**, **Recruiters**, and **Platform Administrators**. Every screen, chart, compatibility score, CV extraction, Kanban pipeline transition, interview schedule, conversation, and audit log is backed by real **PostgreSQL** database records through **Prisma ORM** and validated **Next.js 14 (TypeScript)** API routes.

---

## Core Highlights

- **Three Dedicated Role Workspaces (RBAC Protected)**:
  - **Public Experience**: Hero landing page (*"Recruit Smarter. Discover Better Talent."*), live job board, About, Features, How It Works, Contact, Privacy Policy, Terms of Service, Login, Registration (Candidate & Recruiter), and Forgot/Reset Password.
  - **Candidate Workspace (10 routes)**: Overview Dashboard, Structured Profile Builder, Private CV Vault (PDF & DOCX upload + AI extraction + manual correction), Job Discovery & Bookmarking, Application Pipeline Tracker (9 statuses + feedback), Contextual AI Career Assistant, Interactive Skill Gap Analysis, Real-Time Notifications, and Privacy/Account Settings.
  - **Recruiter Workspace (12 routes)**: Hiring Overview, Company Profile, Job Management, Job Creation/Editing with AI Job Description Generator (mandatory human approval gate), Kanban & Table Application Pipeline + CSV Export, Explainable AI Candidate Matching (configurable weights + human override), Searchable Opt-In Talent Database, Interview Scheduler with Conflict Detection + AI Question Rubrics + Consent-Gated AI Note Organization, Analytics & Reporting, Direct Messaging, and Settings.
  - **Administrator Workspace (11 routes)**: Platform Telemetry Overview, User Management, Candidate Management (strict confidential-CV privacy boundary), Recruiter Management, Employer Verification, Job Moderation (`MODERATION_HOLD` / restore), Application Pipeline Monitoring, AI Usage & Latency Logs, Executive CSV Reports, Immutable Security Audit Logs, and Global Governance Settings.

- **8 Responsible AI Capabilities** (Dual-Mode `LIVE_LLM` + `DETERMINISTIC_NLP` Fallback):
  1. **AI CV Analyzer** (PDF & DOCX magic-byte validation, text extraction, structured JSON schema validation, candidate verification/editing, zero fabricated credentials).
  2. **Intelligent Job–Candidate Matching** (0–100 score, default weights: Skills `40%`, Experience `25%`, Education `15%`, Responsibilities `15%`, Language `5%`, matching/missing skills, verification prompts, recruiter score override, zero protected personal attributes, zero auto-rejection).
  3. **AI Job Description Generator** (inclusive language framing + mandatory human approval checkbox before publishing).
  4. **AI Interview Question Generator** (technical, behavioral, situational, problem-solving, and project questions with evaluation rubrics).
  5. **AI Interview Note Organization Assistant** (requires explicit candidate consent; maps interviewer-written notes to job skills without emotion/personality/biometric inference or automated hiring verdicts).
  6. **Contextual AI Career Assistant** (candidate chatbot with persistent PostgreSQL chat history grounded in authorized profile & CV context).
  7. **Visual Skill Gap Analysis** (Recharts skill readiness chart, missing core vs. nice-to-have skills, priority levels, difficulty estimates, and portfolio project ideas).
  8. **Explainable AI Job Recommendations** (transparent match reasons + candidate dismiss & work-mode preference controls).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14.2 (App Router, Full-Stack React 18 + TypeScript) |
| **Styling & Design System** | Tailwind CSS, Dark/Light Theme Provider, Lucide Icons, Deep Navy (`#101B35`), Electric Blue (`#367BF5`), Cyan (`#28C5D8`) |
| **Visualizations** | Recharts (Line, Bar, Radar/Comparison, and Pie charts) |
| **Database & ORM** | PostgreSQL 17 + Prisma ORM v5.22 (20 models, 13 enums, SQL migrations, seed script) |
| **Authentication & Security** | `bcryptjs` password hashing, `jose` HS256 JWT (`HttpOnly` cookies + `Authorization: Bearer` header support), Edge Middleware RBAC, Zod validation, XSS/URI/CSV sanitization, rate limiting, audit logging |
| **Document Parsing** | `pdf-parse` (PDF extraction) + `mammoth` (OOXML `.docx` extraction) + binary magic-byte header inspection |
| **Testing** | Vitest (32 Unit, Integration, Security Audit & Live HTTP E2E tests) + Playwright (4 Headless Chromium Browser E2E specs) |
| **Containerization** | Multi-stage `Dockerfile` + `docker-compose.yml` (PostgreSQL 17 + App + persistent CV volume) |

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** `>= 20.x` and **npm** `>= 10.x`
- **PostgreSQL** `>= 15` running locally (default port `5432`)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update values as needed:
```bash
cp .env.example .env
```

Key variables in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/talentai?schema=public"
JWT_SECRET="replace-with-a-secure-random-32-byte-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CV_STORAGE_DIR="./storage/cvs"
MAX_CV_FILE_SIZE_BYTES="5242880"

# Optional Live LLM Mode (leave blank to run clearly labeled Deterministic NLP Demo Mode)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"
```

### 3. Install Dependencies, Migrate Database & Seed Demo Data
```bash
npm install
npx prisma migrate dev
npm run db:seed
```

### 4. Run the Platform
Development mode:
```bash
npm run dev
```
Production build & server:
```bash
npm run build
npm start
```
Open `http://localhost:3000`.

---

## Running with Docker Compose

```bash
docker compose up --build -d
docker compose exec app npm run db:seed
```

---

## Seeded Demo Credentials (Fictional Data Only)

> All seeded accounts, companies, CVs, and hiring metrics are **100% fictional demonstration records** and are transparently badged in the UI.

| Role | Email | Password | Organization / Profile |
|---|---|---|---|
| **Administrator** | `admin@talentai.demo` | `Admin@123!` | Platform Governance (Seed-only; never publicly registrable) |
| **Recruiter 1** | `sarah.chen@novatech.demo` | `Recruiter@123!` | NovaTech AI Systems |
| **Recruiter 2** | `karim.mansour@cloudscale.demo` | `Recruiter@123!` | CloudScale Infrastructure |
| **Recruiter 3** | `elena.rossi@finedge.demo` | `Recruiter@123!` | FinEdge Analytics |
| **Candidate 1** | `alex.rivera@candidate.demo` | `Candidate@123!` | Senior Full-Stack Engineer |
| **Candidate 2** | `amira.benali@candidate.demo` | `Candidate@123!` | Machine Learning & NLP Engineer |
| **Candidates 3–10** | `liam.oconnor@candidate.demo`, `priya.patel@candidate.demo`, `mateo.silva@candidate.demo`, `sophie.laurent@candidate.demo`, `omar.haddad@candidate.demo`, `hannah.kim@candidate.demo`, `lucas.meyer@candidate.demo`, `nadia.toumi@candidate.demo` | `Candidate@123!` | Full-Stack, Cloud DevOps, Data, Security, Frontend, QA, Product, Junior Dev |

Sample downloadable test CVs are also available inside `/public/sample-cvs/`:
- `public/sample-cvs/sample-fullstack-cv.pdf`
- `public/sample-cvs/sample-ai-engineer-cv.docx`

---

## Automated Testing

With PostgreSQL and the app server running on port `3000`, execute the full Unit, Integration, and 20-Workflow End-to-End suite:
```bash
npm test
```
Type-check the entire project:
```bash
npx tsc --noEmit
```

---

## Documentation Index

- **[`docs/UNIVERSITY_PROJECT_DEFENSE_DOCUMENTATION.md`](./docs/UNIVERSITY_PROJECT_DEFENSE_DOCUMENTATION.md)** — **Complete CS University Project Defense Manual** (15 chapters covering Objectives, FR/NFRs, UML Use-Case, Class & 4 Sequence Diagrams, 20-Table ERD, System Architecture, 3NF Database Design, 43-Route REST API, Sublinear TF-IDF & Hybrid Dense/Lexical NLP Equations, 5-Dimension Matching Math, Security/Privacy Matrix, Testing Pyramid, Limitations, and Oral Viva Q&A).
- **[`docs/UNIVERSITY_PROJECT_DEFENSE_DOSSIER.html`](./docs/UNIVERSITY_PROJECT_DEFENSE_DOSSIER.html)** — **Self-Contained Visual Defense Dossier** with embedded inline vector SVG UML/ERD/Architecture diagrams and print-to-PDF thesis formatting.
- [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md) — System design, layered folder structure, auth/session model, and security architecture.
- [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) — Complete 20-model PostgreSQL schema, relationships, indexes, and privacy boundaries.
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — Complete REST endpoint catalog, request/response payloads, and RBAC matrix.
- [`AI_MODULE_DOCUMENTATION.md`](./AI_MODULE_DOCUMENTATION.md) — Detailed technical breakdown of all 8 AI features, scoring equations, dual-mode fallback, and Responsible AI guardrails.
- [`TESTING.md`](./TESTING.md) — Automated test suite coverage across Vitest and Playwright Chromium browser verification.

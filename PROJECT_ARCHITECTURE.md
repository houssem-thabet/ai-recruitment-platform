# TalentAI — Project Architecture

## 1. Architectural Overview

TalentAI follows a clean, modular **Full-Stack Monolithic Architecture** powered by **Next.js 14 App Router**, **TypeScript**, **Prisma ORM**, and **PostgreSQL 17**. This architecture provides strong end-to-end type safety, co-located domain API handlers, isolated server-only secrets, and low-latency server/client rendering.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Browser / Responsive SaaS UI                       │
│   Public Pages  │  Candidate Workspace  │  Recruiter ATS  │  Admin Panel  │
│   Tailwind CSS + ThemeProvider + AuthProvider + Recharts Visualizations   │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ HTTPS JSON / Multipart FormData
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                  Next.js Edge Middleware (src/middleware.ts)              │
│   JWT Verification • Role-Based Route Guards • Security Response Headers  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│              REST API Route Handlers (src/app/api/**/route.ts)            │
│   Zod Schema Validation • Rate Limiting • XSS Sanitization • RBAC Checks  │
└───────────┬─────────────────────────┬─────────────────────────┬───────────┘
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   Domain & DB Layer   │ │  Dual-Mode AI Engine  │ │ Private CV Vault FS   │
│  Prisma Client v5.22  │ │  LIVE_LLM (OpenAI) or │ │ /storage/cvs (0600)   │
│  PostgreSQL 17 RDBMS  │ │  DETERMINISTIC_NLP    │ │ PDF + DOCX Extraction │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 2. Directory Structure

```text
talentai/
├── prisma/
│   ├── migrations/                  # Versioned PostgreSQL SQL migrations
│   ├── schema.prisma                # 26 normalized models + 14 enums
│   └── seed.ts                      # Fictional demo dataset + PDF/DOCX CV generator
├── public/
│   └── sample-cvs/                  # Downloadable sample PDF & DOCX test resumes
├── storage/
│   └── cvs/                         # Private non-public candidate CV vault (chmod 0600)
├── src/
│   ├── middleware.ts                # Edge RBAC guard + security headers
│   ├── types/
│   │   └── external.d.ts            # Type declarations for binary parsers
│   ├── lib/
│   │   ├── prisma.ts                # Singleton Prisma PostgreSQL connection
│   │   ├── jwt.ts                   # HS256 JWT signing & verification (jose)
│   │   ├── auth.ts                  # Cookie + Bearer token session & RBAC helper
│   │   ├── validators.ts            # Zod schemas (blocks public ADMIN registration)
│   │   ├── cv-parser.ts             # Magic-byte validation + PDF/DOCX text extraction
│   │   ├── rate-limit.ts            # Sliding-window IP/user rate limiter
│   │   ├── audit.ts                 # AuditLog, Notification & AIUsageLog persistence
│   │   ├── skills-db.ts             # Canonical Skill normalization & upsert helper
│   │   ├── sample-docx.ts           # Minimal zero-dependency OOXML .docx builder
│   │   ├── api-client.ts            # Frontend fetch client with token/cookie support
│   │   ├── utils.ts                 # XSS sanitizer, formatters, slugifier
│   │   └── ai/
│   │       ├── skill-taxonomy.ts    # 60+ canonical skills, aliases & career blueprints
│   │       ├── semantic.ts          # TF-IDF cosine similarity, protected-term filter, PII redactor
│   │       ├── llm-client.ts        # OpenAI JSON structured client + fallback detector
│   │       └── engine.ts            # All 8 Responsible AI feature implementations
│   ├── components/
│   │   ├── providers/               # ThemeProvider, ToastProvider, AuthProvider
│   │   ├── ui/primitives.tsx        # Button, Card, Badge, Modal, Input, ScoreRing, AIModeBadge
│   │   ├── layout/                  # PublicNavbar, PublicFooter, DashboardShell
│   │   ├── jobs/                    # JobBoardView, JobDetailView
│   │   ├── messaging/               # MessagingWorkspace (direct recruiter-candidate chat)
│   │   ├── settings/                # AccountSettingsPanel
│   │   └── admin/                   # AdminUsersTable
│   └── app/
│       ├── page.tsx                 # Public Landing Page
│       ├── (public & auth pages)    # /jobs, /about, /features, /how-it-works, /contact, /privacy, /terms, /login, /register, /forgot-password, /reset-password
│       ├── candidate/               # 10 Candidate Dashboard routes
│       ├── recruiter/               # 12 Recruiter Dashboard routes
│       ├── admin/                   # 11 Administrator Dashboard routes
│       └── api/                     # 42 REST API route handlers
├── tests/
│   ├── unit/ai-and-parsers.test.ts  # AI engine, semantic math & PDF/DOCX parser unit tests
│   ├── integration/security-and-rbac.test.ts # JWT, XSS, RBAC & PostgreSQL integrity tests
│   └── e2e/workflows.e2e.test.ts    # All 20 end-to-end HTTP workflows
├── Dockerfile                       # Multi-stage Node 20 production container
└── docker-compose.yml               # PostgreSQL 17 + TalentAI app orchestration
```

---

## 3. Authentication, Session & RBAC Design

1. **Password Security**: Passwords are never stored or logged in plaintext. Every password is hashed with `bcryptjs` (`cost = 10`) before persistence.
2. **Admin Isolation**: `registerSchema` strictly restricts public registration to `CANDIDATE` and `RECRUITER`. `ADMIN` accounts can only be provisioned via server-side database seeding (`prisma/seed.ts`).
3. **Hybrid Cookie + Bearer Token Session**:
   - Upon login/registration, the server issues a signed `HS256` JWT (`7d` expiry) stored in an `HttpOnly` cookie (`talentai_session`, configured with `SameSite=None; Secure; Partitioned` on HTTPS previews and `SameSite=Lax` on local HTTP) **and** returned for `Authorization: Bearer` API requests so embedded sandboxed browsers with third-party cookie restrictions authenticate seamlessly.
4. **Defense-in-Depth RBAC**:
   - **Layer 1 (`src/middleware.ts`)**: Intercepts `/candidate/*`, `/recruiter/*`, and `/admin/*` navigations, redirecting unauthenticated users to `/login` and cross-role users to their own dashboard.
   - **Layer 2 (`requireAuth` in every API handler)**: Re-verifies the JWT signature **and** queries PostgreSQL to confirm `user.status === 'ACTIVE'` (immediately blocking suspended accounts even if they hold an unexpired JWT).

---

## 4. Security & Privacy Controls

- **Private CV Storage & Authorization**:
  - Uploaded CVs are stored outside `/public` inside `/storage/cvs/` with `0600` file permissions and randomized filenames.
  - Binary magic-byte inspection verifies `%PDF-` for `.pdf` and `PK\x03\x04` for `.docx` alongside a 5 MB upload cap, blocking disguised executables.
  - `GET /api/candidates/cv/[id]` enforces strict ownership/application checks: **only** the owning candidate or a recruiter at a company to which the candidate explicitly applied can access the CV. Even Platform Administrators receive `403 Forbidden` on confidential candidate CVs.
- **SQL Injection & XSS Mitigation**:
  - All database queries use parameterized Prisma Client methods (zero raw string concatenation).
  - All user-submitted text fields pass through `sanitizeText()` (stripping `<script>`, `<iframe>`, inline event handlers, `javascript:` URIs, and null bytes) and Zod validation.
- **Audit Logging**:
  - Critical lifecycle events (registration, login, failed login, CV review, job moderation, match score override, account suspension, platform config updates) are recorded in the `AuditLog` table.

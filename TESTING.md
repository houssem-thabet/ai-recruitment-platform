# TalentAI — Quality Assurance & Testing Documentation

## 1. Testing Strategy

TalentAI includes an automated 3-tier **Vitest** test suite (`npm test`) that validates unit logic, database/security integration, and all **20 mandatory End-to-End QA workflows** against a live PostgreSQL 17 database and running Next.js server (`http://127.0.0.1:3000`).

| Test Suite | File | Scope | Tests | Status |
|---|---|---|---|---|
| **Unit Suite** | `tests/unit/ai-and-parsers.test.ts` | Skill normalization, TF-IDF cosine similarity, protected-term exclusion, PII redaction, magic-byte CV validation, real PDF & DOCX extraction, all 8 AI engine functions, configurable match weights | 6 | **PASS** |
| **Integration Suite** | `tests/integration/security-and-rbac.test.ts` | Public ADMIN registration block, XSS & null-byte sanitization, HS256 JWT signing/tamper rejection, PostgreSQL seeded entity counts & bcrypt password verification | 4 | **PASS** |
| **End-to-End Suite** | `tests/e2e/workflows.e2e.test.ts` | Full HTTP lifecycle across all 20 platform workflows (Auth, RBAC, Profile, PDF/DOCX CV upload, privacy checks, AI JD approval gate, search/filter, apply, duplicate block, matching override, Kanban status + notifications, interview conflict check, consent-gated evaluation, chatbot, skill gap, analytics CSV, admin suspension/moderation, public routes) | 6 (covering all 20 workflows) | **PASS** |

---

## 2. Coverage Matrix of All 20 Required QA Workflows

| # | Required Workflow | Automated Verification | Result |
|---|---|---|---|
| 1 | Candidate Registration | `POST /api/auth/register` (`accountType: 'CANDIDATE'`) -> `201` + JWT | PASS |
| 2 | Recruiter Registration | `POST /api/auth/register` (`accountType: 'RECRUITER'` + company fields) -> `201` + Company created | PASS |
| 3 | Login, Logout & Role Protection | Admin login `200`; Candidate -> `/api/admin/users` returns `403`; unauthenticated `/candidate` redirects `307` | PASS |
| 4 | Candidate Profile Creation & Editing | `PUT /api/candidates/profile` updates bio, headline, experience, and normalized skills (`200`) | PASS |
| 5 | CV Upload (PDF & DOCX) & Invalid File Rejection | `.exe` upload rejected (`400`); real `.pdf` & `.docx` uploads succeed (`201`); unauthorized recruiter & admin CV access blocked (`403`) | PASS |
| 6 | AI CV Parsing & Candidate Correction | Automatic `CVAnalysis` extraction verified; `PUT /api/candidates/cv/[id]` saves candidate-verified corrections (`200`) | PASS |
| 7 | Recruiter Job Creation, Editing & Publishing | `POST /api/jobs` creates published job with skills, salary, and work mode (`201`) | PASS |
| 8 | AI Job Description Generation & Human Approval | `POST /api/ai/generate-job-description` (`200`); publishing with `humanApproved: false` blocked (`400`); `humanApproved: true` succeeds (`201`) | PASS |
| 9 | Job Search, Filtering, Sorting & Pagination | `GET /api/jobs?q=TypeScript&workMode=HYBRID&sort=salary_desc&page=1&limit=5` returns paginated matches (`200`) | PASS |
| 10 | Job Bookmarking | `POST /api/candidates/bookmarks` saves/toggles job bookmark (`200`) | PASS |
| 11 | Job Application & Duplicate Prevention | First `POST /api/applications` succeeds (`201`); duplicate `POST` returns `409 Conflict` | PASS |
| 12 | AI Matching Score & Recruiter Override | `POST /api/ai/match-candidate` ranks applicants; `PUT /api/ai/match-candidate` persists `recruiterOverrideScore: 94` (`200`) | PASS |
| 13 | Status Progression & Candidate Notification | `PUT /api/applications/[id]/status` (`SHORTLISTED`) creates real notification verified via `GET /api/notifications` | PASS |
| 14 | Interview Scheduling & Conflict Detection | `POST /api/interviews` schedules slot (`201`); overlapping time slot returns `409 Conflict` | PASS |
| 15 | AI Interview Questions & Consent-Gated Evaluation | `POST /api/ai/generate-interview-questions` (`200`); `POST /api/ai/evaluate-interview` without consent returns `400`, with `consentConfirmed: true` returns `200` | PASS |
| 16 | Candidate AI Career Assistant | `POST /api/ai/career-assistant` persists contextual Q&A in PostgreSQL (`200`) | PASS |
| 17 | Skill Gap Analysis & Job Recommendations | `POST /api/ai/skill-gap` & `GET /api/ai/recommendations` return readiness scores, learning projects, and ranked jobs (`200`) | PASS |
| 18 | Recruiter Analytics & CSV Export | `GET /api/recruiter/analytics?range=all` & `?format=csv` return live KPIs and valid CSV headers (`200`) | PASS |
| 19 | Admin User Suspension & Job Moderation | Suspending user blocks login (`403`), reactivation restores access (`200`); job `MODERATION_HOLD` & `AuditLog` verified (`200`) | PASS |
| 20 | Public & Responsive Routes Render | `/`, `/jobs`, `/about`, `/features`, `/how-it-works`, `/contact`, `/login`, `/register`, `/privacy`, `/terms` all render HTTP `200` | PASS |

---

## 3. Running the Tests Locally

1. Ensure PostgreSQL is running and seeded (`npm run db:seed`), and the application server is running on `http://localhost:3000` (`npm run build && npm start` or `npm run dev`).
2. Run TypeScript static verification:
   ```bash
   npx tsc --noEmit
   ```
3. Run the automated test suites:
   ```bash
   npm test
   ```
   *(Temporary QA users and companies created during E2E execution are automatically cleaned up in `afterAll` so seeded demo accounts remain untouched.)*

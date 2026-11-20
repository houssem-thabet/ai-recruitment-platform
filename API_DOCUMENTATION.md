# TalentAI — REST API Documentation

All endpoints are served under `/api/*` using JSON payloads (except `/api/candidates/cv` which accepts `multipart/form-data` and CSV export routes which return `text/csv`). Authentication accepts either the `talentai_session` `HttpOnly` cookie or `Authorization: Bearer <jwt>`.

---

## 1. Authentication & Account Endpoints

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Registers a `CANDIDATE` or `RECRUITER` (creates `Company` + `RecruiterProfile` when `RECRUITER`). Rejects `ADMIN` (`400`). Rate-limited. |
| `POST` | `/api/auth/login` | Public | Authenticates email & bcrypt password. Blocks `SUSPENDED` accounts (`403`). Returns user + JWT + role redirect path. |
| `POST` | `/api/auth/logout` | Any | Clears `talentai_session` cookie and logs `AUTH_LOGOUT`. |
| `GET` | `/api/auth/me` | Authenticated | Returns active session user, profile summary, and unread notification count. |
| `PUT` | `/api/auth/me` | Authenticated | Updates account details or changes password (`currentPassword` verified via bcrypt). |
| `DELETE` | `/api/auth/me` | `CANDIDATE`, `RECRUITER` | Self-service GDPR account & data deletion (`ADMIN` deletion blocked). |
| `POST` | `/api/auth/forgot-password` | Public | Generates time-limited password reset token (returns demo reset link in local/demo mode). |
| `POST` | `/api/auth/reset-password` | Public | Validates reset token and updates bcrypt password hash. |

---

## 2. Public Endpoints

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/public/stats` | Public | Live PostgreSQL counts of candidates, verified companies, published jobs, applications, AI engine mode, and featured jobs. |
| `POST` | `/api/public/contact` | Public | Validates & logs contact inquiries with rate limiting and XSS sanitization. |

---

## 3. Candidate, Profile & Private CV Vault Endpoints

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/candidates/dashboard` | `CANDIDATE` | Aggregated candidate KPIs, profile completion %, status breakdown, recent applications, interviews, and top AI job matches. |
| `GET` | `/api/candidates/profile` | `CANDIDATE` | Full structured profile (skills, educations, experiences, certifications, projects, privacy preferences). |
| `PUT` | `/api/candidates/profile` | `CANDIDATE` | Updates scalar profile fields and replaces skills/educations/experiences/certifications/projects atomically. |
| `POST` | `/api/candidates/cv` | `CANDIDATE` | Uploads `.pdf` or `.docx` (max 5 MB, magic-byte verified), extracts text, runs AI CV Analyzer, and optionally syncs skills to profile (`201`). |
| `GET` | `/api/candidates/cv` | `CANDIDATE` | Lists candidate's uploaded CV documents and structured `CVAnalysis` records. |
| `GET` | `/api/candidates/cv/[id]` | Owner or Authorized `RECRUITER` | Returns CV analysis JSON (or binary download with `?download=1`). Returns `403` to unauthorized recruiters and admins. |
| `PUT` | `/api/candidates/cv/[id]` | `CANDIDATE` | Saves candidate manual corrections/verification on AI-extracted CV fields or sets primary CV. |
| `DELETE` | `/api/candidates/cv/[id]` | `CANDIDATE` | Deletes private CV file from disk and database, promoting next latest CV to primary. |
| `GET` | `/api/candidates/bookmarks` | `CANDIDATE` | Lists candidate's bookmarked jobs. |
| `POST` | `/api/candidates/bookmarks` | `CANDIDATE` | Toggles job bookmark (`{ jobId }`). |
| `GET` | `/api/candidates` | `RECRUITER`, `ADMIN` | Searches talent pool filtered by `q`, `skill`, `location`, `minExp`, `education`, `interest` (respects `isSearchableByRecruiters`). |
| `GET` | `/api/candidates/[id]` | `RECRUITER`, `ADMIN` | Detailed candidate profile view for authorized recruiters. |

---

## 4. Jobs, Applications, Interviews, Messaging & Notifications

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/jobs` | Public / All | Search (`q`), filter (`location`, `workMode`, `employmentType`, `experienceLevel`, `skill`, `minSalary`), sort (`newest`, `salary_desc`), and paginate (`page`, `limit`). `?mine=1` returns recruiter's company jobs. |
| `POST` | `/api/jobs` | `RECRUITER` | Creates job posting. Enforces `humanApproved === true` if `aiGenerated === true` and `status === 'PUBLISHED'`. |
| `GET` | `/api/jobs/[id]` | Public / All | Job detail + view counter increment + skill tags + company overview. |
| `PUT` | `/api/jobs/[id]` | `RECRUITER` | Updates job details, skills, or lifecycle status (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`). |
| `DELETE` | `/api/jobs/[id]` | `RECRUITER` | Deletes company job posting. |
| `GET` | `/api/applications` | Authenticated | Role-scoped applications list (`?format=csv` exports CSV for recruiters). Strips `privateNotes` for candidates. |
| `POST` | `/api/applications` | `CANDIDATE` | Submits job application, prevents duplicates (`409`), computes & stores initial `MatchResult`, and notifies recruiter (`201`). |
| `PUT` | `/api/applications/[id]/status` | `CANDIDATE`, `RECRUITER`, `ADMIN` | Transitions status across all 9 stages (`CANDIDATE` may only set `WITHDRAWN`), records `statusHistory`, and dispatches notifications. |
| `GET` | `/api/interviews` | `CANDIDATE`, `RECRUITER`, `ADMIN` | Lists scheduled interviews with application, job, and evaluation records. |
| `POST` | `/api/interviews` | `RECRUITER` | Schedules interview after checking overlapping time windows (`409 Conflict` on double-booking) and notifies candidate (`201`). |
| `PUT` | `/api/interviews/[id]` | `RECRUITER`, `CANDIDATE` | Reschedules, cancels, completes interview, or saves customized interview questions. |
| `GET` / `POST` | `/api/messages` | `CANDIDATE`, `RECRUITER` | Lists direct conversations/messages (`GET`) and sends messages + real-time notification (`POST`). |
| `GET` / `PUT` | `/api/notifications` | Authenticated | Lists alerts (`GET`) and marks individual or all notifications read (`PUT`). |
| `GET` | `/api/recruiter/dashboard` | `RECRUITER` | Recruiter KPIs, funnel counts, active jobs, upcoming interviews, and recent applicants. |
| `GET` / `PUT` | `/api/recruiter/company` | `RECRUITER` | Views and updates employer organization profile. |
| `GET` | `/api/recruiter/analytics` | `RECRUITER`, `ADMIN` | Date-filtered (`7d`, `30d`, `90d`, `all`) conversion rates, avg time-to-hire, skill demand/supply charts, and `?format=csv` export. |

---

## 5. Responsible AI Endpoints (8 Core Features)

| Method | Endpoint | Roles | Feature |
|---|---|---|---|
| `POST` | `/api/ai/analyze-cv` | `CANDIDATE` | Re-runs or ad-hoc runs structured CV extraction & completeness analysis. |
| `GET` / `POST` / `PUT` | `/api/ai/match-candidate` | `RECRUITER`, `CANDIDATE` | Computes 0–100 explainable compatibility scores with configurable weights (`POST`), retrieves ranked candidates (`GET`), and saves recruiter manual score overrides (`PUT`). |
| `POST` | `/api/ai/generate-job-description` | `RECRUITER` | Generates inclusive, structured job description draft requiring human approval. |
| `POST` | `/api/ai/generate-interview-questions` | `RECRUITER` | Generates role- and candidate-tailored interview questions + evaluation criteria. |
| `POST` | `/api/ai/evaluate-interview` | `RECRUITER` | Organizes interviewer notes into evidence mapped against job skills. Rejects (`400`) unless `consentConfirmed: true`. |
| `GET` / `POST` / `DELETE` | `/api/ai/career-assistant` | `CANDIDATE` | Contextual AI Career Assistant chat history (`GET`), reply generation (`POST`), and history reset (`DELETE`). |
| `GET` / `POST` | `/api/ai/skill-gap` | `CANDIDATE` | Career path / job blueprints (`GET`) and readiness + missing skill learning roadmap (`POST`). |
| `GET` / `POST` | `/api/ai/recommendations` | `CANDIDATE` | Personalized top job recommendations with match explanations (`GET`) and dismiss/restore control (`POST`). |

---

## 6. Administrator Governance Endpoints

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | `ADMIN` | Platform-wide KPIs, 6-month trends, recruitment funnel, AI feature breakdown, and recent audit events. |
| `GET` | `/api/admin/users` | `ADMIN` | Search & filter users by role/status (non-confidential metadata only). |
| `PUT` | `/api/admin/users/[id]/status` | `ADMIN` | Suspends or reactivates accounts (`ACTIVE` / `SUSPENDED`) and logs governance action. |
| `GET` / `PUT` | `/api/admin/companies` | `ADMIN` | Lists companies and toggles verified employer badge. |
| `GET` / `PUT` | `/api/admin/jobs` | `ADMIN` | Lists all jobs and places/removes `MODERATION_HOLD` with moderation note + recruiter notification. |
| `GET` | `/api/admin/ai-logs` | `ADMIN` | Telemetry summary (total calls, avg latency, estimated tokens, errors) and `AIUsageLog` stream. |
| `GET` | `/api/admin/analytics` | `ADMIN` | Executive platform summary and `?format=csv` downloadable report. |
| `GET` | `/api/admin/audit-logs` | `ADMIN` | Filterable security & governance `AuditLog` stream. |
| `GET` / `PUT` | `/api/admin/settings` | `ADMIN` | Reads and updates global platform governance parameters. |

# TalentAI — AI Module & Responsible AI Documentation

## 1. Dual-Mode Execution Architecture

TalentAI implements an honest, transparent **Dual-Mode AI Architecture** (`src/lib/ai/llm-client.ts` and `src/lib/ai/engine.ts`):

1. **`LIVE_LLM` Mode**: Activated automatically when `OPENAI_API_KEY` is configured in `.env`. Invokes the configured OpenAI chat-completions model (`OPENAI_MODEL`, default `gpt-4o-mini`) with strict Zod JSON schema validation, PII redaction (`redactPIIForExternalLLM`), and automatic graceful fallback if the external provider times out or errors.
2. **`DETERMINISTIC_NLP` Mode (Default Demo Fallback)**: Active whenever external LLM credentials are absent. Uses deterministic section segmentation, a 60+ canonical skill & alias taxonomy (`src/lib/ai/skill-taxonomy.ts`), unigram + bigram TF-IDF cosine similarity (`src/lib/ai/semantic.ts`), and rule-based rubric synthesis.
   - **Strict Transparency Guarantee**: Every API response, database record (`AIMode` enum), and UI screen displays an explicit `<AIModeBadge />` (`Live LLM` vs. `Deterministic NLP Demo Mode`). The platform **never** pretends an external LLM ran when operating in deterministic mode.

Every invocation across all 8 features is logged in the `AIUsageLog` PostgreSQL table with `feature`, `mode`, `modelName`, `latencyMs`, `tokensEstimated`, and `status`.

---

## 2. Detailed Specification of the 8 AI Features

### Feature 1: AI CV Analyzer (`analyzeCVText`)
- **Input**: Validated `.pdf` (`pdf-parse` over `Uint8Array`) or `.docx` (`mammoth`) document up to 5 MB.
- **Processing**: Normalizes bullets/whitespace, segments CV headers (`Summary`, `Experience`, `Education`, `Skills`, `Projects`, `Certifications`), extracts canonical technical/soft/language skills, estimates experience span from date ranges, and calculates a 0–100 completeness score.
- **Guardrails**:
  - Validated against `cvAnalysisOutputSchema` (Zod).
  - **Zero Fabrication**: Never invents degrees, employers, or certifications not present in the uploaded text.
  - **Human-in-the-Loop**: Candidates can inspect, edit, and verify extracted data via `PUT /api/candidates/cv/[id]` before syncing skills to their profile.

### Feature 2: Intelligent Job–Candidate Matching (`computeCandidateJobMatch`)
- **Scoring Formula**: Computes 5 interpretable sub-scores in `[0, 100]` combined with configurable weights (normalized to sum to `100%`):
  $$\text{Overall Score} = \frac{w_S \cdot S_{\text{skills}} + w_E \cdot S_{\text{exp}} + w_D \cdot S_{\text{edu}} + w_R \cdot S_{\text{resp}} + w_L \cdot S_{\text{lang}}}{w_S + w_E + w_D + w_R + w_L}$$
  - **Default Weights**:
    - Required & Preferred Skills ($w_S$): **40%**
    - Relevant Years & Role Experience ($w_E$): **25%**
    - Education Qualification Alignment ($w_D$): **15%**
    - Semantic Responsibility Similarity ($w_R$): **15%** (TF-IDF unigram/bigram cosine similarity)
    - Required Language Match ($w_L$): **5%**
- **Explainability & Human Control**:
  - Outputs `matchingSkills`, `missingSkills`, `matchingQualifications`, natural-language `explanation`, and `verificationAreas` for human interview probing.
  - Recruiters can customize weights per run and save a manual **`recruiterOverrideScore`** + justification note (`PUT /api/ai/match-candidate`), logged to `AuditLog`.
  - **Never** auto-rejects candidates.

### Feature 3: AI Job Description Generator (`generateJobDescriptionAI`)
- Generates structured `overview`, `responsibilities`, `requiredQualifications`, `preferredQualifications`, `benefits`, and `applicationInstructions` using gender-neutral, inclusive phrasing.
- **Mandatory Human Approval**: `POST /api/jobs` rejects publication (`400 Bad Request`) of AI-generated postings unless `humanApproved: true` is explicitly confirmed by the recruiter.

### Feature 4: AI Interview Question Generator (`generateInterviewQuestionsAI`)
- Produces structured questions spanning **Technical**, **Behavioral**, **Situational**, **Problem-Solving**, and **Project Deep-Dive** categories, each paired with `skillAssessed`, `strongAnswerIndicators`, and `evaluationCriteria` (1–5 rubric). Recruiters can customize and save questions onto any scheduled `Interview`.

### Feature 5: AI Interview Evaluation Assistant (`evaluateInterviewNotesAI`)
- **Consent Gate**: Strictly requires `consentConfirmed === true` (`400 Bad Request` otherwise).
- Organizes interviewer-written notes into an `organizedSummary`, `evidenceMap` (`Demonstrated` / `Partial` / `Not Observed` per required skill), `strengths`, `concerns`, and `followUpQuestions`.
- **Anti-Pseudoscience Guardrail**: Never performs facial, voice, biometric, emotion, honesty, or personality inference, and never issues automated hiring verdicts (`humanRecommendation` is chosen solely by the human interviewer).

### Feature 6: AI Career Assistant (`runCareerAssistantAI`)
- Authenticated candidate chatbot persisted in `CareerChatMessage`. Grounded strictly in the candidate's own profile, CV completeness feedback, and live matching jobs to advise on CV bullet quantification, interview prep, and career growth.

### Feature 7: Skill Gap Analysis (`computeSkillGapAnalysis`)
- Compares candidate skill proficiency levels (`BEGINNER` = 45, `INTERMEDIATE` = 72, `ADVANCED` = 90, `EXPERT` = 100) against either a live published `Job` or curated `CAREER_PATH_BLUEPRINTS`.
- Outputs visual Recharts comparison data, `readinessScore`, `missingRequiredSkills`, `niceToHaveSkills`, difficulty, estimated learning weeks, and hands-on portfolio project ideas—without ever inventing completed courses on the candidate's profile.

### Feature 8: AI Job Recommendations (`/api/ai/recommendations`)
- Ranks open published jobs for the candidate with transparent reasons (*"Matches 5 of your core skills..."*), respects `remotePreference`, and allows candidates to **Dismiss** or **Restore** recommendations at any time.

---

## 3. Responsible AI & Non-Discrimination Summary

| Risk Area | Technical Enforcement in TalentAI |
|---|---|
| Demographic Bias | `PROTECTED_TERMS` filter in `src/lib/ai/semantic.ts` strips gender, race, religion, age, marital status, nationality, and disability terms from similarity vectors; schema stores zero demographic scoring inputs. |
| Automated Rejection | No code path transitions an `Application` to `REJECTED` automatically; only authenticated human recruiters can update status with a documented reason. |
| Hallucinated Credentials | Deterministic extractor matches only skills/degrees explicitly written in CV text; candidate verification UI allows manual correction. |
| External Data Leakage | `redactPIIForExternalLLM` masks email addresses and phone numbers before any external OpenAI prompt is transmitted. |

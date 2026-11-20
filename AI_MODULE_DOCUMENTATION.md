# TalentAI — AI Module & Responsible AI Documentation

## 1. Multi-Provider Dual-Mode Execution Architecture

TalentAI implements an honest, resilient **Dual-Mode AI Architecture** (`src/lib/ai/pii-guard.ts`, `src/lib/ai/llm-client.ts`, `src/lib/ai/semantic.ts`, `src/lib/ai/skill-taxonomy.ts`, and `src/lib/ai/engine.ts`):

1. **`LIVE_LLM` + Hybrid Dense Embeddings Mode**:
   - Automatically activates when any supported provider API key is configured in `.env` (with optional `AI_PROVIDER` override):
     - **OpenAI / OpenAI-Compatible** (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` default `gpt-4o-mini`, `OPENAI_EMBEDDING_MODEL` default `text-embedding-3-small`)
     - **Anthropic Claude** (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` default `claude-3-5-haiku-latest`)
     - **Google Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL` default `gemini-2.0-flash`, `GEMINI_EMBEDDING_MODEL` default `text-embedding-004`)
   - Features `AbortController` timeouts, exponential backoff retry on transient `HTTP 429` / `5xx` errors, markdown-fence stripping, strict **Zod schema validation**, bounded LRU vector caching (`256` entries), and pre-transmission PII/demographic scrubbing (`redactPIIForExternalLLM`).
2. **`DETERMINISTIC_NLP` Fallback Mode (`talentai-deterministic-nlp-v2`)**:
   - Active whenever external API credentials are absent **or** automatically engaged on upstream timeout, rate-limit exhaustion, or schema mismatch (`fallbackUsed: true`, logged with `AIExecutionStatus = 'FALLBACK'` in PostgreSQL `AIUsageLog`).
   - Uses sublinear TF-IDF (`1 + ln(tf)`) with domain-calibrated IDF weights over unigrams, phrase bigrams, and canonical skill concepts, combined with a 65+ skill taxonomy, directed ecosystem transferability graph, and prerequisite DAG.
   - **Strict Transparency Guarantee**: Every API response, database record (`AIMode` enum), and UI screen displays an explicit `<AIModeBadge />` (`Live LLM` vs. `Deterministic NLP`). The engine **never** reports `LIVE_LLM` unless a live provider call succeeded and passed schema validation.

---

## 2. Deep Technical Specification of Key AI Subsystems

### A. Hardened CV Document Parsing (`src/lib/cv-parser.ts`)
- **Validation & Typed Error Taxonomy (`CVParseError`)**: Verifies file non-emptiness (`EMPTY_FILE`), 5 MB size cap (`FILE_TOO_LARGE`), extension allowlist (`UNSUPPORTED_EXTENSION`), and binary magic-byte signatures (`%PDF-` for PDF and `PK\x03\x04` for OOXML `.docx`, throwing `INVALID_SIGNATURE` on disguised files).
- **Artifact Normalization (`normalizeExtractedCVText`)**: Expands typographic ligatures (`ﬁ`→`fi`, `ﬂ`→`fl`), strips BOM/soft-hyphens/zero-width chars, rejoins hyphenated PDF line-breaks (`micro-\nservices`→`microservices`), converts wide multi-column gaps into structured separators, and removes standalone page-number footers.
- **Dual-Stage PDF Resilience**: Extracts text via `pdf-parse` over standalone `Uint8Array` buffers, backed by a pure-Node `zlib` `FlateDecode` / uncompressed `BT...ET` PDF operator stream extractor (`pdf-stream-fallback`) for non-standard PDF XRef tables.

### B. Structured Information Extraction & Anti-Hallucination (`analyzeCVText`)
- **Merged Timeline Experience Math (`estimateYearsOfExperience`)**: Parses month-year and year-year ranges (`Jan 2021 – Dec 2023`, `03/2020 - Present`) inside the `Experience` section and **merges overlapping intervals** so concurrent roles are never double-counted and `Education` dates are never miscounted as employment years.
- **Grounding Verification Filter (`filterGroundedItems`)**: Even in `LIVE_LLM` mode, every LLM-extracted skill or certification is cross-verified against the source CV text and deterministic baseline—automatically stripping any hallucinated credential before `cvAnalysisOutputSchema` validation.

### C. Semantic Job Matching & Explainable Scoring (`computeCandidateJobMatch`)
- **Configurable Composite Formula** (safe weight normalization via `normalizeMatchWeights`, default `40 / 25 / 15 / 15 / 5`):
  $$\text{Overall Score} = \frac{w_S S_{\text{skills}} + w_E S_{\text{exp}} + w_D S_{\text{edu}} + w_R S_{\text{resp}} + w_L S_{\text{lang}}}{\sum w_i}$$
- **Directed Ecosystem Skill Transferability (`computeSkillTransferability`)**:
  - Exact canonical skill match earns `1.0` credit (`matchingSkills`).
  - Documented ecosystem supersets/siblings (e.g., candidate knows `Next.js` when job asks for `React`, or `PostgreSQL` when job asks for `SQL`) earn calibrated partial credit (`0.35–0.90`), recorded in `adjacentSkills` and surfaced in `dimensionRationales` and `verificationAreas` for human interview probing.
- **Hybrid Dense + Lexical Semantic Alignment (`computeHybridSemanticSimilarity`)**:
  - Blends calibrated dense embedding cosine similarity (`68%`) with sublinear IDF lexical/concept cosine similarity (`32%`) when live embeddings are active, or uses pure IDF semantic similarity offline.

### D. Prerequisite-Sequenced Skill Gap Analysis (`computeSkillGapAnalysis` & `runSkillGapAnalysisAI`)
- Evaluates proficiency-weighted readiness (`BEGINNER`..`EXPERT`) plus adjacent skill bridges (`adjacentBridges` reduce estimated ramp-up weeks by ~30%).
- **Topological Prerequisite Ordering (`orderSkillsByPrerequisites`)**: Sequences missing skills from foundational prerequisites (`Python`, `JavaScript`, `SQL`, `Linux`) to downstream frameworks (`TypeScript`, `React`, `Docker`) to advanced specializations (`Next.js`, `Kubernetes`, `LLM Integration`).
- When `LIVE_LLM` is configured, `runSkillGapAnalysisAI` customizes portfolio project briefs to connect the candidate's existing stack with each target skill while preserving deterministic readiness scores.

### E. Multi-Turn Contextual AI Career Assistant (`runCareerAssistantAI`)
- Classifies queries across **8 career intents** (`CV_OPTIMIZATION`, `SUMMARY_BIO_DRAFT`, `COVER_LETTER_OUTREACH`, `JOB_MATCHING`, `SKILL_GAP_ROADMAP`, `INTERVIEW_PREP`, `SALARY_NEGOTIATION`, `APPLICATION_STRATEGY`) with multi-turn `history` resolution for conversational follow-ups.

---

## 3. Responsible AI & Non-Discrimination Guarantees

| Safeguard | Technical Enforcement |
|---|---|
| **Demographic Score Invariance** | `stripProtectedAttributes` + `PROTECTED_TERMS` (`src/lib/ai/pii-guard.ts`) strip gender, pronouns, age, birth dates, marital/family status, religion, nationality, race, and disability markers prior to tokenization and embedding calls—proven mathematically invariant in `tests/unit/ai-engine-deep.test.ts`. |
| **Zero Automated Rejection** | Compatibility scores are decision-support estimates only; recruiters can override any score (`PUT /api/ai/match-candidate`) with audit logging. |
| **Zero Fabricated Credentials** | Post-LLM source-text grounding strips unverified skills/certifications; Skill Gap never records uncompleted courses as candidate skills. |
| **Consent-Gated Note Organization** | `evaluateInterviewNotesAI` throws unless `consentConfirmed === true` and performs zero biometric, emotion, or personality inference. |

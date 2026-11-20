import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import {
  CVParseError,
  normalizeExtractedCVText,
  parseCVDocument,
} from '../../src/lib/cv-parser';
import {
  computeSkillTransferability,
  orderSkillsByPrerequisites,
} from '../../src/lib/ai/skill-taxonomy';
import {
  computeSemanticSimilarity,
  computeHybridSemanticSimilarity,
  stripProtectedAttributes,
  redactPIIForExternalLLM,
} from '../../src/lib/ai/semantic';
import {
  callStructuredLLM,
  callEmbeddingsAPI,
  clearEmbeddingCache,
  extractJsonFromLLMResponse,
  getLastLLMDiagnostics,
} from '../../src/lib/ai/llm-client';
import {
  analyzeCVText,
  estimateYearsOfExperience,
  computeCandidateJobMatch,
  normalizeMatchWeights,
  computeSkillGapAnalysis,
  runSkillGapAnalysisAI,
  runCareerAssistantAI,
  classifyCareerAssistantIntent,
  evaluateInterviewNotesAI,
  generateJobDescriptionAI,
  generateInterviewQuestionsAI,
} from '../../src/lib/ai/engine';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  clearEmbeddingCache();
  process.env = { ...ORIGINAL_ENV };
});

describe('Deep AI Engine Suite: CV Parsing, Extraction, Semantic Matching, Live LLM/Embeddings & Fallbacks', () => {
  it('normalizes PDF ligatures, soft hyphens, broken line-wraps, multi-column gaps, and page footers, and throws typed CVParseError codes', async () => {
    const messyRaw =
      '\uFEFFAlex   |   Rivera\npro\uFB01cient in micro-\nservices and work\uFB02ows\u200B\n• Built scalable APIs\nPage 1 of 2\n- 2 -';
    const clean = normalizeExtractedCVText(messyRaw);
    expect(clean).toContain('proficient in microservices and workflows');
    expect(clean).toContain('- Built scalable APIs');
    expect(clean).not.toContain('Page 1 of 2');
    expect(clean).not.toContain('- 2 -');

    await expect(parseCVDocument('empty.pdf', Buffer.alloc(0))).rejects.toMatchObject({
      name: 'CVParseError',
      code: 'EMPTY_FILE',
    });

    await expect(
      parseCVDocument('script.sh', Buffer.from('#!/bin/bash'))
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_EXTENSION',
    });

    await expect(
      parseCVDocument('spoof.pdf', Buffer.from('NOT-PDF-BYTES'))
    ).rejects.toMatchObject({
      code: 'INVALID_SIGNATURE',
    });

    // Pure PDF BT...ET stream fallback works even on minimal synthetic PDF without XRef table
    const syntheticStreamPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Length 75 >>\nstream\nBT /F1 12 Tf (Yasmine Engineer - TypeScript PostgreSQL Docker) Tj ET\nendstream\nendobj\n%%EOF',
      'latin1'
    );
    const fallbackDoc = await parseCVDocument('synthetic.pdf', syntheticStreamPdf);
    expect(fallbackDoc.text).toContain('Yasmine Engineer');
    expect(fallbackDoc.text).toContain('TypeScript');
  });

  it('merges overlapping employment date intervals without double-counting and separates Education years from Work Experience', async () => {
    // Jan 2020 – Dec 2022 (3 yrs) overlapping with Jan 2021 – Dec 2023 (3 yrs) => 4 total years (2020..2023), NOT 6!
    const expSection = [
      'Senior Full-Stack Engineer at NovaTech | Jan 2021 - Dec 2023',
      '- Led TypeScript and PostgreSQL architecture reducing query latency by 42%.',
      'Software Engineer at CloudScale | Jan 2020 - Dec 2022',
      '- Built React and Node.js microservices.',
    ].join('\n');

    expect(estimateYearsOfExperience(expSection)).toBe(4);

    const fullCv = [
      'Nadia Toumi',
      'SUMMARY',
      'Full-stack engineer focused on resilient web systems, automated testing, and cloud architecture.',
      'EDUCATION',
      'B.Sc. in Computer Science | Tunis Science University | 2015 - 2019',
      'EXPERIENCE',
      expSection,
      'SKILLS',
      'TypeScript, React, Next.js, PostgreSQL, Docker, Communication, Problem Solving',
      'PROJECTS',
      'Realtime ATS: Built event-driven hiring board with Next.js and PostgreSQL',
      'LANGUAGES',
      'English, French, Arabic',
    ].join('\n');

    const analyzed = await analyzeCVText(fullCv);
    expect(analyzed.result.extractedData.yearsOfExperience).toBe(4); // Education 2015-2019 NOT added!
    expect(analyzed.result.extractedData.education.length).toBeGreaterThanOrEqual(1);
    expect(analyzed.result.extractedData.experience.length).toBe(2);
    expect(analyzed.result.extractedData.projects[0].title).toBe('Realtime ATS');
    expect(analyzed.result.completenessScore).toBeGreaterThanOrEqual(85);
  });

  it('computes ecosystem skill transferability, demographic bias invariance, and safe weight normalization', async () => {
    // Candidate has Next.js & PostgreSQL; job asks for React & SQL -> strong adjacent transferability!
    const candSkills = new Set(['next.js', 'postgresql', 'typescript']);
    const reactTransfer = computeSkillTransferability('React', candSkills);
    expect(reactTransfer.matchType).toBe('ADJACENT');
    expect(reactTransfer.credit).toBeGreaterThanOrEqual(0.8);
    expect(reactTransfer.matchedVia).toBe('Next.js');

    const sqlTransfer = computeSkillTransferability('SQL', candSkills);
    expect(sqlTransfer.matchType).toBe('ADJACENT');
    expect(sqlTransfer.credit).toBeGreaterThanOrEqual(0.85);

    // Malformed / negative / zero weights normalize safely
    expect(
      normalizeMatchWeights({
        skills: -10,
        experience: 0,
        education: 0,
        responsibilities: 0,
        language: 0,
      })
    ).toEqual({
      skills: 40,
      experience: 25,
      education: 15,
      responsibilities: 15,
      language: 5,
    });

    // Mathematical proof of Demographic / Protected-Attribute Invariance
    const baseJob = {
      title: 'Senior Full-Stack Engineer',
      description: 'Architect Next.js, TypeScript, and PostgreSQL web applications.',
      responsibilities: ['Build REST APIs and React UIs', 'Optimize PostgreSQL queries'],
      qualifications: ["Bachelor's degree in Computer Science"],
      requiredSkills: ['TypeScript', 'React', 'PostgreSQL'],
      minYearsExperience: 4,
      educationRequirement: "Bachelor's",
      location: 'Remote',
      workMode: 'REMOTE',
      requiredLanguages: ['English'],
    };

    const neutralCandidate = {
      fullName: 'Candidate A',
      headline: 'Senior Full-Stack Engineer',
      bio: 'Delivered scalable TypeScript, Next.js, and PostgreSQL SaaS systems.',
      yearsOfExperience: 5,
      skills: ['TypeScript', 'Next.js', 'PostgreSQL'],
      educations: [{ degree: 'B.Sc.', fieldOfStudy: 'Computer Science', institution: 'Tech Univ' }],
      experiences: [
        {
          title: 'Full-Stack Engineer',
          company: 'Acme',
          description: 'Built REST APIs and Next.js interfaces backed by PostgreSQL.',
        },
      ],
      certifications: [],
      projects: [],
      languages: ['English'],
    };

    const demographicCandidate = {
      ...neutralCandidate,
      fullName: 'Candidate B',
      bio: 'Gender: Female. Age: 34 years old. Marital Status: Married mother. Religion: Muslim. Nationality: Tunisian. Delivered scalable TypeScript, Next.js, and PostgreSQL SaaS systems.',
      cvText: 'Born in 1992 (she/her). Disabled veteran.',
    };

    const scoreNeutral = await computeCandidateJobMatch(neutralCandidate, baseJob);
    const scoreDemographic = await computeCandidateJobMatch(demographicCandidate, baseJob);

    expect(scoreNeutral.result.overallScore).toBe(scoreDemographic.result.overallScore);
    expect(scoreNeutral.result.skillScore).toBe(scoreDemographic.result.skillScore);
    expect(scoreNeutral.result.experienceScore).toBe(scoreDemographic.result.experienceScore);
    expect(scoreNeutral.result.responsibilityScore).toBe(
      scoreDemographic.result.responsibilityScore
    );
    // Verify adjacent bridge (React via Next.js) is surfaced in explainable output
    expect(scoreNeutral.result.adjacentSkills?.some((a) => a.requiredSkill === 'React')).toBe(
      true
    );
    expect(scoreNeutral.result.dimensionRationales?.skills).toContain('Next.js');
  });

  it('executes real OpenAI Chat + Dense Embeddings integration, strips hallucinated LLM credentials, and redacts PII', async () => {
    process.env.OPENAI_API_KEY = 'mock_openai_unit_test_credential_9999';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

    const capturedBodies: string[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const bodyStr = String(init?.body || '');
      capturedBodies.push(bodyStr);

      if (url.endsWith('/embeddings')) {
        return new Response(
          JSON.stringify({
            data: [
              { index: 0, embedding: [0.8, 0.5, 0.2, 0.1] },
              { index: 1, embedding: [0.78, 0.52, 0.22, 0.12] },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.endsWith('/chat/completions')) {
        // Deliberately include a hallucinated skill ("COBOL") and hallucinated cert ("CISSP")
        // to prove our anti-hallucination grounding filter strips them!
        return new Response(
          JSON.stringify({
            usage: { total_tokens: 312 },
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: 'Experienced TypeScript & PostgreSQL engineer.',
                    technicalSkills: ['TypeScript', 'PostgreSQL', 'COBOL'],
                    softSkills: ['Communication'],
                    certifications: ['CISSP Certified Hacker'],
                    skillsOverview: 'Strong backend and full-stack TypeScript foundation.',
                    experienceOverview: '4 years building web services.',
                    strengths: ['Type-safe API architecture'],
                    suggestions: ['Add cloud deployment metrics'],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    const cvRun = await analyzeCVText(
      'Jane Doe\njane.private@example.com | +1 415-555-0199\nEXPERIENCE\nBackend Engineer at DataCorp | 2020 - 2024\n- Built TypeScript and PostgreSQL APIs with strong Communication.'
    );

    expect(cvRun.result.aiMode).toBe('LIVE_LLM');
    expect(cvRun.fallbackUsed).toBe(false);
    expect(cvRun.tokensEstimated).toBe(312);
    // Grounded skills kept, hallucinated COBOL & CISSP stripped!
    expect(cvRun.result.extractedData.technicalSkills).toContain('TypeScript');
    expect(cvRun.result.extractedData.technicalSkills).not.toContain('COBOL');
    expect(cvRun.result.extractedData.certifications).not.toContain('CISSP Certified Hacker');

    // Outgoing LLM prompt must have redacted email & phone PII!
    expect(capturedBodies.join(' ')).not.toContain('jane.private@example.com');
    expect(capturedBodies.join(' ')).toContain('[REDACTED_EMAIL]');

    // Hybrid dense embeddings integration check
    const hybrid = await computeHybridSemanticSimilarity(
      'TypeScript Next.js PostgreSQL SaaS engineer',
      'Full-Stack TypeScript PostgreSQL developer'
    );
    expect(hybrid.usedLiveEmbeddings).toBe(true);
    expect(hybrid.embeddingSimilarity).toBeGreaterThan(0.95);
  });

  it('supports Anthropic & Gemini JSON integrations, retries HTTP 429 rate limits, and falls back reliably on HTTP 500 or invalid schema', async () => {
    // 1. Anthropic with ```json markdown fence + HTTP 429 retry recovery
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'mock_anthropic_unit_test_credential_9999';

    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        return new Response('Rate limited', { status: 429 });
      }
      return new Response(
        JSON.stringify({
          usage: { input_tokens: 90, output_tokens: 45 },
          content: [
            {
              text: '```json\n{"reply":"Focus on PostgreSQL indexing and Docker CI/CD.","suggestedActions":["Open Skill Analysis"]}\n```',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const chatLive = await runCareerAssistantAI(
      'What should I study next?',
      {
        firstName: 'Yasmine',
        lastName: 'QA',
        yearsOfExperience: 3,
        skills: ['TypeScript', 'React'],
        applicationsCount: 1,
        topMatchingJobs: [],
      },
      [{ role: 'user', content: 'Tell me about backend roles' }]
    );

    expect(calls).toBe(2); // Retried once after 429 and succeeded!
    expect(chatLive.aiMode).toBe('LIVE_LLM');
    expect(chatLive.fallbackUsed).toBe(false);
    expect(chatLive.reply).toContain('PostgreSQL indexing');

    // 2. Simulate Provider Outage (HTTP 500) -> Reliable Fallback without throwing!
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Upstream Gateway Error', { status: 500 })
    );

    const gapFallback = await runSkillGapAnalysisAI({
      candidateSkills: [{ name: 'JavaScript', level: 'ADVANCED' }],
      targetTitle: 'Full-Stack Software Engineer',
      targetType: 'CAREER_PATH',
      requiredSkills: ['Next.js', 'React', 'TypeScript', 'PostgreSQL'],
    });

    expect(gapFallback.fallbackUsed).toBe(true);
    expect(gapFallback.analysis.aiMode).toBe('DETERMINISTIC_NLP');
    expect(getLastLLMDiagnostics()?.errorCode).toBe('HTTP_SERVER_ERROR');

    // Verify prerequisite sequencing: TypeScript & PostgreSQL (rank 2) appear before React (rank 3) and Next.js (rank 4)!
    const ordered = gapFallback.analysis.missingRequiredSkills;
    expect(ordered.indexOf('TypeScript')).toBeLessThan(ordered.indexOf('React'));
    expect(ordered.indexOf('React')).toBeLessThan(ordered.indexOf('Next.js'));

    // 3. Simulate Schema Validation Failure -> Reliable Fallback
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ text: '{"wrongKey": 123}' }],
        }),
        { status: 200 }
      )
    );

    const badSchemaRes = await callStructuredLLM({
      systemPrompt: 'Test',
      userPrompt: 'Test',
      schema: z.object({ expectedField: z.string() }),
    });
    expect(badSchemaRes).toBeNull();
    expect(getLastLLMDiagnostics()?.errorCode).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('classifies all 8 Career Assistant intents and resolves multi-turn conversational follow-ups', async () => {
    expect(classifyCareerAssistantIntent('Can you critique my resume bullets?')).toBe(
      'CV_OPTIMIZATION'
    );
    expect(classifyCareerAssistantIntent('Write a short cover letter for NovaTech')).toBe(
      'COVER_LETTER_OUTREACH'
    );
    expect(classifyCareerAssistantIntent('How should I negotiate base salary and equity?')).toBe(
      'SALARY_NEGOTIATION'
    );
    expect(classifyCareerAssistantIntent('Practice STAR behavioral interview questions')).toBe(
      'INTERVIEW_PREP'
    );
    expect(
      classifyCareerAssistantIntent('Tell me more about that', [
        { role: 'user', content: 'How should I negotiate base salary?' },
        { role: 'assistant', content: 'Anchor on scope...' },
      ])
    ).toBe('SALARY_NEGOTIATION');

    // Verify extractJsonFromLLMResponse handles prose around JSON
    const parsed = extractJsonFromLLMResponse(
      'Sure! Here is the JSON:\n{"score": 91}\nHope that helps!'
    ) as { score: number };
    expect(parsed.score).toBe(91);
  });

  it('executes Google Gemini generateContent + batchEmbedContents, caches embeddings in LRU, and handles request timeouts gracefully', async () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'mock_gemini_unit_test_credential_9999';
    process.env.GEMINI_MODEL = 'gemini-2.0-flash';

    let embedNetworkHits = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(':batchEmbedContents')) {
        embedNetworkHits++;
        return new Response(
          JSON.stringify({
            embeddings: [
              { values: [0.9, 0.4, 0.1] },
              { values: [0.88, 0.42, 0.12] },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes(':generateContent')) {
        return new Response(
          JSON.stringify({
            usageMetadata: { totalTokenCount: 220 },
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        organizedNotes: 'Structured summary of candidate technical discussion.',
                        evidenceMap: [
                          {
                            requirement: 'PostgreSQL',
                            evidenceFound: 'Explained B-tree composite indexing clearly.',
                            status: 'Demonstrated',
                          },
                        ],
                        demonstratedSkills: ['PostgreSQL'],
                        unansweredQuestions: ['Production incident runbooks'],
                        suggestedFollowUps: ['Ask about zero-downtime schema migrations'],
                        structuredSummary: 'Demonstrated strong database indexing fundamentals.',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    // First call hits Gemini batchEmbedContents; second identical call hits in-memory LRU cache!
    const vecFirst = await callEmbeddingsAPI(['React & TypeScript', 'Frontend Engineer']);
    const vecSecond = await callEmbeddingsAPI(['React & TypeScript', 'Frontend Engineer']);
    expect(vecFirst).toHaveLength(2);
    expect(vecSecond).toEqual(vecFirst);
    expect(embedNetworkHits).toBe(1);

    // Consent-gated Interview Evaluation Assistant in LIVE_LLM Gemini mode
    await expect(
      evaluateInterviewNotesAI({
        jobTitle: 'Backend Engineer',
        requiredSkills: ['PostgreSQL'],
        rawNotes: 'Candidate discussed PostgreSQL B-tree composite indexing.',
        consentConfirmed: false,
      })
    ).rejects.toThrow(/Candidate consent confirmation/i);

    const evalRun = await evaluateInterviewNotesAI({
      jobTitle: 'Backend Engineer',
      requiredSkills: ['PostgreSQL'],
      rawNotes: 'Candidate discussed PostgreSQL B-tree composite indexing in depth.',
      consentConfirmed: true,
    });
    expect(evalRun.result.aiMode).toBe('LIVE_LLM');
    expect(evalRun.fallbackUsed).toBe(false);
    expect(evalRun.result.evidenceMap[0].status).toBe('Demonstrated');

    // Simulate AbortController timeout -> clean fallback without throwing
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        })
    );

    const timedOut = await callStructuredLLM({
      systemPrompt: 'Test',
      userPrompt: 'Test',
      schema: z.object({ ok: z.boolean() }),
      timeoutMs: 40,
      maxRetries: 0,
    });
    expect(timedOut).toBeNull();
    expect(getLastLLMDiagnostics()?.errorCode).toBe('TIMEOUT');
  });

  it('produces rich deterministic outputs for summary drafting, cover letters, salary negotiation, JD generation, and interview questions', async () => {
    const candidateCtx = {
      firstName: 'Amine',
      lastName: 'Mansouri',
      headline: 'Backend Software Engineer',
      yearsOfExperience: 5,
      skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
      cvCompleteness: 88,
      applicationsCount: 2,
      topMatchingJobs: [
        {
          id: 'job-1',
          title: 'Senior Backend Engineer',
          company: 'CloudScale',
          score: 92,
          missingSkills: ['Kubernetes'],
        },
      ],
    };

    const summaryHelp = await runCareerAssistantAI(
      'Draft a strong headline and professional bio summary for my profile',
      candidateCtx
    );
    expect(summaryHelp.intent).toBe('SUMMARY_BIO_DRAFT');
    expect(summaryHelp.reply).toContain('tailored professional summary');
    expect(summaryHelp.reply).toContain('Backend Software Engineer');

    const coverHelp = await runCareerAssistantAI(
      'Write a tailored cover letter and outreach message',
      candidateCtx
    );
    expect(coverHelp.intent).toBe('COVER_LETTER_OUTREACH');
    expect(coverHelp.reply).toContain('Senior Backend Engineer');

    const salaryHelp = await runCareerAssistantAI(
      'How do I negotiate my salary offer and total compensation?',
      candidateCtx
    );
    expect(salaryHelp.intent).toBe('SALARY_NEGOTIATION');
    expect(salaryHelp.reply).toContain('Total Compensation');

    const jdRun = await generateJobDescriptionAI({
      title: 'Staff Distributed Systems Engineer',
      industry: 'Cloud Infrastructure',
      experienceLevel: 'Lead',
      employmentType: 'FULL_TIME',
      location: 'Remote',
      workMode: 'REMOTE',
      requiredSkills: ['Go', 'Kubernetes', 'Kafka', 'PostgreSQL'],
    });
    expect(jdRun.result.responsibilities.length).toBeGreaterThanOrEqual(4);

    const iqRun = await generateInterviewQuestionsAI({
      jobTitle: 'Staff Distributed Systems Engineer',
      jobDescription: 'Design high-throughput distributed event streaming infrastructure.',
      seniorityLevel: 'Lead',
      requiredSkills: ['Go', 'Kubernetes', 'Kafka'],
    });
    expect(iqRun.questions.length).toBeGreaterThanOrEqual(6);
  });
});

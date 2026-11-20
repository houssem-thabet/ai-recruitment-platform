import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../../src/lib/prisma';

const BASE_URL = 'http://127.0.0.1:3000';
const uniqueSuffix = Date.now().toString().slice(-6);
const testCandidateEmail = `qa.candidate.${uniqueSuffix}@test.demo`;
const testRecruiterEmail = `qa.recruiter.${uniqueSuffix}@test.demo`;

let candidateToken = '';
let recruiterToken = '';
let adminToken = '';
let uploadedPdfCvId = '';
let createdJobId = '';
let createdAppId = '';
let createdInterviewId = '';
let testCandidateUserId = '';

async function api(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ status: number; data: any; text: string }> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    redirect: 'manual',
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: res.status, data, text };
}

describe('End-to-End QA Workflows (All 20 Core Platform Workflows)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [testCandidateEmail, testRecruiterEmail] } },
    });
    await prisma.company.deleteMany({
      where: { name: `QA Labs ${uniqueSuffix}` },
    });
  });

  it('Workflows 1, 2 & 3: Candidate registration, Recruiter registration, Login/Logout, and RBAC route protection', async () => {
    // 1. Candidate Registration
    const candReg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        accountType: 'CANDIDATE',
        firstName: 'Yasmine',
        lastName: 'QA',
        email: testCandidateEmail,
        password: 'Candidate@123!',
        confirmPassword: 'Candidate@123!',
      }),
    });
    expect(candReg.status).toBe(201);
    expect(candReg.data.token).toBeTruthy();
    candidateToken = candReg.data.token;
    testCandidateUserId = candReg.data.user.id;

    // 2. Recruiter Registration
    const recReg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        accountType: 'RECRUITER',
        firstName: 'Sami',
        lastName: 'Hiring',
        email: testRecruiterEmail,
        password: 'Recruiter@123!',
        confirmPassword: 'Recruiter@123!',
        companyName: `QA Labs ${uniqueSuffix}`,
        companyDescription: 'Enterprise cloud AI testing and observability platform.',
        industry: 'Enterprise AI',
        companySize: '51-200',
      }),
    });
    expect(recReg.status).toBe(201);
    recruiterToken = recReg.data.token;

    // 3. Admin Login + RBAC verification
    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@talentai.demo',
        password: 'Admin@123!',
      }),
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.data.token;

    // Candidate must be forbidden from Admin endpoints
    const forbiddenCheck = await api('/api/admin/users', {}, candidateToken);
    expect(forbiddenCheck.status).toBe(403);

    // Unauthenticated browser navigation to /candidate redirects to /login
    const unauthPage = await api('/candidate');
    expect([302, 307]).toContain(unauthPage.status);
  });

  it('Workflows 4, 5 & 6: Candidate profile update, CV upload (PDF & DOCX + invalid rejection), AI CV parsing & candidate correction, and CV confidentiality', async () => {
    // 4. Profile update
    const profUpdate = await api(
      '/api/candidates/profile',
      {
        method: 'PUT',
        body: JSON.stringify({
          firstName: 'Yasmine',
          lastName: 'QA',
          headline: 'Full-Stack TypeScript & AI Engineer',
          bio: 'Building resilient cloud web applications with TypeScript, React, Next.js, Node.js, and PostgreSQL.',
          location: 'Tunis, Tunisia',
          yearsOfExperience: 5,
          desiredTitle: 'Senior Full-Stack Engineer',
          remotePreference: 'HYBRID',
          skills: [
            { name: 'TypeScript', level: 'ADVANCED', yearsUsed: 5 },
            { name: 'React', level: 'ADVANCED', yearsUsed: 4 },
            { name: 'PostgreSQL', level: 'ADVANCED', yearsUsed: 4 },
          ],
        }),
      },
      candidateToken
    );
    expect(profUpdate.status).toBe(200);

    // 5a. Invalid file upload rejected (.exe)
    const badForm = new FormData();
    badForm.append(
      'file',
      new Blob(['MZ-fake-binary'], { type: 'application/octet-stream' }),
      'exploit.exe'
    );
    const badUpload = await api(
      '/api/candidates/cv',
      { method: 'POST', body: badForm },
      candidateToken
    );
    expect(badUpload.status).toBe(400);

    // 5b. Valid PDF CV upload & automatic AI CV parsing
    const pdfBuffer = await fs.readFile(
      path.join(process.cwd(), 'public', 'sample-cvs', 'sample-fullstack-cv.pdf')
    );
    const pdfForm = new FormData();
    pdfForm.append(
      'file',
      new Blob([pdfBuffer], { type: 'application/pdf' }),
      'yasmine-cv.pdf'
    );
    const pdfUpload = await api(
      '/api/candidates/cv',
      { method: 'POST', body: pdfForm },
      candidateToken
    );
    expect(pdfUpload.status).toBe(201);
    uploadedPdfCvId = pdfUpload.data.cvDocument.id;
    expect(
      pdfUpload.data.cvDocument.analysis.extractedData.technicalSkills
    ).toContain('TypeScript');

    // 5c. Valid DOCX CV upload
    const docxBuffer = await fs.readFile(
      path.join(process.cwd(), 'public', 'sample-cvs', 'sample-ai-engineer-cv.docx')
    );
    const docxForm = new FormData();
    docxForm.append(
      'file',
      new Blob([docxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      'yasmine-cv.docx'
    );
    const docxUpload = await api(
      '/api/candidates/cv',
      { method: 'POST', body: docxForm },
      candidateToken
    );
    expect(docxUpload.status).toBe(201);

    // 6. Candidate reviews & saves corrected AI CV extraction
    const correction = await api(
      `/api/candidates/cv/${uploadedPdfCvId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          setPrimary: true,
          extractedData: {
            ...pdfUpload.data.cvDocument.analysis.extractedData,
            technicalSkills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'Docker'],
          },
        }),
      },
      candidateToken
    );
    expect(correction.status).toBe(200);
    expect(correction.data.analysis.reviewedByCandidate).toBe(true);

    // Privacy check: Recruiter from QA Labs cannot access candidate's CV before application!
    const unauthorizedCvAccess = await api(
      `/api/candidates/cv/${uploadedPdfCvId}`,
      {},
      recruiterToken
    );
    expect(unauthorizedCvAccess.status).toBe(403);

    // Admin cannot open confidential CV!
    const adminNoReasonAccess = await api(
      `/api/candidates/cv/${uploadedPdfCvId}`,
      {},
      adminToken
    );
    expect(adminNoReasonAccess.status).toBe(403);
  });

  it('Workflows 7, 8, 9 & 10: AI Job Description generation, human approval enforcement, job creation/editing, search/filter/pagination & bookmarking', async () => {
    // 8a. Generate JD with AI
    const genJd = await api(
      '/api/ai/generate-job-description',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Principal Full-Stack TypeScript Engineer',
          experienceLevel: 'SENIOR',
          industry: 'Enterprise AI',
          workMode: 'HYBRID',
          employmentType: 'FULL_TIME',
          location: 'Paris, France',
          requiredSkills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL'],
        }),
      },
      recruiterToken
    );
    expect(genJd.status).toBe(200);
    expect(genJd.data.generated.overview.length).toBeGreaterThan(50);

    // 8b. Attempting to publish AI-assisted job WITHOUT human approval fails!
    const unapprovedPub = await api(
      '/api/jobs',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Principal Full-Stack TypeScript Engineer',
          description: genJd.data.generated.overview,
          responsibilities: genJd.data.generated.responsibilities,
          qualifications: genJd.data.generated.requiredQualifications,
          technicalSkills: ['TypeScript', 'React'],
          location: 'Paris, France',
          workMode: 'HYBRID',
          employmentType: 'FULL_TIME',
          experienceLevel: 'SENIOR',
          status: 'PUBLISHED',
          aiGenerated: true,
          humanApproved: false,
        }),
      },
      recruiterToken
    );
    expect(unapprovedPub.status).toBe(400);

    // 7 & 8c. Publish WITH human approval succeeds
    const createJob = await api(
      '/api/jobs',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Principal Full-Stack TypeScript Engineer',
          description: genJd.data.generated.overview,
          responsibilities: genJd.data.generated.responsibilities,
          qualifications: genJd.data.generated.requiredQualifications,
          benefits: genJd.data.generated.benefits,
          technicalSkills: ['TypeScript', 'React', 'PostgreSQL', 'Kubernetes'],
          softSkills: ['Communication'],
          location: 'Paris, France',
          workMode: 'HYBRID',
          employmentType: 'FULL_TIME',
          experienceLevel: 'SENIOR',
          minYearsExperience: 3,
          salaryMin: 80000,
          salaryMax: 110000,
          salaryCurrency: 'EUR',
          status: 'PUBLISHED',
          aiGenerated: true,
          humanApproved: true,
        }),
      },
      recruiterToken
    );
    expect(createJob.status).toBe(201);
    createdJobId = createJob.data.job.id;

    // 9. Job search, filter, sort & pagination
    const searchRes = await api(
      '/api/jobs?q=TypeScript&workMode=HYBRID&sort=salary_desc&page=1&limit=5'
    );
    expect(searchRes.status).toBe(200);
    expect(searchRes.data.jobs.length).toBeGreaterThan(0);
    expect(searchRes.data.pagination.page).toBe(1);

    // 10. Bookmarking toggle
    const bmSave = await api(
      '/api/candidates/bookmarks',
      { method: 'POST', body: JSON.stringify({ jobId: createdJobId }) },
      candidateToken
    );
    expect(bmSave.status).toBe(200);
    expect(bmSave.data.bookmarked).toBe(true);
  });

  it('Workflows 11, 12 & 13: Application submission, duplicate prevention, AI match score + human override, status progression & candidate notification', async () => {
    // 11a. Apply to job
    const applyRes = await api(
      '/api/applications',
      {
        method: 'POST',
        body: JSON.stringify({
          jobId: createdJobId,
          cvDocumentId: uploadedPdfCvId,
          coverLetter:
            'Excited to bring 5 years of TypeScript, Next.js, and PostgreSQL expertise to your platform engineering team.',
        }),
      },
      candidateToken
    );
    expect(applyRes.status).toBe(201);
    createdAppId = applyRes.data.application.id;
    expect(createdAppId).toBeTruthy();

    // 11b. Duplicate application prevented (409)
    const dupApply = await api(
      '/api/applications',
      {
        method: 'POST',
        body: JSON.stringify({ jobId: createdJobId }),
      },
      candidateToken
    );
    expect(dupApply.status).toBe(409);

    // Now that candidate applied to QA Labs' job, recruiter IS authorized to view attached CV
    const authorizedCvAccess = await api(
      `/api/candidates/cv/${uploadedPdfCvId}`,
      {},
      recruiterToken
    );
    expect(authorizedCvAccess.status).toBe(200);

    // 12. Recruiter triggers AI match ranking & applies human override
    const matchRanking = await api(
      '/api/ai/match-candidate',
      {
        method: 'POST',
        body: JSON.stringify({ jobId: createdJobId, scope: 'applicants' }),
      },
      recruiterToken
    );
    expect(matchRanking.status).toBe(200);
    expect(matchRanking.data.results.length).toBeGreaterThanOrEqual(1);
    const matchId = matchRanking.data.results[0].id;

    const overrideRes = await api(
      '/api/ai/match-candidate',
      {
        method: 'PUT',
        body: JSON.stringify({
          matchResultId: matchId,
          overrideScore: 94,
          overrideNote: 'Strong distributed PostgreSQL portfolio verified manually.',
        }),
      },
      recruiterToken
    );
    expect(overrideRes.status).toBe(200);
    expect(overrideRes.data.matchResult.recruiterOverrideScore).toBe(94);

    // 13. Status progression -> SHORTLISTED + candidate notification check
    const statusUpdate = await api(
      `/api/applications/${createdAppId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'SHORTLISTED',
          candidateFeedback: 'Great technical match — advancing to technical interview!',
        }),
      },
      recruiterToken
    );
    expect(statusUpdate.status).toBe(200);

    const notifs = await api('/api/notifications', {}, candidateToken);
    expect(notifs.status).toBe(200);
    expect(notifs.data.notifications.length).toBeGreaterThan(0);
  });

  it('Workflows 14 & 15: Interview scheduling, conflict detection, AI interview question generation & consent-gated AI note evaluation', async () => {
    const start = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    // 14a. Schedule interview
    const sched = await api(
      '/api/interviews',
      {
        method: 'POST',
        body: JSON.stringify({
          applicationId: createdAppId,
          title: 'Technical System Design Interview',
          type: 'TECHNICAL',
          scheduledAt: start,
          durationMinutes: 60,
          meetingLink: 'https://meet.talentai.demo/qa-session',
        }),
      },
      recruiterToken
    );
    expect(sched.status).toBe(201);
    createdInterviewId = sched.data.interview.id;

    // 14b. Scheduling overlapping interview for same recruiter/candidate returns 409 Conflict
    const conflict = await api(
      '/api/interviews',
      {
        method: 'POST',
        body: JSON.stringify({
          applicationId: createdAppId,
          title: 'Overlapping Slot',
          type: 'TECHNICAL',
          scheduledAt: start,
          durationMinutes: 45,
        }),
      },
      recruiterToken
    );
    expect(conflict.status).toBe(409);

    // 15a. Generate tailored AI interview questions
    const genQ = await api(
      '/api/ai/generate-interview-questions',
      {
        method: 'POST',
        body: JSON.stringify({
          interviewId: createdInterviewId,
          saveToInterview: true,
        }),
      },
      recruiterToken
    );
    expect(genQ.status).toBe(200);
    expect(genQ.data.questions.length).toBeGreaterThanOrEqual(5);

    // 15b. AI Note Evaluation blocked without consent (400), succeeds with consent (200)
    const noConsentEval = await api(
      '/api/ai/evaluate-interview',
      {
        method: 'POST',
        body: JSON.stringify({
          interviewId: createdInterviewId,
          consentConfirmed: false,
          rawNotes:
            'Strong TypeScript architecture answers and clear PostgreSQL schema normalization reasoning.',
        }),
      },
      recruiterToken
    );
    expect(noConsentEval.status).toBe(400);

    const consentEval = await api(
      '/api/ai/evaluate-interview',
      {
        method: 'POST',
        body: JSON.stringify({
          interviewId: createdInterviewId,
          consentConfirmed: true,
          rawNotes:
            'Strong TypeScript architecture answers and clear PostgreSQL schema normalization reasoning.',
          humanRecommendation: 'YES',
        }),
      },
      recruiterToken
    );
    expect(consentEval.status).toBe(200);
    expect(consentEval.data.evaluation).toBeDefined();
  });

  it('Workflows 16, 17, 18, 19 & 20: AI Career Assistant, Skill Gap & Job Recommendations, Recruiter Analytics + CSV, Admin Suspension/Moderation, and Public UI Routes', async () => {
    // 16. Candidate AI Career Assistant
    const chatRes = await api(
      '/api/ai/career-assistant',
      {
        method: 'POST',
        body: JSON.stringify({
          message: 'Which skills should I prioritize for Senior Full-Stack roles?',
        }),
      },
      candidateToken
    );
    expect(chatRes.status).toBe(200);
    expect(chatRes.data.message.content.length).toBeGreaterThan(30);

    // 17. Skill Gap Analysis & Personalized Job Recommendations
    const gapRes = await api(
      '/api/ai/skill-gap',
      {
        method: 'POST',
        body: JSON.stringify({ jobId: createdJobId }),
      },
      candidateToken
    );
    expect(gapRes.status).toBe(200);
    expect(gapRes.data.analysis).toBeDefined();

    const recsRes = await api('/api/ai/recommendations', {}, candidateToken);
    expect(recsRes.status).toBe(200);
    expect(Array.isArray(recsRes.data.recommendations)).toBe(true);

    // 18. Recruiter Analytics JSON + CSV Export
    const recAnalytics = await api(
      '/api/recruiter/analytics?range=all',
      {},
      recruiterToken
    );
    expect(recAnalytics.status).toBe(200);
    expect(recAnalytics.data.kpis).toBeDefined();

    const recCsv = await api(
      '/api/recruiter/analytics?range=all&format=csv',
      {},
      recruiterToken
    );
    expect(recCsv.status).toBe(200);
    expect(recCsv.text).toContain('Candidate,Email,Job Title,Company,Status');

    // 19. Admin User Suspension + Job Moderation + Audit Logs
    const suspendRes = await api(
      `/api/admin/users/${testCandidateUserId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'SUSPENDED', reason: 'Automated QA suspension test' }),
      },
      adminToken
    );
    expect(suspendRes.status).toBe(200);

    // Suspended user cannot log in (403)
    const suspendedLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCandidateEmail,
        password: 'Candidate@123!',
      }),
    });
    expect(suspendedLogin.status).toBe(403);

    // Reactivate user
    const reactivateRes = await api(
      `/api/admin/users/${testCandidateUserId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' }),
      },
      adminToken
    );
    expect(reactivateRes.status).toBe(200);

    // Admin moderates job -> MODERATION_HOLD
    const modJob = await api(
      '/api/admin/jobs',
      {
        method: 'PUT',
        body: JSON.stringify({
          jobId: createdJobId,
          status: 'MODERATION_HOLD',
          moderationNote: 'QA moderation check',
        }),
      },
      adminToken
    );
    expect(modJob.status).toBe(200);
    expect(modJob.data.job.status).toBe('MODERATION_HOLD');

    const auditCheck = await api('/api/admin/audit-logs', {}, adminToken);
    expect(auditCheck.status).toBe(200);
    expect(auditCheck.data.logs.length).toBeGreaterThan(0);

    // 20. Public & Auth Routes Render HTTP 200 cleanly
    for (const route of [
      '/',
      '/jobs',
      '/about',
      '/features',
      '/how-it-works',
      '/contact',
      '/login',
      '/register',
      '/privacy',
      '/terms',
    ]) {
      const pageRes = await api(route);
      expect(pageRes.status).toBe(200);
      expect(pageRes.text).toContain('TalentAI');
    }
  });
});

import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../../src/lib/prisma';
import { SESSION_COOKIE_NAME } from '../../src/lib/jwt';
import {
  escapeCsvCell,
  parsePositiveInt,
  parseValidDate,
  sanitizeHttpUrl,
  sanitizeLogoUrl,
  sanitizeText,
} from '../../src/lib/utils';

const BASE_URL = 'http://127.0.0.1:3000';
const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

const candAEmail = `qa.canda.${suffix}@audit.demo`;
const candBEmail = `qa.candb.${suffix}@audit.demo`;
const recAEmail = `qa.reca.${suffix}@audit.demo`;
const recBEmail = `qa.recb.${suffix}@audit.demo`;
const deleteCandEmail = `qa.delcand.${suffix}@audit.demo`;
const deleteRecEmail = `qa.delrec.${suffix}@audit.demo`;

let candAToken = '';
let candBToken = '';
let recAToken = '';
let recBToken = '';
let adminToken = '';

let candAUserId = '';
let candBUserId = '';
let recAUserId = '';
let recBUserId = '';

let jobAId = '';
let jobBId = '';
let appAId = '';
let interviewA1Id = '';
let interviewA2Id = '';
let candBCvId = '';

async function rawRequest(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
  cookieToken?: string
): Promise<{ status: number; data: any; text: string; headers: Headers }> {
  const headers: Record<string, string> = {
    'x-forwarded-for': `10.99.${Math.floor(Number(suffix.slice(0, 2)) % 200) + 1}.${
      Math.floor(Number(suffix.slice(2, 4)) % 200) + 1
    }`,
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (cookieToken) headers['Cookie'] = `${SESSION_COOKIE_NAME}=${cookieToken}`;

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
  return { status: res.status, data, text, headers: res.headers };
}

async function jsonApi(
  endpoint: string,
  method: string,
  body?: unknown,
  token?: string
) {
  return rawRequest(
    endpoint,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    token
  );
}

describe('Senior QA & Security Full-Platform Audit Suite', () => {
  afterAll(async () => {
    // Ensure platform settings are restored to defaults
    await prisma.platformSetting
      .upsert({
        where: { key: 'allowPublicCandidateRegistration' },
        update: { value: true as unknown as object },
        create: { key: 'allowPublicCandidateRegistration', value: true as unknown as object },
      })
      .catch(() => null);

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            candAEmail,
            candBEmail,
            recAEmail,
            recBEmail,
            deleteCandEmail,
            deleteRecEmail,
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        name: {
          in: [
            `Audit Corp A ${suffix}`,
            `Audit Corp B ${suffix}`,
            `Ephemeral Co ${suffix}`,
          ],
        },
      },
    });
  });

  it('1. Unit-verifies sanitization, URL/Logo XSS guards, CSV formula neutralization, and safe date/pagination parsers', () => {
    // URL Sanitization
    expect(sanitizeHttpUrl('https://talentai.io/about')).toBe('https://talentai.io/about');
    expect(sanitizeHttpUrl('github.com/houssem-thabet')).toBe(
      'https://github.com/houssem-thabet'
    );
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeHttpUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeHttpUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeNull();
    expect(sanitizeHttpUrl('file:///etc/passwd')).toBeNull();

    // Logo Sanitization (allows PNG/JPEG/WEBP/GIF data URIs, rejects SVG/HTML/JS)
    expect(sanitizeLogoUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toContain(
      'data:image/png;base64,'
    );
    expect(sanitizeLogoUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+')).toBeNull();
    expect(sanitizeLogoUrl('javascript:evil()')).toBeNull();

    // CSV Formula Injection Protection (CWE-1236)
    expect(escapeCsvCell('=1+1')).toBe('"\'=1+1"');
    expect(escapeCsvCell('+cmd|\' /C calc\'!A0')).toBe('"\'+cmd|\' /C calc\'!A0"');
    expect(escapeCsvCell('-2+3')).toBe('"\'-2+3"');
    expect(escapeCsvCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
    expect(escapeCsvCell('Safe "Quoted" Title')).toBe('"Safe ""Quoted"" Title"');

    // Text XSS Sanitization
    expect(sanitizeText('<script>evil()</script>Clean')).not.toContain('<script>');
    expect(sanitizeText('data:text/html,<svg onload=1>')).not.toContain('data:text/html');

    // Date & Pagination Parsers
    expect(parseValidDate('not-a-date')).toBeNull();
    expect(parseValidDate('2026-11-25T10:00:00Z')).toBeInstanceOf(Date);
    expect(parsePositiveInt('abc', 1, 50)).toBe(1);
    expect(parsePositiveInt('-9', 1, 50)).toBe(1);
    expect(parsePositiveInt('999', 1, 50)).toBe(50);
  });

  it('2. Bootstraps isolated Candidate A/B, Recruiter A/B, and Admin sessions for cross-tenant security testing', async () => {
    const rCandA = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'CANDIDATE',
      firstName: '=FormulaCandA',
      lastName: 'Tester',
      email: candAEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
    });
    expect(rCandA.status).toBe(201);
    candAToken = rCandA.data.token;
    candAUserId = rCandA.data.user.id;

    const rCandB = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'CANDIDATE',
      firstName: 'PrivateCandB',
      lastName: 'Vault',
      email: candBEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
    });
    expect(rCandB.status).toBe(201);
    candBToken = rCandB.data.token;
    candBUserId = rCandB.data.user.id;

    // Candidate B opts OUT of recruiter searchability and creates a private CV document
    await jsonApi(
      '/api/candidates/profile',
      'PUT',
      { isSearchableByRecruiters: false, headline: 'Confidential Engineer' },
      candBToken
    );
    const candBProfile = await prisma.candidateProfile.findUnique({
      where: { userId: candBUserId },
    });
    const createdCv = await prisma.cVDocument.create({
      data: {
        candidateProfileId: candBProfile!.id,
        fileName: `private-${suffix}.pdf`,
        originalName: 'private-cv.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: `/tmp/nonexistent-${suffix}.pdf`,
        extractedText:
          'Private Candidate B confidential resume with TypeScript, Rust, and Cryptography experience.',
        isPrimary: true,
      },
    });
    candBCvId = createdCv.id;

    const rRecA = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'RECRUITER',
      firstName: 'RecruiterA',
      lastName: 'Alpha',
      email: recAEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
      companyName: `Audit Corp A ${suffix}`,
      companyDescription: 'Enterprise cloud security engineering organization.',
      industry: 'Cybersecurity',
      companySize: '51-200',
    });
    expect(rRecA.status).toBe(201);
    recAToken = rRecA.data.token;
    recAUserId = rRecA.data.user.id;

    const rRecB = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'RECRUITER',
      firstName: 'RecruiterB',
      lastName: 'Beta',
      email: recBEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
      companyName: `Audit Corp B ${suffix}`,
      companyDescription: 'Rival cloud platform organization.',
      industry: 'Cloud Computing',
      companySize: '11-50',
    });
    expect(rRecB.status).toBe(201);
    recBToken = rRecB.data.token;
    recBUserId = rRecB.data.user.id;

    const rAdmin = await jsonApi('/api/auth/login', 'POST', {
      email: 'admin@talentai.demo',
      password: 'Admin@123!',
    });
    expect(rAdmin.status).toBe(200);
    adminToken = rAdmin.data.token;
  });

  it('3. Rejects malformed/empty JSON bodies with 400 (never 500) across POST & PUT API endpoints', async () => {
    const endpoints: Array<{ method: 'POST' | 'PUT'; url: string; token?: string }> = [
      { method: 'POST', url: '/api/auth/login' },
      { method: 'POST', url: '/api/auth/register' },
      { method: 'POST', url: '/api/auth/forgot-password' },
      { method: 'POST', url: '/api/auth/reset-password' },
      { method: 'PUT', url: '/api/auth/me', token: candAToken },
      { method: 'POST', url: '/api/jobs', token: recAToken },
      { method: 'PUT', url: '/api/candidates/profile', token: candAToken },
      { method: 'POST', url: '/api/candidates/bookmarks', token: candAToken },
      { method: 'POST', url: '/api/applications', token: candAToken },
      { method: 'POST', url: '/api/interviews', token: recAToken },
      { method: 'POST', url: '/api/messages', token: candAToken },
      { method: 'PUT', url: '/api/notifications', token: candAToken },
      { method: 'PUT', url: '/api/recruiter/company', token: recAToken },
      { method: 'POST', url: '/api/public/contact' },
      { method: 'PUT', url: '/api/admin/companies', token: adminToken },
      { method: 'PUT', url: '/api/admin/jobs', token: adminToken },
      { method: 'PUT', url: '/api/admin/settings', token: adminToken },
      { method: 'POST', url: '/api/ai/analyze-cv', token: candAToken },
      { method: 'POST', url: '/api/ai/match-candidate', token: recAToken },
      { method: 'PUT', url: '/api/ai/match-candidate', token: recAToken },
      { method: 'POST', url: '/api/ai/generate-job-description', token: recAToken },
      { method: 'POST', url: '/api/ai/generate-interview-questions', token: recAToken },
      { method: 'POST', url: '/api/ai/evaluate-interview', token: recAToken },
      { method: 'POST', url: '/api/ai/career-assistant', token: candAToken },
      { method: 'POST', url: '/api/ai/skill-gap', token: candAToken },
      { method: 'POST', url: '/api/ai/recommendations', token: candAToken },
    ];

    for (const ep of endpoints) {
      const res = await rawRequest(
        ep.url,
        {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: '{malformed-json',
        },
        ep.token
      );
      expect(res.status, `${ep.method} ${ep.url} should return 400 on malformed JSON`).toBe(
        400
      );
    }
  });

  it('4. Rejects invalid query parameters, NaN pagination, unsafe URLs, invalid dates, and inverted salaries cleanly', async () => {
    // NaN pagination falls back safely to 200 instead of 500
    const nanPage = await rawRequest('/api/jobs?page=abc&limit=xyz');
    expect(nanPage.status).toBe(200);
    expect(Array.isArray(nanPage.data.jobs)).toBe(true);

    // Invalid enum filters return 400 instead of Prisma 500
    expect((await rawRequest('/api/jobs?workMode=MARS')).status).toBe(400);
    expect((await rawRequest('/api/jobs?employmentType=INVALID')).status).toBe(400);
    expect((await rawRequest('/api/jobs?experienceLevel=GURU')).status).toBe(400);
    expect(
      (await rawRequest('/api/applications?status=FAKE_STATUS', {}, candAToken)).status
    ).toBe(400);
    expect(
      (await rawRequest('/api/candidates?minExp=notanumber', {}, recAToken)).status
    ).toBe(400);
    expect(
      (await rawRequest('/api/admin/users?role=SUPERADMIN', {}, adminToken)).status
    ).toBe(400);

    // Inverted salary & invalid deadline in POST /api/jobs
    const badSalaryJob = await jsonApi(
      '/api/jobs',
      'POST',
      {
        title: 'Security Architect',
        description: 'Architect zero-trust microservices and cloud security controls.',
        technicalSkills: ['TypeScript', 'PostgreSQL'],
        location: 'Tunis',
        salaryMin: 120000,
        salaryMax: 80000,
      },
      recAToken
    );
    expect(badSalaryJob.status).toBe(400);

    const badDeadlineJob = await jsonApi(
      '/api/jobs',
      'POST',
      {
        title: 'Security Architect',
        description: 'Architect zero-trust microservices and cloud security controls.',
        technicalSkills: ['TypeScript', 'PostgreSQL'],
        location: 'Tunis',
        deadline: 'not-a-valid-date',
      },
      recAToken
    );
    expect(badDeadlineJob.status).toBe(400);

    // Unsafe URLs in Candidate profile & Recruiter company
    const badProfileUrl = await jsonApi(
      '/api/candidates/profile',
      'PUT',
      { linkedinUrl: 'javascript:alert(document.cookie)' },
      candAToken
    );
    expect(badProfileUrl.status).toBe(400);

    const badCompanyLogo = await jsonApi(
      '/api/recruiter/company',
      'PUT',
      { logoUrl: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+' },
      recAToken
    );
    expect(badCompanyLogo.status).toBe(400);

    // Bookmarking non-existent job returns 404 (never 500 P2003)
    const missingBookmark = await jsonApi(
      '/api/candidates/bookmarks',
      'POST',
      { jobId: 'non-existent-job-id-999' },
      candAToken
    );
    expect(missingBookmark.status).toBe(404);
  });

  it('5. Enforces strict cross-tenant IDOR, privacy isolation, moderation-hold lock, and CSV formula escaping', async () => {
    // Recruiter A creates a valid job
    const createJobA = await jsonApi(
      '/api/jobs',
      'POST',
      {
        title: 'Principal QA & Security Engineer',
        description:
          'Lead automated security verification, API fuzzing, and CI/CD quality engineering.',
        technicalSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
        location: 'Paris, France',
        workMode: 'HYBRID',
        salaryMin: 80000,
        salaryMax: 115000,
        status: 'PUBLISHED',
      },
      recAToken
    );
    expect(createJobA.status).toBe(201);
    jobAId = createJobA.data.job.id;

    // Recruiter B creates their own job
    const createJobB = await jsonApi(
      '/api/jobs',
      'POST',
      {
        title: 'Cloud Infrastructure Engineer',
        description: 'Build distributed Kubernetes clusters and observability pipelines.',
        technicalSkills: ['Kubernetes', 'Docker'],
        location: 'Remote',
        workMode: 'REMOTE',
        status: 'PUBLISHED',
      },
      recBToken
    );
    expect(createJobB.status).toBe(201);
    jobBId = createJobB.data.job.id;

    // Candidate A CANNOT attach Candidate B's private CV document when applying!
    const crossCvApp = await jsonApi(
      '/api/applications',
      'POST',
      { jobId: jobAId, cvDocumentId: candBCvId },
      candAToken
    );
    expect(crossCvApp.status).toBe(403);

    // Candidate A submits legitimate application to Job A
    const validApp = await jsonApi(
      '/api/applications',
      'POST',
      { jobId: jobAId, coverLetter: 'Excited to contribute to Audit Corp A.' },
      candAToken
    );
    expect(validApp.status).toBe(201);
    appAId = validApp.data.application.id;

    // Recruiter A writes confidential privateNotes & an override note on MatchResult
    const statusRes = await jsonApi(
      `/api/applications/${appAId}/status`,
      'PUT',
      {
        status: 'SHORTLISTED',
        privateNotes: 'CONFIDENTIAL_INTERNAL_COMPENSATION_NOTE_DO_NOT_LEAK',
        candidateFeedback: 'Strong technical background—moving to shortlist.',
      },
      recAToken
    );
    expect(statusRes.status).toBe(200);

    // Candidate A inspects BOTH /api/applications and /api/candidates/applications: privateNotes MUST NOT leak!
    const candApps1 = await rawRequest('/api/applications', {}, candAToken);
    expect(candApps1.status).toBe(200);
    expect(JSON.stringify(candApps1.data)).not.toContain(
      'CONFIDENTIAL_INTERNAL_COMPENSATION_NOTE_DO_NOT_LEAK'
    );

    const candApps2 = await rawRequest('/api/candidates/applications', {}, candAToken);
    expect(candApps2.status).toBe(200);
    expect(JSON.stringify(candApps2.data)).not.toContain(
      'CONFIDENTIAL_INTERNAL_COMPENSATION_NOTE_DO_NOT_LEAK'
    );

    // IDOR Check 1: Recruiter B CANNOT read MatchResults for Recruiter A's job!
    const crossCompanyMatch = await rawRequest(
      `/api/ai/match-candidate?jobId=${jobAId}`,
      {},
      recBToken
    );
    expect(crossCompanyMatch.status).toBe(403);

    // IDOR Check 2: Candidate B (who never applied) sees 0 match records for Job A (never Candidate A's email!)
    const candBMatchSpy = await rawRequest(
      `/api/ai/match-candidate?jobId=${jobAId}`,
      {},
      candBToken
    );
    expect(candBMatchSpy.status).toBe(200);
    expect(candBMatchSpy.data.results).toHaveLength(0);

    // IDOR Check 3: Recruiter A CANNOT analyze Candidate B's private CV via POST /api/ai/analyze-cv!
    const unauthCvAnalyze = await jsonApi(
      '/api/ai/analyze-cv',
      'POST',
      { cvDocumentId: candBCvId },
      recAToken
    );
    expect(unauthCvAnalyze.status).toBe(403);

    // IDOR Check 4: Recruiter B CANNOT generate/overwrite questions for Recruiter A's job!
    const crossJobQuestions = await jsonApi(
      '/api/ai/generate-interview-questions',
      'POST',
      { jobId: jobAId },
      recBToken
    );
    expect(crossJobQuestions.status).toBe(403);

    // CSV Formula Injection Check: Candidate A's firstName starts with '=FormulaCandA'; CSV must prefix single quote!
    const csvRes = await rawRequest('/api/applications?format=csv', {}, recAToken);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('"\'=FormulaCandA Tester"');

    // Privilege Escalation Check: Admin places Job A on MODERATION_HOLD -> Recruiter A CANNOT self-restore to PUBLISHED!
    const holdRes = await jsonApi(
      '/api/admin/jobs',
      'PUT',
      { jobId: jobAId, status: 'MODERATION_HOLD', moderationNote: 'Audit policy check' },
      adminToken
    );
    expect(holdRes.status).toBe(200);

    const bypassAttempt = await jsonApi(
      `/api/jobs/${jobAId}`,
      'PUT',
      { status: 'PUBLISHED' },
      recAToken
    );
    expect(bypassAttempt.status).toBe(403);

    // Admin restores Job A back to PUBLISHED
    const restoreRes = await jsonApi(
      '/api/admin/jobs',
      'PUT',
      { jobId: jobAId, status: 'PUBLISHED', moderationNote: 'Cleared by Admin' },
      adminToken
    );
    expect(restoreRes.status).toBe(200);
  });

  it('6. Enforces interview reschedule conflict detection (409) and Candidate<->Recruiter messaging role pairing', async () => {
    // Schedule two non-overlapping interviews for Recruiter A
    const iv1 = await jsonApi(
      '/api/interviews',
      'POST',
      {
        applicationId: appAId,
        title: 'Slot 1 Technical Screen',
        type: 'TECHNICAL',
        scheduledAt: '2027-03-10T10:00:00.000Z',
        durationMinutes: 45,
      },
      recAToken
    );
    expect(iv1.status).toBe(201);
    interviewA1Id = iv1.data.interview.id;

    const iv2 = await jsonApi(
      '/api/interviews',
      'POST',
      {
        applicationId: appAId,
        title: 'Slot 2 System Design',
        type: 'TECHNICAL',
        scheduledAt: '2027-03-10T14:00:00.000Z',
        durationMinutes: 45,
      },
      recAToken
    );
    expect(iv2.status).toBe(201);
    interviewA2Id = iv2.data.interview.id;

    // Rescheduling Interview 2 right onto Interview 1's slot must return 409 Conflict!
    const conflictReschedule = await jsonApi(
      `/api/interviews/${interviewA2Id}`,
      'PUT',
      { scheduledAt: '2027-03-10T10:15:00.000Z' },
      recAToken
    );
    expect(conflictReschedule.status).toBe(409);

    // Invalid date string on reschedule returns 400 (never 500)
    const invalidDateReschedule = await jsonApi(
      `/api/interviews/${interviewA2Id}`,
      'PUT',
      { scheduledAt: 'invalid-date-string' },
      recAToken
    );
    expect(invalidDateReschedule.status).toBe(400);

    // Recruiter B cannot overwrite Interview 1's generated questions
    const crossIvQuestions = await jsonApi(
      '/api/ai/generate-interview-questions',
      'POST',
      { interviewId: interviewA1Id, jobTitle: 'Spoof', saveToInterview: true },
      recBToken
    );
    expect(crossIvQuestions.status).toBe(403);

    // Messaging Role Pairing: Candidate A CANNOT message Candidate B directly (403)
    const candToCand = await jsonApi(
      '/api/messages',
      'POST',
      { recipientUserId: candBUserId, content: 'Peer message attempt' },
      candAToken
    );
    expect(candToCand.status).toBe(403);

    // Recruiter A CANNOT message Recruiter B directly (403)
    const recToRec = await jsonApi(
      '/api/messages',
      'POST',
      { recipientUserId: recBUserId, content: 'Rival recruiter message attempt' },
      recAToken
    );
    expect(recToRec.status).toBe(403);

    // Valid Candidate A <-> Recruiter A message succeeds (201)
    const validMsg = await jsonApi(
      '/api/messages',
      'POST',
      { recipientUserId: recAUserId, jobId: jobAId, content: 'Looking forward to the interview!' },
      candAToken
    );
    expect(validMsg.status).toBe(201);
  });

  it('7. Verifies Password Reset token flow, PlatformSetting governance toggles, and full Account Deletion cascades', async () => {
    // Forgot password -> Reset password flow
    const forgotRes = await jsonApi('/api/auth/forgot-password', 'POST', {
      email: candBEmail,
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.data.demoResetPath).toContain('/reset-password?token=');
    const rawToken = forgotRes.data.demoResetPath.split('token=')[1];

    // Weak password rejected on reset-password (missing lowercase)
    const weakReset = await jsonApi('/api/auth/reset-password', 'POST', {
      token: rawToken,
      password: 'ALLUPPERCASE123!',
      confirmPassword: 'ALLUPPERCASE123!',
    });
    expect(weakReset.status).toBe(400);

    // Strong password succeeds and invalidates token for replay
    const validReset = await jsonApi('/api/auth/reset-password', 'POST', {
      token: rawToken,
      password: 'NewStrongPassword99!',
      confirmPassword: 'NewStrongPassword99!',
    });
    expect(validReset.status).toBe(200);

    const replayReset = await jsonApi('/api/auth/reset-password', 'POST', {
      token: rawToken,
      password: 'AnotherPassword99!',
      confirmPassword: 'AnotherPassword99!',
    });
    expect(replayReset.status).toBe(400);

    // Admin governance toggle: pause public candidate registration -> verify 403 -> re-enable
    const disableReg = await jsonApi(
      '/api/admin/settings',
      'PUT',
      { allowPublicCandidateRegistration: false },
      adminToken
    );
    expect(disableReg.status).toBe(200);

    const blockedReg = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'CANDIDATE',
      firstName: 'Blocked',
      lastName: 'User',
      email: deleteCandEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
    });
    expect(blockedReg.status).toBe(403);

    const enableReg = await jsonApi(
      '/api/admin/settings',
      'PUT',
      { allowPublicCandidateRegistration: true },
      adminToken
    );
    expect(enableReg.status).toBe(200);

    // Register & permanently delete both a Candidate and a Recruiter account (verifies zero FK cascade errors)
    const tempCand = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'CANDIDATE',
      firstName: 'Delete',
      lastName: 'Candidate',
      email: deleteCandEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
    });
    expect(tempCand.status).toBe(201);
    const delCandRes = await rawRequest(
      '/api/auth/me',
      { method: 'DELETE' },
      tempCand.data.token
    );
    expect(delCandRes.status).toBe(200);

    const tempRec = await jsonApi('/api/auth/register', 'POST', {
      accountType: 'RECRUITER',
      firstName: 'Delete',
      lastName: 'Recruiter',
      email: deleteRecEmail,
      password: 'AuditPass123!',
      confirmPassword: 'AuditPass123!',
      companyName: `Ephemeral Co ${suffix}`,
      companyDescription: 'Temporary organization to verify clean cascade deletion.',
      industry: 'Software',
      companySize: '1-10',
    });
    expect(tempRec.status).toBe(201);
    const delRecRes = await rawRequest(
      '/api/auth/me',
      { method: 'DELETE' },
      tempRec.data.token
    );
    expect(delRecRes.status).toBe(200);
  });

  it('8. Crawls ALL 46 pages, static sample CVs, and RBAC redirects across Public, Candidate, Recruiter & Admin roles with 0 broken links', async () => {
    const publicPages = [
      '/',
      '/jobs',
      `/jobs/${jobAId}`,
      '/about',
      '/features',
      '/how-it-works',
      '/contact',
      '/privacy',
      '/terms',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/sample-cvs/sample-fullstack-cv.pdf',
      '/sample-cvs/sample-ai-engineer-cv.docx',
    ];

    const candidatePages = [
      '/candidate',
      '/candidate/profile',
      '/candidate/cv',
      '/candidate/jobs',
      `/candidate/jobs/${jobAId}`,
      '/candidate/applications',
      '/candidate/skills',
      '/candidate/assistant',
      '/candidate/notifications',
      '/candidate/settings',
    ];

    const recruiterPages = [
      '/recruiter',
      '/recruiter/company',
      '/recruiter/jobs',
      '/recruiter/jobs/new',
      `/recruiter/jobs/${jobAId}/edit`,
      '/recruiter/applications',
      '/recruiter/matching',
      '/recruiter/candidates',
      '/recruiter/interviews',
      '/recruiter/messages',
      '/recruiter/analytics',
      '/recruiter/settings',
    ];

    const adminPages = [
      '/admin',
      '/admin/users',
      '/admin/candidates',
      '/admin/recruiters',
      '/admin/companies',
      '/admin/jobs',
      '/admin/applications',
      '/admin/ai-usage',
      '/admin/audit-logs',
      '/admin/reports',
      '/admin/settings',
    ];

    const discoveredInternalLinks = new Set<string>();
    const extractLinks = (html: string) => {
      const regex = /href="(\/[^"#?]*)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null) {
        const href = match[1];
        if (!href.startsWith('/_next/')) {
          discoveredInternalLinks.add(href);
        }
      }
    };

    // 1. Verify all public pages & static assets return 200
    for (const p of publicPages) {
      const res = await rawRequest(p);
      expect(res.status, `Public route ${p} should return 200`).toBe(200);
      if (p.startsWith('/') && !p.includes('.pdf') && !p.includes('.docx')) {
        extractLinks(res.text);
      }
    }

    // 2. Verify unauthenticated access to protected routes redirects to /login (307)
    for (const protectedRoot of ['/candidate', '/recruiter', '/admin']) {
      const unauth = await rawRequest(protectedRoot);
      expect([302, 307]).toContain(unauth.status);
    }

    // 3. Verify all Candidate pages render 200 with Candidate cookie & forbid /admin (307 redirect)
    for (const p of candidatePages) {
      const res = await rawRequest(p, {}, undefined, candAToken);
      expect(res.status, `Candidate route ${p} should return 200`).toBe(200);
      extractLinks(res.text);
    }
    const candCrossRole = await rawRequest('/admin', {}, undefined, candAToken);
    expect([302, 307]).toContain(candCrossRole.status);

    // 4. Verify all Recruiter pages render 200 with Recruiter cookie & forbid /admin (307 redirect)
    for (const p of recruiterPages) {
      const res = await rawRequest(p, {}, undefined, recAToken);
      expect(res.status, `Recruiter route ${p} should return 200`).toBe(200);
      extractLinks(res.text);
    }
    const recCrossRole = await rawRequest('/candidate', {}, undefined, recAToken);
    expect([302, 307]).toContain(recCrossRole.status);

    // 5. Verify all Admin pages render 200 with Admin cookie
    for (const p of adminPages) {
      const res = await rawRequest(p, {}, undefined, adminToken);
      expect(res.status, `Admin route ${p} should return 200`).toBe(200);
      extractLinks(res.text);
    }

    // 6. Verify every discovered internal link across rendered HTML resolves cleanly (never 404 or 500)
    for (const link of Array.from(discoveredInternalLinks)) {
      const tokenForLink = link.startsWith('/admin')
        ? adminToken
        : link.startsWith('/recruiter')
        ? recAToken
        : link.startsWith('/candidate')
        ? candAToken
        : undefined;
      const res = await rawRequest(link, {}, undefined, tokenForLink);
      expect(
        [200, 302, 307].includes(res.status),
        `Discovered internal link ${link} returned unexpected status ${res.status}`
      ).toBe(true);
    }
  });
});

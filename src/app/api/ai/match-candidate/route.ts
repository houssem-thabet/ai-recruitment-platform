import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { computeCandidateJobMatch, MatchWeights } from '@/lib/ai/engine';
import { logAIUsage, logAudit } from '@/lib/audit';
import { sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { getPlatformSettings } from '@/lib/platform-settings';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER', 'CANDIDATE', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId query param is required' }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, companyId: true, status: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  // Enforce strict RBAC / tenant isolation on match results
  if (auth.user.role === 'RECRUITER' && job.companyId !== auth.user.companyId) {
    return NextResponse.json(
      { error: 'Forbidden: You can only view match rankings for your own company jobs.' },
      { status: 403 }
    );
  }

  const where: Prisma.MatchResultWhereInput = {
    jobId,
    ...(auth.user.role === 'CANDIDATE'
      ? { candidateProfileId: auth.user.candidateProfileId! }
      : {}),
  };

  const results = await prisma.matchResult.findMany({
    where,
    include: {
      candidateProfile: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          skills: { include: { skill: true } },
          experiences: { take: 2 },
          educations: { take: 1 },
        },
      },
    },
    orderBy: { overallScore: 'desc' },
  });

  // Strip internal recruiter override notes when a Candidate views their own match record
  const safeResults =
    auth.user.role === 'CANDIDATE'
      ? results.map((r) => ({
          ...r,
          recruiterOverrideScore: undefined,
          recruiterOverrideNote: undefined,
        }))
      : results;

  return NextResponse.json({ results: safeResults });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER', 'CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const { jobId, candidateProfileId, weights, scope } = body as {
      jobId: string;
      candidateProfileId?: string;
      weights?: Partial<MatchWeights>;
      scope?: 'applicants' | 'all_searchable';
    };

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: { include: { skill: true } } },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    if (auth.user.role === 'RECRUITER' && job.companyId !== auth.user.companyId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    let targetCandidateIds: string[] = [];
    if (auth.user.role === 'CANDIDATE') {
      targetCandidateIds = [auth.user.candidateProfileId!];
    } else if (candidateProfileId) {
      targetCandidateIds = [candidateProfileId];
    } else if (scope === 'all_searchable') {
      const cands = await prisma.candidateProfile.findMany({
        where: { isSearchableByRecruiters: true, user: { status: 'ACTIVE' } },
        select: { id: true },
        take: 25,
      });
      targetCandidateIds = cands.map((c) => c.id);
    } else {
      const apps = await prisma.application.findMany({
        where: { jobId },
        select: { candidateProfileId: true },
      });
      if (apps.length > 0) {
        targetCandidateIds = apps.map((a) => a.candidateProfileId);
      } else {
        const cands = await prisma.candidateProfile.findMany({
          where: { isSearchableByRecruiters: true, user: { status: 'ACTIVE' } },
          select: { id: true },
          take: 15,
        });
        targetCandidateIds = cands.map((c) => c.id);
      }
    }

    const candidates = await prisma.candidateProfile.findMany({
      where: { id: { in: targetCandidateIds } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        skills: { include: { skill: true } },
        educations: true,
        experiences: true,
        certifications: true,
        projects: true,
        cvDocuments: { where: { isPrimary: true }, take: 1 },
      },
    });

    const savedResults = [];
    let totalLatency = 0;
    let totalTokens = 0;
    let activeMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP' = 'DETERMINISTIC_NLP';
    let modelName = 'talentai-deterministic-nlp-v1';

    for (const c of candidates) {
      const langs = Array.isArray(c.languages)
        ? (c.languages as Array<{ name?: string }>).map((l) => l?.name || '').filter(Boolean)
        : ['English'];

      const matchRun = await computeCandidateJobMatch(
        {
          fullName: `${c.user.firstName} ${c.user.lastName}`,
          headline: c.headline,
          bio: c.bio,
          yearsOfExperience: c.yearsOfExperience,
          location: c.location,
          remotePreference: c.remotePreference,
          skills: c.skills.map((s) => s.skill.name),
          educations: c.educations,
          experiences: c.experiences,
          certifications: c.certifications,
          projects: c.projects,
          languages: langs,
          cvText: c.cvDocuments[0]?.extractedText ?? null,
        },
        {
          title: job.title,
          description: job.description,
          responsibilities: job.responsibilities,
          qualifications: job.qualifications,
          requiredSkills: job.skills.filter((s) => s.isRequired).map((s) => s.skill.name),
          softSkills: job.softSkills,
          minYearsExperience: job.minYearsExperience,
          educationRequirement: job.educationRequirement,
          location: job.location,
          workMode: job.workMode,
          requiredLanguages: job.requiredLanguages,
        },
        weights
      );

      totalLatency += matchRun.latencyMs;
      totalTokens += matchRun.tokensEstimated;
      activeMode = matchRun.result.aiMode;
      modelName = matchRun.result.modelName;

      const record = await prisma.matchResult.upsert({
        where: {
          jobId_candidateProfileId: {
            jobId: job.id,
            candidateProfileId: c.id,
          },
        },
        update: {
          overallScore: matchRun.result.overallScore,
          skillScore: matchRun.result.skillScore,
          experienceScore: matchRun.result.experienceScore,
          educationScore: matchRun.result.educationScore,
          responsibilityScore: matchRun.result.responsibilityScore,
          languageScore: matchRun.result.languageScore,
          weightsUsed: matchRun.result.weightsUsed as unknown as Prisma.InputJsonValue,
          matchingSkills: matchRun.result.matchingSkills,
          missingSkills: matchRun.result.missingSkills,
          relevantExperience: matchRun.result.relevantExperience,
          matchingQualifications: matchRun.result.matchingQualifications,
          explanation: matchRun.result.explanation,
          verificationAreas: matchRun.result.verificationAreas,
          aiMode: matchRun.result.aiMode,
        },
        create: {
          jobId: job.id,
          candidateProfileId: c.id,
          overallScore: matchRun.result.overallScore,
          skillScore: matchRun.result.skillScore,
          experienceScore: matchRun.result.experienceScore,
          educationScore: matchRun.result.educationScore,
          responsibilityScore: matchRun.result.responsibilityScore,
          languageScore: matchRun.result.languageScore,
          weightsUsed: matchRun.result.weightsUsed as unknown as Prisma.InputJsonValue,
          matchingSkills: matchRun.result.matchingSkills,
          missingSkills: matchRun.result.missingSkills,
          relevantExperience: matchRun.result.relevantExperience,
          matchingQualifications: matchRun.result.matchingQualifications,
          explanation: matchRun.result.explanation,
          verificationAreas: matchRun.result.verificationAreas,
          aiMode: matchRun.result.aiMode,
        },
        include: {
          candidateProfile: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
              skills: { include: { skill: true } },
              experiences: { take: 2 },
              educations: { take: 1 },
            },
          },
        },
      });
      savedResults.push(record);
    }

    if (candidates.length > 0) {
      await logAIUsage({
        userId: auth.user.id,
        feature: 'CANDIDATE_MATCHING',
        mode: activeMode,
        modelName,
        latencyMs: totalLatency,
        tokensEstimated: totalTokens,
      });
    }

    savedResults.sort(
      (a, b) =>
        (b.recruiterOverrideScore ?? b.overallScore) -
        (a.recruiterOverrideScore ?? a.overallScore)
    );

    return NextResponse.json({
      disclaimer:
        'Compatibility scores (0–100) are explainable decision-support estimates based on job-relevant skills and experience. Protected attributes are never used, and recruiters can review or override any score.',
      results: savedResults,
    });
  } catch (err) {
    console.error('[POST /api/ai/match-candidate]', err);
    return NextResponse.json({ error: 'Matching engine error.' }, { status: 500 });
  }
}

/**
 * Allows recruiters to review and manually override AI compatibility recommendations (Part 6 Feature 2).
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const { matchResultId, overrideScore, overrideNote } = json.data;
    if (!matchResultId || typeof matchResultId !== 'string') {
      return NextResponse.json({ error: 'matchResultId is required.' }, { status: 400 });
    }
    const existing = await prisma.matchResult.findUnique({
      where: { id: matchResultId },
      include: { job: true },
    });

    if (!existing || existing.job.companyId !== auth.user.companyId) {
      return NextResponse.json({ error: 'Match record not found or unauthorized' }, { status: 404 });
    }

    const updated = await prisma.matchResult.update({
      where: { id: existing.id },
      data: {
        recruiterOverrideScore:
          overrideScore !== null && overrideScore !== undefined && overrideScore !== ''
            ? Math.min(100, Math.max(0, Math.round(Number(overrideScore))))
            : null,
        recruiterOverrideNote: overrideNote ? sanitizeText(overrideNote) : null,
        reviewedByRecruiter: true,
      },
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'MATCH_SCORE_REVIEWED_OR_OVERRIDDEN',
      entityType: 'MatchResult',
      entityId: existing.id,
      details: {
        aiScore: existing.overallScore,
        recruiterOverrideScore: updated.recruiterOverrideScore,
      },
    });

    return NextResponse.json({
      message: 'Recruiter review & override saved.',
      matchResult: updated,
    });
  } catch (err) {
    console.error('[PUT /api/ai/match-candidate]', err);
    return NextResponse.json({ error: 'Unable to save override.' }, { status: 500 });
  }
}

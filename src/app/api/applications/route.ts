import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { applicationCreateSchema, parseJsonBody } from '@/lib/validators';
import { escapeCsvCell, sanitizeText } from '@/lib/utils';
import { computeCandidateJobMatch } from '@/lib/ai/engine';
import { createNotification, logAudit, logAIUsage } from '@/lib/audit';
import { ApplicationStatus, Prisma } from '@prisma/client';

const VALID_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || undefined;
  const status = searchParams.get('status') || undefined;
  const search = (searchParams.get('q') || '').trim();
  const sort = searchParams.get('sort') || 'recent';
  const format = searchParams.get('format');

  if (status && !VALID_APPLICATION_STATUSES.has(status as ApplicationStatus)) {
    return NextResponse.json({ error: 'Invalid application status filter.' }, { status: 400 });
  }

  if (auth.user.role === 'CANDIDATE') {
    const applications = await prisma.application.findMany({
      where: {
        candidateProfileId: auth.user.candidateProfileId!,
        ...(status ? { status: status as ApplicationStatus } : {}),
      },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true, logoUrl: true, location: true } },
            recruiter: { select: { userId: true } },
            skills: { include: { skill: true } },
          },
        },
        interviews: { orderBy: { scheduledAt: 'asc' } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    // Exclude recruiter privateNotes from candidate response!
    const safeApps = applications.map((a) => ({
      ...a,
      privateNotes: undefined,
    }));

    return NextResponse.json({ applications: safeApps });
  }

  // Recruiter or Admin view
  const where: Prisma.ApplicationWhereInput = {
    ...(auth.user.role === 'RECRUITER' && auth.user.companyId
      ? { job: { companyId: auth.user.companyId } }
      : {}),
    ...(jobId ? { jobId } : {}),
    ...(status ? { status: status as ApplicationStatus } : {}),
    ...(search
      ? {
          OR: [
            {
              candidateProfile: {
                user: { firstName: { contains: search, mode: 'insensitive' } },
              },
            },
            {
              candidateProfile: {
                user: { lastName: { contains: search, mode: 'insensitive' } },
              },
            },
            { job: { title: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const applications = await prisma.application.findMany({
    where,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          location: true,
          workMode: true,
          company: { select: { id: true, name: true } },
          skills: { include: { skill: true } },
        },
      },
      candidateProfile: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          skills: { include: { skill: true } },
          educations: true,
          experiences: true,
          // Admin monitoring does NOT expose confidential CV documents automatically
          cvDocuments:
            auth.user.role === 'RECRUITER'
              ? {
                  where: { isPrimary: true },
                  select: { id: true, originalName: true, analysis: true },
                }
              : false,
        },
      },
      interviews: {
        include: { evaluation: true },
        orderBy: { scheduledAt: 'asc' },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });

  // Attach corresponding MatchResult for each application
  const matchPairs =
    applications.length > 0
      ? await prisma.matchResult.findMany({
          where: {
            OR: applications.map((a) => ({
              jobId: a.jobId,
              candidateProfileId: a.candidateProfileId,
            })),
          },
        })
      : [];
  const matchMap = new Map(
    matchPairs.map((m) => [`${m.jobId}:${m.candidateProfileId}`, m])
  );

  const enriched = applications.map((a) => ({
    ...a,
    matchResult: matchMap.get(`${a.jobId}:${a.candidateProfileId}`) || null,
  }));

  if (sort === 'score_desc') {
    enriched.sort((a, b) => {
      const sA = a.matchResult?.recruiterOverrideScore ?? a.matchResult?.overallScore ?? 0;
      const sB = a.matchResult?.recruiterOverrideScore ?? b.matchResult?.overallScore ?? 0;
      const bVal = b.matchResult?.recruiterOverrideScore ?? b.matchResult?.overallScore ?? 0;
      return bVal - sA;
    });
  }

  if (format === 'csv' && auth.user.role === 'RECRUITER') {
    const header =
      'Candidate Name,Email,Job Title,Status,Compatibility Score,Matching Skills,Applied Date\n';
    const rows = enriched
      .map((a) => {
        const score =
          a.matchResult?.recruiterOverrideScore ?? a.matchResult?.overallScore ?? 'N/A';
        return [
          escapeCsvCell(`${a.candidateProfile.user.firstName} ${a.candidateProfile.user.lastName}`),
          escapeCsvCell(a.candidateProfile.user.email),
          escapeCsvCell(a.job.title),
          escapeCsvCell(a.status),
          escapeCsvCell(score),
          escapeCsvCell((a.matchResult?.matchingSkills || []).join('; ')),
          escapeCsvCell(new Date(a.appliedAt).toISOString().split('T')[0]),
        ].join(',');
      })
      .join('\n');

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="talentai-applicants-export.csv"',
      },
    });
  }

  return NextResponse.json({ applications: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const parsed = applicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid application input' },
        { status: 400 }
      );
    }

    const candidateProfileId = auth.user.candidateProfileId!;
    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        company: true,
        recruiter: true,
        skills: { include: { skill: true } },
      },
    });

    if (!job || job.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'This job is no longer accepting new applications.' },
        { status: 400 }
      );
    }

    if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'The application deadline for this position has passed.' },
        { status: 400 }
      );
    }

    const duplicate = await prisma.application.findUnique({
      where: {
        jobId_candidateProfileId: {
          jobId: job.id,
          candidateProfileId,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'You have already submitted an application for this position.' },
        { status: 409 }
      );
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { id: candidateProfileId },
      include: {
        skills: { include: { skill: true } },
        educations: true,
        experiences: true,
        certifications: true,
        projects: true,
        cvDocuments: { orderBy: { isPrimary: 'desc' }, take: 1 },
      },
    });

    let cvId: string | null = profile?.cvDocuments[0]?.id || null;
    if (parsed.data.cvDocumentId) {
      const ownedCv = await prisma.cVDocument.findFirst({
        where: {
          id: parsed.data.cvDocumentId,
          candidateProfileId,
        },
        select: { id: true },
      });
      if (!ownedCv) {
        return NextResponse.json(
          { error: 'Forbidden: Invalid or unauthorized CV document selection.' },
          { status: 403 }
        );
      }
      cvId = ownedCv.id;
    }

    const application = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateProfileId,
        cvDocumentId: cvId,
        coverLetter: parsed.data.coverLetter
          ? sanitizeText(parsed.data.coverLetter)
          : null,
        status: 'SUBMITTED',
        statusHistory: [
          {
            status: 'SUBMITTED',
            changedAt: new Date().toISOString(),
            changedBy: `${auth.user.firstName} ${auth.user.lastName}`,
            note: 'Application submitted via TalentAI.',
          },
        ],
      },
    });

    // Compute & persist transparent MatchResult decision-support record
    if (profile) {
      const langs = Array.isArray(profile.languages)
        ? (profile.languages as Array<{ name?: string }>).map((l) => l?.name || '').filter(Boolean)
        : ['English'];
      const matchRun = await computeCandidateJobMatch(
        {
          fullName: `${auth.user.firstName} ${auth.user.lastName}`,
          headline: profile.headline,
          bio: profile.bio,
          yearsOfExperience: profile.yearsOfExperience,
          location: profile.location,
          remotePreference: profile.remotePreference,
          skills: profile.skills.map((s) => s.skill.name),
          educations: profile.educations,
          experiences: profile.experiences,
          certifications: profile.certifications,
          projects: profile.projects,
          languages: langs,
          cvText: profile.cvDocuments[0]?.extractedText ?? null,
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
        }
      );

      await prisma.matchResult.upsert({
        where: {
          jobId_candidateProfileId: { jobId: job.id, candidateProfileId },
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
          candidateProfileId,
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
      });

      await logAIUsage({
        userId: auth.user.id,
        feature: 'CANDIDATE_MATCHING',
        mode: matchRun.result.aiMode,
        modelName: matchRun.result.modelName,
        latencyMs: matchRun.latencyMs,
        tokensEstimated: matchRun.tokensEstimated,
      });
    }

    // Notify recruiter
    await createNotification({
      userId: job.recruiter.userId,
      type: 'APPLICATION_RECEIVED',
      title: `New Application: ${job.title}`,
      message: `${auth.user.firstName} ${auth.user.lastName} applied for ${job.title}.`,
      link: '/recruiter/applications',
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: application.id,
      details: { jobId: job.id, jobTitle: job.title },
    });

    return NextResponse.json(
      { message: 'Application submitted successfully!', application },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/applications]', err);
    return NextResponse.json(
      { error: 'Unable to submit application.' },
      { status: 500 }
    );
  }
}

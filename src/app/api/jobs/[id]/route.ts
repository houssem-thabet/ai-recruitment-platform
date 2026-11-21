import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { parseValidDate, sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { upsertSkillRecord } from '@/lib/skills-db';
import { computeCandidateJobMatch } from '@/lib/ai/engine';
import { logAudit } from '@/lib/audit';
import { getPlatformSettings } from '@/lib/platform-settings';
import { EmploymentType, ExperienceLevel, JobStatus, WorkMode } from '@prisma/client';

const VALID_WORK_MODES = new Set<WorkMode>(['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE']);
const VALID_EMPLOYMENT_TYPES = new Set<EmploymentType>([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
]);
const VALID_EXPERIENCE_LEVELS = new Set<ExperienceLevel>([
  'ENTRY',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'EXECUTIVE',
]);
const RECRUITER_JOB_STATUSES = new Set<JobStatus>(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']);
const ADMIN_JOB_STATUSES = new Set<JobStatus>([
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'MODERATION_HOLD',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);

  const job = await prisma.job.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
    include: {
      company: true,
      recruiter: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      skills: { include: { skill: true } },
      _count: { select: { applications: true, bookmarks: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job advertisement not found.' }, { status: 404 });
  }

  // Non-published jobs are visible only to owning company recruiters or admins
  if (
    job.status !== 'PUBLISHED' &&
    user?.role !== 'ADMIN' &&
    user?.companyId !== job.companyId
  ) {
    return NextResponse.json(
      { error: 'This job is not currently accepting public views.' },
      { status: 403 }
    );
  }

  // Increment view count for candidates & public visitors
  if (!user || user.role === 'CANDIDATE') {
    await prisma.job
      .update({
        where: { id: job.id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch(() => null);
  }

  let candidateState: Record<string, unknown> | null = null;
  if (user?.candidateProfileId) {
    const [bookmark, existingApp, profile] = await Promise.all([
      prisma.jobBookmark.findUnique({
        where: {
          candidateProfileId_jobId: {
            candidateProfileId: user.candidateProfileId,
            jobId: job.id,
          },
        },
      }),
      prisma.application.findUnique({
        where: {
          jobId_candidateProfileId: {
            jobId: job.id,
            candidateProfileId: user.candidateProfileId,
          },
        },
        select: {
          id: true,
          jobId: true,
          candidateProfileId: true,
          status: true,
          appliedAt: true,
          updatedAt: true,
          candidateFeedback: true,
          rejectionReason: true,
        },
      }),
      prisma.candidateProfile.findUnique({
        where: { id: user.candidateProfileId },
        include: {
          skills: { include: { skill: true } },
          educations: true,
          experiences: true,
          certifications: true,
          projects: true,
          cvDocuments: { where: { isPrimary: true }, take: 1 },
        },
      }),
    ]);

    let matchPreview = null;
    if (profile) {
      const langs = Array.isArray(profile.languages)
        ? (profile.languages as Array<{ name?: string }>).map((l) => l?.name || '').filter(Boolean)
        : ['English'];
      const matchRun = await computeCandidateJobMatch(
        {
          fullName: `${user.firstName} ${user.lastName}`,
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
      matchPreview = matchRun.result;
    }

    candidateState = {
      isBookmarked: Boolean(bookmark),
      application: existingApp,
      matchPreview,
    };
  }

  return NextResponse.json({ job, candidateState });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['RECRUITER', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  if (auth.user.role === 'RECRUITER' && job.companyId !== auth.user.companyId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;

    if (body.title !== undefined && sanitizeText(String(body.title)).length < 3) {
      return NextResponse.json(
        { error: 'Job title must be at least 3 characters.' },
        { status: 400 }
      );
    }
    if (body.description !== undefined && sanitizeText(String(body.description)).length < 20) {
      return NextResponse.json(
        { error: 'Job description must be at least 20 characters.' },
        { status: 400 }
      );
    }
    if (body.location !== undefined && sanitizeText(String(body.location)).length < 2) {
      return NextResponse.json({ error: 'Valid location is required.' }, { status: 400 });
    }
    if (
      body.experienceLevel !== undefined &&
      !VALID_EXPERIENCE_LEVELS.has(body.experienceLevel as ExperienceLevel)
    ) {
      return NextResponse.json({ error: 'Invalid experienceLevel.' }, { status: 400 });
    }
    if (
      body.employmentType !== undefined &&
      !VALID_EMPLOYMENT_TYPES.has(body.employmentType as EmploymentType)
    ) {
      return NextResponse.json({ error: 'Invalid employmentType.' }, { status: 400 });
    }
    if (body.workMode !== undefined && !VALID_WORK_MODES.has(body.workMode as WorkMode)) {
      return NextResponse.json({ error: 'Invalid workMode.' }, { status: 400 });
    }

    if (body.status !== undefined) {
      const allowedSet =
        auth.user.role === 'ADMIN' ? ADMIN_JOB_STATUSES : RECRUITER_JOB_STATUSES;
      if (!allowedSet.has(body.status as JobStatus)) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized job status transition.' },
          { status: auth.user.role === 'RECRUITER' && body.status === 'MODERATION_HOLD' ? 403 : 400 }
        );
      }
      // Security: Recruiters cannot lift an administrator MODERATION_HOLD themselves
      if (
        auth.user.role === 'RECRUITER' &&
        job.status === 'MODERATION_HOLD' &&
        body.status !== 'MODERATION_HOLD'
      ) {
        return NextResponse.json(
          {
            error:
              'This job is under administrator moderation hold and can only be restored by an administrator.',
          },
          { status: 403 }
        );
      }
    }

    const nextHumanApproved =
      typeof body.humanApproved === 'boolean' ? body.humanApproved : job.humanApproved;
    const nextStatus = (body.status as JobStatus | undefined) ?? job.status;
    if (job.aiGenerated && nextStatus === 'PUBLISHED' && !nextHumanApproved) {
      const settings = await getPlatformSettings();
      if (settings.requireHumanApprovalForAIJobs) {
        return NextResponse.json(
          {
            error:
              'Human review and approval is mandatory before publishing an AI-generated job description.',
          },
          { status: 400 }
        );
      }
    }

    const nextSalaryMin =
      body.salaryMin !== undefined
        ? body.salaryMin !== null && body.salaryMin !== ''
          ? Number(body.salaryMin)
          : null
        : job.salaryMin;
    const nextSalaryMax =
      body.salaryMax !== undefined
        ? body.salaryMax !== null && body.salaryMax !== ''
          ? Number(body.salaryMax)
          : null
        : job.salaryMax;

    if (
      (nextSalaryMin !== null && (!Number.isFinite(nextSalaryMin) || nextSalaryMin < 0)) ||
      (nextSalaryMax !== null && (!Number.isFinite(nextSalaryMax) || nextSalaryMax < 0))
    ) {
      return NextResponse.json({ error: 'Salary values must be non-negative numbers.' }, { status: 400 });
    }
    if (nextSalaryMin !== null && nextSalaryMax !== null && nextSalaryMax < nextSalaryMin) {
      return NextResponse.json(
        { error: 'Maximum salary must be greater than or equal to minimum salary.' },
        { status: 400 }
      );
    }

    let nextMinYears: number | undefined;
    if (body.minYearsExperience !== undefined) {
      const parsedMin = Number(body.minYearsExperience);
      if (!Number.isFinite(parsedMin) || parsedMin < 0 || parsedMin > 30) {
        return NextResponse.json(
          { error: 'minYearsExperience must be between 0 and 30.' },
          { status: 400 }
        );
      }
      nextMinYears = Math.round(parsedMin);
    }

    let nextDeadline: Date | null | undefined = undefined;
    if (body.deadline !== undefined) {
      if (!body.deadline) {
        nextDeadline = null;
      } else {
        const parsedDate = parseValidDate(body.deadline);
        if (!parsedDate) {
          return NextResponse.json({ error: 'Invalid deadline date.' }, { status: 400 });
        }
        nextDeadline = parsedDate;
      }
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        ...(body.title ? { title: sanitizeText(String(body.title)).slice(0, 140) } : {}),
        ...(body.description ? { description: sanitizeText(String(body.description)) } : {}),
        ...(Array.isArray(body.responsibilities)
          ? { responsibilities: body.responsibilities.map((r: string) => sanitizeText(String(r))) }
          : {}),
        ...(Array.isArray(body.qualifications)
          ? { qualifications: body.qualifications.map((q: string) => sanitizeText(String(q))) }
          : {}),
        ...(Array.isArray(body.preferredQualifications)
          ? {
              preferredQualifications: body.preferredQualifications.map((p: string) =>
                sanitizeText(String(p))
              ),
            }
          : {}),
        ...(Array.isArray(body.benefits)
          ? { benefits: body.benefits.map((b: string) => sanitizeText(String(b))) }
          : {}),
        ...(Array.isArray(body.softSkills)
          ? { softSkills: body.softSkills.map((s: string) => sanitizeText(String(s))) }
          : {}),
        ...(body.experienceLevel
          ? { experienceLevel: body.experienceLevel as ExperienceLevel }
          : {}),
        ...(nextMinYears !== undefined ? { minYearsExperience: nextMinYears } : {}),
        ...(body.educationRequirement !== undefined
          ? {
              educationRequirement: body.educationRequirement
                ? sanitizeText(String(body.educationRequirement))
                : null,
            }
          : {}),
        ...(body.employmentType
          ? { employmentType: body.employmentType as EmploymentType }
          : {}),
        ...(body.location ? { location: sanitizeText(String(body.location)).slice(0, 140) } : {}),
        ...(body.workMode ? { workMode: body.workMode as WorkMode } : {}),
        ...(body.salaryMin !== undefined
          ? { salaryMin: nextSalaryMin !== null ? Math.round(nextSalaryMin) : null }
          : {}),
        ...(body.salaryMax !== undefined
          ? { salaryMax: nextSalaryMax !== null ? Math.round(nextSalaryMax) : null }
          : {}),
        ...(Array.isArray(body.requiredLanguages)
          ? { requiredLanguages: body.requiredLanguages.map((l: string) => sanitizeText(String(l))) }
          : {}),
        ...(typeof body.humanApproved === 'boolean'
          ? { humanApproved: body.humanApproved }
          : {}),
        ...(body.status && job.status !== 'MODERATION_HOLD'
          ? {
              status: body.status as JobStatus,
              ...(body.status === 'PUBLISHED' && !job.publishedAt
                ? { publishedAt: new Date() }
                : {}),
            }
          : auth.user.role === 'ADMIN' && body.status
          ? {
              status: body.status as JobStatus,
              ...(body.status === 'PUBLISHED' && !job.publishedAt
                ? { publishedAt: new Date() }
                : {}),
            }
          : {}),
        ...(auth.user.role === 'ADMIN' && body.moderationNote !== undefined
          ? {
              moderationNote: body.moderationNote
                ? sanitizeText(String(body.moderationNote))
                : null,
            }
          : {}),
        ...(nextDeadline !== undefined ? { deadline: nextDeadline } : {}),
      },
    });

    if (Array.isArray(body.technicalSkills)) {
      await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
      const seen = new Set<string>();
      for (const sk of body.technicalSkills) {
        if (!sk || !String(sk).trim()) continue;
        const skillRow = await upsertSkillRecord(String(sk), 'TECHNICAL');
        if (seen.has(skillRow.id)) continue;
        seen.add(skillRow.id);
        await prisma.jobSkill.create({
          data: { jobId: job.id, skillId: skillRow.id, isRequired: true },
        });
      }
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'JOB_UPDATED',
      entityType: 'Job',
      entityId: job.id,
      details: { status: updated.status },
    });

    return NextResponse.json({ message: 'Job updated successfully', job: updated });
  } catch (err) {
    console.error('[PUT /api/jobs/[id]]', err);
    return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['RECRUITER', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  if (auth.user.role === 'RECRUITER' && job.companyId !== auth.user.companyId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  await prisma.job.delete({ where: { id: job.id } });

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'JOB_DELETED',
    entityType: 'Job',
    entityId: job.id,
    details: { title: job.title },
  });

  return NextResponse.json({ message: 'Job advertisement deleted.' });
}

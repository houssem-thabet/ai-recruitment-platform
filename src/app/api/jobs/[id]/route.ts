import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { upsertSkillRecord } from '@/lib/skills-db';
import { computeCandidateJobMatch } from '@/lib/ai/engine';
import { logAudit } from '@/lib/audit';
import { EmploymentType, ExperienceLevel, JobStatus, WorkMode } from '@prisma/client';

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
    return NextResponse.json({ error: 'This job is not currently accepting public views.' }, { status: 403 });
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

  try {
    const body = await req.json();
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        ...(body.title ? { title: sanitizeText(body.title) } : {}),
        ...(body.description ? { description: sanitizeText(body.description) } : {}),
        ...(Array.isArray(body.responsibilities)
          ? { responsibilities: body.responsibilities.map(sanitizeText) }
          : {}),
        ...(Array.isArray(body.qualifications)
          ? { qualifications: body.qualifications.map(sanitizeText) }
          : {}),
        ...(Array.isArray(body.preferredQualifications)
          ? { preferredQualifications: body.preferredQualifications.map(sanitizeText) }
          : {}),
        ...(Array.isArray(body.benefits)
          ? { benefits: body.benefits.map(sanitizeText) }
          : {}),
        ...(Array.isArray(body.softSkills)
          ? { softSkills: body.softSkills.map(sanitizeText) }
          : {}),
        ...(body.experienceLevel
          ? { experienceLevel: body.experienceLevel as ExperienceLevel }
          : {}),
        ...(body.minYearsExperience !== undefined
          ? { minYearsExperience: Number(body.minYearsExperience) }
          : {}),
        ...(body.educationRequirement !== undefined
          ? {
              educationRequirement: body.educationRequirement
                ? sanitizeText(body.educationRequirement)
                : null,
            }
          : {}),
        ...(body.employmentType
          ? { employmentType: body.employmentType as EmploymentType }
          : {}),
        ...(body.location ? { location: sanitizeText(body.location) } : {}),
        ...(body.workMode ? { workMode: body.workMode as WorkMode } : {}),
        ...(body.salaryMin !== undefined
          ? { salaryMin: body.salaryMin ? Number(body.salaryMin) : null }
          : {}),
        ...(body.salaryMax !== undefined
          ? { salaryMax: body.salaryMax ? Number(body.salaryMax) : null }
          : {}),
        ...(Array.isArray(body.requiredLanguages)
          ? { requiredLanguages: body.requiredLanguages.map(sanitizeText) }
          : {}),
        ...(body.status
          ? {
              status: body.status as JobStatus,
              ...(body.status === 'PUBLISHED' && !job.publishedAt
                ? { publishedAt: new Date() }
                : {}),
            }
          : {}),
        ...(body.moderationNote !== undefined
          ? {
              moderationNote: body.moderationNote
                ? sanitizeText(body.moderationNote)
                : null,
            }
          : {}),
        ...(body.deadline !== undefined
          ? { deadline: body.deadline ? new Date(body.deadline) : null }
          : {}),
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

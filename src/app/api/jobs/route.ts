import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { jobUpsertSchema } from '@/lib/validators';
import { sanitizeText, slugify } from '@/lib/utils';
import { upsertSkillRecord } from '@/lib/skills-db';
import { logAudit } from '@/lib/audit';
import { EmploymentType, ExperienceLevel, JobStatus, Prisma, WorkMode } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const location = (searchParams.get('location') || '').trim();
  const workMode = (searchParams.get('workMode') || '').trim();
  const employmentType = (searchParams.get('employmentType') || '').trim();
  const experienceLevel = (searchParams.get('experienceLevel') || '').trim();
  const skill = (searchParams.get('skill') || '').trim();
  const salaryMin = Number(searchParams.get('salaryMin') || 0);
  const sort = searchParams.get('sort') || 'newest';
  const mine = searchParams.get('mine') === '1';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));

  const user = await getAuthUser(req);

  const where: Prisma.JobWhereInput = {};

  if (mine && user?.role === 'RECRUITER' && user.companyId) {
    where.companyId = user.companyId;
    const statusFilter = searchParams.get('status');
    if (statusFilter) where.status = statusFilter as JobStatus;
  } else {
    where.status = 'PUBLISHED';
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { company: { name: { contains: q, mode: 'insensitive' } } },
      { skills: { some: { skill: { name: { contains: q, mode: 'insensitive' } } } } },
    ];
  }
  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }
  if (workMode) {
    where.workMode = workMode as WorkMode;
  }
  if (employmentType) {
    where.employmentType = employmentType as EmploymentType;
  }
  if (experienceLevel) {
    where.experienceLevel = experienceLevel as ExperienceLevel;
  }
  if (skill) {
    where.skills = {
      some: { skill: { name: { contains: skill, mode: 'insensitive' } } },
    };
  }
  if (salaryMin > 0) {
    where.salaryMax = { gte: salaryMin };
  }

  let orderBy: Prisma.JobOrderByWithRelationInput = { publishedAt: 'desc' };
  if (sort === 'salary_desc') orderBy = { salaryMax: 'desc' };
  else if (sort === 'views') orderBy = { viewsCount: 'desc' };
  else if (mine) orderBy = { createdAt: 'desc' };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, slug: true, logoUrl: true, industry: true, location: true },
        },
        skills: { include: { skill: true } },
        _count: { select: { applications: true, bookmarks: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  let bookmarkedIds = new Set<string>();
  let appliedIds = new Set<string>();
  if (user?.candidateProfileId) {
    const [bms, apps] = await Promise.all([
      prisma.jobBookmark.findMany({
        where: { candidateProfileId: user.candidateProfileId },
        select: { jobId: true },
      }),
      prisma.application.findMany({
        where: { candidateProfileId: user.candidateProfileId },
        select: { jobId: true },
      }),
    ]);
    bookmarkedIds = new Set(bms.map((b) => b.jobId));
    appliedIds = new Set(apps.map((a) => a.jobId));
  }

  const enriched = jobs.map((j) => ({
    ...j,
    isBookmarked: bookmarkedIds.has(j.id),
    hasApplied: appliedIds.has(j.id),
  }));

  return NextResponse.json({
    jobs: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = jobUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    // Enforce Part 6 Feature 3: AI-generated descriptions require human approval before publication
    if (d.aiGenerated && d.status === 'PUBLISHED' && !d.humanApproved) {
      return NextResponse.json(
        {
          error:
            'Human review and approval is mandatory before publishing an AI-generated job description.',
        },
        { status: 400 }
      );
    }

    const slug = `${slugify(d.title)}-${Math.random().toString(36).slice(2, 7)}`;

    const job = await prisma.job.create({
      data: {
        companyId: auth.user.companyId!,
        recruiterProfileId: auth.user.recruiterProfileId!,
        title: sanitizeText(d.title),
        slug,
        description: sanitizeText(d.description),
        responsibilities: d.responsibilities.map(sanitizeText),
        qualifications: d.qualifications.map(sanitizeText),
        preferredQualifications: d.preferredQualifications.map(sanitizeText),
        benefits: d.benefits.map(sanitizeText),
        softSkills: d.softSkills.map(sanitizeText),
        experienceLevel: d.experienceLevel,
        minYearsExperience: d.minYearsExperience,
        educationRequirement: d.educationRequirement
          ? sanitizeText(d.educationRequirement)
          : null,
        employmentType: d.employmentType,
        location: sanitizeText(d.location),
        workMode: d.workMode,
        salaryMin: d.salaryMin ?? null,
        salaryMax: d.salaryMax ?? null,
        salaryCurrency: d.salaryCurrency || 'USD',
        requiredLanguages: d.requiredLanguages.map(sanitizeText),
        status: d.status,
        deadline: d.deadline ? new Date(d.deadline) : null,
        publishedAt: d.status === 'PUBLISHED' ? new Date() : null,
        aiGenerated: Boolean(d.aiGenerated),
        humanApproved: Boolean(d.humanApproved),
      },
    });

    const seenSkills = new Set<string>();
    for (const sk of d.technicalSkills) {
      const skillRow = await upsertSkillRecord(sk, 'TECHNICAL');
      if (seenSkills.has(skillRow.id)) continue;
      seenSkills.add(skillRow.id);
      await prisma.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: skillRow.id,
          isRequired: true,
        },
      });
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'JOB_CREATED',
      entityType: 'Job',
      entityId: job.id,
      details: { title: job.title, status: job.status, aiGenerated: job.aiGenerated },
    });

    const fullJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: { company: true, skills: { include: { skill: true } } },
    });

    return NextResponse.json(
      { message: 'Job saved successfully', job: fullJob },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/jobs]', err);
    return NextResponse.json({ error: 'Unable to create job.' }, { status: 500 });
  }
}

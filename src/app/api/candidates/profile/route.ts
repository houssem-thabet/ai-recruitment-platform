import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseValidDate, sanitizeHttpUrl, sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { upsertSkillRecord } from '@/lib/skills-db';
import { SkillLevel, WorkMode } from '@prisma/client';
import { logAudit } from '@/lib/audit';

const VALID_WORK_MODES = new Set<WorkMode>(['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE']);
const VALID_SKILL_LEVELS = new Set<SkillLevel>([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: auth.user.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      skills: { include: { skill: true }, orderBy: { createdAt: 'asc' } },
      educations: { orderBy: { startDate: 'desc' } },
      experiences: { orderBy: { startDate: 'desc' } },
      certifications: { orderBy: { createdAt: 'desc' } },
      projects: { orderBy: { createdAt: 'desc' } },
    },
  });

  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: auth.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (
      body.remotePreference !== undefined &&
      body.remotePreference !== '' &&
      !VALID_WORK_MODES.has(body.remotePreference as WorkMode)
    ) {
      return NextResponse.json({ error: 'Invalid remotePreference value.' }, { status: 400 });
    }

    for (const urlField of ['linkedinUrl', 'githubUrl', 'portfolioUrl'] as const) {
      if (body[urlField] && sanitizeHttpUrl(body[urlField]) === null) {
        return NextResponse.json(
          { error: `Invalid ${urlField}. Please enter a valid HTTP/HTTPS URL.` },
          { status: 400 }
        );
      }
    }

    const nextSalaryMin =
      body.desiredSalaryMin !== undefined
        ? body.desiredSalaryMin !== null && body.desiredSalaryMin !== ''
          ? Number(body.desiredSalaryMin)
          : null
        : profile.desiredSalaryMin;
    const nextSalaryMax =
      body.desiredSalaryMax !== undefined
        ? body.desiredSalaryMax !== null && body.desiredSalaryMax !== ''
          ? Number(body.desiredSalaryMax)
          : null
        : profile.desiredSalaryMax;

    if (
      (nextSalaryMin !== null && (!Number.isFinite(nextSalaryMin) || nextSalaryMin < 0)) ||
      (nextSalaryMax !== null && (!Number.isFinite(nextSalaryMax) || nextSalaryMax < 0))
    ) {
      return NextResponse.json({ error: 'Desired salary must be non-negative.' }, { status: 400 });
    }
    if (nextSalaryMin !== null && nextSalaryMax !== null && nextSalaryMax < nextSalaryMin) {
      return NextResponse.json(
        { error: 'Desired maximum salary must be >= desired minimum salary.' },
        { status: 400 }
      );
    }

    // Update basic user fields if provided
    if (body.firstName || body.lastName || body.phone !== undefined) {
      await prisma.user.update({
        where: { id: auth.user.id },
        data: {
          ...(body.firstName ? { firstName: sanitizeText(String(body.firstName)).slice(0, 80) } : {}),
          ...(body.lastName ? { lastName: sanitizeText(String(body.lastName)).slice(0, 80) } : {}),
          ...(body.phone !== undefined
            ? { phone: body.phone ? sanitizeText(String(body.phone)).slice(0, 30) : null }
            : {}),
        },
      });
    }

    const parsedExp =
      body.yearsOfExperience !== undefined
        ? Math.min(60, Math.max(0, Number(body.yearsOfExperience) || 0))
        : undefined;

    // Update CandidateProfile scalar fields
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        ...(body.headline !== undefined ? { headline: sanitizeText(String(body.headline)).slice(0, 180) } : {}),
        ...(body.bio !== undefined ? { bio: sanitizeText(String(body.bio)).slice(0, 5000) } : {}),
        ...(body.location !== undefined ? { location: sanitizeText(String(body.location)).slice(0, 140) } : {}),
        ...(parsedExp !== undefined ? { yearsOfExperience: parsedExp } : {}),
        ...(body.desiredTitle !== undefined
          ? { desiredTitle: sanitizeText(String(body.desiredTitle)).slice(0, 140) }
          : {}),
        ...(body.desiredSalaryMin !== undefined
          ? { desiredSalaryMin: nextSalaryMin !== null ? Math.round(nextSalaryMin) : null }
          : {}),
        ...(body.desiredSalaryMax !== undefined
          ? { desiredSalaryMax: nextSalaryMax !== null ? Math.round(nextSalaryMax) : null }
          : {}),
        ...(body.remotePreference
          ? { remotePreference: body.remotePreference as WorkMode }
          : {}),
        ...(body.linkedinUrl !== undefined
          ? { linkedinUrl: sanitizeHttpUrl(body.linkedinUrl) }
          : {}),
        ...(body.githubUrl !== undefined
          ? { githubUrl: sanitizeHttpUrl(body.githubUrl) }
          : {}),
        ...(body.portfolioUrl !== undefined
          ? { portfolioUrl: sanitizeHttpUrl(body.portfolioUrl) }
          : {}),
        ...(Array.isArray(body.careerInterests)
          ? {
              careerInterests: body.careerInterests
                .map((c: string) => sanitizeText(String(c)))
                .filter(Boolean),
            }
          : {}),
        ...(Array.isArray(body.languages)
          ? {
              languages: body.languages
                .filter((l: any) => l && typeof l === 'object' && l.name)
                .map((l: any) => ({
                  name: sanitizeText(String(l.name)).slice(0, 60),
                  proficiency: sanitizeText(String(l.proficiency || 'Fluent')).slice(0, 40),
                })),
            }
          : {}),
        ...(typeof body.isSearchableByRecruiters === 'boolean'
          ? { isSearchableByRecruiters: body.isSearchableByRecruiters }
          : {}),
      },
    });

    // Replace skills if supplied
    if (Array.isArray(body.skills)) {
      await prisma.candidateSkill.deleteMany({
        where: { candidateProfileId: profile.id },
      });
      const seenSkillIds = new Set<string>();
      for (const s of body.skills) {
        const name = typeof s === 'string' ? s : s?.name;
        if (!name || !String(name).trim()) continue;
        const category = typeof s === 'object' && s?.category ? s.category : undefined;
        const skillRow = await upsertSkillRecord(String(name), category);
        if (seenSkillIds.has(skillRow.id)) continue;
        seenSkillIds.add(skillRow.id);
        const levelCandidate = (typeof s === 'object' && s?.level ? s.level : 'INTERMEDIATE') as SkillLevel;
        const level = VALID_SKILL_LEVELS.has(levelCandidate) ? levelCandidate : 'INTERMEDIATE';
        const yearsUsedNum =
          typeof s === 'object' && s?.yearsUsed !== undefined && s?.yearsUsed !== null
            ? Number(s.yearsUsed)
            : NaN;
        await prisma.candidateSkill.create({
          data: {
            candidateProfileId: profile.id,
            skillId: skillRow.id,
            level,
            yearsUsed: Number.isFinite(yearsUsedNum) && yearsUsedNum >= 0 ? yearsUsedNum : null,
          },
        });
      }
    }

    // Replace educations if supplied
    if (Array.isArray(body.educations)) {
      await prisma.education.deleteMany({ where: { candidateProfileId: profile.id } });
      for (const edu of body.educations) {
        if (!edu?.institution || !edu?.degree) continue;
        await prisma.education.create({
          data: {
            candidateProfileId: profile.id,
            institution: sanitizeText(String(edu.institution)),
            degree: sanitizeText(String(edu.degree)),
            fieldOfStudy: sanitizeText(String(edu.fieldOfStudy || 'General Studies')),
            startDate: parseValidDate(edu.startDate),
            endDate: parseValidDate(edu.endDate),
            current: Boolean(edu.current),
            grade: edu.grade ? sanitizeText(String(edu.grade)) : null,
            description: edu.description ? sanitizeText(String(edu.description)) : null,
          },
        });
      }
    }

    // Replace experiences if supplied
    if (Array.isArray(body.experiences)) {
      await prisma.experience.deleteMany({ where: { candidateProfileId: profile.id } });
      for (const exp of body.experiences) {
        if (!exp?.company || !exp?.title) continue;
        await prisma.experience.create({
          data: {
            candidateProfileId: profile.id,
            company: sanitizeText(String(exp.company)),
            title: sanitizeText(String(exp.title)),
            location: exp.location ? sanitizeText(String(exp.location)) : null,
            employmentType: exp.employmentType ? sanitizeText(String(exp.employmentType)) : 'Full-Time',
            startDate: parseValidDate(exp.startDate) || new Date('2023-01-01T00:00:00.000Z'),
            endDate: parseValidDate(exp.endDate),
            current: Boolean(exp.current),
            description: sanitizeText(String(exp.description || '')),
            achievements: Array.isArray(exp.achievements)
              ? exp.achievements.map((a: string) => sanitizeText(String(a))).filter(Boolean)
              : [],
          },
        });
      }
    }

    // Replace certifications if supplied
    if (Array.isArray(body.certifications)) {
      await prisma.certification.deleteMany({ where: { candidateProfileId: profile.id } });
      for (const cert of body.certifications) {
        if (!cert?.name || !cert?.issuer) continue;
        await prisma.certification.create({
          data: {
            candidateProfileId: profile.id,
            name: sanitizeText(String(cert.name)),
            issuer: sanitizeText(String(cert.issuer)),
            issueDate: parseValidDate(cert.issueDate),
            credentialId: cert.credentialId ? sanitizeText(String(cert.credentialId)) : null,
            credentialUrl: sanitizeHttpUrl(cert.credentialUrl),
          },
        });
      }
    }

    // Replace projects if supplied
    if (Array.isArray(body.projects)) {
      await prisma.project.deleteMany({ where: { candidateProfileId: profile.id } });
      for (const proj of body.projects) {
        if (!proj?.title) continue;
        await prisma.project.create({
          data: {
            candidateProfileId: profile.id,
            title: sanitizeText(String(proj.title)),
            description: sanitizeText(String(proj.description || '')),
            technologies: Array.isArray(proj.technologies)
              ? proj.technologies.map((t: string) => sanitizeText(String(t))).filter(Boolean)
              : [],
            projectUrl: sanitizeHttpUrl(proj.projectUrl),
            repoUrl: sanitizeHttpUrl(proj.repoUrl),
          },
        });
      }
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'CANDIDATE_PROFILE_UPDATED',
      entityType: 'CandidateProfile',
      entityId: profile.id,
    });

    const refreshed = await prisma.candidateProfile.findUnique({
      where: { id: profile.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        skills: { include: { skill: true } },
        educations: { orderBy: { startDate: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        certifications: true,
        projects: true,
      },
    });

    return NextResponse.json({ message: 'Profile saved successfully', profile: refreshed });
  } catch (err) {
    console.error('[PUT /api/candidates/profile]', err);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { upsertSkillRecord } from '@/lib/skills-db';
import { SkillLevel, WorkMode } from '@prisma/client';
import { logAudit } from '@/lib/audit';

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

  try {
    const body = await req.json();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: auth.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update basic user fields if provided
    if (body.firstName || body.lastName || body.phone !== undefined) {
      await prisma.user.update({
        where: { id: auth.user.id },
        data: {
          ...(body.firstName ? { firstName: sanitizeText(body.firstName) } : {}),
          ...(body.lastName ? { lastName: sanitizeText(body.lastName) } : {}),
          ...(body.phone !== undefined
            ? { phone: body.phone ? sanitizeText(body.phone) : null }
            : {}),
        },
      });
    }

    // Update CandidateProfile scalar fields
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        ...(body.headline !== undefined ? { headline: sanitizeText(body.headline) } : {}),
        ...(body.bio !== undefined ? { bio: sanitizeText(body.bio) } : {}),
        ...(body.location !== undefined ? { location: sanitizeText(body.location) } : {}),
        ...(body.yearsOfExperience !== undefined
          ? { yearsOfExperience: Math.max(0, Number(body.yearsOfExperience) || 0) }
          : {}),
        ...(body.desiredTitle !== undefined
          ? { desiredTitle: sanitizeText(body.desiredTitle) }
          : {}),
        ...(body.desiredSalaryMin !== undefined
          ? { desiredSalaryMin: body.desiredSalaryMin ? Number(body.desiredSalaryMin) : null }
          : {}),
        ...(body.desiredSalaryMax !== undefined
          ? { desiredSalaryMax: body.desiredSalaryMax ? Number(body.desiredSalaryMax) : null }
          : {}),
        ...(body.remotePreference
          ? { remotePreference: body.remotePreference as WorkMode }
          : {}),
        ...(body.linkedinUrl !== undefined
          ? { linkedinUrl: sanitizeText(body.linkedinUrl) || null }
          : {}),
        ...(body.githubUrl !== undefined
          ? { githubUrl: sanitizeText(body.githubUrl) || null }
          : {}),
        ...(body.portfolioUrl !== undefined
          ? { portfolioUrl: sanitizeText(body.portfolioUrl) || null }
          : {}),
        ...(Array.isArray(body.careerInterests)
          ? { careerInterests: body.careerInterests.map((c: string) => sanitizeText(c)).filter(Boolean) }
          : {}),
        ...(Array.isArray(body.languages) ? { languages: body.languages } : {}),
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
        await prisma.candidateSkill.create({
          data: {
            candidateProfileId: profile.id,
            skillId: skillRow.id,
            level: (s?.level as SkillLevel) || 'INTERMEDIATE',
            yearsUsed: s?.yearsUsed ? Number(s.yearsUsed) : null,
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
            institution: sanitizeText(edu.institution),
            degree: sanitizeText(edu.degree),
            fieldOfStudy: sanitizeText(edu.fieldOfStudy || 'General Studies'),
            startDate: edu.startDate ? new Date(edu.startDate) : null,
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            current: Boolean(edu.current),
            grade: edu.grade ? sanitizeText(edu.grade) : null,
            description: edu.description ? sanitizeText(edu.description) : null,
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
            company: sanitizeText(exp.company),
            title: sanitizeText(exp.title),
            location: exp.location ? sanitizeText(exp.location) : null,
            employmentType: exp.employmentType ? sanitizeText(exp.employmentType) : 'Full-Time',
            startDate: exp.startDate ? new Date(exp.startDate) : new Date('2023-01-01'),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            current: Boolean(exp.current),
            description: sanitizeText(exp.description || ''),
            achievements: Array.isArray(exp.achievements)
              ? exp.achievements.map((a: string) => sanitizeText(a)).filter(Boolean)
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
            name: sanitizeText(cert.name),
            issuer: sanitizeText(cert.issuer),
            issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
            credentialId: cert.credentialId ? sanitizeText(cert.credentialId) : null,
            credentialUrl: cert.credentialUrl ? sanitizeText(cert.credentialUrl) : null,
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
            title: sanitizeText(proj.title),
            description: sanitizeText(proj.description || ''),
            technologies: Array.isArray(proj.technologies)
              ? proj.technologies.map((t: string) => sanitizeText(t)).filter(Boolean)
              : [],
            projectUrl: proj.projectUrl ? sanitizeText(proj.projectUrl) : null,
            repoUrl: proj.repoUrl ? sanitizeText(proj.repoUrl) : null,
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

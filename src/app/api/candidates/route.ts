import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const skill = (searchParams.get('skill') || '').trim();
  const location = (searchParams.get('location') || '').trim();
  const minExpRaw = searchParams.get('minExp');
  let minExp = 0;
  if (minExpRaw !== null && minExpRaw.trim() !== '') {
    const parsedMinExp = Number(minExpRaw);
    if (!Number.isFinite(parsedMinExp) || parsedMinExp < 0) {
      return NextResponse.json({ error: 'Invalid minExp query parameter.' }, { status: 400 });
    }
    minExp = parsedMinExp;
  }
  const education = (searchParams.get('education') || '').trim();
  const language = (searchParams.get('language') || '').trim();
  const interest = (searchParams.get('interest') || '').trim();

  const andConditions: Prisma.CandidateProfileWhereInput[] = [
    { user: { status: 'ACTIVE' } },
  ];

  // Recruiters can only view candidates who opted into searchability OR applied to their company
  if (auth.user.role === 'RECRUITER' && auth.user.companyId) {
    andConditions.push({
      OR: [
        { isSearchableByRecruiters: true },
        { applications: { some: { job: { companyId: auth.user.companyId } } } },
      ],
    });
  }

  if (minExp > 0) {
    andConditions.push({ yearsOfExperience: { gte: minExp } });
  }
  if (location) {
    andConditions.push({ location: { contains: location, mode: 'insensitive' } });
  }
  if (skill) {
    andConditions.push({
      skills: {
        some: {
          skill: { name: { contains: skill, mode: 'insensitive' } },
        },
      },
    });
  }
  if (education) {
    andConditions.push({
      educations: {
        some: {
          OR: [
            { degree: { contains: education, mode: 'insensitive' } },
            { fieldOfStudy: { contains: education, mode: 'insensitive' } },
          ],
        },
      },
    });
  }
  if (interest) {
    andConditions.push({ careerInterests: { hasSome: [interest] } });
  }
  if (q) {
    andConditions.push({
      OR: [
        { headline: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        {
          skills: {
            some: { skill: { name: { contains: q, mode: 'insensitive' } } },
          },
        },
      ],
    });
  }

  const candidates = await prisma.candidateProfile.findMany({
    where: { AND: andConditions },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      skills: { include: { skill: true } },
      educations: { orderBy: { startDate: 'desc' }, take: 2 },
      experiences: { orderBy: { startDate: 'desc' }, take: 2 },
      certifications: { take: 3 },
      projects: { take: 2 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const filtered = language
    ? candidates.filter((c) =>
        JSON.stringify(c.languages || []).toLowerCase().includes(language.toLowerCase())
      )
    : candidates;

  return NextResponse.json({ candidates: filtered });
}

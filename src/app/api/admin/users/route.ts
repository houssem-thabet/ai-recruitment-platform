import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { AccountStatus, Prisma, Role } from '@prisma/client';

const VALID_ROLES = new Set<Role>(['CANDIDATE', 'RECRUITER', 'ADMIN']);
const VALID_ACCOUNT_STATUSES = new Set<AccountStatus>(['ACTIVE', 'SUSPENDED', 'PENDING']);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const q = (searchParams.get('q') || '').trim();

  if (role && !VALID_ROLES.has(role as Role)) {
    return NextResponse.json({ error: 'Invalid role filter.' }, { status: 400 });
  }
  if (status && !VALID_ACCOUNT_STATUSES.has(status as AccountStatus)) {
    return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
  }

  const where: Prisma.UserWhereInput = {
    ...(role ? { role: role as Role } : {}),
    ...(status ? { status: status as AccountStatus } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Strict Privacy Rule (Part 7): Admin directory exposes account & non-confidential metadata only — never raw private CV files
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      candidateProfile: {
        select: {
          id: true,
          headline: true,
          location: true,
          yearsOfExperience: true,
          isSearchableByRecruiters: true,
          _count: { select: { applications: true, skills: true, cvDocuments: true } },
        },
      },
      recruiterProfile: {
        select: {
          id: true,
          title: true,
          company: { select: { id: true, name: true, industry: true, verified: true } },
          _count: { select: { jobs: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

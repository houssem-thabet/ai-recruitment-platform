import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const applications = await prisma.application.findMany({
    where: { candidateProfileId: auth.user.candidateProfileId! },
    include: {
      job: {
        include: {
          company: { select: { id: true, name: true, logoUrl: true, location: true } },
          skills: { include: { skill: true } },
        },
      },
      interviews: { orderBy: { scheduledAt: 'asc' } },
    },
    orderBy: { appliedAt: 'desc' },
  });

  return NextResponse.json({ applications });
}

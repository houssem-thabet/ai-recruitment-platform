import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const bookmarks = await prisma.jobBookmark.findMany({
    where: { candidateProfileId: auth.user.candidateProfileId! },
    include: {
      job: {
        include: {
          company: { select: { name: true, logoUrl: true, industry: true } },
          skills: { include: { skill: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const candidateProfileId = auth.user.candidateProfileId!;
  const existing = await prisma.jobBookmark.findUnique({
    where: {
      candidateProfileId_jobId: { candidateProfileId, jobId },
    },
  });

  if (existing) {
    await prisma.jobBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false, message: 'Removed from saved jobs' });
  }

  await prisma.jobBookmark.create({
    data: { candidateProfileId, jobId },
  });
  return NextResponse.json({ bookmarked: true, message: 'Job bookmarked' });
}

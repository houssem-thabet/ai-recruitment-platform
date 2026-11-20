import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { createNotification, logAudit } from '@/lib/audit';
import { JobStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const jobs = await prisma.job.findMany({
    include: {
      company: { select: { id: true, name: true, industry: true } },
      recruiter: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ jobs });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { jobId, status, moderationNote } = await req.json();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { recruiter: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: status as JobStatus,
      moderationNote: moderationNote ? sanitizeText(moderationNote) : null,
    },
  });

  await createNotification({
    userId: job.recruiter.userId,
    type: 'SYSTEM',
    title: `Job Moderation Update: ${job.title}`,
    message: `Administrator updated job status to ${status}${
      moderationNote ? ` — Note: ${sanitizeText(moderationNote)}` : ''
    }.`,
    link: '/recruiter/jobs',
  });

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'ADMIN_JOB_MODERATED',
    entityType: 'Job',
    entityId: jobId,
    details: { status, moderationNote },
  });

  return NextResponse.json({ message: 'Job moderation updated', job: updated });
}

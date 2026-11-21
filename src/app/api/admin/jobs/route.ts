import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { createNotification, logAudit } from '@/lib/audit';
import { JobStatus } from '@prisma/client';

const VALID_JOB_STATUSES = new Set<JobStatus>([
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'MODERATION_HOLD',
]);

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

  const json = await parseJsonBody<{
    jobId?: string;
    status?: string;
    moderationNote?: string;
  }>(req);
  if (json.errorResponse) return json.errorResponse;

  const { jobId, status, moderationNote } = json.data;
  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
  }
  if (!status || !VALID_JOB_STATUSES.has(status as JobStatus)) {
    return NextResponse.json({ error: 'Invalid job moderation status.' }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { recruiter: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const cleanNote = moderationNote ? sanitizeText(String(moderationNote)).slice(0, 1000) : null;
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: status as JobStatus,
      moderationNote: cleanNote,
      ...(status === 'PUBLISHED' && !job.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });

  await createNotification({
    userId: job.recruiter.userId,
    type: 'SYSTEM',
    title: `Job Moderation Update: ${job.title}`,
    message: `Administrator updated job status to ${status}${
      cleanNote ? ` — Note: ${cleanNote}` : ''
    }.`,
    link: '/recruiter/jobs',
  });

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'ADMIN_JOB_MODERATED',
    entityType: 'Job',
    entityId: jobId,
    details: { status, moderationNote: cleanNote },
  });

  return NextResponse.json({ message: 'Job moderation updated', job: updated });
}

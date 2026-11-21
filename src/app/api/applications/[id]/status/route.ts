import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { applicationStatusUpdateSchema, parseJsonBody } from '@/lib/validators';
import { sanitizeText } from '@/lib/utils';
import { createNotification, logAudit } from '@/lib/audit';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['CANDIDATE', 'RECRUITER', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: { include: { company: true, recruiter: true } },
      candidateProfile: { include: { user: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const parsed = applicationStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid status update' },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Candidate can ONLY withdraw their own application
    if (auth.user.role === 'CANDIDATE') {
      if (application.candidateProfileId !== auth.user.candidateProfileId) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
      if (d.status !== 'WITHDRAWN') {
        return NextResponse.json(
          { error: 'Candidates may only withdraw their own application.' },
          { status: 403 }
        );
      }
    }

    // Recruiter can ONLY manage applications to their own company's jobs
    if (
      auth.user.role === 'RECRUITER' &&
      application.job.companyId !== auth.user.companyId
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // Require documented reason when rejecting (Part 5D)
    if (
      d.status === 'REJECTED' &&
      (!d.rejectionReason || d.rejectionReason.trim().length < 5) &&
      !application.rejectionReason
    ) {
      return NextResponse.json(
        { error: 'Please document a clear, constructive rejection reason.' },
        { status: 400 }
      );
    }

    const prevHistory = Array.isArray(application.statusHistory)
      ? (application.statusHistory as Array<Record<string, unknown>>)
      : [];

    const newHistory = [
      ...prevHistory,
      {
        status: d.status,
        changedAt: new Date().toISOString(),
        changedBy: `${auth.user.firstName} ${auth.user.lastName}`,
        note: d.candidateFeedback || d.rejectionReason || `Status updated to ${d.status}`,
      },
    ];

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: d.status,
        humanReviewed: auth.user.role === 'RECRUITER' ? true : application.humanReviewed,
        ...(d.rejectionReason !== undefined
          ? { rejectionReason: d.rejectionReason ? sanitizeText(d.rejectionReason) : null }
          : {}),
        ...(d.candidateFeedback !== undefined
          ? {
              candidateFeedback: d.candidateFeedback
                ? sanitizeText(d.candidateFeedback)
                : null,
            }
          : {}),
        ...(d.privateNotes !== undefined && auth.user.role !== 'CANDIDATE'
          ? { privateNotes: d.privateNotes ? sanitizeText(d.privateNotes) : null }
          : {}),
        ...(d.status === 'HIRED' ? { hiredAt: new Date() } : {}),
        statusHistory: newHistory as unknown as Prisma.InputJsonValue,
      },
    });

    // Notify candidate on recruiter status transitions
    if (auth.user.role !== 'CANDIDATE') {
      const notifType =
        d.status === 'SHORTLISTED'
          ? 'CANDIDATE_SHORTLISTED'
          : d.status === 'UNDER_REVIEW'
          ? 'APPLICATION_REVIEWED'
          : 'APPLICATION_STATUS';

      await createNotification({
        userId: application.candidateProfile.userId,
        type: notifType,
        title: `Application Update: ${application.job.title}`,
        message: `Your application at ${application.job.company.name} moved to ${d.status.replace(
          /_/g,
          ' '
        )}.`,
        link: '/candidate/applications',
      });
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'APPLICATION_STATUS_UPDATED',
      entityType: 'Application',
      entityId: application.id,
      details: { previousStatus: application.status, newStatus: d.status },
    });

    return NextResponse.json({
      message: 'Application updated successfully',
      application:
        auth.user.role === 'CANDIDATE'
          ? { ...updated, privateNotes: undefined }
          : updated,
    });
  } catch (err) {
    console.error('[PUT /api/applications/[id]/status]', err);
    return NextResponse.json(
      { error: 'Unable to update application status.' },
      { status: 500 }
    );
  }
}

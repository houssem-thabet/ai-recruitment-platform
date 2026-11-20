import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { createNotification, logAudit } from '@/lib/audit';
import { InterviewStatus, InterviewType } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['CANDIDATE', 'RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    include: {
      job: true,
      candidateProfile: { include: { user: true } },
      recruiter: { include: { user: true } },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found.' }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Candidate actions: ACCEPT or REQUEST_RESCHEDULE
    if (auth.user.role === 'CANDIDATE') {
      if (interview.candidateProfileId !== auth.user.candidateProfileId) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
      if (!['ACCEPTED', 'RESCHEDULE_REQUESTED'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Candidates may accept or request rescheduling.' },
          { status: 400 }
        );
      }

      const updated = await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: body.status as InterviewStatus,
          rescheduleNote: body.rescheduleNote ? sanitizeText(body.rescheduleNote) : null,
          proposedNewTime: body.proposedNewTime ? new Date(body.proposedNewTime) : null,
        },
      });

      await createNotification({
        userId: interview.recruiter.userId,
        type: 'INTERVIEW_RESCHEDULED',
        title:
          body.status === 'ACCEPTED'
            ? `Interview Accepted: ${interview.title}`
            : `Reschedule Requested: ${interview.title}`,
        message:
          body.status === 'ACCEPTED'
            ? `${auth.user.firstName} ${auth.user.lastName} accepted the interview invitation.`
            : `${auth.user.firstName} ${auth.user.lastName} requested to reschedule: "${body.rescheduleNote || 'See details'}"`,
        link: '/recruiter/interviews',
      });

      return NextResponse.json({ message: 'Interview response recorded', interview: updated });
    }

    // Recruiter actions: reschedule, cancel, complete, edit instructions, save generated questions
    if (interview.job.companyId !== auth.user.companyId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const newScheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    const isRescheduled =
      newScheduledAt &&
      newScheduledAt.getTime() !== new Date(interview.scheduledAt).getTime();

    const updated = await prisma.interview.update({
      where: { id: interview.id },
      data: {
        ...(body.title ? { title: sanitizeText(body.title) } : {}),
        ...(body.type ? { type: body.type as InterviewType } : {}),
        ...(body.status
          ? { status: body.status as InterviewStatus }
          : isRescheduled
          ? { status: 'RESCHEDULED' }
          : {}),
        ...(newScheduledAt ? { scheduledAt: newScheduledAt } : {}),
        ...(body.durationMinutes ? { durationMinutes: Number(body.durationMinutes) } : {}),
        ...(body.meetingLink !== undefined
          ? { meetingLink: body.meetingLink ? sanitizeText(body.meetingLink) : null }
          : {}),
        ...(body.location !== undefined
          ? { location: body.location ? sanitizeText(body.location) : null }
          : {}),
        ...(body.instructions !== undefined
          ? { instructions: body.instructions ? sanitizeText(body.instructions) : null }
          : {}),
        ...(Array.isArray(body.interviewers)
          ? { interviewers: body.interviewers.map(sanitizeText) }
          : {}),
        ...(body.generatedQuestions !== undefined
          ? { generatedQuestions: body.generatedQuestions }
          : {}),
      },
    });

    if (body.status === 'COMPLETED') {
      await prisma.application
        .update({
          where: { id: interview.applicationId },
          data: { status: 'INTERVIEW_COMPLETED' },
        })
        .catch(() => null);
    }

    if (isRescheduled || body.status === 'CANCELLED') {
      await createNotification({
        userId: interview.candidateProfile.userId,
        type: 'INTERVIEW_RESCHEDULED',
        title:
          body.status === 'CANCELLED'
            ? `Interview Cancelled: ${interview.title}`
            : `Interview Updated: ${interview.title}`,
        message:
          body.status === 'CANCELLED'
            ? `Your interview for ${interview.job.title} has been cancelled.`
            : `Your interview for ${interview.job.title} is now scheduled for ${updated.scheduledAt.toLocaleString()}.`,
        link: '/candidate/applications',
      });
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'INTERVIEW_UPDATED',
      entityType: 'Interview',
      entityId: interview.id,
      details: { status: updated.status },
    });

    return NextResponse.json({ message: 'Interview updated', interview: updated });
  } catch (err) {
    console.error('[PUT /api/interviews/[id]]', err);
    return NextResponse.json({ error: 'Unable to update interview.' }, { status: 500 });
  }
}

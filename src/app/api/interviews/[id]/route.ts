import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseValidDate, sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { createNotification, logAudit } from '@/lib/audit';
import { InterviewStatus, InterviewType } from '@prisma/client';

const VALID_INTERVIEW_STATUSES = new Set<InterviewStatus>([
  'INVITED',
  'ACCEPTED',
  'RESCHEDULE_REQUESTED',
  'RESCHEDULED',
  'COMPLETED',
  'CANCELLED',
]);
const VALID_INTERVIEW_TYPES = new Set<InterviewType>([
  'ONLINE',
  'IN_PERSON',
  'TECHNICAL',
  'HR',
  'FINAL',
]);

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

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;

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

      let parsedProposed: Date | null = null;
      if (body.proposedNewTime) {
        parsedProposed = parseValidDate(body.proposedNewTime);
        if (!parsedProposed) {
          return NextResponse.json(
            { error: 'Invalid proposedNewTime date format.' },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: body.status as InterviewStatus,
          rescheduleNote: body.rescheduleNote
            ? sanitizeText(String(body.rescheduleNote)).slice(0, 2000)
            : null,
          proposedNewTime: parsedProposed,
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
            : `${auth.user.firstName} ${auth.user.lastName} requested to reschedule: "${
                body.rescheduleNote ? sanitizeText(String(body.rescheduleNote)) : 'See details'
              }"`,
        link: '/recruiter/interviews',
      });

      return NextResponse.json({ message: 'Interview response recorded', interview: updated });
    }

    // Recruiter actions: reschedule, cancel, complete, edit instructions, save generated questions
    if (interview.job.companyId !== auth.user.companyId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (body.status && !VALID_INTERVIEW_STATUSES.has(body.status as InterviewStatus)) {
      return NextResponse.json({ error: 'Invalid interview status.' }, { status: 400 });
    }
    if (body.type && !VALID_INTERVIEW_TYPES.has(body.type as InterviewType)) {
      return NextResponse.json({ error: 'Invalid interview type.' }, { status: 400 });
    }

    let nextDuration = interview.durationMinutes;
    if (body.durationMinutes !== undefined) {
      const parsedDur = Number(body.durationMinutes);
      if (!Number.isFinite(parsedDur) || parsedDur < 15 || parsedDur > 240) {
        return NextResponse.json(
          { error: 'Duration must be between 15 and 240 minutes.' },
          { status: 400 }
        );
      }
      nextDuration = Math.round(parsedDur);
    }

    let newScheduledAt: Date | undefined = undefined;
    if (body.scheduledAt !== undefined && body.scheduledAt !== '') {
      const parsedDt = parseValidDate(body.scheduledAt);
      if (!parsedDt) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt date/time format.' },
          { status: 400 }
        );
      }
      newScheduledAt = parsedDt;
    }

    const isRescheduled =
      Boolean(newScheduledAt) &&
      newScheduledAt!.getTime() !== new Date(interview.scheduledAt).getTime();

    // Enforce overlap/conflict check on reschedule just like POST /api/interviews
    if (isRescheduled && body.status !== 'CANCELLED') {
      const startTime = newScheduledAt!;
      const endTime = new Date(startTime.getTime() + nextDuration * 60_000);
      const potentialConflicts = await prisma.interview.findMany({
        where: {
          id: { not: interview.id },
          status: { in: ['INVITED', 'ACCEPTED', 'RESCHEDULED'] },
          OR: [
            { recruiterProfileId: interview.recruiterProfileId },
            { candidateProfileId: interview.candidateProfileId },
          ],
        },
      });

      for (const existing of potentialConflicts) {
        const exStart = new Date(existing.scheduledAt).getTime();
        const exEnd = exStart + existing.durationMinutes * 60_000;
        if (startTime.getTime() < exEnd && endTime.getTime() > exStart) {
          return NextResponse.json(
            {
              error: `Scheduling conflict detected with existing interview "${existing.title}" at ${new Date(
                existing.scheduledAt
              ).toLocaleString()}. Please choose a non-overlapping time slot.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const updated = await prisma.interview.update({
      where: { id: interview.id },
      data: {
        ...(body.title ? { title: sanitizeText(String(body.title)).slice(0, 160) } : {}),
        ...(body.type ? { type: body.type as InterviewType } : {}),
        ...(body.status
          ? { status: body.status as InterviewStatus }
          : isRescheduled
          ? { status: 'RESCHEDULED' }
          : {}),
        ...(newScheduledAt ? { scheduledAt: newScheduledAt } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: nextDuration } : {}),
        ...(body.meetingLink !== undefined
          ? { meetingLink: body.meetingLink ? sanitizeText(String(body.meetingLink)).slice(0, 300) : null }
          : {}),
        ...(body.location !== undefined
          ? { location: body.location ? sanitizeText(String(body.location)).slice(0, 200) : null }
          : {}),
        ...(body.instructions !== undefined
          ? { instructions: body.instructions ? sanitizeText(String(body.instructions)).slice(0, 2000) : null }
          : {}),
        ...(Array.isArray(body.interviewers)
          ? { interviewers: body.interviewers.map((i: string) => sanitizeText(String(i))) }
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

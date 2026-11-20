import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { interviewCreateSchema } from '@/lib/validators';
import { sanitizeText } from '@/lib/utils';
import { createNotification, logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const where =
    auth.user.role === 'CANDIDATE'
      ? { candidateProfileId: auth.user.candidateProfileId! }
      : auth.user.role === 'RECRUITER'
      ? { job: { companyId: auth.user.companyId! } }
      : {};

  const interviews = await prisma.interview.findMany({
    where,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          experienceLevel: true,
          company: { select: { name: true, logoUrl: true } },
          skills: { include: { skill: true } },
        },
      },
      candidateProfile: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          experiences: { take: 2 },
        },
      },
      recruiter: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      evaluation: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json({ interviews });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = interviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid interview details' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const application = await prisma.application.findUnique({
      where: { id: d.applicationId },
      include: {
        job: true,
        candidateProfile: { include: { user: true } },
      },
    });

    if (!application || application.job.companyId !== auth.user.companyId) {
      return NextResponse.json(
        { error: 'Application not found or unauthorized.' },
        { status: 404 }
      );
    }

    const startTime = new Date(d.scheduledAt);
    if (Number.isNaN(startTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format.' }, { status: 400 });
    }
    const endTime = new Date(startTime.getTime() + d.durationMinutes * 60000);

    // Scheduling conflict check for recruiter & candidate within active interviews (Part 8)
    const potentialConflicts = await prisma.interview.findMany({
      where: {
        status: { in: ['INVITED', 'ACCEPTED', 'RESCHEDULED'] },
        OR: [
          { recruiterProfileId: auth.user.recruiterProfileId! },
          { candidateProfileId: application.candidateProfileId },
        ],
      },
    });

    for (const existing of potentialConflicts) {
      const exStart = new Date(existing.scheduledAt).getTime();
      const exEnd = exStart + existing.durationMinutes * 60000;
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

    const interview = await prisma.interview.create({
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        candidateProfileId: application.candidateProfileId,
        recruiterProfileId: auth.user.recruiterProfileId!,
        title: sanitizeText(d.title),
        type: d.type,
        status: 'INVITED',
        scheduledAt: startTime,
        durationMinutes: d.durationMinutes,
        meetingLink: d.meetingLink ? sanitizeText(d.meetingLink) : null,
        location: d.location ? sanitizeText(d.location) : null,
        instructions: d.instructions ? sanitizeText(d.instructions) : null,
        interviewers: d.interviewers.map(sanitizeText),
      },
    });

    // Advance application status if in early stage
    if (['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(application.status)) {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          status: 'INTERVIEW_SCHEDULED',
          humanReviewed: true,
        },
      });
    }

    await createNotification({
      userId: application.candidateProfile.userId,
      type: 'INTERVIEW_INVITATION',
      title: `Interview Invitation: ${application.job.title}`,
      message: `You have been invited to a ${d.type} interview ("${interview.title}") scheduled for ${startTime.toLocaleString()}.`,
      link: '/candidate/applications',
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'INTERVIEW_SCHEDULED',
      entityType: 'Interview',
      entityId: interview.id,
    });

    return NextResponse.json(
      { message: 'Interview invitation sent successfully', interview },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/interviews]', err);
    return NextResponse.json({ error: 'Unable to schedule interview.' }, { status: 500 });
  }
}

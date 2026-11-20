import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const companyId = auth.user.companyId!;

  const [jobs, applications, interviews, company] = await Promise.all([
    prisma.job.findMany({
      where: { companyId },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.application.findMany({
      where: { job: { companyId } },
      include: {
        job: { select: { id: true, title: true } },
        candidateProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            skills: { include: { skill: true }, take: 5 },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.interview.findMany({
      where: {
        job: { companyId },
        status: { in: ['INVITED', 'ACCEPTED', 'RESCHEDULED', 'RESCHEDULE_REQUESTED'] },
      },
      include: {
        job: { select: { title: true } },
        candidateProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 8,
    }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
  }

  const pipelineChart = [
    { stage: 'Submitted', count: statusCounts['SUBMITTED'] || 0 },
    { stage: 'Under Review', count: statusCounts['UNDER_REVIEW'] || 0 },
    { stage: 'Shortlisted', count: statusCounts['SHORTLISTED'] || 0 },
    {
      stage: 'Interview',
      count:
        (statusCounts['INTERVIEW_SCHEDULED'] || 0) +
        (statusCounts['INTERVIEW_COMPLETED'] || 0),
    },
    { stage: 'Offered', count: statusCounts['OFFERED'] || 0 },
    { stage: 'Hired', count: statusCounts['HIRED'] || 0 },
  ];

  const applicationsPerJob = jobs.slice(0, 8).map((j) => ({
    title: j.title.length > 22 ? `${j.title.slice(0, 22)}…` : j.title,
    applications: j._count.applications,
    views: j.viewsCount,
  }));

  return NextResponse.json({
    company,
    metrics: {
      publishedJobs: jobs.filter((j) => j.status === 'PUBLISHED').length,
      totalJobs: jobs.length,
      totalApplications: applications.length,
      newApplications: statusCounts['SUBMITTED'] || 0,
      underReview: statusCounts['UNDER_REVIEW'] || 0,
      shortlisted: statusCounts['SHORTLISTED'] || 0,
      scheduledInterviews: interviews.length,
      hiredCandidates: statusCounts['HIRED'] || 0,
    },
    pipelineChart,
    applicationsPerJob,
    recentApplications: applications.slice(0, 6),
    upcomingInterviews: interviews,
  });
}

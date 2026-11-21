import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { escapeCsvCell } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER', 'ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || 'all'; // 7d, 30d, 90d, all
  const format = searchParams.get('format');

  let sinceDate: Date | undefined;
  if (range === '7d') sinceDate = new Date(Date.now() - 7 * 86400 * 1000);
  else if (range === '30d') sinceDate = new Date(Date.now() - 30 * 86400 * 1000);
  else if (range === '90d') sinceDate = new Date(Date.now() - 90 * 86400 * 1000);

  const companyFilter =
    auth.user.role === 'RECRUITER' && auth.user.companyId
      ? { companyId: auth.user.companyId }
      : {};

  const [jobs, applications, candidateSkills, jobSkills] = await Promise.all([
    prisma.job.findMany({
      where: companyFilter,
      include: { _count: { select: { applications: true } } },
    }),
    prisma.application.findMany({
      where: {
        job: companyFilter,
        ...(sinceDate ? { appliedAt: { gte: sinceDate } } : {}),
      },
      include: {
        job: { select: { title: true, company: { select: { name: true } } } },
        candidateProfile: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    }),
    prisma.candidateSkill.findMany({
      include: { skill: true },
    }),
    prisma.jobSkill.findMany({
      where: { job: companyFilter },
      include: { skill: true },
    }),
  ]);

  const totalApps = applications.length;
  const shortlistedOrFurther = applications.filter((a) =>
    [
      'SHORTLISTED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'OFFERED',
      'HIRED',
    ].includes(a.status)
  ).length;
  const interviewedOrFurther = applications.filter((a) =>
    ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFERED', 'HIRED'].includes(a.status)
  ).length;
  const hiredApps = applications.filter((a) => a.status === 'HIRED');

  // Average time to hire in days (from real DB timestamps)
  let avgTimeToHireDays = 0;
  if (hiredApps.length > 0) {
    const sumDays = hiredApps.reduce((acc, a) => {
      const end = a.hiredAt ? new Date(a.hiredAt).getTime() : new Date(a.updatedAt).getTime();
      const start = new Date(a.appliedAt).getTime();
      return acc + Math.max(1, (end - start) / 86400000);
    }, 0);
    avgTimeToHireDays = Number((sumDays / hiredApps.length).toFixed(1));
  }

  const statusMap = new Map<string, number>();
  for (const a of applications) {
    statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1);
  }
  const statusDistribution = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  // Candidate skill distribution
  const candSkillCounts = new Map<string, number>();
  for (const cs of candidateSkills) {
    candSkillCounts.set(cs.skill.name, (candSkillCounts.get(cs.skill.name) || 0) + 1);
  }
  const candidateSkillDistribution = Array.from(candSkillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // Most requested skills in jobs
  const reqSkillCounts = new Map<string, number>();
  for (const js of jobSkills) {
    reqSkillCounts.set(js.skill.name, (reqSkillCounts.get(js.skill.name) || 0) + 1);
  }
  const mostRequestedSkills = Array.from(reqSkillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, demand]) => ({ skill, demand }));

  const applicationsPerJob = jobs.map((j) => ({
    jobTitle: j.title,
    status: j.status,
    applications: j._count.applications,
    views: j.viewsCount,
  }));

  if (format === 'csv') {
    const header = 'Candidate,Email,Job Title,Company,Status,Applied Date\n';
    const rows = applications
      .map((a) =>
        [
          escapeCsvCell(`${a.candidateProfile.user.firstName} ${a.candidateProfile.user.lastName}`),
          escapeCsvCell(a.candidateProfile.user.email),
          escapeCsvCell(a.job.title),
          escapeCsvCell(a.job.company.name),
          escapeCsvCell(a.status),
          escapeCsvCell(new Date(a.appliedAt).toISOString().split('T')[0]),
        ].join(',')
      )
      .join('\n');
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="talentai-analytics-${range}.csv"`,
      },
    });
  }

  return NextResponse.json({
    isDatabaseSourced: true,
    range,
    kpis: {
      publishedJobs: jobs.filter((j) => j.status === 'PUBLISHED').length,
      totalJobs: jobs.length,
      totalApplications: totalApps,
      applicationsPerJobAvg:
        jobs.length > 0 ? Number((totalApps / jobs.length).toFixed(1)) : 0,
      shortlistedCandidates: shortlistedOrFurther,
      interviewConversionRate:
        totalApps > 0 ? Number(((interviewedOrFurther / totalApps) * 100).toFixed(1)) : 0,
      hiringConversionRate:
        totalApps > 0 ? Number(((hiredApps.length / totalApps) * 100).toFixed(1)) : 0,
      averageTimeToHireDays: avgTimeToHireDays,
    },
    statusDistribution,
    applicationsPerJob,
    candidateSkillDistribution,
    mostRequestedSkills,
  });
}

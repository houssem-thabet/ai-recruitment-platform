import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const [
    users,
    companiesCount,
    jobs,
    applications,
    aiLogs,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, role: true, status: true, createdAt: true },
    }),
    prisma.company.count(),
    prisma.job.findMany({
      select: { id: true, status: true, createdAt: true, publishedAt: true },
    }),
    prisma.application.findMany({
      select: { id: true, status: true, appliedAt: true, hiredAt: true },
    }),
    prisma.aIUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.auditLog.findMany({
      include: {
        actor: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  // Group monthly trends for the past 6 months from actual DB timestamps
  const monthLabels: string[] = [];
  const monthKeys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push(key);
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
  }

  const getKey = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;

  const trends = monthKeys.map((mk, idx) => ({
    month: monthLabels[idx],
    registrations: users.filter((u) => getKey(new Date(u.createdAt)) === mk).length,
    jobsPublished: jobs.filter((j) => getKey(new Date(j.createdAt)) === mk).length,
    applications: applications.filter((a) => getKey(new Date(a.appliedAt)) === mk).length,
    hires: applications.filter(
      (a) => a.status === 'HIRED' && getKey(new Date(a.hiredAt || a.appliedAt)) === mk
    ).length,
  }));

  // Recruitment funnel conversion
  const funnel = [
    { stage: 'Applications', count: applications.length },
    {
      stage: 'Reviewed',
      count: applications.filter((a) => a.status !== 'SUBMITTED').length,
    },
    {
      stage: 'Shortlisted',
      count: applications.filter((a) =>
        ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFERED', 'HIRED'].includes(
          a.status
        )
      ).length,
    },
    {
      stage: 'Interviewed',
      count: applications.filter((a) =>
        ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFERED', 'HIRED'].includes(a.status)
      ).length,
    },
    {
      stage: 'Hired',
      count: applications.filter((a) => a.status === 'HIRED').length,
    },
  ];

  // AI usage by feature
  const aiByFeatureMap = new Map<string, number>();
  for (const log of aiLogs) {
    aiByFeatureMap.set(log.feature, (aiByFeatureMap.get(log.feature) || 0) + 1);
  }
  const aiFeatureUsage = Array.from(aiByFeatureMap.entries()).map(([feature, calls]) => ({
    feature: feature.replace(/_/g, ' '),
    calls,
  }));

  return NextResponse.json({
    aiEngine: getActiveAIModelInfo(),
    metrics: {
      totalUsers: users.length,
      candidatesCount: users.filter((u) => u.role === 'CANDIDATE').length,
      recruitersCount: users.filter((u) => u.role === 'RECRUITER').length,
      suspendedCount: users.filter((u) => u.status === 'SUSPENDED').length,
      companiesCount,
      publishedJobsCount: jobs.filter((j) => j.status === 'PUBLISHED').length,
      moderationHoldJobsCount: jobs.filter((j) => j.status === 'MODERATION_HOLD').length,
      totalJobsCount: jobs.length,
      totalApplicationsCount: applications.length,
      totalHiresCount: applications.filter((a) => a.status === 'HIRED').length,
      totalAICalls: aiLogs.length,
      aiErrorCount: aiLogs.filter((l) => l.status === 'ERROR').length,
    },
    trends,
    funnel,
    aiFeatureUsage,
    recentAuditLogs,
  });
}

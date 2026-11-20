import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  const [usersCount, companiesCount, jobs, applications, aiLogsCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.job.findMany({
        include: {
          company: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.application.findMany({
        include: {
          job: { select: { title: true, company: { select: { name: true } } } },
        },
      }),
      prisma.aIUsageLog.count(),
    ]);

  if (format === 'csv') {
    const header = 'Job Title,Company,Status,Views,Applications,Created Date\n';
    const rows = jobs
      .map((j) =>
        [
          `"${j.title.replace(/"/g, '""')}"`,
          `"${j.company.name.replace(/"/g, '""')}"`,
          j.status,
          j.viewsCount,
          j._count.applications,
          new Date(j.createdAt).toISOString().split('T')[0],
        ].join(',')
      )
      .join('\n');
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="talentai-platform-report.csv"',
      },
    });
  }

  return NextResponse.json({
    summary: {
      usersCount,
      companiesCount,
      jobsCount: jobs.length,
      applicationsCount: applications.length,
      hiredCount: applications.filter((a) => a.status === 'HIRED').length,
      aiLogsCount,
    },
    jobs,
  });
}

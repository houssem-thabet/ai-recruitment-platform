import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      candidatesCount,
      companiesCount,
      publishedJobsCount,
      applicationsCount,
      matchesCount,
      featuredJobs,
    ] = await Promise.all([
      prisma.candidateProfile.count(),
      prisma.company.count(),
      prisma.job.count({ where: { status: 'PUBLISHED' } }),
      prisma.application.count(),
      prisma.matchResult.count(),
      prisma.job.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        include: {
          company: { select: { name: true, industry: true, logoUrl: true } },
          skills: { include: { skill: true }, take: 5 },
        },
      }),
    ]);

    return NextResponse.json({
      isSeededDemoEnvironment: true,
      aiEngine: getActiveAIModelInfo(),
      stats: {
        candidatesCount,
        companiesCount,
        publishedJobsCount,
        applicationsCount,
        matchesCount,
      },
      featuredJobs,
    });
  } catch (err) {
    console.error('[GET /api/public/stats]', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const logs = await prisma.aIUsageLog.findMany({
    include: {
      user: { select: { email: true, role: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  const avgLatency =
    logs.length > 0
      ? Math.round(logs.reduce((acc, l) => acc + l.latencyMs, 0) / logs.length)
      : 0;
  const totalTokens = logs.reduce((acc, l) => acc + l.tokensEstimated, 0);

  return NextResponse.json({
    activeEngine: getActiveAIModelInfo(),
    summary: {
      totalCalls: logs.length,
      successCount: logs.filter((l) => l.status === 'SUCCESS').length,
      fallbackCount: logs.filter((l) => l.status === 'FALLBACK').length,
      errorCount: logs.filter((l) => l.status === 'ERROR').length,
      avgLatencyMs: avgLatency,
      totalTokensEstimated: totalTokens,
    },
    logs,
  });
}

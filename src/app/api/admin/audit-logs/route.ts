import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const action = (searchParams.get('action') || '').trim();

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: { contains: action, mode: 'insensitive' } } : {},
    include: {
      actor: { select: { firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  return NextResponse.json({ logs });
}

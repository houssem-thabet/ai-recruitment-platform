import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const companies = await prisma.company.findMany({
    include: {
      recruiters: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ companies });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { companyId, verified } = await req.json();
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { verified: Boolean(verified) },
  });

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: verified ? 'ADMIN_COMPANY_VERIFIED' : 'ADMIN_COMPANY_UNVERIFIED',
    entityType: 'Company',
    entityId: companyId,
  });

  return NextResponse.json({ message: 'Company verification updated', company: updated });
}

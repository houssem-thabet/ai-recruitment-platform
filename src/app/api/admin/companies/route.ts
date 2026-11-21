import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
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

  const json = await parseJsonBody<{ companyId?: string; verified?: boolean }>(req);
  if (json.errorResponse) return json.errorResponse;

  const companyId =
    typeof json.data.companyId === 'string' ? json.data.companyId.trim() : '';
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required.' }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  const verified = Boolean(json.data.verified);
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { verified },
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

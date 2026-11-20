import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const company = await prisma.company.findUnique({
    where: { id: auth.user.companyId! },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      },
      recruiters: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({ company });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const updated = await prisma.company.update({
      where: { id: auth.user.companyId! },
      data: {
        ...(body.name ? { name: sanitizeText(body.name) } : {}),
        ...(body.description ? { description: sanitizeText(body.description) } : {}),
        ...(body.industry ? { industry: sanitizeText(body.industry) } : {}),
        ...(body.website !== undefined
          ? { website: body.website ? sanitizeText(body.website) : null }
          : {}),
        ...(body.location !== undefined
          ? { location: body.location ? sanitizeText(body.location) : null }
          : {}),
        ...(body.size ? { size: sanitizeText(body.size) } : {}),
        ...(body.logoUrl !== undefined
          ? { logoUrl: body.logoUrl ? String(body.logoUrl).slice(0, 150000) : null }
          : {}),
        ...(body.foundedYear !== undefined
          ? { foundedYear: body.foundedYear ? Number(body.foundedYear) : null }
          : {}),
      },
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'Company',
      entityId: updated.id,
    });

    return NextResponse.json({
      message: 'Company profile updated successfully',
      company: updated,
    });
  } catch (err) {
    console.error('[PUT /api/recruiter/company]', err);
    return NextResponse.json({ error: 'Unable to update company.' }, { status: 500 });
  }
}

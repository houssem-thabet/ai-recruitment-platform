import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import { sanitizeText } from '@/lib/utils';
import { logAudit } from '@/lib/audit';
import { AccountStatus } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  if (params.id === auth.user.id) {
    return NextResponse.json(
      { error: 'Administrators cannot suspend their own active session.' },
      { status: 400 }
    );
  }

  const json = await parseJsonBody<{ status?: string; reason?: string }>(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const { status, reason } = json.data;
    if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Invalid account status.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { status: status as AccountStatus },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action:
        status === 'SUSPENDED'
          ? 'ADMIN_USER_SUSPENDED'
          : 'ADMIN_USER_REACTIVATED',
      entityType: 'User',
      entityId: updated.id,
      details: {
        email: updated.email,
        status,
        reason: reason ? sanitizeText(String(reason)).slice(0, 500) : 'Administrative action',
      },
    });

    return NextResponse.json({
      message: `Account status updated to ${status}`,
      user: updated,
    });
  } catch (err) {
    console.error('[PUT /api/admin/users/[id]/status]', err);
    return NextResponse.json({ error: 'Unable to update user status.' }, { status: 500 });
  }
}

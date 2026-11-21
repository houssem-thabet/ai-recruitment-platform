import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import {
  getAuthUser,
  requireAuth,
  hashPassword,
  verifyPassword,
  clearSessionCookie,
} from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';
import { parseJsonBody, strongPasswordSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: user.id },
        conversation: {
          OR: [{ candidateUserId: user.id }, { recruiterUserId: user.id }],
        },
      },
    }),
  ]);

  return NextResponse.json({
    user,
    unreadNotifications,
    unreadMessages,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const { firstName, lastName, phone, currentPassword, newPassword } = body;

    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) {
      const cleaned = sanitizeText(String(firstName));
      if (cleaned.length < 2 || cleaned.length > 80) {
        return NextResponse.json(
          { error: 'First name must be between 2 and 80 characters.' },
          { status: 400 }
        );
      }
      updates.firstName = cleaned;
    }
    if (lastName !== undefined) {
      const cleaned = sanitizeText(String(lastName));
      if (cleaned.length < 2 || cleaned.length > 80) {
        return NextResponse.json(
          { error: 'Last name must be between 2 and 80 characters.' },
          { status: 400 }
        );
      }
      updates.lastName = cleaned;
    }
    if (phone !== undefined) {
      const cleanedPhone = phone ? sanitizeText(String(phone)) : '';
      if (cleanedPhone.length > 30) {
        return NextResponse.json(
          { error: 'Phone number cannot exceed 30 characters.' },
          { status: 400 }
        );
      }
      updates.phone = cleanedPhone || null;
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      const pwCheck = strongPasswordSchema.safeParse(String(newPassword));
      if (!pwCheck.success) {
        return NextResponse.json(
          {
            error:
              pwCheck.error.issues[0]?.message ||
              'New password must be 8–128 characters with uppercase, lowercase, and a number.',
          },
          { status: 400 }
        );
      }
      const dbUser = await prisma.user.findUnique({ where: { id: auth.user.id } });
      if (!dbUser || !(await verifyPassword(String(currentPassword), dbUser.passwordHash))) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(pwCheck.data);
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: newPassword ? 'PASSWORD_CHANGED' : 'ACCOUNT_SETTINGS_UPDATED',
      entityType: 'User',
      entityId: auth.user.id,
    });

    return NextResponse.json({ message: 'Account updated successfully', user: updated });
  } catch (err) {
    console.error('[PUT /api/auth/me]', err);
    return NextResponse.json({ error: 'Failed to update account.' }, { status: 500 });
  }
}

/**
 * Privacy & Data Retention: Allows candidates/recruiters (non-admin) to permanently delete their account and private CV files.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  if (auth.user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Primary administrator account cannot be self-deleted.' },
      { status: 400 }
    );
  }

  try {
    if (auth.user.candidateProfileId) {
      const cvs = await prisma.cVDocument.findMany({
        where: { candidateProfileId: auth.user.candidateProfileId },
      });
      for (const cv of cvs) {
        await fs.unlink(cv.storagePath).catch(() => null);
      }
    }

    let orphanCompanyId: string | null = null;
    if (auth.user.companyId) {
      const recruiterCount = await prisma.recruiterProfile.count({
        where: { companyId: auth.user.companyId },
      });
      if (recruiterCount <= 1) {
        orphanCompanyId = auth.user.companyId;
      }
    }

    await prisma.user.delete({ where: { id: auth.user.id } });
    if (orphanCompanyId) {
      await prisma.company.delete({ where: { id: orphanCompanyId } }).catch(() => null);
    }

    const res = NextResponse.json({
      message: 'Account and associated personal records permanently deleted.',
    });
    return clearSessionCookie(res, req);
  } catch (err) {
    console.error('[DELETE /api/auth/me]', err);
    return NextResponse.json({ error: 'Unable to delete account.' }, { status: 500 });
  }
}

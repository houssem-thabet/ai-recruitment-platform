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

  try {
    const body = await req.json();
    const { firstName, lastName, phone, currentPassword, newPassword } = body;

    const updates: Record<string, unknown> = {};
    if (typeof firstName === 'string' && firstName.trim().length >= 2) {
      updates.firstName = sanitizeText(firstName);
    }
    if (typeof lastName === 'string' && lastName.trim().length >= 2) {
      updates.lastName = sanitizeText(lastName);
    }
    if (phone !== undefined) {
      updates.phone = phone ? sanitizeText(String(phone)) : null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      if (
        String(newPassword).length < 8 ||
        !/[A-Z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
      ) {
        return NextResponse.json(
          {
            error:
              'New password must be at least 8 characters and include an uppercase letter and number.',
          },
          { status: 400 }
        );
      }
      const dbUser = await prisma.user.findUnique({ where: { id: auth.user.id } });
      if (!dbUser || !(await verifyPassword(currentPassword, dbUser.passwordHash))) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(newPassword);
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

    await prisma.user.delete({ where: { id: auth.user.id } });
    const res = NextResponse.json({
      message: 'Account and associated personal records permanently deleted.',
    });
    return clearSessionCookie(res, req);
  } catch (err) {
    console.error('[DELETE /api/auth/me]', err);
    return NextResponse.json({ error: 'Unable to delete account.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, hashResetToken } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(parsed.data.token);
    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Reset token is invalid or has expired.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
    });

    return NextResponse.json({
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err);
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 });
  }
}

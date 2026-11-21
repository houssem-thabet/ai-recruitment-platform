import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateResetToken } from '@/lib/auth';
import { forgotPasswordSchema, parseJsonBody } from '@/lib/validators';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`forgot:${ip}`, 8, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Retry in ${rl.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    let demoResetPath: string | null = null;
    if (user && user.status === 'ACTIVE') {
      const { rawToken, tokenHash } = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: expiresAt,
        },
      });

      await logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
      });

      // When no external SMTP provider is configured, surface a clearly labeled demo reset link
      if (!process.env.SMTP_HOST) {
        demoResetPath = `/reset-password?token=${rawToken}`;
      }
    }

    return NextResponse.json({
      message:
        'If an active account exists for that email address, password reset instructions have been issued.',
      demoResetPath,
    });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password]', err);
    return NextResponse.json({ error: 'Unable to process request.' }, { status: 500 });
  }
}

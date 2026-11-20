import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  hashPassword,
  signSessionToken,
  attachSessionCookie,
  getDashboardPathForRole,
} from '@/lib/auth';
import { registerSchema } from '@/lib/validators';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit, createNotification } from '@/lib/audit';
import { sanitizeText, slugify } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`register:${ip}`, 12, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${rl.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // Explicitly block any attempt to register as ADMIN through public endpoint
    if (body?.accountType === 'ADMIN' || body?.role === 'ADMIN') {
      await logAudit({
        action: 'BLOCKED_ADMIN_REGISTRATION_ATTEMPT',
        entityType: 'User',
        details: { email: body?.email },
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: 'Administrator accounts cannot be created via public registration.' },
        { status: 403 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: sanitizeText(data.firstName),
          lastName: sanitizeText(data.lastName),
          phone: data.phone ? sanitizeText(data.phone) : null,
          role: data.accountType,
          status: 'ACTIVE',
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      if (data.accountType === 'CANDIDATE') {
        await tx.candidateProfile.create({
          data: {
            userId: user.id,
            headline: 'Aspiring Professional',
            languages: [{ name: 'English', proficiency: 'Fluent' }],
          },
        });
      } else if (data.accountType === 'RECRUITER') {
        const baseSlug = slugify(data.companyName!);
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
        const company = await tx.company.create({
          data: {
            name: sanitizeText(data.companyName!),
            slug: uniqueSlug,
            website: data.companyWebsite ? sanitizeText(data.companyWebsite) : null,
            description: sanitizeText(data.companyDescription!),
            industry: sanitizeText(data.industry!),
            size: sanitizeText(data.companySize!),
            verified: true,
          },
        });

        await tx.recruiterProfile.create({
          data: {
            userId: user.id,
            companyId: company.id,
            title: 'Talent Acquisition Lead',
            isPrimaryContact: true,
          },
        });
      }

      return user;
    });

    await createNotification({
      userId: createdUser.id,
      type: 'SYSTEM',
      title: 'Welcome to TalentAI!',
      message:
        createdUser.role === 'CANDIDATE'
          ? 'Complete your profile and upload your CV to unlock AI compatibility insights and career guidance.'
          : 'Your company workspace is ready. Publish your first job or use the AI Job Description Generator.',
      link: getDashboardPathForRole(createdUser.role),
    });

    await logAudit({
      actorId: createdUser.id,
      actorRole: createdUser.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: createdUser.id,
      details: { role: createdUser.role, email: createdUser.email },
      ipAddress: ip,
    });

    const token = await signSessionToken({
      sub: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
    });

    const res = NextResponse.json(
      {
        message: 'Account created successfully',
        token,
        redirectTo: getDashboardPathForRole(createdUser.role),
        user: {
          id: createdUser.id,
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          role: createdUser.role,
        },
      },
      { status: 201 }
    );

    return attachSessionCookie(res, token, req);
  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json(
      { error: 'Unable to complete registration at this time.' },
      { status: 500 }
    );
  }
}

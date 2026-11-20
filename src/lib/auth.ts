import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import {
  SESSION_COOKIE_NAME,
  SessionTokenPayload,
  signSessionToken,
  verifySessionToken,
  getDashboardPathForRole,
} from '@/lib/jwt';

export {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  getDashboardPathForRole,
};
export type { SessionTokenPayload };

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: string;
  candidateProfileId: string | null;
  recruiterProfileId: string | null;
  companyId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  req?: NextRequest | Request
): NextResponse {
  const proto = req?.headers.get('x-forwarded-proto') || '';
  const urlStr = req?.url || '';
  const isHttps = proto.includes('https') || urlStr.startsWith('https://');
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  if (isHttps) {
    // Support cross-site iframe previews via SameSite=None; Secure; Partitioned (CHIPS)
    res.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
  return res;
}

export function clearSessionCookie(
  res: NextResponse,
  req?: NextRequest | Request
): NextResponse {
  const proto = req?.headers.get('x-forwarded-proto') || '';
  const urlStr = req?.url || '';
  const isHttps = proto.includes('https') || urlStr.startsWith('https://');
  if (isHttps) {
    res.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  return res;
}

export function extractTokenFromRequest(req?: NextRequest | Request): string | null {
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (bearer && bearer !== 'null' && bearer !== 'undefined') return bearer;
    }

    if ('cookies' in req && typeof req.cookies?.get === 'function') {
      const cookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (cookieVal) return cookieVal;
    }

    const rawCookie = req.headers.get('cookie') || '';
    const match = rawCookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      return decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }

  try {
    const cookieStore = cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getAuthUser(
  req?: NextRequest | Request
): Promise<AuthenticatedUser | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      candidateProfile: { select: { id: true } },
      recruiterProfile: { select: { id: true, companyId: true } },
    },
  });

  if (!user || user.status === 'SUSPENDED') {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    candidateProfileId: user.candidateProfile?.id ?? null,
    recruiterProfileId: user.recruiterProfile?.id ?? null,
    companyId: user.recruiterProfile?.companyId ?? null,
  };
}

export async function requireAuth(
  req: NextRequest | Request,
  allowedRoles?: Role[]
): Promise<
  | { user: AuthenticatedUser; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse }
> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please sign in to continue.' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Forbidden. Requires role: ${allowedRoles.join(' or ')}.`,
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
